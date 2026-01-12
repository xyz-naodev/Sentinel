/**
 * Sentinel App Utilities
 * Provides error handling, logging, DOM validation, and loading states
 */

// ==================== LOGGER ====================
const Logger = {
  levels: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  },
  currentLevel: 0, // Set to 0 for DEBUG, increase to suppress lower levels

  log(level, message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const levelName = Object.keys(this.levels).find(key => this.levels[key] === level);
    
    if (level >= this.currentLevel) {
      const logMessage = `[${timestamp}] [${levelName}] ${message}`;
      
      switch (level) {
        case this.levels.DEBUG:
          console.debug(logMessage, data || '');
          break;
        case this.levels.INFO:
          console.info(logMessage, data || '');
          break;
        case this.levels.WARN:
          console.warn(logMessage, data || '');
          break;
        case this.levels.ERROR:
          console.error(logMessage, data || '');
          break;
      }
    }
  },

  debug(message, data) {
    this.log(this.levels.DEBUG, message, data);
  },

  info(message, data) {
    this.log(this.levels.INFO, message, data);
  },

  warn(message, data) {
    this.log(this.levels.WARN, message, data);
  },

  error(message, data) {
    this.log(this.levels.ERROR, message, data);
  }
};

// ==================== DOM VALIDATOR ====================
const DOMValidator = {
  /**
   * Check if element exists and return it
   * @param {string} selector - CSS selector
   * @param {string} context - Context for error message
   * @returns {HTMLElement|null}
   */
  getElement(selector, context = 'Document') {
    try {
      const element = document.querySelector(selector);
      if (!element) {
        Logger.warn(`Element not found: "${selector}" in ${context}`);
        return null;
      }
      Logger.debug(`Element found: "${selector}"`);
      return element;
    } catch (error) {
      Logger.error(`Invalid selector: "${selector}"`, error.message);
      return null;
    }
  },

  /**
   * Check if elements exist and return them
   * @param {string} selector - CSS selector
   * @param {string} context - Context for error message
   * @returns {NodeList}
   */
  getElements(selector, context = 'Document') {
    try {
      const elements = document.querySelectorAll(selector);
      Logger.debug(`Found ${elements.length} elements matching: "${selector}"`);
      return elements;
    } catch (error) {
      Logger.error(`Invalid selector: "${selector}"`, error.message);
      return [];
    }
  },

  /**
   * Get element and validate it exists before manipulation
   * @param {string} selector - CSS selector
   * @param {string} operation - Operation being performed
   * @returns {HTMLElement|null}
   */
  validateElement(selector, operation = 'operation') {
    const element = this.getElement(selector);
    if (!element) {
      Logger.error(`Cannot perform ${operation}: Element "${selector}" does not exist`);
      return null;
    }
    return element;
  },

  /**
   * Wait for element to be available in DOM
   * @param {string} selector - CSS selector
   * @param {number} timeout - Max wait time in ms
   * @returns {Promise<HTMLElement|null>}
   */
  async waitForElement(selector, timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) {
        Logger.info(`Element available after ${Date.now() - startTime}ms: "${selector}"`);
        return element;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    Logger.error(`Timeout waiting for element: "${selector}" (${timeout}ms)`);
    return null;
  }
};

// ==================== ERROR HANDLER ====================
const ErrorHandler = {
  /**
   * Handle errors with logging and user notification
   * @param {Error} error - Error object
   * @param {string} context - Context where error occurred
   * @param {HTMLElement} displayElement - Element to display error message
   */
  handle(error, context = 'Unknown', displayElement = null) {
    const errorMessage = error?.message || String(error);
    Logger.error(`Error in ${context}: ${errorMessage}`, error);

    if (displayElement) {
      this.displayError(errorMessage, displayElement);
    }

    return { success: false, error: errorMessage, context };
  },

  /**
   * Display error message to user
   * @param {string} message - Error message
   * @param {HTMLElement} element - Element to display in
   * @param {number} duration - How long to show (ms), 0 = persistent
   */
  displayError(message, element, duration = 5000) {
    if (!element) return;

    element.textContent = `❌ ${message}`;
    element.style.color = '#d90429';
    element.style.display = 'block';
    element.style.padding = '12px';
    element.style.marginTop = '10px';
    element.style.borderRadius = '4px';
    element.style.backgroundColor = '#ffe6e6';
    element.style.border = '1px solid #d90429';

    Logger.info(`Error displayed to user: ${message}`);

    if (duration > 0) {
      setTimeout(() => {
        element.style.display = 'none';
      }, duration);
    }
  },

  /**
   * Display success message to user
   * @param {string} message - Success message
   * @param {HTMLElement} element - Element to display in
   * @param {number} duration - How long to show (ms)
   */
  displaySuccess(message, element, duration = 3000) {
    if (!element) return;

    element.textContent = `✓ ${message}`;
    element.style.color = '#28a745';
    element.style.display = 'block';
    element.style.padding = '12px';
    element.style.marginTop = '10px';
    element.style.borderRadius = '4px';
    element.style.backgroundColor = '#d4edda';
    element.style.border = '1px solid #28a745';

    Logger.info(`Success message displayed: ${message}`);

    if (duration > 0) {
      setTimeout(() => {
        element.style.display = 'none';
      }, duration);
    }
  }
};

