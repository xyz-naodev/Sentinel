/**
 * Page Authentication Guard
 * Ensures user is logged in before allowing access to protected pages
 */

class PageAuthGuard {
  constructor() {
    this.protectedPages = [
      'dashboard.html',
      'incireport.html',
      'analytics.html',
      'settings.html',
      'notification.html'
    ];
  }

  /**
   * Check if current page is protected
   */
  isPageProtected() {
    const currentPage = window.location.pathname.split('/').pop();
    return this.protectedPages.includes(currentPage);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return localStorage.getItem('sentinel_logged_in') === 'true';
  }

  /**
   * Get current session
   */
  getCurrentSession() {
    try {
      const session = localStorage.getItem('sentinel_session');
      if (session) {
        return JSON.parse(session);
      }
    } catch (error) {
      console.error('[Guard] Error reading session:', error);
    }
    return null;
  }

  /**
   * Load user info into page
   */
  loadUserInfo() {
    const session = this.getCurrentSession();
    if (!session) return;

    try {
      // Update sidebar user info
      const userNameElement = document.querySelector('.user-info h4');
      const userAvatarElement = document.querySelector('.user-avatar');
      
      if (userNameElement) {
        userNameElement.textContent = (session.username || session.email || 'User').toUpperCase();
      }
      
      if (userAvatarElement) {
        const firstLetter = (session.username || session.email || 'U').charAt(0).toUpperCase();
        userAvatarElement.innerHTML = `<span style="font-weight: bold;">${firstLetter}</span>`;
      }

      console.log('[Guard] User info loaded:', session.username);
    } catch (error) {
      console.error('[Guard] Error loading user info:', error);
    }
  }

  /**
   * Attach logout handler
   */
  setupLogoutHandler() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        console.log('[Guard] Logout button clicked');
        
        if (window.firebaseAuthService) {
          await window.firebaseAuthService.logout();
        } else {
          localStorage.removeItem('sentinel_logged_in');
          localStorage.removeItem('sentinel_session');
        }

        console.log('[Guard] User logged out, redirecting to login');
        window.location.href = 'login.html';
      });
    }
  }

  /**
   * Check authentication and enforce page protection
   */
  enforceProtection() {
    if (!this.isPageProtected()) {
      console.log('[Guard] Current page is not protected');
      return true;
    }

    if (!this.isAuthenticated()) {
      console.log('[Guard] ❌ User not authenticated, redirecting to login');
      window.location.href = 'login.html';
      return false;
    }

    console.log('[Guard] ✅ User authenticated, allowing page access');
    return true;
  }

  /**
   * Initialize guard on page load
   */
  initialize() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupGuard();
      });
    } else {
      this.setupGuard();
    }
  }

  /**
   * Setup guard functionality
   */
  setupGuard() {
    // Enforce protection
    if (!this.enforceProtection()) {
      return;
    }

    // Load user info
    this.loadUserInfo();

    // Setup logout handler
    this.setupLogoutHandler();

    console.log('[Guard] Page authentication guard initialized');
  }
}

// Create global instance
window.pageAuthGuard = new PageAuthGuard();

// Initialize immediately
window.pageAuthGuard.initialize();

console.log('[Guard] Page Auth Guard script loaded');
