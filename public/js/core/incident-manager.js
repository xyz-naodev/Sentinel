/**
 * Incident Manager Module
 * Handles incident creation, management, and notifications
 */

const IncidentManager = {
  incidentTypes: ['Accident', 'Medical', 'Crime', 'Fire', 'Other'],
  simulationRunning: false,
  incidentInterval: null,
  maxIncidentsPerArea: 50,

  /**
   * Create a new incident
   * @param {Object} incidentData - { type, location, lat, lng }
   */
  createIncident(incidentData) {
    const incident = {
      id: incidentData.id || `INC-${Date.now()}`,
      type: incidentData.type || 'Other',
      location: incidentData.location || 'Unknown',
      timestamp: incidentData.timestamp || new Date(),
      time: incidentData.time || new Date(),
      status: incidentData.status || 'active',
      lat: incidentData.lat,
      lng: incidentData.lng
    };

    return SentinelState.addIncident(incident);
  },

  /**
   * Get incidents filtered by type
   * @param {String} type - Incident type to filter
   */
  getIncidentsByType(type) {
    return SentinelState.incidents.filter(i => i.type === type);
  },

  /**
   * Get incidents in geographic area
   * @param {Number} centerLat - Center latitude
   * @param {Number} centerLng - Center longitude
   * @param {Number} radiusKm - Search radius in kilometers
   */
  getIncidentsInArea(centerLat, centerLng, radiusKm = 1) {
    const kmPerDegree = 111; // Approximate
    const latOffset = radiusKm / kmPerDegree;
    const lngOffset = radiusKm / (kmPerDegree * Math.cos((centerLat * Math.PI) / 180));

    return SentinelState.incidents.filter(inc => {
      const latDiff = Math.abs(inc.lat - centerLat);
      const lngDiff = Math.abs(inc.lng - centerLng);
      return latDiff <= latOffset && lngDiff <= lngOffset;
    });
  },

  /**
   * Get incidents by status
   * @param {String} status - Status to filter (active, resolved, etc)
   */
  getIncidentsByStatus(status) {
    return SentinelState.incidents.filter(i => i.status === status);
  },

  /**
   * Update incident status
   * @param {String} incidentId - ID of incident
   * @param {String} newStatus - New status
   */
  updateStatus(incidentId, newStatus) {
    return SentinelState.updateIncidentStatus(incidentId, newStatus);
  },

  /**
   * Get recent incidents
   * @param {Number} count - Number of incidents to retrieve
   */
  getRecent(count = 5) {
    return SentinelState.incidents.slice(0, count);
  },

  /**
   * Get incident statistics
   */
  getStats() {
    const total = SentinelState.incidents.length;
    const active = SentinelState.getActiveIncidents().length;
    const resolved = SentinelState.incidents.filter(i => i.status === 'resolved').length;
    
    const typeDistribution = {};
    SentinelState.incidents.forEach(inc => {
      typeDistribution[inc.type] = (typeDistribution[inc.type] || 0) + 1;
    });

    return {
      total,
      active,
      resolved,
      typeDistribution
    };
  },

  /**
   * Notify of new incident
   * @param {Object} incident - Incident object
   */
  notifyIncident(incident) {
    const message = `${incident.type} reported at ${incident.location}`;
    UIUtils.showToast(`New Incident: ${incident.type}`, message);
    
    SentinelState.updateNotificationCount();
    UIUtils.updateNotificationBadge(SentinelState.notificationCount);
  },

  /**
   * Start simulating random incidents
   * @param {Number} intervalMs - Interval between incidents in milliseconds
   * @param {Object} bounds - Geographic bounds { minLat, maxLat, minLng, maxLng }
   */
  startSimulation(intervalMs = 8000, bounds = null) {
    if (this.simulationRunning) {
      console.warn('Incident simulation already running');
      return;
    }

    const defaultBounds = {
      minLat: 14.330,
      maxLat: 14.350,
      minLng: 121.110,
      maxLng: 121.125
    };

    const boundsToUse = bounds || defaultBounds;

    this.simulationRunning = true;

    this.incidentInterval = setInterval(() => {
      const randomType = this.incidentTypes[Math.floor(Math.random() * this.incidentTypes.length)];
      const incident = {
        id: `INC-${Date.now()}`,
        type: randomType,
        location: `Area ${Math.floor(Math.random() * 10) + 1}`,
        timestamp: new Date(),
        time: new Date(),
        status: 'active',
        lat: boundsToUse.minLat + Math.random() * (boundsToUse.maxLat - boundsToUse.minLat),
        lng: boundsToUse.minLng + Math.random() * (boundsToUse.maxLng - boundsToUse.minLng)
      };

      const createdIncident = this.createIncident(incident);
      
      if (MapManager.isInitialized()) {
        MapManager.addIncidentMarker(createdIncident);
      }
      
      this.notifyIncident(createdIncident);
    }, intervalMs);
  },

  /**
   * Stop incident simulation
   */
  stopSimulation() {
    if (this.incidentInterval) {
      clearInterval(this.incidentInterval);
      this.incidentInterval = null;
      this.simulationRunning = false;
    }
  },

  /**
   * Check if simulation is running
   */
  isSimulating() {
    return this.simulationRunning;
  }
};
