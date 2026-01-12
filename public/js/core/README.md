# Sentinel Core Modules - Integration Guide

## Overview

Six modular, reusable JavaScript modules have been created to provide all core Sentinel functionality without modifying your existing HTML and CSS files.

## 📁 File Structure

```
js/core/
├── app-state.js           # Global state management
├── map-manager.js         # Leaflet map operations
├── incident-manager.js    # Incident creation and handling
├── unit-tracker.js        # Tanod/Unit tracking
├── ui-utils.js           # UI rendering utilities
├── init.js               # System initialization
├── INTEGRATION_GUIDE.js  # Detailed usage examples
└── API_REFERENCE.js      # Quick API reference
```

## 📋 Script Loading Order

Add to your `dashboard.html` in this exact order:

```html
<!-- External Libraries (required) -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.awesome-markers@2.0.2/dist/leaflet.awesome-markers.js"></script>

<!-- Sentinel Core Modules (required order) -->
<script src="../js/core/app-state.js"></script>
<script src="../js/core/map-manager.js"></script>
<script src="../js/core/incident-manager.js"></script>
<script src="../js/core/unit-tracker.js"></script>
<script src="../js/core/ui-utils.js"></script>
<script src="../js/core/init.js"></script>

<!-- Your Custom Scripts -->
<script src="../js/your-custom-script.js"></script>
```

## 🚀 Quick Start

### Option 1: Automatic Initialization

```html
<body data-sentinel-auto-init="true">
  <div id="map"></div>
  <!-- Your content -->
</body>
```

### Option 2: Manual Initialization

```javascript
document.addEventListener('DOMContentLoaded', function() {
  SentinelCore.init({
    mapContainer: 'map',
    enableMapTracking: true,
    enableIncidentSimulation: true,
    autoInitMap: true
  });
});
```

### Option 3: Step-by-Step

```javascript
document.addEventListener('DOMContentLoaded', function() {
  // Initialize units
  UnitTracker.initialize();
  
  // Initialize map
  MapManager.init('map');
  MapManager.renderTanodMarkers();
  MapManager.renderIncidentMarkers();
  
  // Start tracking
  UnitTracker.startTracking(5000);
  IncidentManager.startSimulation(8000);
});
```

## 📚 Core Modules

### 1. **app-state.js** - Global State Management

```javascript
// Add incident
SentinelState.addIncident({
  type: 'Accident',
  location: 'Main St',
  lat: 14.342,
  lng: 121.116
});

// Get active incidents
const active = SentinelState.getActiveIncidents();

// Update incident status
SentinelState.updateIncidentStatus('INC-001', 'resolved');

// Update unit position
SentinelState.updateTanodPosition('T01', 14.343, 121.117);
```

### 2. **map-manager.js** - Map Operations

```javascript
// Initialize map
MapManager.init('map', {
  center: [14.342, 121.116],
  zoom: 15
});

// Render markers
MapManager.renderTanodMarkers();
MapManager.renderIncidentMarkers();

// Center map
MapManager.centerOnTanods();

// Check status
if (MapManager.isInitialized()) {
  // Map is ready
}
```

### 3. **incident-manager.js** - Incident Management

```javascript
// Create incident
const incident = IncidentManager.createIncident({
  type: 'Crime',
  location: 'Park',
  lat: 14.345,
  lng: 121.115
});

// Get incidents by type
const crimes = IncidentManager.getIncidentsByType('Crime');

// Get statistics
const stats = IncidentManager.getStats();
// { total, active, resolved, typeDistribution }

// Start random incident simulation
IncidentManager.startSimulation(8000);
```

### 4. **unit-tracker.js** - Unit Tracking

```javascript
// Initialize units
UnitTracker.initialize();

// Get all units
const units = UnitTracker.getAllUnits();

// Update position
UnitTracker.updatePosition('T01', 14.343, 121.117);

// Update status
UnitTracker.updateStatus('T01', 'patrolling');

// Get statistics
const stats = UnitTracker.getStats();
// { total, onDuty, patrolling, idle }

// Start GPS simulation
UnitTracker.startTracking(5000);
```

### 5. **ui-utils.js** - UI Rendering

