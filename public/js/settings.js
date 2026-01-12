// settings.js - tab switching and activity logs for settings page
let activityLogs = [];

// ============================================
// USER SETTINGS PERSISTENCE
// ============================================

/**
 * User Settings Service - Manages localStorage persistence
 */
const UserSettingsService = (() => {
  const SETTINGS_KEY = 'sentinel_user_settings';

  /**
   * Load settings from localStorage
   */
  function loadSettings() {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('[Settings] Error loading settings:', error);
    }
    return getDefaultSettings();
  }

  /**
   * Get default settings
   */
  function getDefaultSettings() {
    return {
      name: 'Administrator',
      email: '',
      phone: '',
      department: '',
      notifEmail: false,
      notifSMS: false,
      notifPush: true,
      savedAt: new Date().toISOString()
    };
  }

  /**
   * Save settings to localStorage
   */
  function saveSettings(settings) {
    try {
      settings.savedAt = new Date().toISOString();
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      console.log('[Settings] Settings saved successfully');
      return true;
    } catch (error) {
      console.error('[Settings] Error saving settings:', error);
      return false;
    }
  }

  /**
   * Apply settings to form fields
   */
  function applySettingsToForm(settings) {
    try {
      document.getElementById('settingsName').value = settings.name || '';
      document.getElementById('settingsEmail').value = settings.email || '';
      document.getElementById('settingsPhone').value = settings.phone || '';
      document.getElementById('settingsDepartment').value = settings.department || '';
      document.getElementById('notifEmail').checked = settings.notifEmail || false;
      document.getElementById('notifSMS').checked = settings.notifSMS || false;
      document.getElementById('notifPush').checked = settings.notifPush !== false;
      console.log('[Settings] Applied settings to form');
    } catch (error) {
      console.error('[Settings] Error applying settings to form:', error);
    }
  }

  /**
   * Get settings from form fields
   */
  function getSettingsFromForm() {
    return {
      name: document.getElementById('settingsName').value || '',
      email: document.getElementById('settingsEmail').value || '',
      phone: document.getElementById('settingsPhone').value || '',
      department: document.getElementById('settingsDepartment').value || '',
      notifEmail: document.getElementById('notifEmail').checked,
      notifSMS: document.getElementById('notifSMS').checked,
      notifPush: document.getElementById('notifPush').checked
    };
  }

  /**
   * Initialize settings on page load
   */
  function init() {
    const settings = loadSettings();
    applySettingsToForm(settings);
    console.log('[Settings] Settings initialized');
  }

  return {
    init,
    loadSettings,
    saveSettings,
    applySettingsToForm,
    getSettingsFromForm,
    getDefaultSettings
  };
})();


function fetchActivityLogsFromREST() {
  const dbURL = 'https://sentinel-tanod-system-default-rtdb.asia-southeast1.firebasedatabase.app/activityLogs.json';
  
  console.log('[Settings] Fetching activity logs from REST API...');
  
  fetch(dbURL, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  })
    .then(response => {
      console.log('[Settings] Response status:', response.status);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      console.log('[Settings] ✅ REST fetch successful, data type:', typeof data);
      console.log('[Settings] Data is null?', data === null);
      console.log('[Settings] Data keys count:', data ? Object.keys(data).length : 0);
      
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        activityLogs = [];
        const keys = Object.keys(data);
        console.log('[Settings] Processing', keys.length, 'activity log entries');
        
        keys.forEach((key) => {
          const entry = data[key];
          activityLogs.push({
            id: key,
            ...entry,
          });
        });
        
        // Normalize and sort by timestamp (newest first)
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

        activityLogs.sort((a, b) => {
          const aTime = parseTime(a.createdAt || a.timestamp || 0);
          const bTime = parseTime(b.createdAt || b.timestamp || 0);
          return bTime - aTime;
        });

        // Keep recent 100 logs
        activityLogs = activityLogs.slice(0, 100);
        
        console.log('[Settings] ✅ Loaded', activityLogs.length, 'activity logs (kept top 100)');
        
        // If activity tab is visible, update display
        const activityPanel = document.getElementById('activity');
        if (activityPanel && !activityPanel.classList.contains('hidden')) {
          console.log('[Settings] Activity panel is visible, rendering now');
          loadActivityLogs();
        }
      } else {
        console.warn('[Settings] No data or empty object returned');
        activityLogs = [];
      }
    })
    .catch(error => {
      console.error('[Settings] REST fetch error:', error);
      // Retry after 2 seconds on error
      setTimeout(fetchActivityLogsFromREST, 2000);
    });
}

