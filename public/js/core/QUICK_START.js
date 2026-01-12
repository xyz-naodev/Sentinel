/**
 * QUICK START TEMPLATE
 * 
 * Add this code to your dashboard.html to enable Sentinel Core
 * NO CHANGES TO EXISTING HTML/CSS NEEDED
 * 
 * Just copy the script section below and add it to your <head> or before </body>
 */

// ============================================================================
// COPY EVERYTHING BELOW AND ADD TO YOUR dashboard.html
// ============================================================================

// In <head> or before </body>:

/*
<!-- ===== LEAFLET MAP LIBRARY ===== -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.awesome-markers@2.0.2/dist/leaflet.awesome-markers.js"></script>
<link rel="stylesheet" href="https://unpkg.com/leaflet.awesome-markers@2.0.2/dist/leaflet.awesome-markers.css" />

<!-- ===== SENTINEL CORE MODULES ===== -->
<script src="../js/core/app-state.js"></script>
<script src="../js/core/map-manager.js"></script>
<script src="../js/core/incident-manager.js"></script>
<script src="../js/core/unit-tracker.js"></script>
<script src="../js/core/ui-utils.js"></script>
<script src="../js/core/init.js"></script>

<!-- ===== INITIALIZATION ===== -->
<script>
document.addEventListener('DOMContentLoaded', function() {
  // Initialize entire Sentinel system
  SentinelCore.init({
    mapContainer: 'map',                    // Your map div ID
    enableMapTracking: true,                // Enable unit tracking
    enableIncidentSimulation: true,         // Enable incident generation
    autoInitMap: true                       // Auto-initialize map
  });

  console.log('Sentinel Core initialized!');
  console.log('System status:', SentinelCore.getStatus());
  
  // Your map is now live with:
  // - Real-time map display
  // - Tanod markers (blue/lightblue/gray based on status)
  // - Incident markers (red)
  // - Patrol trails
  // - Click-to-report functionality
  // - Auto-simulated unit movement
  // - Auto-generated incidents
});
</script>

<!-- (Optional) Toast Container for Notifications -->
<div id="toastContainer" style="position: fixed; top: 20px; right: 20px; z-index: 9999;"></div>
*/

// ============================================================================
// THAT'S IT! YOUR MAP IS NOW LIVE WITH CORE FUNCTIONALITY
// ============================================================================

// ============================================================================
// OPTIONAL: POPULATING OTHER ELEMENTS
// ============================================================================

/*
After the initialization script above, add this to populate other elements:

<script>
document.addEventListener('DOMContentLoaded', function() {
  // Wait for Sentinel to initialize
  setTimeout(function() {
    // Populate units list (if you have <div id="unitsList"></div>)
    if (document.getElementById('unitsList')) {
      const units = UnitTracker.getAllUnits();
      UIUtils.renderUnitList(units, 'unitsList');
      
      // Keep it updated
      setInterval(function() {
        UIUtils.renderUnitList(UnitTracker.getAllUnits(), 'unitsList');
      }, 5000);
    }
    
    // Populate incidents list (if you have <div id="incidentsList"></div>)
    if (document.getElementById('incidentsList')) {
      const incidents = IncidentManager.getRecent(5);
      UIUtils.renderIncidentList(incidents, 'incidentsList');
      
      // Keep it updated
      setInterval(function() {
        UIUtils.renderIncidentList(IncidentManager.getRecent(5), 'incidentsList');
      }, 3000);
    }
    
    // Update notification badge (if you have <span id="notificationBadge"></span>)
    if (document.getElementById('notificationBadge')) {
      setInterval(function() {
        const activeCount = IncidentManager.getStats().active;
        UIUtils.updateNotificationBadge(activeCount, 'notificationBadge');
      }, 2000);
    }
    
  }, 500);
});
</script>
*/

// ============================================================================
// REFERENCE: MINIMUM REQUIRED HTML ELEMENTS
// ============================================================================

/*
Your HTML needs at minimum:

<!DOCTYPE html>
<html>
<head>
  <title>Sentinel Dashboard</title>
  <link rel="stylesheet" href="../css/dashboard.css">
  
  <!-- ADD THESE LINKS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.awesome-markers@2.0.2/dist/leaflet.awesome-markers.css" />
</head>
<body>
  <!-- YOUR EXISTING SIDEBAR AND HEADER -->
  <div class="sidebar">
    <!-- Your existing sidebar content -->
  </div>
  
  <div class="main">
    <!-- YOUR EXISTING TOP BAR -->
    <div class="topbar">
      <!-- Your existing topbar content -->
    </div>
    
    <!-- YOUR CONTENT AREA -->
    <div class="content">
      <!-- THE IMPORTANT PART: Map container -->
      <div id="map"></div>
      
      <!-- Optional: Other containers -->
      <div id="unitsList"></div>
      <div id="incidentsList"></div>
    </div>
  </div>
  
  <!-- ADD THESE SCRIPTS -->
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.awesome-markers@2.0.2/dist/leaflet.awesome-markers.js"></script>
  
  <script src="../js/core/app-state.js"></script>
  <script src="../js/core/map-manager.js"></script>
  <script src="../js/core/incident-manager.js"></script>
  <script src="../js/core/unit-tracker.js"></script>
  <script src="../js/core/ui-utils.js"></script>
  <script src="../js/core/init.js"></script>
  
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      SentinelCore.init({
        mapContainer: 'map',
        enableMapTracking: true,
        enableIncidentSimulation: true,
        autoInitMap: true
      });
    });
  </script>
  
  <!-- Toast container (optional) -->
  <div id="toastContainer" style="position: fixed; top: 20px; right: 20px; z-index: 9999;"></div>
</body>
</html>
*/

// ============================================================================
// REFERENCE: WHAT HAPPENS WHEN YOU INITIALIZE
// ============================================================================

/*
When SentinelCore.init() is called, it automatically:

1. ✓ Initializes SentinelState with default incidents
2. ✓ Initializes UnitTracker with 3 default units (T01, T02, T03)
3. ✓ Initializes MapManager with Leaflet
4. ✓ Renders tanod markers on the map
5. ✓ Renders incident markers on the map
6. ✓ Sets up click-to-report functionality on the map
7. ✓ Starts UnitTracker GPS simulation (units move every 5 seconds)
8. ✓ Starts IncidentManager simulation (new incidents every 8 seconds)
9. ✓ Sets up real-time notification system

Result: Your map is fully functional with live data!
*/

// ============================================================================
// REFERENCE: API QUICK ACCESS
// ============================================================================

/*
// Get data
const units = UnitTracker.getAllUnits();
const incidents = IncidentManager.getRecent(5);
const stats = IncidentManager.getStats();

// Create incident
IncidentManager.createIncident({
  type: 'Accident',
  location: 'Main St',
  lat: 14.342,
  lng: 121.116
});

// Update unit
UnitTracker.updatePosition('T01', 14.343, 121.117);
UnitTracker.updateStatus('T01', 'patrolling');

// Show notification
UIUtils.showSuccess('Success', 'Incident resolved');

// Render content
UIUtils.renderUnitList(units, 'unitsList');
UIUtils.renderIncidentList(incidents, 'incidentsList');

// Stop simulations
UnitTracker.stopTracking();
IncidentManager.stopSimulation();

// Get system status
console.log(SentinelCore.getStatus());
*/

// ============================================================================
// NOW GO TO YOUR dashboard.html AND ADD THE SCRIPTS!
// ============================================================================
