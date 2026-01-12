/**
 * Dashboard Firebase Integration
 * Displays real incidents and tanod locations from Firebase
 */

class DashboardFirebaseIntegration {
  constructor() {
    this.incidents = [];
    this.tanodLocations = [];
    this.gpsLocations = [];
    this.activityLogs = [];
    this.markers = {
      incidents: [],
      tanods: []
    };
    this.gpsMarker = null;
    this.markerClusterer = null;
    
    // Data change detection
    this.lastTanodLocationsHash = null;
    this.lastGpsLocationsHash = null;
    this.lastIncidentsHash = null;
    
    // Filter state
    this.filters = {
      severity: '',
      status: '',
      type: '',
      dateFrom: '',
      dateTo: ''
    };
  }

  /**
   * Initialize Firebase data listeners
   */
  async init() {
    try {
      console.log('[Dashboard] init() method called');
      console.log('[Dashboard] Initializing Firebase integration...');

      // Wait for Firebase service to initialize
      let retries = 0;
      while (!firebaseService.initialized && retries < 30) {
        console.log('[Dashboard] Waiting for Firebase... (' + retries + '/30)');
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
      }

      if (!firebaseService.initialized) {
        console.error('[Dashboard] Firebase service failed to initialize after 15 seconds');
        return;
      }

      console.log('[Dashboard] Firebase service initialized, setting up listeners');
      console.log('[Dashboard] Current incidents in Firebase:', firebaseService.incidents);
      
      // Initialize search service with incidents if they're already loaded
      if (firebaseService.incidents && firebaseService.incidents.length > 0) {
        try {
          if (typeof searchService !== 'undefined' && searchService && typeof searchService.setIncidents === 'function') {
            searchService.setIncidents(firebaseService.incidents);
            console.log('[Dashboard] ✅ Initialized searchService with', firebaseService.incidents.length, 'incidents');
          }
        } catch (error) {
          console.error('[Dashboard] Error initializing searchService:', error);
        }
      }

      // Listen for incident changes
      console.log('[Dashboard] Setting up onIncidentsChange listener');
      console.log('[Dashboard] firebaseService object:', firebaseService);
      console.log('[Dashboard] firebaseService.onIncidentsChange type:', typeof firebaseService.onIncidentsChange);
      
      firebaseService.onIncidentsChange((incidents) => {
        console.log('[Dashboard] ✅ CALLBACK FIRED - Incident listener fired with count:', incidents.length, 'Incidents:', incidents);
        this.incidents = incidents;
        
        // Check for new incidents and update notification badge
        if (typeof window.notificationManager !== 'undefined' && window.notificationManager) {
          window.notificationManager.checkForNewIncidents(incidents);
        }

        // Push only NEW incidents to shared notification service
        if (typeof sharedNotificationService !== 'undefined' && sharedNotificationService) {
          const existingNotifications = sharedNotificationService.getNotifications();
          const existingIds = new Set(existingNotifications.map(n => n.id));
          
          incidents.forEach(incident => {
            // Only add if it's a new incident not already in notifications
            if (!existingIds.has(incident.id)) {
              console.log('[Dashboard] Adding new incident to notifications:', incident.id, incident.type);
              sharedNotificationService.addNotification(incident);
            }
          });
        }
        
        this.updateIncidentDisplay();
        this.updateLatestIncidentDisplay();
        this.updateAnalyticsDisplay();
        
        // Update search service with latest incidents - with safety check
        try {
          if (typeof searchService !== 'undefined' && searchService && typeof searchService.setIncidents === 'function') {
            searchService.setIncidents(incidents);
            console.log('[Dashboard] ✅ Updated searchService with', incidents.length, 'incidents');
          } else {
            console.warn('[Dashboard] searchService not available yet for update');
          }
        } catch (error) {
          console.error('[Dashboard] Error updating searchService:', error);
        }

        // Check if we need to open an incident from incident reports page
        const openIncidentId = sessionStorage.getItem('openIncidentId');
        if (openIncidentId) {
          console.log('[Dashboard] Opening incident from session:', openIncidentId);
          sessionStorage.removeItem('openIncidentId');
          const incidentToOpen = incidents.find(i => i.id === openIncidentId);
          if (incidentToOpen && typeof incidentModalManager !== 'undefined' && incidentModalManager) {
            console.log('[Dashboard] Opening modal for incident:', openIncidentId);
            setTimeout(() => {
              incidentModalManager.openIncident(incidentToOpen);
            }, 300);
          }
        }
      });
      
      console.log('[Dashboard] After onIncidentsChange call - now waiting for callback...');

      // Listen for tanod location changes
      console.log('[Dashboard] Setting up onTanodLocationsChange listener');
      firebaseService.onTanodLocationsChange((locations) => {
        console.log('[Dashboard] Tanod listener fired with count:', locations.length);
        this.tanodLocations = locations;
        this.updateTanodDisplay();
      });

      // Listen for GPS location changes
      console.log('[Dashboard] Setting up onGPSLocationsChange listener');
      firebaseService.onGPSLocationsChange((locations) => {
        console.log('[Dashboard] GPS listener fired with count:', locations.length);
        this.gpsLocations = locations;
        this.updateGPSDisplay();
      });

      // Listen for activity log changes
      console.log('[Dashboard] Setting up onActivityLogsChange listener');
      firebaseService.onActivityLogsChange((logs) => {
        console.log('[Dashboard] Activity log listener fired');
        this.activityLogs = logs;
        this.updateActivityDisplay();
      });

      // Set up filter listeners
      this.setupFilterListeners();

      console.log('[Dashboard] Firebase listeners configured');
      
      // Load initial data if already available
      if (firebaseService.incidents && firebaseService.incidents.length > 0) {
        console.log('[Dashboard] Loading initial incidents data:', firebaseService.incidents.length);
        this.incidents = firebaseService.incidents;
        this.updateIncidentDisplay();
        this.updateLatestIncidentDisplay();
        this.updateAnalyticsDisplay();
      }
      
      if (firebaseService.tanodLocations && firebaseService.tanodLocations.length > 0) {
        console.log('[Dashboard] Loading initial tanod locations:', firebaseService.tanodLocations.length);
        this.tanodLocations = firebaseService.tanodLocations;
        this.updateTanodDisplay();
      }
    } catch (error) {
      console.error('[Dashboard] Firebase integration error:', error);
    }
  }

