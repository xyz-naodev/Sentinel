/**
 * Sentinel App Core Integration
 * Map management, incident tracking, and unit positioning
 * Includes comprehensive error handling and logging
 */

// Verify utilities are loaded
if (typeof Logger === 'undefined' || typeof DOMValidator === 'undefined') {
  console.warn('Sentinel App: Utils module not loaded. Some features may not work properly.');
}

// Global state management (from app-state.js)
// Use window.state which is set by app-state.js, create fallback if needed
let state = window.state;
if (!state) {
  state = {
    incidents: [],
    tanods: [],
    mapMarkers: [],
    map: null,
    notificationCount: 0,
    currentUser: null
  };
  window.state = state;
}

// Map layer management
let map = null;
let heatmap = null;
let tanodsLayer = null;
let incidentsLayer = null;
const patrolTrails = { 'T01': [], 'T02': [], 'T03': [] };
let patrolPolylines = {};

// Tracking intervals for cleanup
let trackingInterval = null;
let incidentInterval = null;

/**
 * Initialize Google Maps with error handling
 */
function initMap() {
  try {
    if (map) {
      Logger.debug('Map already initialized, skipping initialization');
      return;
    }

    Logger.info('Starting Google Maps initialization');

    // Validate map container exists
    const mapContainer = DOMValidator.validateElement('#map', 'Map container');
    if (!mapContainer) {
      throw new Error('Map container (#map) not found in DOM');
    }

    // Initialize map with error handling
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
      throw new Error('Google Maps API not loaded. Please check network connection.');
    }

    // Create Google Map instance
    map = new google.maps.Map(document.getElementById('map'), {
      zoom: 17,
      center: { lat: 14.27835, lng: 121.05366 },
      mapTypeId: 'roadmap',
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'on' }]
        }
      ]
    });
    state.map = map;
    window.map = map;  // Make map accessible to Firebase dashboard integration
    Logger.info('Google Maps instance created');

    // Store markers for tracking
    window.mapMarkers = {
      tanods: {},
      incidents: {}
    };

    // Initialize heatmap layer for analytics visualization (only on analytics page)
    try {
      const isAnalyticsPage = window.location.pathname.includes('analytics.html');
      if (isAnalyticsPage && typeof google.maps.visualization !== 'undefined') {
        heatmap = new google.maps.visualization.HeatmapLayer({
          data: [],
          radius: 30,
          maxIntensity: 5,
          dissipating: true,
          gradient: [
            'rgba(0, 255, 255, 0)',
            'rgba(0, 255, 255, 1)',
            'rgba(0, 191, 255, 1)',
            'rgba(0, 127, 255, 1)',
            'rgba(0, 63, 255, 1)',
            'rgba(0, 0, 255, 1)',
            'rgba(0, 0, 223, 1)',
            'rgba(0, 0, 191, 1)',
            'rgba(0, 0, 159, 1)',
            'rgba(0, 0, 127, 1)',
            'rgba(63, 0, 91, 1)',
            'rgba(127, 0, 63, 1)',
            'rgba(191, 0, 31, 1)',
            'rgba(255, 0, 0, 1)'
          ],
          map: map
        });
        Logger.info('Heatmap layer initialized for analytics visualization');
      } else if (!isAnalyticsPage) {
        Logger.debug('Skipping heatmap on dashboard (not analytics page)');
      }
    } catch (error) {
      Logger.warn('Could not initialize heatmap layer', error.message);
      heatmap = null;
    }

    // Handle map clicks to add incidents
    // DISABLED FOR WEB: Only Flutter app can report incidents via map clicks
    // map.addListener('click', (e) => {
    //   try {
    //     const incidentType = prompt('Incident type (Accident/Medical/Crime/Fire/Other):');
    //     if (incidentType && incidentType.trim()) {
    //       const incident = {
    //         id: `INC-${Date.now()}`,
    //         type: incidentType,
    //         location: `Map Location`,
    //         timestamp: new Date(),
    //         time: new Date(),
    //         status: 'active',
    //         lat: e.latLng.lat(),
    //         lng: e.latLng.lng()
    //       };
    //       addIncidentToState(incident);
    //       Logger.info('Incident added via map click', { type: incidentType, lat: e.latLng.lat(), lng: e.latLng.lng() });
    //     }
    //   } catch (error) {
    //     Logger.error('Error handling map click', error.message);
    //   }
    // });

    // Initialize map data
    // seedTanods();  // Disabled: Using Firebase integration instead
    renderTanodMarkers();

    // Expose heatmap update function to global scope
    window.updateHeatmap = function() {
      if (!heatmap || typeof google === 'undefined') {
        Logger.debug('Heatmap not available for update');
        return;
      }
      try {
        let points = [];
        if (Array.isArray(state.incidents)) {
          points = state.incidents
            .filter(i => i && typeof i.lat === 'number' && typeof i.lng === 'number')
            .map(i => new google.maps.LatLng(parseFloat(i.lat), parseFloat(i.lng)));
        }
        // If no dynamic incidents exist, include a static fallback heat point
        if (!points || points.length === 0) {
          try {
            points = [new google.maps.LatLng(14.27835, 121.05366)];
          } catch (e) {
            points = [];
          }
        }
        heatmap.setData(points);
        Logger.debug('Heatmap updated with incident data', { count: points.length });
      } catch (error) {
        Logger.warn('Failed to update heatmap', error.message);
      }
    };

    setTimeout(() => {
      try {
        // renderTanods();  // Disabled: Using Firebase integration instead
        // renderIncidents();  // Disabled: Using Firebase integration instead
        window.updateHeatmap();
        // startTrackingSimulation();  // Disabled: Using Firebase real-time data instead
      } catch (error) {
        Logger.error('Error during deferred initialization', error.message);
      }
    }, 50);

    Logger.info('Map initialization completed successfully');

  } catch (error) {
    Logger.error('Critical error during map initialization', error.message);
    throw error; // Re-throw to be caught by dashboard init
  }
}

