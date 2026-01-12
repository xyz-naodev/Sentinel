/**
 * Toast Notifications System
 * Provides feedback for user actions with auto-hiding notifications
 */

class ToastNotification {
  constructor() {
    this.container = null;
    this.toasts = [];
    this.initializeContainer();
  }

  /**
   * Initialize toast container
   */
  initializeContainer() {
    this.container = document.getElementById('toastContainer');
    
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toastContainer';
      this.container.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    }
    
    // Add CSS styles for toast notifications
    if (!document.getElementById('toastStyles')) {
      const style = document.createElement('style');
      style.id = 'toastStyles';
      style.textContent = `
        .toast {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-left: 4px solid #4CAF50;
          animation: slideInRight 0.3s ease-out;
          pointer-events: auto;
          min-width: 300px;
          word-wrap: break-word;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        .toast.success {
          border-left-color: #4CAF50;
          background: #f1f8f4;
        }

        .toast.success .toast-icon {
          color: #4CAF50;
        }

        .toast.error {
          border-left-color: #FF0000;
          background: #fef5f5;
        }

        .toast.error .toast-icon {
          color: #FF0000;
        }

        .toast.warning {
          border-left-color: #FFC107;
          background: #fffbf0;
        }

        .toast.warning .toast-icon {
          color: #FFC107;
        }

        .toast.info {
          border-left-color: #2196F3;
          background: #f0f8ff;
        }

        .toast.info .toast-icon {
          color: #2196F3;
        }

        .toast-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .toast-content {
          flex: 1;
        }

        .toast-title {
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
          font-size: 14px;
        }

        .toast-message {
          font-size: 13px;
          color: #666;
          margin: 0;
        }

        .toast-close {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          font-size: 20px;
          padding: 0;
          margin-left: 8px;
          flex-shrink: 0;
          transition: color 0.2s;
        }

        .toast-close:hover {
          color: #333;
        }

        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }

        .toast.removing {
          animation: slideOutRight 0.3s ease-in forwards;
        }

        @media (max-width: 600px) {
          .toast {
            min-width: 280px;
          }

          #toastContainer {
            bottom: 15px !important;
            right: 15px !important;
            left: 15px !important;
            max-width: none !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Show a toast notification
   * @param {string} title - Toast title
   * @param {string} message - Toast message
   * @param {string} type - Type: 'success', 'error', 'warning', 'info' (default: 'info')
   * @param {number} duration - Auto-hide duration in ms (default: 4000, 0 = no auto-hide)
   * @returns {HTMLElement} Toast element
   */
  show(title, message, type = 'info', duration = 4000) {
    const toastEl = document.createElement('div');
    toastEl.className = `toast ${type}`;

    // Icon mapping
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    toastEl.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${this.escapeHtml(title)}</div>` : ''}
        <p class="toast-message">${this.escapeHtml(message)}</p>
      </div>
      <button class="toast-close" aria-label="Close notification">×</button>
    `;

    // Close button handler
    const closeBtn = toastEl.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.remove(toastEl));

    // Add to container
    this.container.appendChild(toastEl);
    this.toasts.push(toastEl);

    console.log(`[Toast] ${type.toUpperCase()}: ${title} - ${message}`);

    // Auto-hide after duration
    if (duration > 0) {
      setTimeout(() => this.remove(toastEl), duration);
    }

    return toastEl;
  }

  /**
   * Show success toast
   */
  success(title, message, duration = 4000) {
    return this.show(title, message, 'success', duration);
  }

  /**
   * Show error toast
   */
  error(title, message, duration = 4000) {
    return this.show(title, message, 'error', duration);
  }

  /**
   * Show warning toast
   */
  warning(title, message, duration = 4000) {
    return this.show(title, message, 'warning', duration);
  }

  /**
   * Show info toast
   */
  info(title, message, duration = 4000) {
    return this.show(title, message, 'info', duration);
  }

  /**
   * Remove a specific toast
   */
  remove(toastEl) {
    if (!toastEl) return;

    toastEl.classList.add('removing');
    
    setTimeout(() => {
      toastEl.remove();
      this.toasts = this.toasts.filter(t => t !== toastEl);
    }, 300);
  }

  /**
   * Clear all toasts
   */
  clearAll() {
    this.toasts.forEach(toast => this.remove(toast));
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create global instance
window.toast = new ToastNotification();

console.log('[ToastNotifications] System initialized');