// ==================== LOADING SPINNER ====================
const LoadingSpinner = {
  /**
   * Show loading spinner
   * @param {HTMLElement} container - Container to show spinner in
   * @param {string} message - Loading message
   */
  show(container, message = 'Loading...') {
    if (!container) {
      Logger.warn('Cannot show spinner: container is null');
      return;
    }

    // Remove existing spinner
    this.hide(container);

    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner-overlay';
    spinner.innerHTML = `
      <div class="spinner-container">
        <div class="spinner"></div>
        <p class="spinner-message">${message}</p>
      </div>
    `;

    container.style.position = 'relative';
    container.appendChild(spinner);

    Logger.debug(`Loading spinner shown: "${message}"`);
  },

  /**
   * Hide loading spinner
   * @param {HTMLElement} container - Container to hide spinner from
   */
  hide(container) {
    if (!container) return;

    const spinner = container.querySelector('.loading-spinner-overlay');
    if (spinner) {
      spinner.remove();
      Logger.debug('Loading spinner hidden');
    }
  },

  /**
   * Show temporary loading state on button
   * @param {HTMLElement} button - Button element
   * @param {boolean} isLoading - Loading state
   */
  setButtonLoading(button, isLoading) {
    if (!button) {
      Logger.warn('Cannot set button loading state: button is null');
      return;
    }

    if (isLoading) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.innerHTML = '<span class="spinner-dots"></span> Loading...';
      Logger.debug('Button set to loading state');
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || 'Submit';
      Logger.debug('Button loading state cleared');
    }
  }
};

// ==================== SAFE EVENT LISTENER ====================
const EventHelper = {
  /**
   * Safely add event listener with error handling
   * @param {HTMLElement} element - Target element
   * @param {string} eventType - Event type (click, submit, etc.)
   * @param {Function} callback - Event handler
   * @param {string} context - Context for error logging
   */
  on(element, eventType, callback, context = 'EventListener') {
    if (!element) {
      Logger.warn(`Cannot attach ${eventType} listener: element is null`);
      return;
    }

    try {
      element.addEventListener(eventType, (event) => {
        try {
          callback(event);
        } catch (error) {
          Logger.error(`Error in ${eventType} handler (${context}):`, error.message);
          ErrorHandler.handle(error, `${eventType} event in ${context}`);
        }
      });
      Logger.debug(`${eventType} listener attached: ${context}`);
    } catch (error) {
      Logger.error(`Failed to attach ${eventType} listener:`, error.message);
    }
  }
};

// ==================== STORAGE HELPER ====================
const StorageHelper = {
  /**
   * Safely get from localStorage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if not found
   * @returns {*}
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        Logger.debug(`Storage item not found: "${key}"`);
        return defaultValue;
      }
      
      try {
        const parsed = JSON.parse(item);
        Logger.debug(`Storage item retrieved: "${key}"`);
        return parsed;
      } catch {
        // Return as string if not JSON
        return item;
      }
    } catch (error) {
      Logger.error(`Failed to retrieve from storage: "${key}"`, error.message);
      return defaultValue;
    }
  },

  /**
   * Safely set to localStorage
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @returns {boolean}
   */
  set(key, value) {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
      Logger.debug(`Storage item saved: "${key}"`);
      return true;
    } catch (error) {
      Logger.error(`Failed to save to storage: "${key}"`, error.message);
      return false;
    }
  },

  /**
   * Safely remove from localStorage
   * @param {string} key - Storage key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      Logger.debug(`Storage item removed: "${key}"`);
    } catch (error) {
      Logger.error(`Failed to remove from storage: "${key}"`, error.message);
    }
  },

  /**
   * Clear all localStorage
   */
  clear() {
    try {
      localStorage.clear();
      Logger.info('All storage cleared');
    } catch (error) {
      Logger.error('Failed to clear storage:', error.message);
    }
  }
};

// ==================== INITIALIZATION ====================
// Initialize logging on page load
document.addEventListener('DOMContentLoaded', () => {
  Logger.info('Sentinel App Utilities Module Loaded');
});

Logger.info('Utilities module script loaded');
