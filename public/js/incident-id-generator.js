/**
 * Incident ID Generator
 * Generates date-based incident IDs in the format INC-YYYYMMDD-NNN
 * Where NNN is the sequential global counter across all incidents
 */

class IncidentIDGenerator {
  constructor() {
    this.globalCounter = 0;
    this.incidentMap = new Map(); // Maps Firebase key to date-based ID
    this.loadFromStorage();
  }

  /**
   * Load global counter and incident map from local storage
   */
  loadFromStorage() {
    // Load global counter
    const storedCounter = localStorage.getItem('incident_global_counter');
    if (storedCounter) {
      this.globalCounter = parseInt(storedCounter, 10);
      console.log('[IncidentIDGenerator] Loaded global counter from storage:', this.globalCounter);
    }

    // Load incident map
    const storedMap = localStorage.getItem('incident_map');
    if (storedMap) {
      try {
        const mapData = JSON.parse(storedMap);
        this.incidentMap = new Map(Object.entries(mapData));
        console.log('[IncidentIDGenerator] Loaded incident map with', this.incidentMap.size, 'entries');
      } catch (e) {
        console.warn('[IncidentIDGenerator] Failed to load incident map:', e);
        this.incidentMap = new Map();
      }
    }
  }

  /**
   * Save global counter and incident map to local storage
   */
  saveToStorage() {
    localStorage.setItem('incident_global_counter', this.globalCounter.toString());
    
    // Convert Map to object for JSON serialization
    const mapObj = Object.fromEntries(this.incidentMap);
    localStorage.setItem('incident_map', JSON.stringify(mapObj));
  }

  /**
   * Get date string from timestamp in YYYYMMDD format
   */
  getDateString(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Get the next global incident number
   */
  getNextGlobalNumber() {
    this.globalCounter++;
    this.saveToStorage();
    return this.globalCounter;
  }

  /**
   * Format a date-based ID with global counter
   */
  formatID(dateString, globalNumber) {
    return `INC-${dateString}-${String(globalNumber).padStart(3, '0')}`;
  }

  /**
   * Get or assign an ID for a given incident
   * If the Firebase key has been seen before, return the same ID
   * Otherwise, generate a new date-based ID based on incident timestamp
   */
  getIDForIncident(firebaseKey, timestamp) {
    if (this.incidentMap.has(firebaseKey)) {
      return this.incidentMap.get(firebaseKey);
    }

    const dateString = this.getDateString(timestamp);
    const globalNumber = this.getNextGlobalNumber();
    const newID = this.formatID(dateString, globalNumber);
    
    this.incidentMap.set(firebaseKey, newID);
    this.saveToStorage();
    return newID;
  }

  /**
   * Process an array of incidents and assign date-based IDs
   * @param {Array} incidents - Array of incident objects with Firebase keys
   * @returns {Array} - Incidents with 'id' field containing date-based ID
   */
  processIncidents(incidents) {
    // First, sort by timestamp to ensure correct numbering
    const sorted = [...incidents].sort((a, b) => {
      const aTime = new Date(a.timestamp || a.createdAt || 0).getTime();
      const bTime = new Date(b.timestamp || b.createdAt || 0).getTime();
      return aTime - bTime; // Oldest first
    });

    return sorted.map(incident => {
      const firebaseKey = incident.firebaseKey || incident.id;
      const timestamp = incident.timestamp || incident.createdAt || 0;
      const sequentialID = this.getIDForIncident(firebaseKey, timestamp);

      return {
        ...incident,
        id: sequentialID,
        firebaseKey: firebaseKey,
      };
    });
  }

  /**
   * Reset the counter (useful for testing or admin functions)
   */
  resetCounter() {
    this.incidentCounter = 0;
    this.incidentMap.clear();
    this.saveCounterToStorage();
    console.log('[IncidentIDGenerator] Counter reset to 0');
  }
}

// Create global instance
const incidentIDGenerator = new IncidentIDGenerator();