  /**
   * Setup filter control listeners
   */
  setupFilterListeners() {
    const filterDateFrom = document.getElementById('filterDateFrom');
    const filterDateTo = document.getElementById('filterDateTo');
    const filterSeverity = document.getElementById('filterSeverity');
    const filterStatus = document.getElementById('filterStatus');
    const filterType = document.getElementById('filterType');

    if (filterDateFrom) {
      filterDateFrom.addEventListener('change', (e) => {
        this.filters.dateFrom = e.target.value;
        this.updateIncidentDisplay();
      });
    }

    if (filterDateTo) {
      filterDateTo.addEventListener('change', (e) => {
        this.filters.dateTo = e.target.value;
        this.updateIncidentDisplay();
      });
    }

    if (filterSeverity) {
      filterSeverity.addEventListener('change', (e) => {
        this.filters.severity = e.target.value;
        this.updateIncidentDisplay();
      });
    }

    if (filterStatus) {
      filterStatus.addEventListener('change', (e) => {
        this.filters.status = e.target.value;
        this.updateIncidentDisplay();
      });
    }

    if (filterType) {
      filterType.addEventListener('change', (e) => {
        this.filters.type = e.target.value;
        this.updateIncidentDisplay();
      });
    }

    console.log('[Dashboard] Filter listeners configured');
  }

  /**
   * Get filtered incidents based on current filter state
   */
  getFilteredIncidents() {
    return this.incidents.filter((incident) => {
      // Date range filtering
      if (this.filters.dateFrom || this.filters.dateTo) {
        const incidentDate = new Date(incident.timestamp || incident.createdAt || 0);
        
        if (this.filters.dateFrom) {
          const fromDate = new Date(this.filters.dateFrom);
          // Set to start of day (00:00:00)
          fromDate.setHours(0, 0, 0, 0);
          if (incidentDate < fromDate) return false;
        }
        
        if (this.filters.dateTo) {
          const toDate = new Date(this.filters.dateTo);
          // Set to end of day (23:59:59)
          toDate.setHours(23, 59, 59, 999);
          if (incidentDate > toDate) return false;
        }
      }
      
      if (this.filters.severity && incident.severity !== this.filters.severity) return false;
      if (this.filters.status && incident.status !== this.filters.status) return false;
      if (this.filters.type && incident.type !== this.filters.type) return false;
      return true;
    });
  }