// Expose initMap to global scope for Google Maps API callback
window.initMap = initMap;

/**
 * Initialize tanod (unit) positions
 */
function seedTanods() {
  try {
    const baseCoords = { lat: 14.27835, lng: 121.05366 };
    state.tanods = [
      { 
        id: 'T01', 
        name: 'Unit 01', 
        position: { lat: baseCoords.lat + 0.002, lng: baseCoords.lng - 0.002 }, 
        status: 'on-duty', 
        lastUpdate: Date.now() 
      },
      { 
        id: 'T02', 
        name: 'Unit 02', 
        position: { lat: baseCoords.lat - 0.001, lng: baseCoords.lng + 0.003 }, 
        status: 'patrolling', 
        lastUpdate: Date.now() 
      },
      { 
        id: 'T03', 
        name: 'Unit 03', 
        position: { lat: baseCoords.lat, lng: baseCoords.lng }, 
        status: 'idle', 
        lastUpdate: Date.now() 
      }
    ];
    Logger.info('Tanods seeded successfully', { count: state.tanods.length });
  } catch (error) {
    Logger.error('Error seeding tanods', error.message);
    state.tanods = [];
  }
}

/**
 * Render tanod markers on Google Map
 */
function renderTanodMarkers() {
  try {
    if (!map || typeof google === 'undefined') {
      Logger.warn('Map not initialized or Google Maps not loaded');
      return;
    }

    // Clear previous tanod markers
    if (window.mapMarkers && window.mapMarkers.tanods) {
      Object.values(window.mapMarkers.tanods).forEach(marker => marker.setMap(null));
    }
    if (!window.mapMarkers) window.mapMarkers = {};
    window.mapMarkers.tanods = {};

    state.tanods.forEach((tanod) => {
      try {
        const color = getTanodColor(tanod.status);
        
        // Create Google Maps marker for tanod with person icon
        const marker = new google.maps.Marker({
          position: { lat: tanod.position.lat, lng: tanod.position.lng },
          map: map,
          title: tanod.name,
          icon: getTanodPersonIcon(tanod.status)
        });

        // Add combined info window with Tanod + GPS information
        const infoWindow = new google.maps.InfoWindow({
          content: `<div style="padding: 12px; font-family: Arial, sans-serif; width: 280px;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <i class="fa-solid fa-user-circle" style="font-size: 24px; color: #2196F3; margin-right: 10px;"></i>
              <div>
                <strong style="font-size: 14px;">${tanod.name}</strong><br/>
                <span style="font-size: 12px; color: #999;">ID: ${tanod.id}</span>
              </div>
            </div>
            <div style="border-top: 1px solid #eee; padding-top: 10px;">
              <p style="margin: 6px 0; font-size: 12px;">
                <strong>Status:</strong> <span style="color: ${tanod.status === 'on-duty' ? '#4CAF50' : tanod.status === 'patrolling' ? '#2196F3' : '#FF9800'}; font-weight: 600;">${tanod.status}</span>
              </p>
              <p style="margin: 6px 0; font-size: 12px;">
                <strong>GPS Location:</strong><br/>
                <span style="font-family: monospace; font-size: 11px; color: #555;">${tanod.position.lat.toFixed(6)}, ${tanod.position.lng.toFixed(6)}</span>
              </p>
              <p style="margin: 6px 0; font-size: 12px;">
                <strong>Last Update:</strong> <span style="color: #999;">Just now</span>
              </p>
            </div>
          </div>`
        });
        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        window.mapMarkers.tanods[tanod.id] = marker;
        state.mapMarkers.push({ id: tanod.id, marker });

        // Track patrol route for Unit 01
        if (tanod.id === 'T01') {
          patrolTrails['T01'].push([tanod.position.lat, tanod.position.lng]);
          drawPatrolTrail('T01');
        }
      } catch (error) {
        Logger.error(`Error rendering marker for tanod ${tanod.id}`, error.message);
      }
    });

    drawIncidentMarkers();
    renderTanods();
    Logger.debug('Tanod markers rendered', { count: state.tanods.length });

  } catch (error) {
    Logger.error('Error rendering tanod markers', error.message);
  }
}

