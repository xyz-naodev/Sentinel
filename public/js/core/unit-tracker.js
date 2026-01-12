/**
 * Unit Tracker Module
 * Handles tanod/patrol unit tracking, positioning, and status updates
 */

const UnitTracker = {
  trackingRunning: false,
  trackingInterval: null,
  simulationBounds: {
    minLat: 14.330,
    maxLat: 14.350,
    minLng: 121.110,
    maxLng: 121.125
  },

  /**
   * Initialize tanod units
   * @param {Object} options - Configuration options
   */
  initialize(options = {}) {
    const defaultUnits = [
      { 
        id: 'T01', 
        name: 'Unit 01', 
        position: { lat: 14.342 + 0.002, lng: 121.116 - 0.002 }, 
        status: 'on-duty', 
        lastUpdate: Date.now() 
      },
      { 
        id: 'T02', 
        name: 'Unit 02', 
        position: { lat: 14.342 - 0.001, lng: 121.116 + 0.003 }, 
        status: 'patrolling', 
        lastUpdate: Date.now() 
      },
      { 
        id: 'T03', 
        name: 'Unit 03', 
        position: { lat: 14.342, lng: 121.116 }, 
        status: 'idle', 
        lastUpdate: Date.now() 
      }
    ];

    const units = options.units || defaultUnits;
    return SentinelState.initializeTanods(units);
  },

  /**
   * Get all tracked units
   */
  getAllUnits() {
    return SentinelState.getTanods();
  },

  /**
   * Get unit by ID
   * @param {String} unitId - ID of the unit
   */
  getUnit(unitId) {
    return SentinelState.getTanodById(unitId);
  },

  /**
   * Update unit position
   * @param {String} unitId - ID of unit
   * @param {Number} lat - Latitude
   * @param {Number} lng - Longitude
   */
  updatePosition(unitId, lat, lng) {
    const updated = SentinelState.updateTanodPosition(unitId, lat, lng);
    
    if (updated && MapManager.isInitialized()) {
      MapManager.renderTanodMarkers();
    }
    
    return updated;
  },

  /**
   * Update unit status
   * @param {String} unitId - ID of unit
   * @param {String} status - New status (on-duty, patrolling, idle)
   */
  updateStatus(unitId, status) {
    const updated = SentinelState.updateTanodStatus(unitId, status);
    
    if (updated && MapManager.isInitialized()) {
      MapManager.renderTanodMarkers();
    }
    
    return updated;
  },

  /**
   * Get unit status
   * @param {String} unitId - ID of unit
   */
  getStatus(unitId) {
    const unit = this.getUnit(unitId);
    return unit ? unit.status : null;
  },

  /**
   * Get unit position
   * @param {String} unitId - ID of unit
   */
  getPosition(unitId) {
    const unit = this.getUnit(unitId);
    return unit ? unit.position : null;
  },

  /**
   * Get units with specific status
   * @param {String} status - Status filter
   */
  getUnitsByStatus(status) {
    return this.getAllUnits().filter(u => u.status === status);
  },

  /**
   * Get units in geographic area
   * @param {Number} centerLat - Center latitude
   * @param {Number} centerLng - Center longitude
   * @param {Number} radiusKm - Search radius
   */
  getUnitsInArea(centerLat, centerLng, radiusKm = 1) {
    const kmPerDegree = 111;
    const latOffset = radiusKm / kmPerDegree;
    const lngOffset = radiusKm / (kmPerDegree * Math.cos((centerLat * Math.PI) / 180));

    return this.getAllUnits().filter(unit => {
      const latDiff = Math.abs(unit.position.lat - centerLat);
      const lngDiff = Math.abs(unit.position.lng - centerLng);
      return latDiff <= latOffset && lngDiff <= lngOffset;
    });
  },

  /**
   * Start GPS position simulation
   * @param {Number} intervalMs - Update interval in milliseconds
   */
  startTracking(intervalMs = 5000) {
    if (this.trackingRunning) {
      console.warn('Tracking already running');
      return;
    }

    this.trackingRunning = true;

    this.trackingInterval = setInterval(() => {
      this.simulateMovement();
    }, intervalMs);
  },

  /**
   * Simulate tanod movement
   */
  simulateMovement() {
    const BOUNDS = this.simulationBounds;
    const units = this.getAllUnits();

    units.forEach(unit => {
      const latChange = (Math.random() - 0.5) * 0.0002;
      const lngChange = (Math.random() - 0.5) * 0.0002;

      const newLat = Math.max(BOUNDS.minLat, Math.min(BOUNDS.maxLat, unit.position.lat + latChange));
      const newLng = Math.max(BOUNDS.minLng, Math.min(BOUNDS.maxLng, unit.position.lng + lngChange));

      this.updatePosition(unit.id, newLat, newLng);
    });
  },

  /**
   * Stop GPS position simulation
   */
  stopTracking() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
      this.trackingRunning = false;
    }
  },

  /**
   * Check if tracking is active
   */
  isTracking() {
    return this.trackingRunning;
  },

  /**
   * Get tracking statistics
   */
  getStats() {
    const units = this.getAllUnits();
    return {
      total: units.length,
      onDuty: units.filter(u => u.status === 'on-duty').length,
      patrolling: units.filter(u => u.status === 'patrolling').length,
      idle: units.filter(u => u.status === 'idle').length
    };
  },

  /**
   * Calculate distance between two units
   * @param {String} unitId1 - First unit ID
   * @param {String} unitId2 - Second unit ID
   */
  getDistanceBetweenUnits(unitId1, unitId2) {
    const unit1 = this.getUnit(unitId1);
    const unit2 = this.getUnit(unitId2);

    if (!unit1 || !unit2) return null;

    const R = 6371; // Earth's radius in km
    const dLat = ((unit2.position.lat - unit1.position.lat) * Math.PI) / 180;
    const dLng = ((unit2.position.lng - unit1.position.lng) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((unit1.position.lat * Math.PI) / 180) *
        Math.cos((unit2.position.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
};
