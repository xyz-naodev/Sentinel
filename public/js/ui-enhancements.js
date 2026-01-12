/**
 * UI/UX Enhancements
 * - Notification badge management
 * - Skeleton loading state management
 * - Real-time incident counter updates
 */

class UIEnhancements {
  constructor() {
    this.incidentBadge = document.getElementById('incidentBadge');
    this.incidentContainer = document.getElementById('latestIncidentContainer');
  }

  /**
   * Update notification badge with incident count
   */
  updateIncidentBadge(count) {
    if (!this.incidentBadge) return;

    if (count > 0) {
      this.incidentBadge.textContent = count > 99 ? '99+' : count;
      this.incidentBadge.style.display = 'flex';
    } else {
      this.incidentBadge.style.display = 'none';
    }
  }

  /**
   * Hide skeleton loader and show real content
   */
  hideSkeleton(containerId = 'latestIncidentContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Remove skeleton elements
    const skeletons = container.querySelectorAll('.skeleton');
    skeletons.forEach((skeleton) => {
      skeleton.style.display = 'none';
    });
  }

  /**
   * Show skeleton loader with smooth fade-in
   */
  showSkeleton(containerId = 'latestIncidentContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Show skeleton elements with animation
    const skeletons = container.querySelectorAll('.skeleton');
    skeletons.forEach((skeleton) => {
      skeleton.style.display = 'block';
      skeleton.style.animation = 'skeleton-loading 1.5s infinite';
    });
  }

  /**
   * Animate content in when loaded
   */
  animateContentIn(element) {
    if (!element) return;

    element.style.opacity = '0';
    element.style.transform = 'translateY(10px)';
    element.style.transition = 'all 0.3s ease';

    // Trigger reflow to apply initial styles
    element.offsetHeight;

    // Animate in
    element.style.opacity = '1';
    element.style.transform = 'translateY(0)';
  }

  /**
   * Clear incident container and prepare for new content
   */
  clearIncidentContainer() {
    if (!this.incidentContainer) return;

    // Keep skeleton, remove old content
    const oldContent = this.incidentContainer.querySelectorAll(':not(.skeleton)');
    oldContent.forEach((el) => el.remove());
  }

  /**
   * Initialize UI enhancements on page load
   */
  init() {
    console.log('[UIEnhancements] Initializing...');

    // Set up observer for incident container changes
    if (this.incidentContainer) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          // Check if non-skeleton content was added
          if (
            mutation.addedNodes.length > 0 &&
            !Array.from(mutation.addedNodes).some((node) => {
              if (node.nodeType === 1) {
                return node.classList?.contains('skeleton');
              }
              return false;
            })
          ) {
            // Hide skeleton when real content is added
            this.hideSkeleton();
          }
        });
      });

      observer.observe(this.incidentContainer, {
        childList: true,
        subtree: true,
      });
    }

    // Listen for incident count updates
    if (typeof window.state !== 'undefined') {
      setInterval(() => {
        if (window.state.incidents) {
          const criticalCount = window.state.incidents.filter(
            (inc) => inc.severity === 'CRITICAL'
          ).length;
          this.updateIncidentBadge(criticalCount);
        }
      }, 1000);
    }

    console.log('[UIEnhancements] Initialization complete');
  }
}

// Initialize UI enhancements when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.uiEnhancements = new UIEnhancements();
  window.uiEnhancements.init();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIEnhancements;
}
