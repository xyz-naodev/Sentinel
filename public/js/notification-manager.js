/**
 * Notification System - Robust Implementation
 * Tracks unviewed incidents and displays notification badge/panel
 */

class NotificationManager {
  constructor() {
    this.unviewedIncidents = new Map(); // ID -> incident data
    this.isOpen = false;
    this.STORAGE_KEY = 'sentinel_unviewed_incidents';
    this.preCleared = new Set(); // IDs of incidents that existed before the last clear
    this.PRE_CLEARED_KEY = 'sentinel_pre_cleared_ids';
    this.LAST_CLEAR_TIME_KEY = 'sentinel_last_clear_time';
    this.lastClearTime = 0; // Timestamp of last "clear all"
    
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupDOM());
    } else {
      this.setupDOM();
    }
  }

  setupDOM() {
    // Get references to DOM elements
    this.bell = document.getElementById('notificationBell');
    this.badge = document.getElementById('notificationBadge');
    this.panel = document.getElementById('notificationPanel');
    this.panelContent = document.getElementById('notificationPanelContent');
    this.clearAllBtn = document.getElementById('clearAllNotifications');

    if (!this.bell) {
      console.warn('[NotificationManager] Bell element not found');
      return;
    }

    // Load saved unviewed incidents
    this.loadFromStorage();
    this.loadPreClearedIds();
    this.loadLastClearTime();

    // Setup event listeners
    this.bell.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePanel();
    });

    if (this.clearAllBtn) {
      this.clearAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearAll();
      });
    }

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isOpen && 
          this.bell && !this.bell.contains(e.target) && 
          this.panel && !this.panel.contains(e.target)) {
        this.closePanel();
      }
      // Never stop propagation - allow other elements to handle clicks
    });

    // Listen for storage changes from other pages/tabs
    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEY) {
        // Reload from storage if changed by another tab/page
        this.loadFromStorage();
        this.updateBadge();
        this.updatePanel();
        console.log('[NotificationManager] Synced with other page');
      }
    });

    // Listen for broadcast state changes from other pages
    window.addEventListener('storage', (e) => {
      if (e.key === 'sentinel_notification_state' && e.newValue) {
        try {
          const state = JSON.parse(e.newValue);
          // Reload UI to reflect changes
          this.loadFromStorage();
          this.updateBadge();
          this.updatePanel();
        } catch (error) {
          // Silently fail
        }
      }
    });

    // Update display
    this.updateBadge();
    this.updatePanel();

    console.log('[NotificationManager] Initialized successfully');
  }

  /**
   * Add or update an unviewed incident
   */
  addIncident(incident) {
    if (!incident || !incident.id) return;

    const wasNew = !this.unviewedIncidents.has(incident.id);
    this.unviewedIncidents.set(incident.id, incident);
    
    if (wasNew) {
      this.saveToStorage();
      this.updateBadge();
      this.playSound();
    }
  }

  /**
   * Add multiple incidents
   */
  addIncidents(incidents) {
    if (!Array.isArray(incidents)) return;
    
    let hasNew = false;
    incidents.forEach(incident => {
      if (!this.unviewedIncidents.has(incident.id)) {
        this.unviewedIncidents.set(incident.id, incident);
        hasNew = true;
      }
    });

    if (hasNew) {
      this.saveToStorage();
      this.updateBadge();
      this.playSound();
    }
  }

  /**
   * Mark incident as viewed
   */
  markAsViewed(incidentId) {
    if (this.unviewedIncidents.delete(incidentId)) {
      // Only track recently viewed incidents (current session)
      // Don't add to clearedIncidentIds to allow duplicate incidents to show again if needed
      this.saveToStorage();
      this.updateBadge();
      this.updatePanel();
    }
  }

  /**
   * Clear all unviewed incidents
   */
  clearAll() {
    if (this.unviewedIncidents.size === 0) return;

    // Save all current incident IDs so we don't show them again
    this.preCleared.clear();
    this.unviewedIncidents.forEach((incident, id) => {
      this.preCleared.add(id);
    });
    this.savePreClearedIds();

    // Record the time of clearing
    this.lastClearTime = Date.now();
    this.saveLastClearTime();

    // Clear all unviewed incidents
    this.unviewedIncidents.clear();
    
    this.saveToStorage();
    this.updateBadge();
    this.updatePanel();
    this.closePanel();
    
    console.log('[NotificationManager] All', this.preCleared.size, 'notifications cleared - new incidents will show');
  }

  /**
   * Update badge display
   */
  updateBadge() {
    const count = this.unviewedIncidents.size;
    
    if (!this.badge) return;

    if (count > 0) {
      this.badge.textContent = count > 99 ? '99+' : count;
      this.badge.style.display = 'flex';
    } else {
      this.badge.textContent = '';
      this.badge.style.display = 'none';
    }
  }

  /**
   * Update notification panel content
   */
  updatePanel() {
    if (!this.panelContent) return;

    const count = this.unviewedIncidents.size;

    if (count === 0) {
      this.panelContent.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #999;">
          <i class="fa-solid fa-check-circle" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
          All caught up!
        </div>
      `;
      return;
    }

    let html = `<div style="padding: 12px 0;">`;
    
    this.unviewedIncidents.forEach((incident) => {
      const severityColor = this.getSeverityColor(incident.severity);
      const timeStr = this.formatTime(incident.timestamp || incident.createdAt);
      
      html += `
        <div style="padding: 12px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; cursor: pointer; transition: background 0.2s;" 
             class="notification-item" data-id="${incident.id}">
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 13px; color: #333; margin-bottom: 4px;">${this.escapeHtml(incident.type || 'Incident')}</div>
            <div style="font-size: 12px; color: #666; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${this.escapeHtml(incident.description || 'No description')}
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span style="background: ${severityColor}20; color: ${severityColor}; font-weight: 600; font-size: 10px; padding: 2px 6px; border-radius: 3px;">
                ${incident.severity || 'LOW'}
              </span>
              <span style="font-size: 11px; color: #999;">${timeStr}</span>
            </div>
          </div>
          <button class="mark-viewed-btn" style="background: #B00020; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; white-space: nowrap; font-weight: 600;">
            View
          </button>
        </div>
      `;
    });

    html += `</div>`;
    this.panelContent.innerHTML = html;

    // Add click handlers
    this.panelContent.querySelectorAll('.mark-viewed-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const incidentId = btn.closest('.notification-item').getAttribute('data-id');
        const incident = this.unviewedIncidents.get(incidentId);
        
        // Open the modal with the incident (same as clicking a marker)
        if (incident && typeof incidentModalManager !== 'undefined' && incidentModalManager) {
          incidentModalManager.openIncident(incident);
          this.closePanel();
        }
        
        this.markAsViewed(incidentId);
      });
    });

    this.panelContent.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('mouseover', () => {
        item.style.background = '#f9f9f9';
      });
      item.addEventListener('mouseout', () => {
        item.style.background = 'white';
      });
    });
  }

  /**
   * Toggle panel visibility
   */
  togglePanel() {
    if (this.isOpen) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  /**
   * Open notification panel
   */
  openPanel() {
    if (!this.panel) return;
    this.panel.style.display = 'flex';
    this.panel.style.pointerEvents = 'auto';
    this.isOpen = true;
    this.updatePanel();
  }

  /**
   * Close notification panel
   */
  closePanel() {
    if (!this.panel) return;
    this.panel.style.display = 'none';
    this.panel.style.pointerEvents = 'none';
    this.isOpen = false;
    // Broadcast to other tabs
    this.broadcastState();
  }

  /**
   * Broadcast state changes to other tabs/pages
   */
  broadcastState() {
    try {
      const state = {
        unviewed: Array.from(this.unviewedIncidents.keys()),
        isOpen: this.isOpen,
        timestamp: Date.now()
      };
      // Use a separate key for broadcast events
      sessionStorage.setItem('sentinel_notification_state', JSON.stringify(state));
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Save unviewed incidents to localStorage
   */
  saveToStorage() {
    try {
      const data = Array.from(this.unviewedIncidents.entries()).map(([id, incident]) => ({
        id,
        ...incident
      }));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      // Broadcast to other tabs
      this.broadcastState();
    } catch (error) {
      console.error('[NotificationManager] Storage error:', error);
    }
  }

  /**
   * Load unviewed incidents from localStorage
   */
  loadFromStorage() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const incidents = JSON.parse(data);
        incidents.forEach(incident => {
          this.unviewedIncidents.set(incident.id, incident);
        });
        console.log('[NotificationManager] Loaded', incidents.length, 'unviewed incidents');
      }
    } catch (error) {
      console.error('[NotificationManager] Load error:', error);
    }
  }

  /**
   * Play notification sound
   */
  playSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.connect(gain);
      gain.connect(audioContext.destination);
      
      osc.frequency.value = 800;
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      // Silently fail if audio context not available
    }
  }

  /**
   * Get color for severity level
   */
  getSeverityColor(severity) {
    const colors = {
      'CRITICAL': '#FF0000',
      'HIGH': '#FF9800',
      'MEDIUM': '#FFC107',
      'LOW': '#4CAF50'
    };
    return colors[severity?.toUpperCase()] || '#2196F3';
  }

  /**
   * Format timestamp
   */
  formatTime(timestamp) {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '';
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Check for new incidents from Firebase
   */
  checkForNewIncidents(incidents) {
    if (!Array.isArray(incidents)) return;

    let addedCount = 0;
    incidents.forEach(incident => {
      // Skip if already in unviewed list
      if (this.unviewedIncidents.has(incident.id)) return;
      
      // Skip if it was cleared in the last session
      if (this.preCleared.has(incident.id)) return;
      
      // This is a new incident - add it
      this.addIncident(incident);
      addedCount++;
    });
    
    if (addedCount > 0) {
      console.log('[NotificationManager] Added', addedCount, 'new incidents (not in preCleared list)');
    }
  }

  /**
   * Save last clear time to localStorage
   */
  saveLastClearTime() {
    try {
      localStorage.setItem(this.LAST_CLEAR_TIME_KEY, this.lastClearTime.toString());
    } catch (error) {
      console.error('[NotificationManager] Error saving last clear time:', error);
    }
  }

  /**
   * Save pre-cleared incident IDs to localStorage
   */
  savePreClearedIds() {
    try {
      const ids = Array.from(this.preCleared);
      localStorage.setItem(this.PRE_CLEARED_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error('[NotificationManager] Error saving pre-cleared IDs:', error);
    }
  }

  /**
   * Load pre-cleared incident IDs from localStorage
   */
  loadPreClearedIds() {
    try {
      const saved = localStorage.getItem(this.PRE_CLEARED_KEY);
      if (saved) {
        const ids = JSON.parse(saved);
        ids.forEach(id => this.preCleared.add(id));
        console.log('[NotificationManager] Loaded', ids.length, 'pre-cleared incident IDs');
      }
    } catch (error) {
      console.error('[NotificationManager] Error loading pre-cleared IDs:', error);
    }
  }

  /**
   * Save last clear time to localStorage
   */
  loadLastClearTime() {
    try {
      const saved = localStorage.getItem(this.LAST_CLEAR_TIME_KEY);
      if (saved) {
        this.lastClearTime = parseInt(saved, 10);
        console.log('[NotificationManager] Loaded last clear time:', new Date(this.lastClearTime).toLocaleString());
      }
    } catch (error) {
      console.error('[NotificationManager] Error loading last clear time:', error);
    }
  }

  recordIncidentView(incidentId) {
    this.markAsViewed(incidentId);
  }
}

// Initialize globally
window.notificationManager = new NotificationManager();
