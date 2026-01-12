/**
 * Shared Notification Service
 * Synchronizes notifications across all dashboard pages using localStorage
 */

class SharedNotificationService {
  constructor() {
    this.storageKey = 'sentinelNotifications';
    this.notifications = this.loadFromStorage();
    this.listeners = [];
    
    // Listen for storage changes from other tabs/pages
    window.addEventListener('storage', (e) => {
      if (e.key === this.storageKey) {
        this.notifications = JSON.parse(e.newValue || '[]');
        this.notifyListeners();
      }
    });
  }

  /**
   * Load notifications from localStorage
   */
  loadFromStorage() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading notifications from storage:', error);
      return [];
    }
  }

  /**
   * Save notifications to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.notifications));
      this.notifyListeners();
    } catch (error) {
      console.error('Error saving notifications to storage:', error);
    }
  }

  /**
   * Add a new notification
   */
  addNotification(incident) {
    // Check if notification already exists
    const exists = this.notifications.some(n => n.id === incident.id);
    if (!exists) {
      // Format location from various possible fields
      let location = 'Location pending';
      
      if (incident.location) {
        location = incident.location;
      } else if (incident.address) {
        location = incident.address;
      } else if (incident.latitude && incident.longitude) {
        // Format as coordinates
        location = `${parseFloat(incident.latitude).toFixed(4)}°, ${parseFloat(incident.longitude).toFixed(4)}°`;
      } else if (incident.coordinates) {
        location = incident.coordinates;
      }

      this.notifications.unshift({
        id: incident.id,
        type: incident.type || 'Incident',
        severity: incident.severity || 'Medium',
        location: location,
        latitude: incident.latitude,
        longitude: incident.longitude,
        timestamp: incident.timestamp || incident.timestamp_reported || new Date().toISOString(),
        description: incident.description || incident.narrative || 'New incident reported'
      });
      this.saveToStorage();
    }
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    this.notifications = [];
    this.saveToStorage();
  }

  /**
   * Remove a specific notification
   */
  removeNotification(incidentId) {
    this.notifications = this.notifications.filter(n => n.id !== incidentId);
    this.saveToStorage();
  }

  /**
   * Get all notifications
   */
  getNotifications() {
    return this.notifications;
  }

  /**
   * Get notification count
   */
  getCount() {
    return this.notifications.length;
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(callback) {
    this.listeners.push(callback);
  }

  /**
   * Notify all listeners of changes
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.notifications);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }
}

// Create global instance
const sharedNotificationService = new SharedNotificationService();
