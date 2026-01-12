/**
 * QUICK START - Sentinel Core API Reference
 */

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

SentinelState
  .addIncident(incidentData)              // Add new incident
  .getActiveIncidents()                   // Get all active incidents
  .updateIncidentStatus(id, status)       // Update incident status
  .initializeTanods(tanodsData)          // Initialize units
  .updateTanodPosition(id, lat, lng)     // Update unit position
  .updateTanodStatus(id, status)         // Update unit status
  .getTanods()                            // Get all units
  .getTanodById(id)                       // Get specific unit
  .updateNotificationCount()              // Update notification count

// ============================================================================
// MAP MANAGEMENT
// ============================================================================

MapManager
  .init(containerId, options)             // Initialize map
  .renderTanodMarkers(tanods)            // Render unit markers
  .renderIncidentMarkers(incidents)      // Render incident markers
  .addIncidentMarker(incident)           // Add single incident
  .drawPatrolTrail(tanodId)              // Draw patrol route
  .centerMap(lat, lng, zoom)             // Center on coordinates
  .centerOnTanods(tanods)                // Center on all units
  .destroy()                              // Clean up map
  .isInitialized()                        // Check if ready

// ============================================================================
// INCIDENT MANAGEMENT
// ============================================================================

IncidentManager
  .createIncident(data)                   // Create new incident
  .getIncidentsByType(type)              // Filter by type
  .getIncidentsInArea(lat, lng, radius)  // Get nearby incidents
  .getIncidentsByStatus(status)          // Filter by status
  .updateStatus(id, status)              // Update incident status
  .getRecent(count)                      // Get recent incidents
  .getStats()                            // Get statistics
  .startSimulation(interval, bounds)     // Start random incidents
  .stopSimulation()                      // Stop simulation
  .isSimulating()                        // Check if simulating

// ============================================================================
// UNIT TRACKING
// ============================================================================

UnitTracker
  .initialize(options)                   // Init units
  .getAllUnits()                         // Get all units
  .getUnit(id)                           // Get specific unit
  .updatePosition(id, lat, lng)          // Update position
  .updateStatus(id, status)              // Update status
  .getStatus(id)                         // Get unit status
  .getPosition(id)                       // Get unit position
  .getUnitsByStatus(status)              // Filter by status
  .getUnitsInArea(lat, lng, radius)      // Get nearby units
  .startTracking(interval)               // Start GPS simulation
  .stopTracking()                        // Stop tracking
  .isTracking()                          // Check if tracking
  .getStats()                            // Get statistics
  .getDistanceBetweenUnits(id1, id2)     // Calculate distance

// ============================================================================
// UI UTILITIES
// ============================================================================

UIUtils
  .showToast(title, message, type)       // Show notification
  .showSuccess(title, msg)               // Show success
  .showError(title, msg)                 // Show error
  .showWarning(title, msg)               // Show warning
  .updateNotificationBadge(count, id)    // Update badge
  .renderUnitList(units, id)             // Render units
  .renderIncidentList(incidents, id)     // Render incidents
  .renderDashboardStats(stats, id)       // Render stats
  .getStatusColor(status)                // Get color code
  .formatTime(date)                      // Format time
  .formatDate(date)                      // Format date

// ============================================================================
// CORE INITIALIZATION
// ============================================================================

SentinelCore
  .init(options)                         // Initialize system
  .getStatus()                           // Get system status
  .destroy()                             // Cleanup

// ============================================================================
// COMMON WORKFLOWS
// ============================================================================

// Setup Complete Dashboard
SentinelCore.init({
  mapContainer: 'map',
  enableMapTracking: true,
  enableIncidentSimulation: true,
  autoInitMap: true
});

// Get all data
const units = UnitTracker.getAllUnits();
const incidents = IncidentManager.getRecent(5);
const stats = IncidentManager.getStats();

// Populate your HTML (no changes needed!)
UIUtils.renderUnitList(units, 'unitsList');
UIUtils.renderIncidentList(incidents, 'incidentsList');
UIUtils.renderDashboardStats(stats, 'statsContainer');

// ============================================================================
// REQUIRED HTML ELEMENTS (can be empty, will be populated)
// ============================================================================

<div id="map"></div>                    <!-- Map container -->
<div id="unitsList"></div>              <!-- Units will render here -->
<div id="incidentsList"></div>          <!-- Incidents will render here -->
<span id="notificationBadge">0</span>   <!-- Badge will update here -->
<div id="statsContainer"></div>         <!-- Stats will render here -->

// ============================================================================
// SCRIPT LOAD ORDER (required)
// ============================================================================

// 1. Leaflet and plugins
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.awesome-markers@2.0.2/dist/leaflet.awesome-markers.js"></script>

// 2. Sentinel Core (in order!)
<script src="../js/core/app-state.js"></script>
<script src="../js/core/map-manager.js"></script>
<script src="../js/core/incident-manager.js"></script>
<script src="../js/core/unit-tracker.js"></script>
<script src="../js/core/ui-utils.js"></script>
<script src="../js/core/init.js"></script>
