/**
 * SENTINEL APP - ERROR HANDLING & LOGGING QUICK REFERENCE
 * 
 * This guide shows how to use the new error handling utilities
 */

// ========================================
// 1. LOGGING - Console debugging
// ========================================

// Different log levels
Logger.debug('Detailed info for debugging');           // Only shows in DEBUG mode
Logger.info('Important application events');           // Always shown
Logger.warn('Unexpected but recoverable issues');      // Always shown
Logger.error('Critical failures and exceptions');      // Always shown

// With data
Logger.info('User logged in', { username: 'admin', timestamp: Date.now() });
Logger.error('Authentication failed', error.message);


// ========================================
// 2. DOM VALIDATION - Safe element access
// ========================================

// Get single element (returns null if not found)
const button = DOMValidator.getElement('#myButton');
if (!button) {
  Logger.warn('Button not found');
  return;
}

// Get multiple elements
const items = DOMValidator.getElements('.menu-item');
Logger.info(`Found ${items.length} menu items`);

// Validate element exists before using (logs error if missing)
const form = DOMValidator.validateElement('#loginForm', 'Login initialization');
if (!form) return;  // Already logged error, exit

// Wait for element to load (async)
const mapContainer = await DOMValidator.waitForElement('#map', 5000);
if (!mapContainer) {
  Logger.error('Map container failed to load within 5 seconds');
}


// ========================================
// 3. ERROR HANDLING - Display errors to users
// ========================================

// Handle error and display to user
try {
  // Your code here
} catch (error) {
  const errorElement = document.getElementById('error-message');
  ErrorHandler.handle(error, 'My Operation Context', errorElement);
  // Will log error AND display it to user
}

// Display custom error message
const errorDiv = document.getElementById('message');
ErrorHandler.displayError('Username is required', errorDiv, 5000);  // Auto-hide after 5s

// Display success message
ErrorHandler.displaySuccess('Changes saved successfully!', errorDiv, 3000);


// ========================================
// 4. LOADING STATES - Show busy indicators
// ========================================

// Show spinner overlay
const container = document.getElementById('content');
LoadingSpinner.show(container, 'Loading your data...');

// Hide spinner
LoadingSpinner.hide(container);

// Button loading state
const submitBtn = document.getElementById('submit');
LoadingSpinner.setButtonLoading(submitBtn, true);   // Shows "Loading..." 
// Do async work...
LoadingSpinner.setButtonLoading(submitBtn, false);  // Reset


// ========================================
// 5. SAFE EVENT LISTENERS - Catch errors in handlers
// ========================================

// Regular addEventListener (will log any errors in handler)
const myBtn = document.getElementById('button');
EventHelper.on(myBtn, 'click', (event) => {
  // If error occurs here, it's caught and logged
  console.log('Button clicked');
}, 'My Button Handler');  // Context for logging


// ========================================
// 6. LOCAL STORAGE - Safe data persistence
// ========================================

// Get from storage (with default value)
const user = StorageHelper.get('user', null);
const settings = StorageHelper.get('settings', {});

// Set to storage (safe JSON serialization)
StorageHelper.set('user', { name: 'John', role: 'admin' });

// Remove from storage
StorageHelper.remove('sessionToken');

// Clear all storage
StorageHelper.clear();


// ========================================
// EXAMPLE: Complete Login Form Implementation
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  try {
    Logger.info('Initializing login form');

    // 1. Validate all elements exist
    const form = DOMValidator.validateElement('#loginForm', 'Login form');
    const usernameInput = DOMValidator.validateElement('#username', 'Username input');
    const passwordInput = DOMValidator.validateElement('#password', 'Password input');
    const submitBtn = DOMValidator.validateElement('#submit', 'Submit button');
    const errorDisplay = DOMValidator.getElement('#error');

    if (!form || !usernameInput || !passwordInput || !submitBtn) {
      throw new Error('Required form elements missing');
    }

    // 2. Add safe event listener
    EventHelper.on(form, 'submit', async (e) => {
      e.preventDefault();

      try {
        // 3. Validate inputs
        const username = usernameInput.value.trim();
        if (!username) {
          throw new Error('Username required');
        }

        // 4. Show loading state
        LoadingSpinner.setButtonLoading(submitBtn, true);
        Logger.info('Form submission started', { username });

        // 5. Do async work
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });

        if (!response.ok) {
          throw new Error('Login failed');
        }

        const data = await response.json();

        // 6. Save to storage safely
        const saved = StorageHelper.set('user', data);
        if (!saved) {
          throw new Error('Failed to save session');
        }

        // 7. Show success
        Logger.info('Login successful');
        ErrorHandler.displaySuccess('Login successful!', errorDisplay);
        
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);

      } catch (error) {
        // 8. Show error to user
        Logger.error('Login error', error.message);
        LoadingSpinner.setButtonLoading(submitBtn, false);
        ErrorHandler.displayError(error.message, errorDisplay, 5000);
      }

    }, 'Login Form Submit');

    Logger.info('Login form initialized successfully');

  } catch (error) {
    Logger.error('Failed to initialize login form', error.message);
  }
});


// ========================================
// DEBUGGING TIPS
// ========================================

/*
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. You'll see all logs with timestamps
4. Use console filter to show only errors:
   - Type: Logger.error
5. Click on any log to see the data
6. Use Logger.currentLevel to change verbosity:
   - Logger.currentLevel = 0 (DEBUG - most verbose)
   - Logger.currentLevel = 1 (INFO only)
   - Logger.currentLevel = 2 (WARN and ERROR only)
   - Logger.currentLevel = 3 (ERROR only)
7. Search console for specific operations
*/


// ========================================
// COMMON PATTERNS
// ========================================

// Pattern 1: Safe initialization
const initializeFeature = () => {
  try {
    Logger.info('Starting feature initialization');
    const element = DOMValidator.validateElement('#feature', 'Feature init');
    if (!element) return;
    // Initialize...
    Logger.info('Feature initialized successfully');
  } catch (error) {
    Logger.error('Feature initialization failed', error.message);
  }
};

// Pattern 2: Safe element update
const updateElement = (selector, content) => {
  try {
    const element = DOMValidator.validateElement(selector, 'Update element');
    if (!element) return;
    element.textContent = content;
    Logger.debug(`Updated ${selector}`);
  } catch (error) {
    Logger.error('Element update failed', error.message);
  }
};

// Pattern 3: Safe API call
const fetchData = async (url) => {
  const container = document.getElementById('data-container');
  
  try {
    LoadingSpinner.show(container, 'Fetching data...');
    Logger.info('Fetching data', { url });
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    LoadingSpinner.hide(container);
    Logger.info('Data fetched successfully', { items: data.length });
    return data;
    
  } catch (error) {
    Logger.error('Data fetch failed', error.message);
    LoadingSpinner.hide(container);
    ErrorHandler.displayError('Failed to load data', container);
    return [];
  }
};
