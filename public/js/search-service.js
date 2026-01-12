/**
 * Search Service
 * Handles searching incidents across incident ID, type, location, and description
 * Includes debouncing, highlighting, and search history
 */

class SearchService {
  constructor() {
    this.incidents = [];
    this.searchHistory = [];
    this.debounceTimer = null;
    this.DEBOUNCE_DELAY = 300; // ms
    this.MAX_HISTORY = 10;
    this.loadSearchHistory();
  }

  /**
   * Load search history from localStorage
   */
  loadSearchHistory() {
    const stored = localStorage.getItem('search_history');
    if (stored) {
      try {
        this.searchHistory = JSON.parse(stored);
      } catch (e) {
        this.searchHistory = [];
      }
    }
  }

  /**
   * Save search history to localStorage
   */
  saveSearchHistory() {
    // Keep only the last MAX_HISTORY searches
    const unique = [...new Set(this.searchHistory)].slice(0, this.MAX_HISTORY);
    localStorage.setItem('search_history', JSON.stringify(unique));
  }

  /**
   * Add query to search history
   */
  addToHistory(query) {
    if (query && query.trim()) {
      // Remove if already exists, then add to front
      this.searchHistory = this.searchHistory.filter(q => q !== query);
      this.searchHistory.unshift(query);
      this.saveSearchHistory();
    }
  }

  /**
   * Get search history
   */
  getHistory() {
    return this.searchHistory;
  }

  /**
   * Clear search history
   */
  clearHistory() {
    this.searchHistory = [];
    localStorage.removeItem('search_history');
  }

  /**
   * Set incidents to search through
   */
  setIncidents(incidents) {
    this.incidents = incidents || [];
    console.log('[SearchService] setIncidents called with', this.incidents.length, 'incidents');
    if (this.incidents.length > 0) {
      console.log('[SearchService] First incident sample:', this.incidents[0]);
    }
  }

  /**
   * Search incidents by query
   * Searches across: ID, Type, Location, Description
   * Returns array of matching incidents with highlighted fields
   */
  search(query) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.trim().toLowerCase();
    const results = [];

    // Get incidents - try multiple sources to ensure we have data
    let incidentsToSearch = null;
    
    // First priority: internal array (updated by setIncidents from dashboard/incireport)
    if (this.incidents && this.incidents.length > 0) {
      incidentsToSearch = this.incidents;
      console.log('[SearchService] Using internal incidents array:', this.incidents.length, 'incidents');
    }
    // Second: local allIncidents (used in incireport.html)
    else if (typeof window.allIncidents !== 'undefined' && window.allIncidents && window.allIncidents.length > 0) {
      incidentsToSearch = window.allIncidents;
      console.log('[SearchService] Using allIncidents from window');
    }
    // Third: try firebaseService.incidents
    else if (typeof firebaseService !== 'undefined' && firebaseService.incidents && firebaseService.incidents.length > 0) {
      incidentsToSearch = firebaseService.incidents;
      console.log('[SearchService] Using firebaseService.incidents');
    }

    if (!incidentsToSearch || incidentsToSearch.length === 0) {
      console.warn('[SearchService] No incidents available for search from any source');
      return [];
    }
    
    console.log('[SearchService] Searching', incidentsToSearch.length, 'incidents for query:', query);

    incidentsToSearch.forEach(incident => {
      let matchScore = 0;
      const highlighted = { ...incident };

      // Search sequential ID (high priority)
      if (incident.sequentialId) {
        const seqId = String(incident.sequentialId).toLowerCase();
        if (seqId.includes(searchTerm)) {
          matchScore += 10; // Highest priority for ID match
          highlighted.sequentialId = this.highlightMatch(incident.sequentialId, searchTerm);
        }
      }

      // Search Type
      if (incident.type) {
        const type = String(incident.type).toLowerCase();
        if (type.includes(searchTerm)) {
          matchScore += 8;
          highlighted.type = this.highlightMatch(incident.type, searchTerm);
        }
      }

      // Search Location
      if (incident.location) {
        const location = String(incident.location).toLowerCase();
        if (location.includes(searchTerm)) {
          matchScore += 5;
          highlighted.location = this.highlightMatch(incident.location, searchTerm);
        }
      }

      // Search Description
      if (incident.description) {
        const description = String(incident.description).toLowerCase();
        if (description.includes(searchTerm)) {
          matchScore += 3;
          highlighted.description = this.highlightMatch(incident.description, searchTerm);
        }
      }

      // Search Severity
      if (incident.severity) {
        const severity = String(incident.severity).toLowerCase();
        if (severity.includes(searchTerm)) {
          matchScore += 3;
        }
      }

      // Search Status
      if (incident.status) {
        const status = String(incident.status).toLowerCase();
        if (status.includes(searchTerm)) {
          matchScore += 2;
        }
      }

      // If match found, add to results
      if (matchScore > 0) {
        results.push({
          ...highlighted,
          matchScore: matchScore,
          originalData: incident
        });
      }
    });

    // Sort by match score (highest first)
    results.sort((a, b) => b.matchScore - a.matchScore);

    console.log('[SearchService] Found', results.length, 'matches for query:', query);
    return results;
  }

  /**
   * Highlight search term in text
   * Returns HTML with highlighted matches
   */
  highlightMatch(text, searchTerm) {
    if (!text || !searchTerm) return text;

    const textStr = String(text);
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return textStr.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  /**
   * Debounced search - prevents firing too often
   */
  searchDebounced(query, callback) {
    clearTimeout(this.debounceTimer);
    
    this.debounceTimer = setTimeout(() => {
      const results = this.search(query);
      if (callback) callback(results);
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * Format search results as HTML
   */
  formatResults(results) {
    if (!results || results.length === 0) {
      return '<div class="search-no-results">No incidents found</div>';
    }

    let html = `<div class="search-results"><div class="search-result-count">${results.length} result${results.length !== 1 ? 's' : ''} found</div>`;

    results.forEach(incident => {
      const id = incident.sequentialId || incident.id || 'N/A';
      const type = incident.type || 'Unknown';
      const severity = incident.severity || 'LOW';
      const latitude = incident.latitude || 'N/A';
      const longitude = incident.longitude || 'N/A';
      const timestamp = incident.createdAt || incident.timestamp ? new Date(incident.createdAt || incident.timestamp).toLocaleString() : 'N/A';
      const description = incident.description || 'No description';

      // Color for severity
      let severityColor = '#4CAF50';
      if (severity === 'CRITICAL') severityColor = '#FF0000';
      else if (severity === 'HIGH') severityColor = '#FF9800';
      else if (severity === 'MEDIUM') severityColor = '#FFC107';

      html += `
        <div class="search-result-item" data-incident-id="${incident.originalData?.id || incident.id}" data-latitude="${latitude}" data-longitude="${longitude}">
          <div class="search-result-header">
            <span class="search-result-id">${id}</span>
            <span class="search-result-type">${type}</span>
            <span class="search-result-severity" style="background-color: ${severityColor}40; color: ${severityColor}; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: bold;">
              ${severity}
            </span>
          </div>
          <div class="search-result-details">
            <div><strong>Coordinates:</strong> ${latitude}, ${longitude}</div>
            <div><strong>Description:</strong> ${description}</div>
            <div style="font-size: 11px; color: #999; margin-top: 4px;">${timestamp}</div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  /**
   * Get incident count
   */
  getIncidentCount() {
    return this.incidents.length;
  }
}

// Create global instance
const searchService = new SearchService();

console.log('[SearchService] Initialized');
