/**
 * Accessibility Enhancements Module
 * Implements WCAG 2.1 standards for:
 * - ARIA labels and roles
 * - Keyboard navigation
 * - Color contrast improvements for colorblind users
 */

class AccessibilityEnhancements {
  constructor() {
    this.focusedElementIndex = -1;
    this.focusableElements = [];
    this.init();
  }

  /**
   * Initialize accessibility enhancements
   */
  init() {
    console.log('[Accessibility] Initializing enhancements...');
    this.addAriaLabels();
    this.setupKeyboardNavigation();
    this.improveColorContrast();
    this.addKeyboardFocusIndicators();
    console.log('[Accessibility] ✅ Initialization complete');
  }

  /**
   * Add ARIA labels to all buttons and interactive elements
   */
  addAriaLabels() {
    console.log('[Accessibility] Adding ARIA labels...');

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn && !logoutBtn.getAttribute('aria-label')) {
      logoutBtn.setAttribute('aria-label', 'Sign out from Sentinel');
      logoutBtn.setAttribute('role', 'button');
    }

    // Search input
    const searchInput = document.querySelector('.top-bar-search');
    if (searchInput && !searchInput.getAttribute('aria-label')) {
      searchInput.setAttribute('aria-label', 'Search incidents by type, severity, or description');
    }

    // Filter icons
    const filterIcon = document.querySelector('.fa-filter');
    if (filterIcon && filterIcon.parentElement) {
      const filterElement = filterIcon.parentElement;
      if (!filterElement.getAttribute('aria-label')) {
        filterElement.setAttribute('aria-label', 'Toggle filters panel');
        filterElement.setAttribute('role', 'button');
        filterElement.setAttribute('tabindex', '0');
      }
    }

