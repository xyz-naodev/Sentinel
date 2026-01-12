/**
 * Sentinel Core Initialization
 * Initializes all core modules and systems
 */

const SentinelCore = {
  initialized: false,
  mapInitialized: false,
  trackingInitialized: false,

  /**
   * Initialize the entire Sentinel system
   * @param {Object} options - Configuration options
   */
  init(options = {}) {
    console.log('Initializing Sentinel Core...');

    // Default options
    const config = {
      mapContainer: 'map',
      enableMapTracking: true,
      enableIncidentSimulation: true,
      autoInitMap: true,
      ...options
    };

    // Initialize state
    this.initState();

    // Initialize units
    if (config.enableMapTracking) {
      this.initUnits();
    }

    // Initialize map if container exists
    if (config.autoInitMap && document.getElementById(config.mapContainer)) {
      this.initMap(config.mapContainer);
    }

    // Start simulations
    if (config.enableIncidentSimulation) {
      this.startSimulations();
    }

    this.initialized = true;
    console.log('Sentinel Core initialized successfully');

    return this;
  },

  /**
   * Initialize app state
   */
  initState() {
    console.log('Initializing state...');
    // State is already available as SentinelState
  },

  /**
   * Initialize tracking units
   */
  initUnits() {
    console.log('Initializing units...');
    UnitTracker.initialize();
    this.trackingInitialized = true;
  },

  /**
   * Initialize map
   * @param {String} containerId - ID of map container
   */
  initMap(containerId = 'map') {
    console.log('Initializing map...');
    
    if (!document.getElementById(containerId)) {
      console.warn(`Map container "${containerId}" not found`);
      return false;
    }

    try {
      MapManager.init(containerId);
      
      const units = UnitTracker.getAllUnits();
      if (units.length > 0) {
        MapManager.renderTanodMarkers(units);
        MapManager.renderIncidentMarkers();
      }

      this.mapInitialized = true;
      console.log('Map initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing map:', error);
      return false;
    }
  },

  /**
   * Start tracking and simulation
   */
  startSimulations() {
    console.log('Starting simulations...');
    
    // Start unit tracking
    if (this.trackingInitialized) {
      UnitTracker.startTracking(5000);
    }

    // Start incident simulation
    IncidentManager.startSimulation(8000);
  },

  /**
   * Stop all simulations
   */
  stopSimulations() {
    console.log('Stopping simulations...');
    UnitTracker.stopTracking();
    IncidentManager.stopSimulation();
  },

  /**
   * Get system status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      mapInitialized: this.mapInitialized,
      trackingInitialized: this.trackingInitialized,
      isTracking: UnitTracker.isTracking(),
      isSimulating: IncidentManager.isSimulating(),
      unitCount: SentinelState.getTanods().length,
      incidentCount: SentinelState.incidents.length
    };
  },

  /**
   * Cleanup and destroy system
   */
  destroy() {
    console.log('Destroying Sentinel Core...');
    this.stopSimulations();
    MapManager.destroy();
    this.initialized = false;
    console.log('Sentinel Core destroyed');
  }
};

// Auto-initialize on DOM ready if data attribute is present
document.addEventListener('DOMContentLoaded', function() {
  if (document.body.getAttribute('data-sentinel-auto-init') === 'true') {
    SentinelCore.init();
  }
});
