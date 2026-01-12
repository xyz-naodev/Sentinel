/**
 * Firebase Web Service Integration
 * Real-time data fetching from Sentinel Firebase database
 */

class FirebaseWebService {
  constructor() {
    this.database = null;
    this.incidents = [];
    this.tanodLocations = [];
    this.activityLogs = [];
    this.initialized = false;
    this.listeners = {};
  }

  /**
   * Initialize Firebase
   */
  async initialize() {
    try {
      // Firebase configuration (matches Flutter app config)
      const firebaseConfig = {
        apiKey: 'AIzaSyCUvrvXXbiCrAChozS0-PdgCbl8fB6qt_g',
        authDomain: 'sentinel-tanod-system.firebaseapp.com',
        databaseURL: 'https://sentinel-tanod-system-default-rtdb.asia-southeast1.firebasedatabase.app',
        projectId: 'sentinel-tanod-system',
        storageBucket: 'sentinel-tanod-system.firebasestorage.app',
        messagingSenderId: '360867768638',
        appId: '1:360867768638:web:5b07c13fec91ae6c7e246f',
      };

      // Initialize Firebase if not already done
      if (!window.firebase) {
        console.error('[Firebase] Firebase SDK not loaded');
        return false;
      }

      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('[Firebase] Firebase initialized successfully');
      }

      this.database = firebase.database();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('[Firebase] Initialization error:', error);
      return false;
    }
  }

  /**
   * Fetch all incidents in real-time using REST API
   */
  onIncidentsChange(callback) {
    if (!this.initialized) {
      console.error('[Firebase] Service not initialized');
      return;
    }

    try {
      console.log('[Firebase] Setting up incidents listener using REST API...');
      
      const fetchIncidents = () => {
        const dbURL = 'https://sentinel-tanod-system-default-rtdb.asia-southeast1.firebasedatabase.app/incidents.json';
        
        fetch(dbURL)
          .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
          })
          .then(data => {
            if (data && typeof data === 'object') {
              this.incidents = [];
              Object.keys(data).forEach((key) => {
                this.incidents.push({
                  id: key,
                  ...data[key],
                });
              });
              // Normalize and sort incidents by timestamp (newest first)
              const parseTime = (val) => {
                if (!val && val !== 0) return 0;
                // numbers may be seconds or milliseconds
                if (typeof val === 'number') {
                  // if timestamp looks like seconds (10 digits) convert to ms
                  if (val < 1e11) return val * 1000;
                  return val;
                }
                // strings: ISO date or numeric string
                if (typeof val === 'string') {
                  const asNum = Number(val);
                  if (!Number.isNaN(asNum)) {
                    if (asNum < 1e11) return asNum * 1000;
                    return asNum;
                  }
                  const parsed = Date.parse(val);
                  return Number.isNaN(parsed) ? 0 : parsed;
                }
                return 0;
              };

              this.incidents.sort((a, b) => {
                const aTime = parseTime(a.createdAt || a.timestamp || 0);
                const bTime = parseTime(b.createdAt || b.timestamp || 0);
                return bTime - aTime; // newest first
              });

              // Keep recent 200 incidents to avoid huge payloads
              this.incidents = this.incidents.slice(0, 200);

              // Apply date-based incident IDs (INC-YYYYMMDD-NNN)
              if (typeof incidentIDGenerator !== 'undefined') {
                this.incidents = incidentIDGenerator.processIncidents(this.incidents);
                console.log('[Firebase] ✅ Applied date-based IDs to', this.incidents.length, 'incidents');
              }

              console.log('[Firebase] ✅ Incidents via REST (sorted newest-first):', this.incidents.length);
              if (this.incidents.length) {
                console.log('[Firebase] Newest incident id:', this.incidents[0].id, 'time:', (this.incidents[0].createdAt || this.incidents[0].timestamp));
              }
              if (callback) callback(this.incidents);
            } else {
              this.incidents = [];
              if (callback) callback([]);
            }
          })
          .catch(error => {
            console.error('[Firebase] REST fetch error:', error);
          });
      };
      
      // Initial fetch
      fetchIncidents();
      
      // Poll every 2 seconds for updates
      setInterval(fetchIncidents, 2000);
      
    } catch (error) {
      console.error('[Firebase] Error setting up incidents listener:', error);
    }
  }

  /**
   * Fetch all tanod locations in real-time using REST API
   */
  onTanodLocationsChange(callback) {
    if (!this.initialized) {
      console.error('[Firebase] Service not initialized');
      return;
    }

    try {
      console.log('[Firebase] Setting up tanod locations listener...');
      
      const fetchLocations = () => {
        const dbURL = 'https://sentinel-tanod-system-default-rtdb.asia-southeast1.firebasedatabase.app/locations.json';
        
        fetch(dbURL)
          .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
          })
          .then(data => {
            if (data && typeof data === 'object') {
              this.tanodLocations = [];
              Object.keys(data).forEach((userId) => {
                this.tanodLocations.push({
                  userId: userId,
                  ...data[userId],
                });
              });
              console.log('[Firebase] ✅ Tanod locations via REST:', this.tanodLocations.length);
              if (callback) callback(this.tanodLocations);
            } else {
              this.tanodLocations = [];
              if (callback) callback([]);
            }
          })
          .catch(error => {
            console.error('[Firebase] REST fetch error for locations:', error);
          });
      };
      
      // Initial fetch
      fetchLocations();
      
      // Poll every 2 seconds for updates
      setInterval(fetchLocations, 2000);
      
    } catch (error) {
      console.error('[Firebase] Error setting up tanod locations listener:', error);
    }
  }

  /**
   * Fetch activity logs in real-time using REST API
   */
  onActivityLogsChange(callback) {
    if (!this.initialized) {
      console.error('[Firebase] Service not initialized');
      return;
    }

    try {
      console.log('[Firebase] Setting up activity logs listener...');
      
      const fetchActivityLogs = () => {
        const dbURL = 'https://sentinel-tanod-system-default-rtdb.asia-southeast1.firebasedatabase.app/activityLogs.json';
        
        fetch(dbURL)
          .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
          })
          .then(data => {
            if (data && typeof data === 'object') {
              this.activityLogs = [];
              Object.keys(data).forEach((key) => {
                this.activityLogs.push({
                  id: key,
                  ...data[key],
                });
              });
              // Sort by timestamp descending and keep last 50
              this.activityLogs.sort((a, b) => {
                const aTime = a.createdAt || a.timestamp || 0;
                const bTime = b.createdAt || b.timestamp || 0;
                return bTime - aTime;
              });
              this.activityLogs = this.activityLogs.slice(0, 50);
              console.log('[Firebase] ✅ Activity logs via REST:', this.activityLogs.length);
              if (callback) callback(this.activityLogs);
            } else {
              this.activityLogs = [];
              if (callback) callback([]);
            }
          })
          .catch(error => {
            console.error('[Firebase] REST fetch error for activity logs:', error);
          });
      };
      
      // Initial fetch
      fetchActivityLogs();
      
      // Poll every 2 seconds for updates
      setInterval(fetchActivityLogs, 2000);
      
    } catch (error) {
      console.error('[Firebase] Error setting up activity logs listener:', error);
    }
  }

  /**
   * Get incident by ID
   */
  getIncident(incidentId) {
    return this.incidents.find((inc) => inc.id === incidentId);
  }

  /**
   * Fetch a single incident from Firebase (fresh data)
   */
  async fetchIncident(incidentId) {
    if (!this.initialized) {
      console.error('[Firebase] Service not initialized');
      return null;
    }

    try {
      const response = await fetch(
        `https://sentinel-tanod-system-default-rtdb.asia-southeast1.firebasedatabase.app/incidents/${incidentId}.json`
      );

      if (!response.ok) {
        console.error('[Firebase] Error fetching incident:', response.status);
        return null;
      }

      const data = await response.json();
      if (data) {
        const incident = {
          id: incidentId,
          ...data
        };
        console.log('[Firebase] Fetched incident:', incident);
        return incident;
      }
      return null;
    } catch (error) {
      console.error('[Firebase] Error fetching incident:', error);
      return null;
    }
  }

  /**
   * Get tanod location by user ID
   */
  getTanodLocation(userId) {
    return this.tanodLocations.find((loc) => loc.userId === userId);
  }

  /**
   * Get all tanod locations
   */
  getAllTanodLocations() {
    return this.tanodLocations;
  }

  /**
   * Get incidents by type
   */
  getIncidentsByType(type) {
    return this.incidents.filter((inc) => inc.type === type);
  }

  /**
   * Get incidents by status
   */
  getIncidentsByStatus(status) {
    return this.incidents.filter((inc) => inc.status === status);
  }

  /**
   * Stop listening to changes
   */
  stopListening() {
    if (this.database) {
      this.database.ref().off();
      console.log('[Firebase] Stopped listening to database changes');
    }
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(incidentId, newStatus, assignedTo = null) {
    if (!this.initialized) {
      console.error('[Firebase] Service not initialized');
      return false;
    }

    try {
      const updates = {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      if (assignedTo) {
        updates.assignedTo = assignedTo;
      }

      await fetch(
        `https://sentinel-tanod-system-default-rtdb.asia-southeast1.firebasedatabase.app/incidents/${incidentId}.json`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );

      console.log('[Firebase] ✅ Incident status updated:', incidentId, 'to', newStatus);
      return true;
    } catch (error) {
      console.error('[Firebase] Error updating incident status:', error);
      return false;
    }
  }

  /**
   * Update incident with notes and status
   */
  async updateIncident(incidentId, updateData) {
    if (!this.initialized) {
      console.error('[Firebase] Service not initialized');
      return false;
    }

    try {
      const updates = {
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      console.log('[Firebase] Sending update to Firebase:', updates);

      const response = await fetch(
        `https://sentinel-tanod-system-default-rtdb.asia-southeast1.firebasedatabase.app/incidents/${incidentId}.json`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        console.error('[Firebase] Update response not OK:', response.status, response.statusText);
        return false;
      }

      console.log('[Firebase] ✅ Incident updated:', incidentId);
      return true;
    } catch (error) {
      console.error('[Firebase] Error updating incident:', error);
      return false;
    }
  }

  /**
   * Log activity
   */
  async logActivity(activity) {
    if (!this.initialized) {
      console.error('[Firebase] Service not initialized');
      return false;
    }

    try {
      const timestamp = Date.now();
      const logId = `log_${timestamp}`;

      await fetch(
        `https://sentinel-tanod-system-default-rtdb.asia-southeast1.firebasedatabase.app/activityLogs/${logId}.json`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(activity),
        }
      );

      console.log('[Firebase] ✅ Activity logged:', activity);
      return true;
    } catch (error) {
      console.error('[Firebase] Error logging activity:', error);
      return false;
    }
  }

  /**
   * Listen for GPS location updates from Firebase
   */
  onGPSLocationsChange(callback) {
    if (!this.initialized) {
      console.error('[Firebase] Service not initialized');
      return;
    }

    try {
      console.log('[Firebase] Setting up GPS locations listener using REST API...');
      
      const fetchGPSLocations = () => {
        const dbURL = 'https://sentinel-tanod-system-default-rtdb.asia-southeast1.firebasedatabase.app/locations.json';
        
        fetch(dbURL)
          .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
          })
          .then(data => {
            if (data && typeof data === 'object') {
              const gpsLocations = [];
              Object.keys(data).forEach((key) => {
                gpsLocations.push({
                  id: key,
                  ...data[key],
                });
              });
              
              // Sort by timestamp (newest first)
              gpsLocations.sort((a, b) => {
                const aTime = a.timestamp || 0;
                const bTime = b.timestamp || 0;
                return bTime - aTime;
              });
              
              callback(gpsLocations);
            }
          })
          .catch(error => {
            console.error('[Firebase] Error fetching GPS locations:', error);
          });
      };

      // Fetch immediately
      fetchGPSLocations();

      // Set up polling every 2 seconds
      setInterval(fetchGPSLocations, 2000);
    } catch (error) {
      console.error('[Firebase] GPS locations listener error:', error);
    }
  }
}

// Global instance
const firebaseService = new FirebaseWebService();

// Auto-initialize when DOM is ready and Firebase SDK is loaded
function initializeFirebaseService() {
  // Check if firebase is loaded
  if (typeof firebase === 'undefined') {
    console.warn('[Firebase] Firebase SDK not loaded yet, retrying in 500ms...');
    setTimeout(initializeFirebaseService, 500);
    return;
  }
  
  // Check if database is available
  if (typeof firebase.database === 'undefined') {
    console.warn('[Firebase] Firebase database module not loaded yet, retrying in 500ms...');
    setTimeout(initializeFirebaseService, 500);
    return;
  }
  
  console.log('[Firebase] Firebase SDK ready, initializing service...');
  firebaseService.initialize().then((success) => {
    if (success) {
      console.log('[Firebase] Service initialization complete, ready for listeners');
    } else {
      console.error('[Firebase] Service initialization failed');
    }
  }).catch((error) => {
    console.error('[Firebase] Error during service initialization:', error);
  });
}

// Try to initialize immediately if document is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFirebaseService);
} else {
  // DOM is already loaded, initialize after a short delay to ensure Firebase SDK is ready
  setTimeout(initializeFirebaseService, 100);
}