  /**
   * Update incident markers on map
   */
  updateIncidentDisplay() {
    try {
      console.log('[Dashboard] updateIncidentDisplay() called, current incidents:', this.incidents.length);
      
      // Get filtered incidents
      const displayIncidents = this.getFilteredIncidents();
      console.log('[Dashboard] Displaying', displayIncidents.length, 'filtered incidents');
      
      if (!window.map) {
        console.warn('[Dashboard] Map not initialized yet');
        return;
      }

      // Check for new incidents (not already on map)
      const existingIncidentIds = new Set(this.markers.incidents.map(m => m.incidentId || m.incident?.id));
      const newIncidents = displayIncidents.filter(i => !existingIncidentIds.has(i.id));
      const removedIncidents = Array.from(existingIncidentIds).filter(id => !displayIncidents.find(i => i.id === id));
      
      console.log('[Dashboard] New incidents to add:', newIncidents.length, 'Removed:', removedIncidents.length);
      
      // Remove markers that are no longer in filtered results
      if (removedIncidents.length > 0) {
        this.markers.incidents = this.markers.incidents.filter(marker => {
          const incidentId = marker.incidentId || marker.incident?.id;
          if (removedIncidents.includes(incidentId)) {
            marker.setMap(null);
            return false;
          }
          return true;
        });
        console.log('[Dashboard] Removed', removedIncidents.length, 'markers - remaining:', this.markers.incidents.length);
      }
      
      // Add new incident markers
      let addedCount = 0;
      newIncidents.forEach((incident) => {
        try {
          const lat = parseFloat(incident.latitude);
          const lng = parseFloat(incident.longitude);

          if (isNaN(lat) || isNaN(lng)) {
            console.warn('[Dashboard] Invalid coordinates for incident:', incident.id);
            return;
          }

          // Determine marker color based on severity
          let markerColor = '#FF0000'; // Default red
          if (incident.severity === 'CRITICAL') markerColor = '#FF0000';
          else if (incident.severity === 'HIGH') markerColor = '#FF9800';
          else if (incident.severity === 'MEDIUM') markerColor = '#FFC107';
          else if (incident.severity === 'LOW') markerColor = '#4CAF50';

          // Create marker without map (will be added to clusterer)
          const marker = new google.maps.Marker({
            position: { lat, lng },
            map: null,  // Don't add to map yet, will use clusterer
            title: `${incident.type} - ${incident.severity}`,
            icon: this.createMarkerIcon(markerColor),
          });
          
          // Store incident ID and data on marker for later lookup
          marker.incidentId = incident.id;
          marker.incident = incident;
          
          addedCount++;
          console.log('[Dashboard] Added marker for incident:', incident.id, 'at', lat, lng);

          // Add click listener to open modal
          marker.addListener('click', () => {
            if (typeof incidentModalManager !== 'undefined' && incidentModalManager) {
              console.log('[Dashboard] Opening modal for incident:', incident.id);
              incidentModalManager.openIncident(incident);
            }
          });

          this.markers.incidents.push(marker);
        } catch (error) {
          console.error('[Dashboard] Error creating incident marker:', error);
        }
      });

      console.log('[Dashboard] ✅ Updated incident markers - added:', addedCount, 'total on map:', this.markers.incidents.length);
      
      // Update marker clusterer with all current markers
      if (this.markers.incidents.length > 0) {
        try {
          if (!this.markerClusterer) {
            console.log('[Dashboard] Creating new MarkerClusterer with', this.markers.incidents.length, 'markers');
            this.markerClusterer = new markerClusterer.MarkerClusterer({
              map: window.map,
              markers: this.markers.incidents,
              algorithm: new markerClusterer.GridAlgorithm({ gridSize: 40 })
            });
            console.log('[Dashboard] ✅ MarkerClusterer initialized with', this.markers.incidents.length, 'markers');
          } else {
            // If we added new markers, update the clusterer
            if (addedCount > 0 || removedIncidents.length > 0) {
              console.log('[Dashboard] Updating MarkerClusterer - clearing and re-adding', this.markers.incidents.length, 'markers');
              this.markerClusterer.clearMarkers();
              this.markerClusterer.addMarkers(this.markers.incidents);
              console.log('[Dashboard] ✅ MarkerClusterer updated with', this.markers.incidents.length, 'markers');
            }
          }
        } catch (error) {
          console.error('[Dashboard] Error updating MarkerClusterer:', error);
          console.log('[Dashboard] Falling back to direct marker display');
          // Fallback: show markers directly without clustering
          this.markers.incidents.forEach(marker => {
            marker.setMap(window.map);
          });
        }
      } else {
        console.log('[Dashboard] No incidents to display');
        if (this.markerClusterer) {
          this.markerClusterer.clearMarkers();
        }
      }
    } catch (error) {
      console.error('[Dashboard] Error updating incident display:', error);
    }
  }