function drawPatrolTrail(tanodId) {
  const coords = patrolTrails[tanodId] || [];
  if (patrolPolylines[tanodId]) {
    patrolPolylines[tanodId].setMap(null);
  }
  if (coords.length > 1) {
    patrolPolylines[tanodId] = new google.maps.Polyline({
      path: coords.map(c => ({ lat: c[0], lng: c[1] })),
      geodesic: true,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.7,
      strokeWeight: 3,
      map: map
    });
  }
}

function drawIncidentMarkers() {
  // Clear previous incident markers
  if (window.mapMarkers && window.mapMarkers.incidents) {
    Object.values(window.mapMarkers.incidents).forEach(marker => marker.setMap(null));
  }
  if (!window.mapMarkers) window.mapMarkers = {};
  window.mapMarkers.incidents = {};

  state.incidents.forEach(incident => {
    const marker = new google.maps.Marker({
      position: { lat: incident.lat, lng: incident.lng },
      map: map,
      title: incident.type,
      icon: getMarkerIcon('red')
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="width: 200px; padding: 10px;">
          <b>${incident.type}</b><br/>
          <small>${incident.location}</small><br/>
          <small>${incident.timestamp ? incident.timestamp.toLocaleTimeString() : new Date(incident.time).toLocaleTimeString()}</small>
        </div>
      `
    });
    marker.addListener('click', () => {
      infoWindow.open(map, marker);
    });

    window.mapMarkers.incidents[incident.id] = marker;
  });
}

/**
 * Get colored person icon for Tanod based on status
 */
function getTanodPersonIcon(status) {
  const statusColors = {
    'on-duty': '#2196F3',      // Blue
    'patrolling': '#1976D2',   // Dark Blue
    'idle': '#FF9800'          // Orange
  };
  const color = statusColors[status] || '#9E9E9E'; // Gray default

  return `data:image/svg+xml;base64,${btoa(`
    <svg width="15" height="15" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <!-- Background circle -->
      <circle cx="20" cy="20" r="18" fill="${color}" opacity="0.9"/>
      <!-- Border -->
      <circle cx="20" cy="20" r="18" fill="none" stroke="white" stroke-width="2"/>
      <!-- Person icon -->
      <circle cx="20" cy="12" r="5" fill="white"/>
      <path d="M 20 18 Q 14 22 14 27 L 26 27 Q 26 22 20 18" fill="white"/>
    </svg>
  `)}`;
}

/**
 * Get colored marker icon for Google Maps
 */
function getMarkerIcon(color) {
  const colors = {
    'red': 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
    'blue': 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
    'yellow': 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
    'green': 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
    'gray': 'http://maps.google.com/mapfiles/ms/icons/gray-dot.png'
  };
  return colors[color] || colors['gray'];
}

function getTanodColor(status) {
  const colors = {
    'on-duty': 'blue',
    'patrolling': 'lightblue',
    'idle': 'gray'
  };
  return colors[status] || 'gray';
}

function renderTanods() {
  const container = document.getElementById('unitsList');
  if (!container) return;
  container.innerHTML = state.tanods.map(tanod => `
    <div class="unit-item">
      <div class="unit-header">
        <span class="unit-badge" style="background: ${getTanodColor(tanod.status) === 'lightblue' ? '#1e40af' : getTanodColor(tanod.status) === 'blue' ? '#3b82f6' : '#9ca3af'}"></span>
        <strong>${tanod.name}</strong>
      </div>
      <small>Lat: ${tanod.position.lat.toFixed(4)}, Lng: ${tanod.position.lng.toFixed(4)}</small>
      <small style="display: block; color: #666;">Status: ${tanod.status}</small>
    </div>
  `).join('');
}

/**
 * Start background tracking simulations
 */
function startTrackingSimulation() {
  try {
    // Clear existing intervals
    if (trackingInterval) {
      clearInterval(trackingInterval);
    }
    if (incidentInterval) {
      clearInterval(incidentInterval);
    }

    trackingInterval = setInterval(() => {
      try {
        simulateTanodMovement();
      } catch (error) {
        Logger.error('Error in tanod movement simulation', error.message);
      }
    }, 5000);

    incidentInterval = setInterval(() => {
      try {
        simulateRandomIncidents();
      } catch (error) {
        Logger.error('Error in incident simulation', error.message);
      }
    }, 8000);

    Logger.info('Tracking simulations started');
  } catch (error) {
    Logger.error('Error starting tracking simulation', error.message);
  }
}

/**
 * Stop tracking simulations for cleanup
 */
function stopTrackingSimulation() {
  try {
    if (trackingInterval) {
      clearInterval(trackingInterval);
      trackingInterval = null;
    }
    if (incidentInterval) {
      clearInterval(incidentInterval);
      incidentInterval = null;
    }
    Logger.info('Tracking simulations stopped');
  } catch (error) {
    Logger.error('Error stopping tracking simulation', error.message);
  }
}

/**
 * Simulate tanod movement within geographical bounds
 */
function simulateTanodMovement() {
  try {
    const BOUNDS = {
      minLat: 14.273,
      maxLat: 14.284,
      minLng: 121.050,
      maxLng: 121.058
    };

    if (!state.tanods || state.tanods.length === 0) {
      Logger.debug('No tanods to simulate');
      return;
    }

    state.tanods.forEach((tanod) => {
      try {
        const latChange = (Math.random() - 0.5) * 0.0002;
        const lngChange = (Math.random() - 0.5) * 0.0002;
        
        tanod.position.lat = Math.max(
          BOUNDS.minLat, 
          Math.min(BOUNDS.maxLat, tanod.position.lat + latChange)
        );
        tanod.position.lng = Math.max(
          BOUNDS.minLng, 
          Math.min(BOUNDS.maxLng, tanod.position.lng + lngChange)
        );
        tanod.lastUpdate = Date.now();
      } catch (error) {
        Logger.warn(`Error updating tanod position for ${tanod.id}`, error.message);
      }
    });

    renderTanodMarkers();
  } catch (error) {
    Logger.error('Error in tanod movement simulation', error.message);
  }
}

function simulateRandomIncidents() {
  const types = ['Accident', 'Medical', 'Crime', 'Fire', 'Other'];
  const randomType = types[Math.floor(Math.random() * types.length)];
  const now = new Date();
  const incident = {
    id: `INC-${Date.now()}`,
    type: randomType,
    location: `Area ${Math.floor(Math.random() * 10) + 1}`,
    timestamp: now,
    time: now,
    status: 'active',
    lat: 14.273 + Math.random() * 0.011,
    lng: 121.050 + Math.random() * 0.008
  };
  addIncidentToState(incident);
}

/**
 * Add incident to state and render on map
 */
function addIncidentToState(incident) {
  try {
    if (!incident || !incident.lat || !incident.lng) {
      Logger.warn('Invalid incident data', incident);
      return;
    }

    state.incidents.unshift(incident);
    
    // Limit incidents in memory
    if (state.incidents.length > 50) {
      state.incidents.pop();
    }

    Logger.debug('Incident added to state', { 
      id: incident.id, 
      type: incident.type, 
      count: state.incidents.length 
    });

    // Add marker to map
    try {
      if (typeof L.AwesomeMarkers === 'undefined') {
        Logger.warn('AwesomeMarkers not available for incident marker');
      } else {
        const icon = L.AwesomeMarkers.icon({
          icon: 'fa-exclamation-triangle',
        });

        // Add Google Maps marker for incident
        const gMarker = new google.maps.Marker({
          position: { lat: incident.lat, lng: incident.lng },
          map: map,
          title: incident.type,
          icon: getMarkerIcon('red')
        });

        const infoWin = new google.maps.InfoWindow({
          content: `<div style="padding:8px;"><strong>${incident.type}</strong><br/>${incident.location}<br/><small>Severity: ${incident.severity || 'N/A'}</small></div>`
        });
        gMarker.addListener('click', () => infoWin.open(map, gMarker));
      }
    } catch (error) {
      Logger.error('Error adding incident marker to map', error.message);
    }

    // Show notification for new incident
    try {
      showToast(`New ${incident.type} Incident`, `${incident.location} - Coordinates: ${incident.lat.toFixed(4)}, ${incident.lng.toFixed(4)}`);
    } catch (error) {
      Logger.debug('Could not show notification', error.message);
    }

    // Update UI
    try {
      renderIncidents();
    } catch (error) {
      Logger.error('Error rendering incidents', error.message);
    }

    // Notification badge update (if badge element exists)
    try {
      const badge = document.querySelector('.notification-badge');
      if (badge) {
        const count = parseInt(badge.textContent) || 0;
        badge.textContent = count + 1;
      }
    } catch (error) {
      Logger.debug('Notification badge not available');
    }

    // Call heatmap update if available
    if (typeof window.updateHeatmap === 'function') {
      try {
        window.updateHeatmap();
      } catch (error) {
        Logger.debug('Heatmap update failed', error.message);
      }
    }

  } catch (error) {
    Logger.error('Critical error adding incident to state', error.message);
  }
}

/**
 * Render incidents list in UI
 */
function renderIncidents() {
  try {
    // Look for incidents container - multiple possible selectors
    const container = document.querySelector('#incidentsList') || 
                      document.querySelector('[data-incidents-list]') ||
                      document.querySelector('.incidents-container');
    
    if (!container) {
      Logger.debug('Incidents list container not found - skipping render');
      return;
    }

    const incidents = state.incidents.slice(0, 5);
    const html = incidents.map(incident => {
      try {
        const time = incident.timestamp 
          ? incident.timestamp.toLocaleTimeString() 
          : new Date(incident.time).toLocaleTimeString();
        
        return `
          <div class="incident-item">
            <div class="incident-type" style="background: #dc2626;">${incident.type}</div>
            <strong>${incident.location}</strong>
            <small>${time} - Severity: ${incident.severity || 'N/A'}</small>
          </div>
        `;
      } catch (error) {
        Logger.warn(`Error rendering incident ${incident.id}`, error.message);
        return '';
      }
    }).join('');

    container.innerHTML = html;
    Logger.debug('Incidents rendered', { count: incidents.length });

  } catch (error) {
    Logger.error('Error rendering incidents list', error.message);
  }
}

// Simple notification using the notification system if available
function showToast(title, message) {
  if (window.notificationSystem) {
    window.notificationSystem.showAlert(title, message, 'High');
  } else {
    // Fallback: just log to console
    console.log(`[${title}] ${message}`);
  }
}

// Initialize when dashboard loads live-tracking page
document.addEventListener('DOMContentLoaded', function() {
  const mapElement = document.getElementById('map');
  // Only initialize Leaflet map if not explicitly disabled by the page
  const disableLeaflet = window.DISABLE_LEAFLET;
  if (mapElement && !map && !disableLeaflet) {
    setTimeout(() => initMap(), 100);
  }
});

// Google Maps + Firebase integration (moved from html/dashboard.html)
(function () {
  // Firebase config (copy of the former inline config)
  const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  };

  // Initialize Firebase if not already initialized
  try {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
  } catch (e) {
    // firebase may not be loaded in some pages; fail silently
    console.warn('Firebase init skipped or failed:', e);
  }

  // Use a separate variable for the Google Map to avoid colliding with Leaflet `map`
  let gmap = null;
  let heatmap = null;

  // Expose initGMap as the callback for Google Maps API
  window.initGMap = function () {
    const el = document.getElementById('map');
    if (!el) return;
    gmap = new google.maps.Map(el, {
      center: { lat: 14.27830, lng: 121.05300 },
      zoom: 17.70,
      disableDoubleClickZoom: true,
      gestureHandling: 'greedy'
    });
      console.log('initGMap: Google Map initialized', gmap);
      // create a heatmap layer (will be populated from state.incidents)
      try {
        heatmap = new google.maps.visualization.HeatmapLayer({
          data: [],
          radius: 40,
          dissipating: true,
          map: gmap
        });
      } catch (e) {
        // visualization library may not be available
        console.warn('Heatmap library not available:', e);
        heatmap = null;
      }
    // Add click listener to open an incident reporting form
    // DISABLED FOR WEB: Only Flutter app can report incidents via map clicks
    // gmap.addListener('click', function (e) {
    //   openIncidentFormAt(e.latLng);
    // });
    // Start the simulation so dashboards show activity even without Firebase
    // Honor persisted preference in localStorage: 'simEnabled' (defaults to true)
    try {
      const pref = (typeof localStorage !== 'undefined') ? localStorage.getItem('simEnabled') : null;
      const shouldStart = (pref === null || pref === 'true');
      if (shouldStart && typeof startSimulation === 'function') {
        // small delay to ensure map and UI are ready
        setTimeout(() => startSimulation(6000), 800);
      }
    } catch (e) {
      // If localStorage is unavailable for any reason, fallback to starting simulation
      if (typeof startSimulation === 'function') setTimeout(() => startSimulation(6000), 800);
    }
    // populate heatmap from any existing incidents
    try { if (typeof window.updateHeatmap === 'function') window.updateHeatmap(); } catch (e) {}
  };

    // allow other modules to refresh heatmap from state.incidents
    window.updateHeatmap = function () {
      if (!heatmap || typeof google === 'undefined') return;
      let points = [];
      if (Array.isArray(state.incidents)) {
        points = state.incidents
          .filter(i => i && typeof i.lat === 'number' && typeof i.lng === 'number')
          .map(i => new google.maps.LatLng(parseFloat(i.lat), parseFloat(i.lng)));
      }
      // If no dynamic incidents exist, include a static fallback heat point
      if (!points || points.length === 0) {
        try {
          points = [ new google.maps.LatLng(14.27835, 121.05366) ];
        } catch (e) {
          points = [];
        }
      }
      try { heatmap.setData(points); } catch (e) { console.warn('updateHeatmap failed', e); }
    };
  // Add a marker for an incident (Google Maps)
  window.addGIncident = function (lat, lng, title, description) {
    if (!gmap) return;
    const marker = new google.maps.Marker({
      position: { lat: parseFloat(lat), lng: parseFloat(lng) },
      map: gmap,
      title: title,
      icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
    });

    const info = new google.maps.InfoWindow({
      content: `\n        <h3>${title}</h3>\n        <p>${description}</p>\n      `
    });

    marker.addListener('click', function () {
      info.open(gmap, marker);
    });
  };

  // Opens an InfoWindow with a small form at the clicked location
  function openIncidentFormAt(latLng) {
    const content = `
      <div style="min-width:240px;">
        <h4 style="margin:0 0 8px 0;">Report Incident</h4>
        <div style="margin-bottom:6px;"><label>Type: <select id="_inc_type"><option>Accident</option><option>Medical</option><option>Crime</option><option>Fire</option><option>Other</option></select></label></div>
        <div style="margin-bottom:6px;"><label>Severity: <select id="_inc_sev"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label></div>
        <div style="text-align:right;"><button id="_inc_cancel">Cancel</button> <button id="_inc_submit">Report</button></div>
      </div>
    `;

    const info = new google.maps.InfoWindow({ content });
    info.setPosition(latLng);
    info.open(gmap);

    // Attach DOM listeners after InfoWindow is added to DOM
    google.maps.event.addListenerOnce(info, 'domready', function () {
      const btnSubmit = document.getElementById('_inc_submit');
      const btnCancel = document.getElementById('_inc_cancel');
      const selType = document.getElementById('_inc_type');
      const selSev = document.getElementById('_inc_sev');

      if (btnCancel) btnCancel.addEventListener('click', () => info.close());

      if (btnSubmit) {
        btnSubmit.addEventListener('click', function () {
          const type = selType ? selType.value : 'Other';
          const severity = selSev ? selSev.value : 'Low';
          const lat = latLng.lat();
          const lng = latLng.lng();

          const incident = {
            id: `INC-${Date.now()}`,
            type: type,
            severity: severity,
            location: `Lat:${lat.toFixed(5)},Lng:${lng.toFixed(5)}`,
            timestamp: new Date(),
            time: new Date(),
            status: 'active',
            lat: lat,
            lng: lng,
            latitude: lat,
            longitude: lng
          };

          try {
            // Push to Firebase (optional) so realtime listeners persist the incident
            if (firebase && firebase.database) {
              firebase.database().ref('incidents').push({
                incident: incident.type,
                severity: incident.severity,
                latitude: incident.latitude,
                longitude: incident.longitude,
                device_id: 'web'
              });
            }
          } catch (e) {
            // ignore if firebase not available
          }

          // Add to local state and show marker on Google Map
          if (typeof addIncidentToState === 'function') {
            addIncidentToState(incident);
          }
          if (typeof window.addGIncident === 'function') {
            window.addGIncident(lat, lng, `${type} (${severity})`, 'Reported manually');
          }

          info.close();
        });
      }
    });
  }

  // Realtime Firebase listener to populate local state and display incidents
  try {
    if (firebase && firebase.database) {
      firebase.database().ref('incidents').on('child_added', function (snapshot) {
        const data = snapshot.val();
        if (!data) return;

        const incidentObj = {
          id: snapshot.key || `INC-${Date.now()}`,
          type: data.incident || data.type || 'Unknown',
          severity: data.severity || 'N/A',
          location: data.location || (`Lat:${data.latitude},Lng:${data.longitude}`),
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
          time: data.time || Date.now(),
          status: data.status || 'active',
          lat: parseFloat(data.latitude || data.lat || data.latitude),
          lng: parseFloat(data.longitude || data.lng || data.longitude)
        };

        // Add to app state (Leaflet) and show on Google Map as well
        if (typeof addIncidentToState === 'function' && incidentObj.lat && incidentObj.lng) {
          addIncidentToState(incidentObj);
        }
        if (typeof window.addGIncident === 'function' && incidentObj.lat && incidentObj.lng) {
          window.addGIncident(incidentObj.lat, incidentObj.lng, `${incidentObj.type} (${incidentObj.severity})`, 'Reported via device');
        }
      });
    }
  } catch (e) {
    // If firebase is not available on this page, skip the realtime integration
  }

  // --- Simulation: ping randomized incidents around the defined center ---
  const SIM_CENTER = { lat: 14.2735, lng: 121.0471 };
  let simIntervalId = null;

  function simulatePingIncident() {
    const radius = 0.006; // ~600m max offset
    const randOffsetLat = (Math.random() - 0.5) * radius;
    const randOffsetLng = (Math.random() - 0.5) * radius;
    const lat = SIM_CENTER.lat + randOffsetLat;
    const lng = SIM_CENTER.lng + randOffsetLng;

    const types = ['Accident', 'Medical', 'Crime', 'Fire', 'Other'];
    const severities = ['Low', 'Medium', 'High', 'Critical'];
    const type = types[Math.floor(Math.random() * types.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];

    const incident = {
      id: `SIM-${Date.now()}`,
      type: type,
      severity: severity,
      location: `Lat:${lat.toFixed(5)},Lng:${lng.toFixed(5)}`,
      timestamp: new Date(),
      time: Date.now(),
      status: 'active',
      lat: lat,
      lng: lng,
      latitude: lat,
      longitude: lng
    };

    try {
      if (firebase && firebase.database) {
        // push to Firebase as the canonical source and let listener add to UI
        firebase.database().ref('incidents').push({
          incident: incident.type,
          severity: incident.severity,
          latitude: incident.latitude,
          longitude: incident.longitude,
          location: incident.location,
          device_id: 'simulator',
          timestamp: Date.now()
        });
        return;
      }
    } catch (e) {
      // fallback to local only
    }

    // If Firebase not available, add locally and to Google Map
    if (typeof addIncidentToState === 'function') addIncidentToState(incident);
    if (typeof window.addGIncident === 'function') window.addGIncident(lat, lng, `${type} (${severity})`, 'Simulated ping');
  }

  function startSimulation(intervalMs = 6000) {
    if (simIntervalId) return;
    simulatePingIncident();
    simIntervalId = setInterval(simulatePingIncident, intervalMs);
  }

  function stopSimulation() {
    if (simIntervalId) {
      clearInterval(simIntervalId);
      simIntervalId = null;
    }
  }

  // Expose helper so UI can check whether simulation is running
  window.isSimulationRunning = function () {
    return !!simIntervalId;
  };

  // Start simulation automatically when Google Maps loads (if desired)
  window.startSimulation = startSimulation;
  window.stopSimulation = stopSimulation;

})();
