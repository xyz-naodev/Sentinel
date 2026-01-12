/**
 * Notification System - FIXED
 * Professional notification container for new incidents and system alerts
 * Supports multiple notification types: incident, alert, success, warning, error
 */

class NotificationSystem {
  constructor() {
    this.notifications = [];
    this.maxNotifications = 5;
    this.autoCloseTime = 6000; // 6 seconds
    this.recentNotifications = []; // Track recent to prevent duplicates
    this.init();
  }

  /**
   * Initialize the notification system by creating container
   */
  init() {
    // Create notification container if it doesn't exist
    if (!document.getElementById('notification-container')) {
      const container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-container';
      document.body.appendChild(container);
    }
  }

  /**
   * Show a new incident notification
   * @param {Object} incident - Incident data
   * @param {string} incident.id - Incident ID
   * @param {string} incident.type - Incident type (Accident, Crime, Medical, Fire, Other)
   * @param {string} incident.area - Area location
   * @param {string} incident.severity - Severity level (Critical, High, Medium, Low)
   */
  showIncident(incident) {
    const notification = {
      id: incident.id || `incident-${Date.now()}`,
      type: 'incident',
      title: `New Incident: ${incident.type}`,
      message: `Area ${incident.area}`,
      severity: incident.severity || 'High',
      icon: this.getSeverityIcon(incident.severity),
      color: this.getSeverityColor(incident.severity),
      timestamp: new Date(),
      data: incident,
    };

    this.add(notification);
  }

  /**
   * Show an alert notification
   * @param {string} title - Alert title
   * @param {string} message - Alert message
   * @param {string} severity - Severity level
   */
  showAlert(title, message, severity = 'High') {
    const notification = {
      id: `alert-${Date.now()}`,
      type: 'alert',
      title,
      message,
      severity,
      icon: '⚠️',
      color: this.getSeverityColor(severity),
      timestamp: new Date(),
    };

    this.add(notification);
  }

  /**
   * Show a success notification
   * @param {string} title - Success title
   * @param {string} message - Success message
   */
  showSuccess(title, message = '') {
    const notification = {
      id: `success-${Date.now()}`,
      type: 'success',
      title,
      message,
      icon: '✓',
      color: '#4CAF50',
      timestamp: new Date(),
    };

    this.add(notification);
  }

  /**
   * Show an error notification
   * @param {string} title - Error title
   * @param {string} message - Error message
   */
  showError(title, message = '') {
    const notification = {
      id: `error-${Date.now()}`,
      type: 'error',
      title,
      message,
      icon: '✕',
      color: '#F44336',
      timestamp: new Date(),
    };

    this.add(notification);
  }

  /**
   * Add notification to queue and display
   * @param {Object} notification - Notification object
   */
  add(notification) {
    // Prevent RAPID duplicate notifications of the exact same message (within 500ms)
    const notificationKey = `${notification.type}:${notification.title}:${notification.message}`;
    const lastShown = this.recentNotifications.find(n => n.key === notificationKey);
    
    if (lastShown && (Date.now() - lastShown.time) < 500) {
      console.debug('Rapid duplicate notification suppressed:', notificationKey);
      return;
    }

    // Clean up old entries (older than 1 second)
    this.recentNotifications = this.recentNotifications.filter(
      n => (Date.now() - n.time) < 1000
    );
    this.recentNotifications.push({ key: notificationKey, time: Date.now() });

    this.notifications.push(notification);

    // Keep only max notifications - remove oldest
    while (this.notifications.length > this.maxNotifications) {
      this.notifications.shift();
    }

    this.render();

    // Auto close after delay (except incidents)
    if (notification.type !== 'incident') {
      setTimeout(() => this.remove(notification.id), this.autoCloseTime);
    }
  }

