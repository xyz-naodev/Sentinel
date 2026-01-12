/**
 * Shared Notification UI Handler
 * Provides consistent notification bell and panel functionality across all pages
 */

class SharedNotificationUI {
  constructor() {
    this.notificationBell = document.getElementById('notificationBell');
    this.notificationPanel = document.getElementById('notificationPanel');
    this.notificationBadge = document.getElementById('notificationBadge');
    this.clearNotifications = document.getElementById('clearNotifications');
    this.notificationList = document.getElementById('notificationList');
    this.notificationCount = document.getElementById('notificationCount');

    if (this.notificationBell && this.notificationPanel) {
      this.initialize();
    }
  }

  initialize() {
    // Bell click handler
    this.notificationBell.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePanel();
    });

    // Clear button handler
    if (this.clearNotifications) {
      this.clearNotifications.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof sharedNotificationService !== 'undefined') {
          sharedNotificationService.clearAll();
        }
      });
    }

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
      if (this.notificationPanel.style.display !== 'none' &&
          !this.notificationPanel.contains(e.target) &&
          !this.notificationBell.contains(e.target)) {
        this.closePanel();
      }
    });

    // Subscribe to shared notification changes
    if (typeof sharedNotificationService !== 'undefined') {
      sharedNotificationService.subscribe(() => {
        this.updateUI();
      });
      
      // Initial update
      this.updateUI();
    }
  }

  togglePanel() {
    const isVisible = this.notificationPanel.style.display !== 'none';
    this.notificationPanel.style.display = isVisible ? 'none' : 'flex';
  }

  closePanel() {
    this.notificationPanel.style.display = 'none';
  }

  updateUI() {
    if (typeof sharedNotificationService === 'undefined') {
      return;
    }

    const notifications = sharedNotificationService.getNotifications();
    const count = notifications.length;

    // Update badge
    if (this.notificationBadge) {
      this.notificationBadge.textContent = count;
      this.notificationBadge.style.display = count > 0 ? 'flex' : 'none';
    }

    // Update count text
    if (this.notificationCount) {
      this.notificationCount.textContent = `You have ${count} unviewed incident${count !== 1 ? 's' : ''}`;
    }

    // Update list
    if (this.notificationList) {
      if (count === 0) {
        this.notificationList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No unviewed incidents</div>';
      } else {
        this.notificationList.innerHTML = notifications.map(notif => `
          <div style="padding: 12px 16px; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s; display: flex; justify-content: space-between; align-items: start; gap: 8px;" 
               onmouseover="this.style.background='#f5f5f5'" 
               onmouseout="this.style.background='white'">
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #333; font-size: 13px;">${notif.type || 'Incident'}</div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">${notif.location || 'Location pending'}</div>
              <div style="font-size: 11px; color: #999; margin-top: 2px;">${notif.timestamp ? new Date(notif.timestamp).toLocaleString() : 'Just now'}</div>
            </div>
            <span style="background: ${notif.severity === 'High' || notif.severity === 'Critical' ? '#FF0000' : notif.severity === 'Medium' ? '#FFC107' : '#4CAF50'}; color: white; padding: 4px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; white-space: nowrap;">${notif.severity || 'Medium'}</span>
          </div>
        `).join('');
      }
    }
  }
}

// Initialize notification UI when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.sharedNotificationUI = new SharedNotificationUI();
  });
} else {
  window.sharedNotificationUI = new SharedNotificationUI();
}
