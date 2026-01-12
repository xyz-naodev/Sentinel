/**
 * Map Manager Module
 * Handles all Leaflet map operations, markers, and layers
 * Requires: Leaflet.js, Leaflet.AwesomeMarkers
 */

const MapManager = {
  map: null,
  tanodsLayer: null,
  incidentsLayer: null,
  patrolTrails: { 'T01': [], 'T02': [], 'T03': [] },
  patrolPolylines: {},
  mapConfig: {
    center: [14.342, 121.116],
    zoom: 15,
    minZoom: 12,
    maxZoom: 19,
    tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors'
  },

  /**
   * Initialize the Leaflet map
   * @param {String} containerId - ID of the map container element
   * @param {Object} options - Optional configuration overrides
   */
  init(containerId = 'map', options = {}) {
    if (this.map) {
      console.warn('Map already initialized');
      return this.map;
    }

    // Merge options
    const config = { ...this.mapConfig, ...options };

    // Initialize map
    this.map = L.map(containerId).setView(config.center, config.zoom);
    SentinelState.map = this.map;

    // Add tile layer
    L.tileLayer(config.tileLayer, {
      attribution: config.attribution,
      maxZoom: config.maxZoom
    }).addTo(this.map);

    // Add zoom controls
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Create feature groups for layers
    this.tanodsLayer = L.featureGroup().addTo(this.map);
    this.incidentsLayer = L.featureGroup().addTo(this.map);

    // Add map click listener for incident reporting
    this.setupMapClickListener();

    return this.map;
  },

  /**
   * Setup click listener for map incident reporting
   */
  setupMapClickListener() {
    this.map.on('click', (e) => {
      const incidentType = prompt('Incident type (Accident/Medical/Crime/Fire/Other):');
      if (incidentType) {
        const incident = {
          id: `INC-${Date.now()}`,
          type: incidentType,
          location: `Map Location`,
          timestamp: new Date(),
          time: new Date(),
          status: 'active',
          lat: e.latlng.lat,
          lng: e.latlng.lng
        };
        SentinelState.addIncident(incident);
        this.addIncidentMarker(incident);
        IncidentManager.notifyIncident(incident);
      }
    });
  },

  /**
   * Get tanod color based on status
   * @param {String} status - Tanod status
   */
  getTanodColor(status) {
    const colors = {
      'on-duty': 'blue',
      'patrolling': 'lightblue',
      'idle': 'gray'
    };
    return colors[status] || 'gray';
  },

  /**
   * Render tanod markers on map
   * @param {Array} tanods - Array of tanod objects
   */
  renderTanodMarkers(tanods = SentinelState.getTanods()) {
    this.tanodsLayer.clearLayers();
    SentinelState.mapMarkers = [];

    tanods.forEach(tanod => {
      const color = this.getTanodColor(tanod.status);
      const icon = L.AwesomeMarkers.icon({
        icon: 'fa-motorcycle',
        prefix: 'fa',
        markerColor: color
      });

      const marker = L.marker([tanod.position.lat, tanod.position.lng], { icon })
        .bindPopup(`<strong>${tanod.name}</strong><br/>Status: ${tanod.status}`)
        .addTo(this.tanodsLayer);

      SentinelState.mapMarkers.push({ id: tanod.id, marker });

      // Track patrol trail for primary unit (T01)
      if (tanod.id === 'T01') {
        this.patrolTrails['T01'].push([tanod.position.lat, tanod.position.lng]);
        this.drawPatrolTrail('T01');
      }
    });

    this.renderIncidentMarkers();
  },

  /**
   * Draw patrol trail polyline
   * @param {String} tanodId - ID of tanod unit
   */
  drawPatrolTrail(tanodId) {
    const coords = this.patrolTrails[tanodId] || [];
    
    if (this.patrolPolylines[tanodId]) {
      this.map.removeLayer(this.patrolPolylines[tanodId]);
    }

    if (coords.length > 1) {
      this.patrolPolylines[tanodId] = L.polyline(coords, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.7,
        dashArray: '5, 5'
      }).addTo(this.map);
    }
  },

  /**
   * Add single incident marker to map
   * @param {Object} incident - Incident object
   */
  addIncidentMarker(incident) {
    const icon = L.AwesomeMarkers.icon({
      icon: 'fa-exclamation-triangle',
      prefix: 'fa',
      markerColor: 'red'
    });

    L.marker([incident.lat, incident.lng], { icon })
      .bindPopup(`
        <div style="width: 200px;">
          <b>${incident.type}</b><br/>
          <small>${incident.location}</small><br/>
          <small>${incident.timestamp ? incident.timestamp.toLocaleTimeString() : 'N/A'}</small>
        </div>
      `)
      .addTo(this.incidentsLayer);
  },

  /**
   * Render all incident markers
   * @param {Array} incidents - Array of incident objects
   */
  renderIncidentMarkers(incidents = SentinelState.incidents) {
    this.incidentsLayer.clearLayers();

    incidents.forEach(incident => {
      this.addIncidentMarker(incident);
    });
  },

  /**
   * Center map on location
   * @param {Number} lat - Latitude
   * @param {Number} lng - Longitude
   * @param {Number} zoom - Zoom level
   */
  centerMap(lat, lng, zoom = 15) {
    if (this.map) {
      this.map.setView([lat, lng], zoom);
      return true;
    }
    return false;
  },

  /**
   * Center map on all tanods
   */
  centerOnTanods(tanods = SentinelState.getTanods()) {
    if (tanods.length === 0) return false;

    const avgLat = tanods.reduce((sum, t) => sum + t.position.lat, 0) / tanods.length;
    const avgLng = tanods.reduce((sum, t) => sum + t.position.lng, 0) / tanods.length;
    
    return this.centerMap(avgLat, avgLng, 15);
  },

  /**
   * Destroy map instance
   */
  destroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.tanodsLayer = null;
      this.incidentsLayer = null;
    }
  },

  /**
   * Check if map is initialized
   */
  isInitialized() {
    return this.map !== null;
  }
};
