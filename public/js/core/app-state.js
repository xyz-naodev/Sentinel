/**
 * Core App State Management
 * Centralized state for incidents, units, and map data
 * Used across the entire application
 */

const SentinelState = {
  // Incident management
  incidents: [
    { id: 'INC-001', type: 'Accident', location: 'Area 1', status: 'active', time: new Date(Date.now() - 300000) },
    { id: 'INC-002', type: 'Medical', location: 'Area 2', status: 'active', time: new Date(Date.now() - 600000) },
    { id: 'INC-003', type: 'Crime', location: 'Area 3', status: 'resolved', time: new Date(Date.now() - 900000) }
  ],
  
  // Tanod/Unit management
  tanods: [],
  
  // Map and markers
  mapMarkers: [],
  map: null,
  
  // Notifications
  notificationCount: 3,
  
  // User
  currentUser: null,

  /**
   * Add incident to state
   * @param {Object} incident - Incident object with type, location, lat, lng
   */
  addIncident(incident) {
    const newIncident = {
      id: incident.id || `INC-${Date.now()}`,
      type: incident.type,
      location: incident.location,
      timestamp: incident.timestamp || new Date(),
      time: incident.time || new Date(),
      status: incident.status || 'active',
      lat: incident.lat,
      lng: incident.lng
    };
    
    this.incidents.unshift(newIncident);
    
    // Keep max 50 incidents in memory
    if (this.incidents.length > 50) {
      this.incidents.pop();
    }
    
    return newIncident;
  },

  /**
   * Get all active incidents
   */
  getActiveIncidents() {
    return this.incidents.filter(i => i.status === 'active');
  },

  /**
   * Update incident status
   * @param {String} incidentId - ID of incident
   * @param {String} newStatus - New status (active, resolved, etc)
   */
  updateIncidentStatus(incidentId, newStatus) {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (incident) {
      incident.status = newStatus;
      return incident;
    }
    return null;
  },

  /**
   * Initialize tanods
   * @param {Array} tanodsData - Array of tanod objects
   */
  initializeTanods(tanodsData) {
    this.tanods = tanodsData;
    return this.tanods;
  },

  /**
   * Update tanod position
   * @param {String} tanodId - ID of tanod unit
   * @param {Number} lat - Latitude
   * @param {Number} lng - Longitude
   */
  updateTanodPosition(tanodId, lat, lng) {
    const tanod = this.tanods.find(t => t.id === tanodId);
    if (tanod) {
      tanod.position.lat = lat;
      tanod.position.lng = lng;
      tanod.lastUpdate = Date.now();
      return tanod;
    }
    return null;
  },

  /**
   * Update tanod status
   * @param {String} tanodId - ID of tanod unit
   * @param {String} newStatus - New status
   */
  updateTanodStatus(tanodId, newStatus) {
    const tanod = this.tanods.find(t => t.id === tanodId);
    if (tanod) {
      tanod.status = newStatus;
      return tanod;
    }
    return null;
  },

  /**
   * Get all tanods
   */
  getTanods() {
    return this.tanods;
  },

  /**
   * Get tanod by ID
   */
  getTanodById(tanodId) {
    return this.tanods.find(t => t.id === tanodId);
  },

  /**
   * Update notification count
   */
  updateNotificationCount() {
    this.notificationCount = this.getActiveIncidents().length;
    return this.notificationCount;
  }
};

// Export to window for global access
window.state = SentinelState;
window.SentinelState = SentinelState;