    // Filter select dropdowns
    const filterSeverity = document.getElementById('filterSeverity');
    if (filterSeverity && !filterSeverity.getAttribute('aria-label')) {
      filterSeverity.setAttribute('aria-label', 'Filter incidents by severity level');
    }

    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus && !filterStatus.getAttribute('aria-label')) {
      filterStatus.setAttribute('aria-label', 'Filter incidents by current status');
    }

    const filterType = document.getElementById('filterType');
    if (filterType && !filterType.getAttribute('aria-label')) {
      filterType.setAttribute('aria-label', 'Filter incidents by incident type');
    }

    // Sort by select
    const sortBy = document.getElementById('sortBy');
    if (sortBy && !sortBy.getAttribute('aria-label')) {
      sortBy.setAttribute('aria-label', 'Sort incident reports by selected criteria');
    }

    // Map container
    const mapContainer = document.getElementById('map');
    if (mapContainer && !mapContainer.getAttribute('aria-label')) {
      mapContainer.setAttribute('aria-label', 'Interactive map showing incident locations');
      mapContainer.setAttribute('role', 'region');
    }

    // Incident table
    const incidentTable = document.querySelector('table');
    if (incidentTable && !incidentTable.getAttribute('aria-label')) {
      incidentTable.setAttribute('aria-label', 'List of all incidents with details');
    }

    // Incident containers
    const latestIncidentContainer = document.getElementById('latestIncidentContainer');
    if (latestIncidentContainer && !latestIncidentContainer.getAttribute('aria-label')) {
      latestIncidentContainer.setAttribute('aria-label', 'Most recent incident report');
      latestIncidentContainer.setAttribute('role', 'region');
    }

    // Navigation links
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    navLinks.forEach((link) => {
      if (!link.getAttribute('aria-current')) {
        const text = link.textContent.trim();
        link.setAttribute('aria-label', text);
        if (link.classList.contains('active')) {
          link.setAttribute('aria-current', 'page');
        }
      }
    });

    console.log('[Accessibility] ✅ ARIA labels added');
  }

  /**
   * Setup keyboard navigation for interactive elements
   */
  setupKeyboardNavigation() {
    console.log('[Accessibility] Setting up keyboard navigation...');

    // Make filter icon keyboard accessible
    const filterIcon = document.querySelector('.fa-filter');
    if (filterIcon && filterIcon.parentElement) {
      filterIcon.parentElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          filterIcon.click?.();
        }
      });
    }

    // Trap focus within filter panel when open
    const filterPanel = document.querySelector('[id*="filter"]')?.parentElement?.parentElement;
    if (filterPanel) {
      filterPanel.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          // Close filter panel
          const filterToggle = document.querySelector('.fa-filter')?.parentElement;
          filterToggle?.focus();
        }
      });
    }

    // Add tabindex to table rows for keyboard navigation
    const tableRows = document.querySelectorAll('tbody tr');
    tableRows.forEach((row, index) => {
      row.setAttribute('tabindex', '0');
      row.setAttribute('role', 'row');

      // Keyboard navigation within table
      row.addEventListener('keydown', (e) => {
        const rows = Array.from(tableRows);
        const currentIndex = rows.indexOf(row);

        if (e.key === 'ArrowDown' && currentIndex < rows.length - 1) {
          e.preventDefault();
          rows[currentIndex + 1].focus();
        } else if (e.key === 'ArrowUp' && currentIndex > 0) {
          e.preventDefault();
          rows[currentIndex - 1].focus();
        } else if (e.key === 'Enter') {
          // Allow row expansion or detail view
          console.log('[Accessibility] Row selected:', row);
        }
      });

      // Visual feedback for focused rows
      row.addEventListener('focus', () => {
        row.style.outline = '2px solid #B00020';
        row.style.outlineOffset = '2px';
      });

      row.addEventListener('blur', () => {
        row.style.outline = 'none';
      });
    });

    // Setup select dropdown keyboard handling
    const selects = document.querySelectorAll('select');
    selects.forEach((select) => {
      select.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const event = new Event('change', { bubbles: true });
          select.dispatchEvent(event);
        }
      });
    });

    // Setup search input keyboard handling
    const searchInput = document.querySelector('.top-bar-search');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          searchInput.value = '';
          searchInput.blur();
        }
      });
    }

    console.log('[Accessibility] ✅ Keyboard navigation setup complete');
  }

  /**
   * Improve color contrast and add patterns for colorblind users
   */
  improveColorContrast() {
    console.log('[Accessibility] Improving color contrast...');

    // Create enhanced colorblind-friendly color palette
    const colorMap = {
      CRITICAL: {
        color: '#8B0000', // Dark red (darker for better contrast)
        background: '#FFE5E5',
        pattern: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,.5) 2px, rgba(255,255,255,.5) 4px)',
        icon: '⚠️',
      },
      HIGH: {
        color: '#D97706', // Darker orange
        background: '#FEF0E5',
        pattern: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,.3) 3px, rgba(255,255,255,.3) 6px)',
        icon: '⚠️',
      },
      MEDIUM: {
        color: '#B95000', // Darker brown-orange
        background: '#FFEDC2',
        pattern: 'repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(255,255,255,.3) 3px, rgba(255,255,255,.3) 6px)',
        icon: '◐',
      },
      LOW: {
        color: '#0B5345', // Darker teal-green
        background: '#D1F0EC',
        pattern: 'repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(255,255,255,.4) 2px, rgba(255,255,255,.4) 4px)',
        icon: '✓',
      },
    };

    // Apply colorblind-friendly styling to severity badges
    document.querySelectorAll('span[style*="background"]').forEach((badge) => {
      const text = badge.textContent?.trim().toUpperCase();
      const severity = Object.keys(colorMap).find((key) => text?.includes(key));

      if (severity && colorMap[severity]) {
        const config = colorMap[severity];
        badge.style.background = `${config.background}, ${config.pattern}`;
        badge.style.color = config.color;
        badge.style.border = `2px solid ${config.color}`;
        badge.style.fontWeight = '700';

        // Add icon for additional visual cue
        if (!badge.innerHTML.includes(config.icon)) {
          badge.innerHTML = `${config.icon} ${text}`;
        }
      }
    });

    // Apply styles to status badges
    document.querySelectorAll('span[style*="color"]').forEach((badge) => {
      const text = badge.textContent?.trim().toLowerCase();
      const bgColor = badge.style.background || badge.style.backgroundColor;

      // Enhance contrast for status indicators
      if (text === 'new' || text === 'critical') {
        badge.style.fontWeight = '700';
        badge.style.padding = '6px 12px';
      } else if (text === 'acknowledged' || text === 'in_progress') {
        badge.style.fontWeight = '600';
      }
    });

    console.log('[Accessibility] ✅ Color contrast improved');
  }

  /**
   * Add visible focus indicators for keyboard navigation
   */
  addKeyboardFocusIndicators() {
    console.log('[Accessibility] Adding keyboard focus indicators...');

    const style = document.createElement('style');
    style.textContent = `
      /* Visible focus indicator for keyboard navigation */
      button:focus,
      select:focus,
      input:focus,
      a:focus,
      [tabindex]:focus {
        outline: 3px solid #B00020 !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 4px rgba(176, 0, 32, 0.2) !important;
      }

      /* Skip to main content link (hidden by default, visible on focus) */
      .skip-to-content {
        position: absolute;
        top: -40px;
        left: 0;
        background: #B00020;
        color: white;
        padding: 8px 16px;
        z-index: 1000;
        text-decoration: none;
        border-radius: 0 0 4px 0;
      }

      .skip-to-content:focus {
        top: 0;
      }

      /* Enhance table row focus */
      tbody tr:focus {
        background-color: rgba(176, 0, 32, 0.1) !important;
      }

      /* Improved filter/select styling */
      select:focus {
        border-color: #B00020 !important;
        box-shadow: 0 0 4px rgba(176, 0, 32, 0.3) !important;
      }

      /* High contrast mode support */
      @media (prefers-contrast: more) {
        button, select, input, a, [tabindex] {
          border-width: 2px !important;
        }
        
        tbody tr {
          border-bottom: 2px solid #ddd !important;
        }
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.001ms !important;
          transition-duration: 0.001ms !important;
        }
      }

      /* Focus-visible for modern browsers */
      button:focus-visible,
      select:focus-visible,
      input:focus-visible,
      a:focus-visible,
      [tabindex]:focus-visible {
        outline: 3px solid #B00020 !important;
        outline-offset: 2px !important;
      }
    `;

    document.head.appendChild(style);

    console.log('[Accessibility] ✅ Focus indicators added');
  }

  /**
   * Add skip navigation link
   */
  addSkipLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-to-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.setAttribute('aria-label', 'Skip to main content');

    document.body.insertBefore(skipLink, document.body.firstChild);

    // Add ID to main content if not present
    const mainContent = document.querySelector('main');
    if (mainContent && !mainContent.id) {
      mainContent.id = 'main-content';
    }
  }

  /**
   * Announce dynamic content changes to screen readers
   */
  announceChange(message, priority = 'polite') {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      announcement.remove();
    }, 3000);
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const a11y = new AccessibilityEnhancements();
    a11y.addSkipLink();
  });
} else {
  const a11y = new AccessibilityEnhancements();
  a11y.addSkipLink();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AccessibilityEnhancements;
}