```javascript
// Show notifications
UIUtils.showToast('Alert', 'New incident reported', 'info');
UIUtils.showSuccess('Success', 'Incident resolved');
UIUtils.showError('Error', 'Failed to update');

// Render lists
UIUtils.renderUnitList(units, 'unitsList');
UIUtils.renderIncidentList(incidents, 'incidentsList', 5);

// Update badge
UIUtils.updateNotificationBadge(3, 'notificationBadge');

// Render stats
UIUtils.renderDashboardStats({
  total: 10,
  active: 3,
  resolved: 7,
  activeUnits: 2
}, 'statsContainer');
```

### 6. **init.js** - Core Initialization

```javascript
// Get system status
const status = SentinelCore.getStatus();
// { initialized, mapInitialized, trackingInitialized, ... }

// Cleanup
SentinelCore.destroy();
```

## 🎯 Common Workflows

### Complete Dashboard Setup

```javascript
document.addEventListener('DOMContentLoaded', function() {
  // Initialize everything
  SentinelCore.init({
    mapContainer: 'map',
    enableMapTracking: true,
    enableIncidentSimulation: true,
    autoInitMap: true
  });

  // Get data
  const units = UnitTracker.getAllUnits();
  const incidents = IncidentManager.getRecent(5);
  const stats = IncidentManager.getStats();

  // Populate your existing HTML elements
  UIUtils.renderUnitList(units, 'unitsList');
  UIUtils.renderIncidentList(incidents, 'incidentsList');
  UIUtils.updateNotificationBadge(stats.active, 'notificationBadge');
});
```

### Custom Incident Creation

```javascript
function reportIncident(type, location, lat, lng) {
  const incident = IncidentManager.createIncident({
    type,
    location,
    lat,
    lng,
    status: 'active'
  });
  
  // Add to map if initialized
  if (MapManager.isInitialized()) {
    MapManager.addIncidentMarker(incident);
  }
  
  // Show notification
  UIUtils.showSuccess('Incident Reported', `${type} at ${location}`);
  
  return incident;
}
```

### Get Nearest Units to Incident

```javascript
function getNearestUnitsToIncident(incidentId, radiusKm = 1) {
  const incident = SentinelState.incidents.find(i => i.id === incidentId);
  if (!incident) return [];
  
  return UnitTracker.getUnitsInArea(
    incident.lat, 
    incident.lng, 
    radiusKm
  );
}
```

## ✨ Key Features

- **No HTML/CSS modifications needed** - Everything works with your existing markup
- **Modular design** - Use only what you need
- **Easy integration** - Just include scripts and call functions
- **Automatic state management** - All data synchronized
- **Real-time updates** - Automatic map and UI updates
- **GPS simulation** - Built-in unit tracking simulation
- **Incident simulation** - Auto-generate test incidents
- **Leaflet integration** - Uses proven mapping library

## 🔌 Integration with Existing Elements

Your existing HTML elements work automatically:

```html
<!-- Your existing map -->
<div id="map"></div>

<!-- Add these empty divs (will be populated) -->
<div id="unitsList"></div>
<div id="incidentsList"></div>
<span id="notificationBadge">0</span>
```

All content is rendered into these elements - your CSS automatically applies!

## 📝 No Changes to Your Files

Your original files remain untouched:
- `dashboard.html` - No changes needed
- `dashboard.css` - No changes needed  
- `login.html` - No changes needed
- `style.css` - No changes needed

Just add the script tags and initialize!

## 🔍 Available Modules Summary

| Module | Purpose | Key Functions |
|--------|---------|---|
| **app-state.js** | State management | addIncident, updateTanodPosition, getActiveIncidents |
| **map-manager.js** | Map operations | init, renderMarkers, centerMap |
| **incident-manager.js** | Incident handling | createIncident, getStats, startSimulation |
| **unit-tracker.js** | Unit tracking | initialize, updatePosition, startTracking |
| **ui-utils.js** | UI rendering | showToast, renderLists, updateBadge |
| **init.js** | Core initialization | SentinelCore.init, destroy |

## 📞 Support

For detailed examples, see `INTEGRATION_GUIDE.js`
For quick API reference, see `API_REFERENCE.js`