  /**
   * Remove notification by ID
   * @param {string} id - Notification ID
   */
  remove(id) {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      // Animate removal
      const element = document.querySelector(`[data-id="${id}"]`);
      if (element) {
        element.classList.add('removing');
        setTimeout(() => {
          this.notifications = this.notifications.filter(n => n.id !== id);
          this.render();
        }, 300);
      } else {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.render();
      }
    }
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    this.notifications = [];
    this.render();
  }

  /**
   * Render all notifications
   */
  render() {
    const container = document.getElementById('notification-container');
    if (!container) {
      this.init();
      return this.render();
    }

    // Clear container
    container.innerHTML = '';

    // Add each notification
    this.notifications.forEach((notification, index) => {
      const element = this.createNotificationElement(notification, index);
      container.appendChild(element);
    });
  }

  /**
   * Create notification DOM element
   * @param {Object} notification - Notification data
   * @param {number} index - Index in list
   */
  createNotificationElement(notification, index) {
    const self = this;
    const div = document.createElement('div');
    div.className = `notification notification-${notification.type}`;
    div.setAttribute('data-id', notification.id);
    div.style.animationDelay = `${index * 0.05}s`;

    const timeAgo = this.getTimeAgo(notification.timestamp);

    // Create HTML structure
    const contentDiv = document.createElement('div');
    contentDiv.className = 'notification-content';

    // Header
    const headerDiv = document.createElement('div');
    headerDiv.className = 'notification-header';

    const iconDiv = document.createElement('div');
    iconDiv.className = 'notification-icon-wrapper';
    iconDiv.style.color = notification.color;
    iconDiv.textContent = notification.icon;

    const titleSectionDiv = document.createElement('div');
    titleSectionDiv.className = 'notification-title-section';

    const titleH4 = document.createElement('h4');
    titleH4.className = 'notification-title';
    titleH4.textContent = notification.title;

    const timeP = document.createElement('p');
    timeP.className = 'notification-time';
    timeP.textContent = timeAgo;

    titleSectionDiv.appendChild(titleH4);
    titleSectionDiv.appendChild(timeP);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      self.remove(notification.id);
    });

    headerDiv.appendChild(iconDiv);
    headerDiv.appendChild(titleSectionDiv);
    headerDiv.appendChild(closeBtn);

    // Message
    const messageP = document.createElement('p');
    messageP.className = 'notification-message';
    messageP.textContent = notification.message;

    contentDiv.appendChild(headerDiv);
    contentDiv.appendChild(messageP);

    // Severity badge
    if (notification.severity) {
      const severityDiv = document.createElement('div');
      severityDiv.className = 'notification-severity';
      severityDiv.style.background = `${notification.color}20`;
      severityDiv.style.color = notification.color;
      severityDiv.textContent = notification.severity;
      contentDiv.appendChild(severityDiv);
    }

    // Action buttons for incidents
    if (notification.type === 'incident') {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'notification-actions';

      const viewBtn = document.createElement('button');
      viewBtn.className = 'notification-btn primary';
      viewBtn.textContent = 'View Details';
      viewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        self.viewIncident(notification.id);
      });

      const ackBtn = document.createElement('button');
      ackBtn.className = 'notification-btn secondary';
      ackBtn.textContent = 'Acknowledge';
      ackBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        self.acknowledge(notification.id);
      });

      actionsDiv.appendChild(viewBtn);
      actionsDiv.appendChild(ackBtn);
      contentDiv.appendChild(actionsDiv);
    }

    div.appendChild(contentDiv);
    return div;
  }

  /**
   * Get severity icon based on level
   * @param {string} severity - Severity level
   */
  getSeverityIcon(severity) {
    const icons = {
      'Critical': '🚨',
      'High': '⚠️',
      'Medium': '⚡',
      'Low': 'ℹ️',
    };
    return icons[severity] || 'ℹ️';
  }

  /**
   * Get severity color based on level
   * @param {string} severity - Severity level
   */
  getSeverityColor(severity) {
    const colors = {
      'Critical': '#F44336', // Red
      'High': '#FF9800', // Orange
      'Medium': '#FFC107', // Amber
      'Low': '#2196F3', // Blue
    };
    return colors[severity] || '#2196F3';
  }

  /**
   * Format timestamp to "time ago" format
   * @param {Date} date - Timestamp
   */
  getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  /**
   * Callback for view details button
   * @param {string} id - Notification ID
   */
  viewIncident(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification && notification.data) {
      Logger.info(`Viewing incident details: ${notification.data.id}`);
      // Navigate to incident reports page with incident ID
      window.location.href = `incireport.html?id=${notification.data.id}`;
    }
  }

  /**
   * Callback for acknowledge button
   * @param {string} id - Notification ID
   */
  acknowledge(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      Logger.info(`Acknowledged incident: ${notification.data.id}`);
      this.showSuccess('Incident Acknowledged', `Incident ${notification.data.id} acknowledged`);
      this.remove(id);
    }
  }
}

// Initialize global notification system
window.notificationSystem = new NotificationSystem();

// Make it available globally
if (typeof Logger !== 'undefined') {
  Logger.info('Notification system initialized');
} else {
  console.log('Notification system initialized');
}
