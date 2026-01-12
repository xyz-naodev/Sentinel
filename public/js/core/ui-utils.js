/**
 * UI Utilities Module
 * Provides UI/UX utilities for rendering and notifications
 */

const UIUtils = {
  toastContainerId: 'toastContainer',

  /**
   * Show toast notification
   * @param {String} title - Notification title
   * @param {String} message - Notification message
   * @param {String} type - Type of notification (info, success, warning, error)
   */
  showToast(title, message, type = 'info') {
    const container = this.getOrCreateToastContainer();

    const toastHTML = `
      <div class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-type="${type}">
        <div class="toast-header">
          <strong class="me-auto">${title}</strong>
          <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">${message}</div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', toastHTML);

    // Try to use Bootstrap if available, otherwise simple timeout
    const toastEl = container.lastElementChild;
    try {
      if (typeof bootstrap !== 'undefined') {
        const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
        toast.show();
      } else {
        setTimeout(() => toastEl.remove(), 5000);
      }
    } catch (e) {
      setTimeout(() => toastEl.remove(), 5000);
    }
  },

  /**
   * Get or create toast container
   */
  getOrCreateToastContainer() {
    let container = document.getElementById(this.toastContainerId);
    
    if (!container) {
      container = document.createElement('div');
      container.id = this.toastContainerId;
      container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999;';
      document.body.appendChild(container);
    }

    return container;
  },

  /**
   * Update notification badge count
   * @param {Number} count - Number to display
   * @param {String} elementId - ID of badge element
   */
  updateNotificationBadge(count, elementId = 'notificationBadge') {
    const badge = document.getElementById(elementId);
    if (badge) {
      badge.textContent = count;
    }
  },

  /**
   * Render unit list in container
   * @param {Array} units - Array of unit objects
   * @param {String} containerId - ID of container element
   */
  renderUnitList(units, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = units.map(unit => `
      <div class="unit-item" data-unit-id="${unit.id}">
        <div class="unit-header">
          <span class="unit-badge" style="background: ${this.getStatusColor(unit.status)}"></span>
          <strong>${unit.name}</strong>
        </div>
        <small>Lat: ${unit.position.lat.toFixed(4)}, Lng: ${unit.position.lng.toFixed(4)}</small>
        <small style="display: block; color: #666;">Status: ${unit.status}</small>
      </div>
    `).join('');
  },

  /**
   * Render incident list in container
   * @param {Array} incidents - Array of incident objects
   * @param {String} containerId - ID of container element
   * @param {Number} limit - Max incidents to display
   */
  renderIncidentList(incidents, containerId, limit = 5) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const displayIncidents = incidents.slice(0, limit);

    container.innerHTML = displayIncidents.map(incident => `
      <div class="incident-item" data-incident-id="${incident.id}">
        <div class="incident-type" style="background: #dc2626;">${incident.type}</div>
        <strong>${incident.location}</strong>
        <small>${incident.timestamp ? incident.timestamp.toLocaleTimeString() : new Date(incident.time).toLocaleTimeString()}</small>
      </div>
    `).join('');

    if (displayIncidents.length === 0) {
      container.innerHTML = '<p style="color: #999; padding: 10px;">No incidents</p>';
    }
  },

  /**
   * Render dashboard statistics
   * @param {Object} stats - Statistics object
   * @param {String} containerId - ID of container element
   */
  renderDashboardStats(stats, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = `
      <div class="stats-container">
        <div class="stat-item">
          <span class="stat-label">Total Incidents</span>
          <span class="stat-value">${stats.total || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Active</span>
          <span class="stat-value alert">${stats.active || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Resolved</span>
          <span class="stat-value success">${stats.resolved || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Active Units</span>
          <span class="stat-value">${stats.activeUnits || 0}</span>
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * Get color based on status
   * @param {String} status - Status string
   */
  getStatusColor(status) {
    const colors = {
      'on-duty': '#3b82f6',
      'patrolling': '#1e40af',
      'idle': '#9ca3af',
      'active': '#dc2626',
      'resolved': '#10b981'
    };
    return colors[status] || '#6b7280';
  },

  /**
   * Format time for display
   * @param {Date} date - Date object
   */
  formatTime(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleTimeString();
  },

  /**
   * Format date for display
   * @param {Date} date - Date object
   */
  formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString();
  },

  /**
   * Show loading spinner
   * @param {String} message - Loading message
   */
  showLoading(message = 'Loading...') {
    this.showToast('Loading', message, 'info');
  },

  /**
   * Show success message
   * @param {String} title - Title
   * @param {String} message - Message
   */
  showSuccess(title, message) {
    this.showToast(title, message, 'success');
  },

  /**
   * Show error message
   * @param {String} title - Title
   * @param {String} message - Message
   */
  showError(title, message) {
    this.showToast(title, message, 'error');
  },

  /**
   * Show warning message
   * @param {String} title - Title
   * @param {String} message - Message
   */
  showWarning(title, message) {
    this.showToast(title, message, 'warning');
  }
};