/**
 * Start polling for activity logs - NO Firebase dependency!
 */
function startActivityLogsPolling() {
  console.log('[Settings] Starting activity logs polling (direct REST, no Firebase needed)...');
  
  // Initial fetch - start immediately
  fetchActivityLogsFromREST();
  
  // Poll every 2 seconds for updates
  setInterval(fetchActivityLogsFromREST, 2000);
}

// Flag to track if polling has been started
let activityLogsPollingStarted = false;

// Start polling only when activity tab is accessed (not at module load)
// This avoids calling REST API before page is ready

/**
 * Load and display activity logs
 */
function loadActivityLogs() {
  try {
    console.log('[Settings] loadActivityLogs called, logs count:', activityLogs.length);
    
    const container = document.getElementById('settingsActivityLogContainer');
    if (!container) {
      console.warn('[Settings] Activity log container not found');
      return;
    }

    if (!activityLogs || activityLogs.length === 0) {
      console.log('[Settings] No activity logs to display');
      container.innerHTML = `
        <div style="text-align: center; color: #999; padding: 40px;">
          <i class="fa-solid fa-inbox" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
          No activities logged yet
        </div>
      `;
      return;
    }

    let html = '<div style="padding: 10px 0;">';
    
    // Display all activity logs
    activityLogs.forEach((log) => {
      const timestamp = new Date(log.timestamp || log.createdAt || 0);
      const timeStr = timestamp.toLocaleTimeString();
      const dateStr = timestamp.toLocaleDateString();
      
      let iconColor = '#666';
      let icon = 'fa-info-circle';
      
      const action = (log.action || '').toLowerCase();
      
      if (action.includes('status') || action.includes('update')) {
        icon = 'fa-check-circle';
        iconColor = '#4CAF50';
      } else if (action.includes('assigned') || action.includes('assign')) {
        icon = 'fa-user-check';
        iconColor = '#2196F3';
      } else if (action.includes('reported') || action.includes('incident')) {
        icon = 'fa-exclamation-circle';
        iconColor = '#FF5722';
      } else if (action.includes('logged in') || action.includes('login')) {
        icon = 'fa-sign-in-alt';
        iconColor = '#2196F3';
      } else if (action.includes('created') || action.includes('create')) {
        icon = 'fa-plus-circle';
        iconColor = '#FF9800';
      }

      html += `
        <div style="padding: 12px 15px; border-bottom: 1px solid #f0f0f0; display: flex; gap: 12px; align-items: flex-start;">
          <i class="fa-solid ${icon}" style="color: ${iconColor}; margin-top: 4px; font-size: 14px; min-width: 16px;"></i>
          <div style="flex: 1; min-width: 0;">
            <div style="color: #333; font-size: 13px; word-wrap: break-word; overflow-wrap: break-word; line-height: 1.4;">
              ${log.action || 'Activity logged'}
            </div>
            <div style="color: #999; font-size: 11px; margin-top: 3px;">
              ${dateStr} at ${timeStr}
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    console.log('[Settings] Activity logs rendered successfully:', activityLogs.length);
  } catch (error) {
    console.error('[Settings] Error loading activity logs:', error);
    const container = document.getElementById('settingsActivityLogContainer');
    if (container) {
      container.innerHTML = '<div style="color: red; padding: 20px;">Error loading activity logs</div>';
    }
  }
}

/**
 * Tab switching logic
 */
document.addEventListener('DOMContentLoaded', function(){
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const panels = Array.from(document.querySelectorAll('.panel'));

  function showPanel(id){
    panels.forEach(p => p.classList.toggle('hidden', p.id !== id));
    tabs.forEach(t => t.classList.toggle('active', t.dataset.target === id));
    
    // Load activity logs when activity tab is shown
    if (id === 'activity') {
      console.log('[Settings] Activity tab clicked');
      // Start polling on first access
      if (!activityLogsPollingStarted) {
        console.log('[Settings] Starting activity logs polling on first tab access');
        activityLogsPollingStarted = true;
        startActivityLogsPolling();
      }
      loadActivityLogs();
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      showPanel(tab.dataset.target);
    });
    tab.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === ' ') { 
        e.preventDefault(); 
        tab.click(); 
      }
    });
  });

  // Show default panel (account)
  const initial = tabs.find(t=>t.classList.contains('active'))?.dataset.target || 'account';
  showPanel(initial);
  
  // Initialize user settings
  UserSettingsService.init();
  
  // Setup save button handler
  const saveBtn = document.getElementById('saveSettingsBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const settings = UserSettingsService.getSettingsFromForm();
      if (UserSettingsService.saveSettings(settings)) {
        if (window.toast) {
          window.toast.success('Settings Saved', 'Your preferences have been saved successfully!');
        }
        console.log('[Settings] User settings saved');
      } else {
        if (window.toast) {
          window.toast.error('Save Failed', 'Could not save settings. Please try again.');
        }
      }
    });
  }
  
  console.log('[Settings] Tab switching initialized');
});

// Poll for activity log updates every 3 seconds when on settings page
setInterval(() => {
  const activityPanel = document.getElementById('activity');
  if (activityPanel && !activityPanel.classList.contains('hidden')) {
    loadActivityLogs();
  }
}, 3000);

// ============================================
// PI GPS CONFIGURATION SECTION
// ============================================

/**
 * Pi GPS Settings Management
 */
const PiGPSSettings = (() => {
  const PI_IP_KEY = 'sentinel_pi_gps_ip';
  const PI_PORT_KEY = 'sentinel_pi_gps_port';

  /**
   * Initialize Pi GPS functionality when DOM is ready
   */
  function init() {
    console.log('[PiGPS] Initializing Pi GPS settings...');
    
    loadSettings();
    updateStatusDisplay();
    
    // Attach event listeners
    const savePiBtn = document.getElementById('savePiBtn');
    const testPiBtn = document.getElementById('testPiBtn');
    const clearPiBtn = document.getElementById('clearPiBtn');
    
    if (savePiBtn) savePiBtn.addEventListener('click', saveSettings);
    if (testPiBtn) testPiBtn.addEventListener('click', testConnection);
    if (clearPiBtn) clearPiBtn.addEventListener('click', clearSettings);
    
    console.log('[PiGPS] Initialization complete');
  }

  /**
   * Load saved settings from localStorage
   */
  function loadSettings() {
    const ipInput = document.getElementById('piIpInput');
    const portInput = document.getElementById('piPortInput');
    
    const savedIp = localStorage.getItem(PI_IP_KEY);
    const savedPort = localStorage.getItem(PI_PORT_KEY);
    
    if (savedIp) ipInput.value = savedIp;
    if (savedPort) portInput.value = savedPort;
    
    console.log('[PiGPS] Settings loaded - IP:', savedIp, 'Port:', savedPort);
  }

  /**
   * Save settings to localStorage
   */
  function saveSettings() {
    const ipInput = document.getElementById('piIpInput');
    const portInput = document.getElementById('piPortInput');
    
    const ip = ipInput.value.trim();
    const port = portInput.value.trim();
    
    if (!ip) {
      showNotification('Please enter a valid IP address', 'error');
      return;
    }
    
    if (!port || isNaN(port) || port < 1 || port > 65535) {
      showNotification('Please enter a valid port (1-65535)', 'error');
      return;
    }
    
    localStorage.setItem(PI_IP_KEY, ip);
    localStorage.setItem(PI_PORT_KEY, port);
    
    console.log('[PiGPS] Settings saved - IP:', ip, 'Port:', port);
    updateStatusDisplay();
    showNotification('Pi GPS configuration saved successfully!', 'success');
  }

  /**
   * Test connection to Pi GPS server
   */
  async function testConnection() {
    const ipInput = document.getElementById('piIpInput');
    const portInput = document.getElementById('piPortInput');
    const testBtn = document.getElementById('testPiBtn');
    
    const ip = ipInput.value.trim();
    const port = portInput.value.trim();
    
    if (!ip || !port) {
      showNotification('Please enter both IP and port first', 'warning');
      return;
    }
    
    testBtn.disabled = true;
    testBtn.innerHTML = '<i class="fa-solid fa-spinner" style="animation: spin 1s linear infinite;"></i> Testing...';
    
    try {
      const url = `http://${ip}:${port}/health`;
      console.log('[PiGPS] Testing connection to:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[PiGPS] Connection successful:', data);
        showNotification('✓ Connection successful! Pi GPS server is responding.', 'success');
        updateStatusDisplay(true);
      } else {
        showNotification('Server responded with error: ' + response.status, 'error');
      }
    } catch (error) {
      console.error('[PiGPS] Connection error:', error);
      showNotification('✗ Cannot connect to Pi GPS server. Check the IP and port.', 'error');
      updateStatusDisplay(false);
    } finally {
      testBtn.disabled = false;
      testBtn.innerHTML = '<i class="fa-solid fa-plug-circle-check"></i> Test Connection';
    }
  }

  /**
   * Clear saved settings
   */
  function clearSettings() {
    if (confirm('Are you sure you want to clear the Pi GPS configuration?')) {
      localStorage.removeItem(PI_IP_KEY);
      localStorage.removeItem(PI_PORT_KEY);
      
      document.getElementById('piIpInput').value = '192.168.0.111';
      document.getElementById('piPortInput').value = '5000';
      
      updateStatusDisplay(false);
      console.log('[PiGPS] Settings cleared');
      showNotification('Pi GPS configuration cleared', 'info');
    }
  }

  /**
   * Update status display
   */
  function updateStatusDisplay(testResult = null) {
    const ip = localStorage.getItem(PI_IP_KEY);
    const port = localStorage.getItem(PI_PORT_KEY);
    const statusDot = document.getElementById('piStatusDot');
    const statusText = document.getElementById('piStatusText');
    
    // Only update if elements exist
    if (!statusDot || !statusText) {
      console.log('[PiGPS] Status display elements not found on this page');
      return;
    }
    
    if (!ip || !port) {
      statusDot.style.background = '#999';
      statusText.innerHTML = '❌ Not configured';
      statusText.style.color = '#666';
    } else if (testResult === true) {
      statusDot.style.background = '#4CAF50';
      statusText.innerHTML = `✓ Connected: ${ip}:${port}`;
      statusText.style.color = '#4CAF50';
    } else if (testResult === false) {
      statusDot.style.background = '#f44336';
      statusText.innerHTML = `⚠ Configured but not responding: ${ip}:${port}`;
      statusText.style.color = '#f44336';
    } else {
      statusDot.style.background = '#2196F3';
      statusText.innerHTML = `✓ Configured: ${ip}:${port}`;
      statusText.style.color = '#2196F3';
    }
  }

  /**
   * Get Pi GPS settings
   */
  function getSettings() {
    return {
      ip: localStorage.getItem(PI_IP_KEY),
      port: localStorage.getItem(PI_PORT_KEY)
    };
  }

  /**
   * Show notification
   */
  function showNotification(message, type = 'info') {
    console.log('[PiGPS] Notification:', type, message);
    
    // Use existing notification system if available
    if (typeof showNotif === 'function') {
      showNotif(message, type);
    } else {
      // Fallback notification
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        border-radius: 4px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
      `;
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => notification.remove(), 3000);
    }
  }

  return {
    init,
    getSettings,
    loadSettings,
    saveSettings,
    testConnection,
    clearSettings,
    updateStatusDisplay
  };
})();

/**
 * Settings Info Icon Handler
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
        animation: fadeIn 0.3s ease;
      `;

      // Create modal content
      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        animation: slideUp 0.3s ease;
      `;

      modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #333; font-size: 22px;">
            <i class="fa-solid fa-cog" style="color: #B00020; margin-right: 10px;"></i>
            Settings Information
          </h2>
          <button id="closeModal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>

        <div style="color: #666; line-height: 1.8;">
          <p><strong>Configure system settings to customize your Sentinel experience:</strong></p>

          <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; border-left: 4px solid #B00020;">
            <h3 style="margin: 0 0 10px 0; color: #333;">General Settings</h3>
            <p style="margin: 0;">Customize dashboard appearance, language preferences, and notification settings to suit your needs.</p>
          </div>

          <div style="margin-top: 15px; padding: 15px; background: #f5f5f5; border-radius: 8px; border-left: 4px solid #B00020;">
            <h3 style="margin: 0 0 10px 0; color: #333;">User Preferences</h3>
            <p style="margin: 0;">Adjust notification frequency, theme preferences, and privacy settings.</p>
          </div>

          <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
            <p style="margin: 0;"><strong>💡 Tip:</strong> After making changes, click "Save Changes" to apply them.</p>
          </div>
        </div>

        <div style="margin-top: 25px; display: flex; justify-content: flex-end; gap: 10px;">
          <button id="closeModalBtn" style="background: white; border: 2px solid #B00020; color: #B00020; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s;">Close</button>
        </div>
      `;

      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      // Close modal on button click
      const closeButton = document.getElementById('closeModal');
      const closeButtonBtn = document.getElementById('closeModalBtn');
      
      const closeModal = () => {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => modal.remove(), 300);
      };

      closeButton.addEventListener('click', closeModal);
      closeButtonBtn.addEventListener('click', closeModal);

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

  console.log('[Settings] Info icon handler initialized');
});

// Initialize Pi GPS settings when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  PiGPSSettings.init();
});