  /**
   * Update tanod location markers on map
   */
  updateTanodDisplay() {
    try {
      // Check if tanod locations have actually changed
      const locationsHash = JSON.stringify(this.tanodLocations);
      if (this.lastTanodLocationsHash === locationsHash) {
        // Data hasn't changed, skip update
        return;
      }
      this.lastTanodLocationsHash = locationsHash;

      // Clear existing tanod markers
      this.markers.tanods.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
      this.markers.tanods = [];

      if (!window.map) {
        console.warn('[Dashboard] Map not initialized yet');
        return;
      }

      // Add new tanod markers
      this.tanodLocations.forEach((location) => {
        try {
          const lat = parseFloat(location.latitude);
          const lng = parseFloat(location.longitude);

          if (isNaN(lat) || isNaN(lng)) {
            console.warn('[Dashboard] Invalid coordinates for tanod:', location.userId);
            return;
          }

          // Create tanod marker with person icon
          const marker = new google.maps.Marker({
            position: { lat, lng },
            map: window.map,
            title: `Tanod: ${location.userId}`,
            icon: this.getTanodPersonIcon(location.status || 'on-duty'),
          });

          // Add combined info window with Tanod + GPS information
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 12px; font-family: Arial, sans-serif; width: 280px;">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                  <i class="fa-solid fa-user-circle" style="font-size: 24px; color: #2196F3; margin-right: 10px;"></i>
                  <div>
                    <strong style="font-size: 14px;">${location.userId}</strong><br/>
                    <span style="font-size: 12px; color: #999;">Tanod Officer</span>
                  </div>
                </div>
                <div style="border-top: 1px solid #eee; padding-top: 10px;">
                  <p style="margin: 6px 0; font-size: 12px;">
                    <strong>Status:</strong> <span style="color: ${location.status === 'on-duty' ? '#4CAF50' : location.status === 'patrolling' ? '#2196F3' : '#FF9800'}; font-weight: 600;">${location.status || 'on-duty'}</span>
                  </p>
                  <p style="margin: 6px 0; font-size: 12px;">
                    <strong>GPS Location:</strong><br/>
                    <span style="font-family: monospace; font-size: 11px; color: #555;">${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
                  </p>
                  <p style="margin: 6px 0; font-size: 12px;">
                    <strong>Last Update:</strong> <span style="color: #999;">${new Date(location.timestamp).toLocaleTimeString()}</span>
                  </p>
                </div>
              </div>
            `,
          });

          marker.addListener('click', () => {
            infoWindow.open(window.map, marker);
          });

          this.markers.tanods.push(marker);
        } catch (error) {
          console.error('[Dashboard] Error creating tanod marker:', error);
        }
      });

      console.log('[Dashboard] Updated tanod markers:', this.markers.tanods.length);
    } catch (error) {
      console.error('[Dashboard] Error updating tanod display:', error);
    }
  }

  /**
   * Get colored person icon for Tanod based on status
   */
  getTanodPersonIcon(status) {
    const statusColors = {
      'on-duty': '#2196F3',      // Blue
      'patrolling': '#1976D2',   // Dark Blue
      'idle': '#FF9800'          // Orange
    };
    const color = statusColors[status] || '#9E9E9E'; // Gray default

    return `data:image/svg+xml;base64,${btoa(`
      <svg width="20" height="20" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
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
   * Update GPS marker on map
   * DISABLED: GPS information is now consolidated into Tanod marker
   */
  updateGPSDisplay() {
    try {
      // Clear old GPS marker if it exists
      if (this.gpsMarker) {
        this.gpsMarker.setMap(null);
        this.gpsMarker = null;
      }
      
      console.log('[Dashboard] GPS display disabled - consolidated into Tanod marker');
    } catch (error) {
      console.error('[Dashboard] Error updating GPS display:', error);
    }
  }

  /**
   * Update activity log display
   */
  updateActivityDisplay() {
    try {
      const incidentReportBox = document.querySelector('.dashboard-right .card:first-child');
      
      if (!incidentReportBox) {
        console.warn('[Dashboard] Incident report box not found');
        return;
      }

      // Find the content div
      let contentDiv = incidentReportBox.querySelector('div[style*="dashed"]');
      
      if (!contentDiv) {
        // Create it if it doesn't exist
        contentDiv = document.createElement('div');
        incidentReportBox.appendChild(contentDiv);
      }

      // Build HTML for recent incidents
      let html = '';
      
      if (this.incidents.length === 0) {
        html = `
          <div style="text-align: center; color: #999; padding: 20px;">
            <i class="fa-solid fa-file-circle-plus" style="font-size: 32px; color: #ddd; margin-bottom: 10px; display: block;"></i>
            No incidents reported yet
          </div>
        `;
      } else {
        // Show last 5 incidents (sorted with latest first)
        const recentIncidents = this.incidents.slice(0, 5).reverse();
        html = '<div style="max-height: 250px; overflow-y: auto;">';
        
        recentIncidents.forEach((incident) => {
          const time = new Date(incident.timestamp).toLocaleTimeString();
          let severityColor = '#FF0000';
          let severityBg = 'rgba(255, 0, 0, 0.1)';
          if (incident.severity === 'HIGH') {
            severityColor = '#FF9800';
            severityBg = 'rgba(255, 152, 0, 0.1)';
          } else if (incident.severity === 'MEDIUM') {
            severityColor = '#FFC107';
            severityBg = 'rgba(255, 193, 7, 0.1)';
          } else if (incident.severity === 'LOW') {
            severityColor = '#4CAF50';
            severityBg = 'rgba(76, 175, 80, 0.1)';
          }

          html += `
            <div style="padding: 10px 14px; border-bottom: 1px solid #eee; display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                <strong style="font-size: 14px; color: #333; flex: 1; word-wrap: break-word; overflow-wrap: break-word; line-height: 1.4;">${incident.type}</strong>
                <span style="background: ${severityBg}; color: ${severityColor}; font-weight: bold; font-size: 11px; padding: 2px 6px; border-radius: 3px; white-space: nowrap; line-height: 1.2;">
                  ${incident.severity}
                </span>
              </div>
              <div style="color: #666; font-size: 13px; word-wrap: break-word; overflow-wrap: break-word; max-width: 100%; line-height: 1.4;">
                ${(incident.description || 'No description').substring(0, 70)}
              </div>
              <div style="color: #999; font-size: 11px; line-height: 1.2;">
                ${time}
              </div>
            </div>
          `;
        });
        
        html += '</div>';
      }

      contentDiv.innerHTML = html;
      contentDiv.style.minHeight = '280px';
      contentDiv.style.border = '2px dashed #ddd';
      contentDiv.style.borderRadius = '8px';
      contentDiv.style.padding = '0';
      contentDiv.style.display = 'flex';
      contentDiv.style.alignItems = this.incidents.length === 0 ? 'center' : 'flex-start';
      contentDiv.style.justifyContent = 'center';

      console.log('[Dashboard] Updated incident report display');
    } catch (error) {
      console.error('[Dashboard] Error updating activity display:', error);
    }
  }

  /**
   * Update activity log display with actual activity entries
   */
  updateActivityLogDisplay() {
    try {
      const activityLogContainer = document.getElementById('activityLogContainer');
      
      if (!activityLogContainer) {
        console.warn('[Dashboard] Activity log container not found');
        return;
      }

      let html = '';
      
      if (!firebaseService.activityLogs || firebaseService.activityLogs.length === 0) {
        html = `
          <div style="text-align: center; color: #999; padding: 20px;">
            <i class="fa-solid fa-inbox" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
            No activities yet
          </div>
        `;
      } else {
        html = '<div style="padding: 10px 0;">';
        
        // Show last 10 activities
        firebaseService.activityLogs.slice(0, 10).forEach((log) => {
          const timestamp = new Date(log.timestamp || log.createdAt || 0);
          const timeStr = timestamp.toLocaleTimeString();
          const dateStr = timestamp.toLocaleDateString();
          
          let iconColor = '#666';
          let icon = 'fa-info-circle';
          
          if (log.action && log.action.includes('status')) {
            icon = 'fa-check-circle';
            iconColor = '#4CAF50';
          } else if (log.action && log.action.includes('assigned')) {
            icon = 'fa-user-check';
            iconColor = '#2196F3';
          } else if (log.action && log.action.includes('created')) {
            icon = 'fa-plus-circle';
            iconColor = '#FF9800';
          }

          html += `
            <div style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; display: flex; gap: 8px; align-items: flex-start;">
              <i class="fa-solid ${icon}" style="color: ${iconColor}; margin-top: 3px; font-size: 12px; min-width: 14px;"></i>
              <div style="flex: 1; min-width: 0;">
                <div style="color: #333; font-size: 12px; word-wrap: break-word; overflow-wrap: break-word;">
                  ${log.action || 'Activity logged'}
                </div>
                <div style="color: #999; font-size: 10px; margin-top: 2px;">
                  ${timeStr}
                </div>
              </div>
            </div>
          `;
        });
        
        html += '</div>';
      }

      activityLogContainer.innerHTML = html;
      console.log('[Dashboard] Updated activity log display with', firebaseService.activityLogs.length, 'logs');
    } catch (error) {
      console.error('[Dashboard] Error updating activity log display:', error);
    }
  }

  /**
   * Update latest incident display in real-time
   */
  updateLatestIncidentDisplay() {
    try {
      const container = document.getElementById('latestIncidentContainer');
      if (!container) {
        console.warn('[Dashboard] Latest incident container not found');
        return;
      }

      console.log('[Dashboard] updateLatestIncidentDisplay called, incidents count:', this.incidents.length);

      if (!this.incidents || this.incidents.length === 0) {
        console.log('[Dashboard] No incidents to display');
        container.innerHTML = `
          <div style="text-align: center; color: #999; padding: 20px;">
            <i class="fa-solid fa-inbox" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
            No incidents reported yet
          </div>
        `;
        return;
      }

      // Find the incident with the newest timestamp (defensive sort)
      let latest = this.incidents[0];
      if (this.incidents.length > 1) {
        const parseTime = (val) => {
          if (!val && val !== 0) return 0;
          if (typeof val === 'number') {
            if (val < 1e11) return val * 1000;
            return val;
          }
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

        latest = this.incidents.reduce((newest, current) => {
          const newestTime = parseTime(newest.createdAt || newest.timestamp || 0);
          const currentTime = parseTime(current.createdAt || current.timestamp || 0);
          return currentTime > newestTime ? current : newest;
        });
      }
      console.log('[Dashboard] Latest incident:', latest);
      
      const timestamp = new Date(latest.timestamp || latest.createdAt || 0);
      const timeStr = timestamp.toLocaleTimeString();
      const dateStr = timestamp.toLocaleDateString();

      let severityColor = '#FF0000';
      let severityBg = 'rgba(255, 0, 0, 0.1)';
      if (latest.severity === 'HIGH') {
        severityColor = '#FF9800';
        severityBg = 'rgba(255, 152, 0, 0.1)';
      } else if (latest.severity === 'MEDIUM') {
        severityColor = '#FFC107';
        severityBg = 'rgba(255, 193, 7, 0.1)';
      } else if (latest.severity === 'LOW') {
        severityColor = '#4CAF50';
        severityBg = 'rgba(76, 175, 80, 0.1)';
      }

      const html = `
        <div style="padding: 15px; background: ${severityBg}; border-radius: 8px; border-left: 4px solid ${severityColor};">
          <div style="display: flex; justify-content: space-between; align-items: start; gap: 10px; margin-bottom: 8px;">
            <div>
              <h4 style="margin: 0 0 4px 0; color: #333; font-size: 14px;">${latest.type}</h4>
              <p style="margin: 0; color: #666; font-size: 13px;">${latest.description || 'No description'}</p>
            </div>
            <span style="background: ${severityBg}; color: ${severityColor}; font-weight: bold; font-size: 11px; padding: 4px 8px; border-radius: 3px; white-space: nowrap;">
              ${latest.severity}
            </span>
          </div>
          <div style="border-top: 1px solid rgba(0,0,0,0.1); padding-top: 8px; margin-top: 8px; font-size: 12px; color: #666;">
            <p style="margin: 2px 0;"><i class="fa-solid fa-location-dot"></i> ${latest.latitude}, ${latest.longitude}</p>
            <p style="margin: 2px 0;"><i class="fa-solid fa-clock"></i> ${dateStr} at ${timeStr}</p>
            <p style="margin: 2px 0;"><i class="fa-solid fa-clipboard-check"></i> Status: <strong>${latest.status || 'new'}</strong></p>
          </div>
        </div>
      `;

      container.innerHTML = html;
      console.log('[Dashboard] Updated latest incident display');
    } catch (error) {
      console.error('[Dashboard] Error updating latest incident display:', error);
    }
  }

  /**
   * Update analytics display in real-time
   */
  updateAnalyticsDisplay() {
    try {
      const stats = this.getStatistics();
      console.log('[Dashboard] Updating analytics with stats:', stats);
      
      const criticalEl = document.getElementById('analyticsCount_CRITICAL');
      const highEl = document.getElementById('analyticsCount_HIGH');
      const mediumEl = document.getElementById('analyticsCount_MEDIUM');
      const lowEl = document.getElementById('analyticsCount_LOW');
      const clearEl = document.getElementById('analyticsCount_CLEAR');
      const totalEl = document.getElementById('analyticsCount_TOTAL');
      
      if (criticalEl) criticalEl.textContent = stats.criticalCount;
      if (highEl) highEl.textContent = stats.highCount;
      if (mediumEl) mediumEl.textContent = stats.mediumCount;
      if (lowEl) lowEl.textContent = stats.lowCount;
      if (clearEl) clearEl.textContent = stats.clearCount;
      if (totalEl) totalEl.textContent = stats.totalIncidents;

      console.log('[Dashboard] Analytics display updated');
    } catch (error) {
      console.error('[Dashboard] Error updating analytics display:', error);
    }
  }

  /**
   * Helper: Create a colored marker icon
   */
  createMarkerIcon(color) {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="${color}" opacity="0.8"/>
        <circle cx="16" cy="16" r="10" fill="${color}"/>
        <circle cx="16" cy="16" r="6" fill="white"/>
      </svg>
    `)}`;
  }

  /**
   * Get incident statistics
   */
  getStatistics() {
    return {
      totalIncidents: this.incidents.length,
      criticalCount: this.incidents.filter(i => i.severity === 'CRITICAL').length,
      highCount: this.incidents.filter(i => i.severity === 'HIGH').length,
      mediumCount: this.incidents.filter(i => i.severity === 'MEDIUM').length,
      lowCount: this.incidents.filter(i => i.severity === 'LOW').length,
      clearCount: this.incidents.filter(i => i.severity === 'CLEAR').length,
      tanodCount: this.tanodLocations.length,
    };
  }
}

// Global instance
const dashboardIntegration = new DashboardFirebaseIntegration();

// Initialize dashboard after Firebase service and map are ready
async function initializeDashboard() {
  // Wait for Firebase service to be ready
  let retries = 0;
  while (!firebaseService.initialized && retries < 30) {
    await new Promise(resolve => setTimeout(resolve, 100));
    retries++;
  }

  // Wait for map to be initialized
  retries = 0;
  while (!window.map && retries < 30) {
    await new Promise(resolve => setTimeout(resolve, 100));
    retries++;
  }

  if (firebaseService.initialized && window.map) {
    console.log('[Dashboard] Firebase and map ready, initializing dashboard');
    dashboardIntegration.init();
  } else {
    console.error('[Dashboard] Failed to initialize: Firebase=' + firebaseService.initialized + ', Map=' + !!window.map);
  }
}

// Start initialization when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
  initializeDashboard();
}

/**
 * Dashboard Information Button Handler
 */
document.addEventListener('DOMContentLoaded', () => {
  const filterInfoIcon = document.getElementById('filterInfoIcon');
  if (filterInfoIcon) {
    filterInfoIcon.addEventListener('click', () => {
      // Create modal overlay
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
      `;

      // Create modal content
      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 550px;
        width: 90%;
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      `;

      modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
          <h2 style="margin: 0; color: #333; font-size: 24px;">
            <i class="fa-solid fa-circle-info" style="color: #B00020; margin-right: 10px;"></i>
            Dashboard Guide
          </h2>
          <button id="closeModal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>

        <div style="color: #555; line-height: 1.8; font-size: 13px;">
          
          <div style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; border-left: 4px solid #B00020;">
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 14px;">
              <i class="fa-solid fa-map" style="margin-right: 8px;"></i>Interactive Map
            </h3>
            <p style="margin: 0; font-size: 12px;">View all incidents in real-time with color-coded severity markers. Click any marker to view detailed information. Switch between street, satellite, terrain, and hybrid views.</p>
          </div>

          <div style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; border-left: 4px solid #B00020;">
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 14px;">
              <i class="fa-solid fa-user-circle" style="margin-right: 8px; color: #2196F3;"></i>Tanod Officers
            </h3>
            <p style="margin: 0; font-size: 12px;">Blue person icons show officer locations with GPS coordinates. Click to see officer ID, status, and last update time. Status colors: <span style="color: #2196F3;"><strong>Blue</strong></span> = On-Duty, <span style="color: #FF9800;"><strong>Orange</strong></span> = Idle.</p>
          </div>

          <div style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; border-left: 4px solid #B00020;">
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 14px;">
              <i class="fa-solid fa-flag" style="margin-right: 8px;"></i>Incident Severity Levels
            </h3>
            <p style="margin: 0; font-size: 12px;">
              <strong style="color: #B00020;">🔴 CRITICAL</strong> - Severe emergency<br>
              <strong style="color: #FF9800;">🟠 HIGH</strong> - Significant incident<br>
              <strong style="color: #FFC107;">🟡 MEDIUM</strong> - Notable incident<br>
              <strong style="color: #4CAF50;">🟢 LOW</strong> - Minor incident<br>
              <strong style="color: #00AA00;">🚩 CLEAR</strong> - Area is safe, no incidents
            </p>
          </div>

          <div style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; border-left: 4px solid #B00020;">
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 14px;">
              <i class="fa-solid fa-filter" style="margin-right: 8px;"></i>Filters
            </h3>
            <p style="margin: 0; font-size: 12px;">Use date range, severity, and status filters to narrow down incidents. Filters update the map and latest incidents display in real-time.</p>
          </div>

          <div style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; border-left: 4px solid #B00020;">
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 14px;">
              <i class="fa-solid fa-bell" style="margin-right: 8px;"></i>Notifications
            </h3>
            <p style="margin: 0; font-size: 12px;">New incidents trigger notifications in real-time. Click the notification bell to view unread incidents, or click any incident card to open its details modal.</p>
          </div>

          <div style="margin-bottom: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
            <p style="margin: 0; font-size: 12px;"><strong>💡 Tip:</strong> Click any incident marker or card to open detailed view. Use search bar to find specific incidents by ID, location, or description.</p>
          </div>
        </div>

        <div style="margin-top: 25px; display: flex; justify-content: flex-end; gap: 10px;">
          <button id="closeModalBtn" style="background: white; border: 2px solid #B00020; color: #B00020; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s;">Close</button>
        </div>
      `;

      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      // Close modal function
      const closeModal = () => {
        modal.remove();
      };

      // Close modal on X button click
      const closeButton = modal.querySelector('#closeModal');
      if (closeButton) {
        closeButton.addEventListener('click', closeModal);
      }

      // Close modal on Close button click
      const closeButtonBtn = modal.querySelector('#closeModalBtn');
      if (closeButtonBtn) {
        closeButtonBtn.addEventListener('click', closeModal);
      }

      // Close modal on outside click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });

      // Close modal on Escape key
      const escapeHandler = (e) => {
        if (e.key === 'Escape') {
          closeModal();
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      document.addEventListener('keydown', escapeHandler);
    });
  }

  console.log('[Dashboard] Info icon handler initialized');
});
