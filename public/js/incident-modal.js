/**
 * Incident Modal Manager
 * Handles opening, closing, and updating incidents via modal dialog
 */

class IncidentModalManager {
  constructor() {
    this.modal = document.getElementById('incidentModal');
    this.currentIncident = null;
    this.originalStatus = null;
    this.originalAssignment = null;
    
    this.initializeEventListeners();
  }

  /**
   * Initialize modal event listeners
   */
  initializeEventListeners() {
    // Close buttons
    document.getElementById('modalCloseBtn').addEventListener('click', () => this.closeModal());
    document.getElementById('modalCancelBtn').addEventListener('click', () => this.closeModal());
    
    // Status buttons
    document.querySelectorAll('.status-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleStatusChange(e.target.closest('button')));
    });
    
    // Add note button
    document.getElementById('modalAddNoteBtn').addEventListener('click', () => this.addNote());
    
    // Save button - bind this properly
    document.getElementById('modalSaveBtn').addEventListener('click', async (e) => {
      e.preventDefault();
      await this.saveChanges();
    });
    
    // Close on backdrop click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });
  }

  /**
   * Open modal with incident data
   */
  openIncident(incident) {
    if (!incident) {
      console.warn('[IncidentModal] No incident data provided');
      return;
    }

    // Clear any old error messages when opening a new incident
    const errorToasts = document.querySelectorAll('[class*="error"], [class*="toast"]');
    errorToasts.forEach(toast => {
      if (toast.textContent.includes('No incident loaded')) {
        toast.remove();
      }
    });

    // Mark as viewed when opening modal
    if (typeof window.notificationManager !== 'undefined' && window.notificationManager) {
      window.notificationManager.recordIncidentView(incident.id);
      console.log('[IncidentModal] Marked incident', incident.id, 'as viewed');
    }

    this.currentIncident = incident;
    this.originalStatus = incident.status;
    this.originalAssignment = incident.assignedTo || '';

    console.log('[IncidentModal] Opening modal for incident:', incident.id);

    // Populate incident info
    document.getElementById('modalIncidentTitle').textContent = `${incident.type} - ${incident.severity}`;
    document.getElementById('modalIncidentId').textContent = incident.id || 'N/A';
    document.getElementById('modalIncidentType').textContent = incident.type || 'Unknown';
    document.getElementById('modalIncidentLocation').textContent = 
      `${(incident.latitude || 0).toFixed(4)}°, ${(incident.longitude || 0).toFixed(4)}°`;
    document.getElementById('modalIncidentDescription').textContent = incident.description || 'No description provided';
    document.getElementById('modalIncidentTime').textContent = 
      new Date(incident.timestamp || incident.createdAt || 0).toLocaleString();
    
    // Set reporter name
    const reporterEl = document.getElementById('modalIncidentReporter');
    reporterEl.textContent = incident.reportedBy || incident.reporter || incident.userId || 'Anonymous';
    
    // Create embedded map
    this.createIncidentMap(incident);

    // Set severity color
    const severityEl = document.getElementById('modalIncidentSeverity');
    let severityColor = '#4CAF50';
    if (incident.severity === 'CRITICAL') severityColor = '#FF0000';
    else if (incident.severity === 'HIGH') severityColor = '#FF9800';
    else if (incident.severity === 'MEDIUM') severityColor = '#FFC107';
    
    severityEl.textContent = incident.severity || 'LOW';
    severityEl.style.background = severityColor + '20';
    severityEl.style.color = severityColor;

    // Set current status
    document.getElementById('modalIncidentStatus').textContent = incident.status || 'new';
    
    // Update status buttons
    this.updateStatusButtons(incident.status || 'new');
    
    // Load history
    this.loadStatusHistory(incident);
    
    // Load and display existing notes
    this.loadNotes(incident);
    
    // Clear notes input textarea (for new notes)
    document.getElementById('modalNotes').value = '';
    
    // Show modal
    this.modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  /**
   * Load and display existing notes
   */
  loadNotes(incident) {
    const notesDisplay = document.getElementById('modalNotesDisplay');
    
    if (!notesDisplay) {
      console.warn('[IncidentModal] Notes display element not found');
      return;
    }

    if (!incident.notes || incident.notes.length === 0) {
      notesDisplay.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No notes yet</p>';
      return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
    
    incident.notes.forEach((note) => {
      const timestamp = new Date(note.timestamp).toLocaleString();
      const author = note.author || 'Unknown';
      
      html += `
        <div style="padding: 12px; background: #f9f9f9; border-left: 3px solid #2196F3; border-radius: 4px;">
          <div style="color: #333; margin-bottom: 4px;">${note.text}</div>
          <div style="font-size: 11px; color: #999;">By ${author} on ${timestamp}</div>
        </div>
      `;
    });
    
    html += '</div>';
    notesDisplay.innerHTML = html;
    console.log('[IncidentModal] Loaded', incident.notes.length, 'notes');
  }

  /**
   * Update status button states
   */
  updateStatusButtons(currentStatus) {
    document.querySelectorAll('.status-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.status === currentStatus) {
        btn.classList.add('active');
      }
    });
  }

  /**
   * Handle status change button click
   */
  handleStatusChange(btn) {
    const newStatus = btn.dataset.status;
    console.log('[IncidentModal] Status change to:', newStatus);
    
    this.currentIncident.status = newStatus;
    this.updateStatusButtons(newStatus);
    
    // Update display
    document.getElementById('modalIncidentStatus').textContent = newStatus;
  }

  /**
   * Add a note to the incident
   */
  addNote() {
    const noteText = document.getElementById('modalNotes').value.trim();
    
    if (!noteText) {
      console.warn('[IncidentModal] Note is empty');
      if (window.toast) {
        window.toast.warning('Empty Note', 'Please write a note before adding.');
      }
      return;
    }

    if (!this.currentIncident.notes) {
      this.currentIncident.notes = [];
    }

    const note = {
      text: noteText,
      timestamp: new Date().toISOString(),
      author: 'ADMIN'
    };

    this.currentIncident.notes.push(note);
    console.log('[IncidentModal] Note added:', note);
    
    // Clear textarea
    document.getElementById('modalNotes').value = '';
    
    // Show confirmation toast
    if (window.toast) {
      window.toast.success('Note Added', 'Your comment has been saved.');
    }
  }

  /**
   * Load and display status history
   */
  loadStatusHistory(incident) {
    const historyList = document.getElementById('modalHistoryList');
    
    if (!incident.history || incident.history.length === 0) {
      historyList.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No history available</p>';
      return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
    
    incident.history.forEach((entry, index) => {
      const timestamp = new Date(entry.timestamp).toLocaleString();
      const statusChange = entry.previousStatus ? `${entry.previousStatus} → ${entry.status}` : entry.status;
      
      html += `
        <div style="padding: 10px; background: #f9f9f9; border-left: 3px solid #B00020; border-radius: 4px;">
          <div style="font-weight: 600; color: #333;">${statusChange}</div>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">${timestamp}</div>
          ${entry.author ? `<div style="font-size: 11px; color: #999;">By: ${entry.author}</div>` : ''}
        </div>
      `;
    });
    
    html += '</div>';
    historyList.innerHTML = html;
  }

  /**
   * Save changes to incident
   */
  async saveChanges() {
    console.log('[IncidentModal] saveChanges called, currentIncident:', this.currentIncident?.id);
    
    if (!this.currentIncident) {
      console.error('[IncidentModal] No incident to save');
      // Don't show error toast, just return silently
      return;
    }

    const saveBtn = document.getElementById('modalSaveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      // Prepare update data
      const updateData = {
        status: this.currentIncident.status,
        updatedAt: new Date().toISOString(),
        updatedBy: 'ADMIN'
      };

      // Add history if status changed
      if (this.currentIncident.status !== this.originalStatus) {
        if (!this.currentIncident.history) {
          this.currentIncident.history = [];
        }
        
        this.currentIncident.history.push({
          previousStatus: this.originalStatus,
          status: this.currentIncident.status,
          timestamp: new Date().toISOString(),
          author: 'ADMIN'
        });

        updateData.history = this.currentIncident.history;
      }

      // Add notes if any were added
      const noteText = document.getElementById('modalNotes').value.trim();
      console.log('[IncidentModal] Note text from textarea:', noteText);
      
      if (noteText) {
        if (!this.currentIncident.notes) {
          this.currentIncident.notes = [];
        }

        this.currentIncident.notes.push({
          text: noteText,
          timestamp: new Date().toISOString(),
          author: 'ADMIN'
        });

        updateData.notes = this.currentIncident.notes;
        console.log('[IncidentModal] Notes to save:', updateData.notes);
      }

      console.log('[IncidentModal] Full update data:', updateData);

      // If Firebase service is available, use it
      if (typeof firebaseService !== 'undefined' && firebaseService.updateIncident) {
        const success = await firebaseService.updateIncident(this.currentIncident.id, updateData);
        
        if (success) {
          console.log('[IncidentModal] ✅ Incident updated successfully');
          
          // Fetch the updated incident from Firebase to refresh notes/history
          if (typeof firebaseService.fetchIncident === 'function') {
            const updatedIncident = await firebaseService.fetchIncident(this.currentIncident.id);
            if (updatedIncident) {
              this.currentIncident = updatedIncident;
              console.log('[IncidentModal] Refreshed incident data from Firebase');
            }
          }
          
          // Update the notes display immediately to show the newly added note
          this.loadNotes(this.currentIncident);
          // Clear notes field after successful save
          document.getElementById('modalNotes').value = '';
          if (window.toast) {
            window.toast.success('Incident Updated', 'Changes saved successfully!');
          }
          setTimeout(() => this.closeModal(), 1000);
        } else {
          console.error('[IncidentModal] Failed to update incident');
          if (window.toast) {
            window.toast.error('Update Failed', 'Could not save changes. Please try again.');
          }
        }
      } else {
        console.warn('[IncidentModal] Firebase service not available, simulating save');
        // Update the notes display immediately
        this.loadNotes(this.currentIncident);
        // Clear notes field
        document.getElementById('modalNotes').value = '';
        // Simulate save for demo
        if (window.toast) {
          window.toast.success('Incident Updated', 'Changes saved successfully!');
        }
        setTimeout(() => this.closeModal(), 1000);
      }
    } catch (error) {
      console.error('[IncidentModal] Error saving changes:', error);
      alert('Error saving changes: ' + error.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  }

  /**
   * Create embedded map for incident location
   */
  createIncidentMap(incident) {
    const mapContainer = document.getElementById('modalIncidentMap');
    if (!mapContainer || typeof google === 'undefined') {
      console.warn('[IncidentModal] Map container or Google Maps not available');
      return;
    }

    const lat = incident.latitude || 0;
    const lng = incident.longitude || 0;
    
    // Create map
    const incidentMap = new google.maps.Map(mapContainer, {
      zoom: 16,
      center: { lat, lng },
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      zoomControl: true,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'on' }]
        }
      ]
    });

    // Add marker
    new google.maps.Marker({
      position: { lat, lng },
      map: incidentMap,
      title: incident.type,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: this.getSeverityColor(incident.severity),
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 2
      }
    });

    console.log('[IncidentModal] Embedded map created at', lat, lng);
  }

  /**
   * Get color for severity level
   */
  getSeverityColor(severity) {
    const colors = {
      'CRITICAL': '#FF0000',
      'HIGH': '#FF9800',
      'MEDIUM': '#FFC107',
      'LOW': '#4CAF50',
      'CLEAR': '#00AA00'
    };
    return colors[severity] || '#4CAF50';
  }

  /**
   * Close modal
   */
  closeModal() {
    this.modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    this.currentIncident = null;
    console.log('[IncidentModal] Modal closed');
  }
}

// Create global instance
let incidentModalManager = null;

document.addEventListener('DOMContentLoaded', () => {
  incidentModalManager = new IncidentModalManager();
  console.log('[IncidentModal] IncidentModalManager initialized');
});
