/**
 * Export Service
 * Provides CSV and PDF export functionality for incidents
 */

class ExportService {
  /**
   * Export incidents to CSV file
   * @param {Array} incidents - Array of incident objects to export
   * @param {string} filename - Optional custom filename (default: incidents_YYYYMMDD.csv)
   */
  static exportToCSV(incidents, filename = null) {
    if (!incidents || incidents.length === 0) {
      console.warn('[ExportService] No incidents to export');
      window.toast?.warning('No Data', 'No incidents to export');
      return;
    }

    try {
      // Define CSV headers
      const headers = [
        'Incident ID',
        'Type',
        'Severity',
        'Status',
        'Location',
        'Description',
        'Reporter',
        'Latitude',
        'Longitude',
        'Time Reported',
        'Last Updated'
      ];

      // Convert incidents to CSV rows
      const rows = incidents.map(incident => [
        incident.id || '',
        incident.type || '',
        incident.severity || '',
        incident.status || '',
        `"${(incident.location || '').replace(/"/g, '""')}"`, // Escape quotes in location
        `"${(incident.description || '').replace(/"/g, '""')}"`, // Escape quotes in description
        incident.reportedBy || incident.reporter || incident.userId || 'Anonymous',
        incident.latitude || '',
        incident.longitude || '',
        new Date(incident.timestamp || incident.createdAt).toLocaleString(),
        new Date(incident.updatedAt || incident.timestamp).toLocaleString()
      ]);

      // Build CSV content
      let csvContent = headers.join(',') + '\n';
      rows.forEach(row => {
        csvContent += row.join(',') + '\n';
      });

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const timestamp = new Date().toISOString().split('T')[0]; // YYYYMMDD format
      const csvFilename = filename || `incidents_${timestamp}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', csvFilename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('[ExportService] ✅ CSV exported:', csvFilename);
      window.toast?.success('Export Complete', `${incidents.length} incidents exported to CSV`);
    } catch (error) {
      console.error('[ExportService] Error exporting to CSV:', error);
      window.toast?.error('Export Failed', error.message);
    }
  }

  /**
   * Export incidents to PDF using print-to-PDF
   * Creates a printable HTML table and opens print dialog
   * @param {Array} incidents - Array of incident objects to export
   * @param {string} title - Optional title for the PDF (default: 'Incident Report')
   */
  static exportToPDF(incidents, title = 'Incident Report') {
    if (!incidents || incidents.length === 0) {
      console.warn('[ExportService] No incidents to export');
      window.toast?.warning('No Data', 'No incidents to export');
      return;
    }

    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      
      // Build table rows first
      let tableRowsHTML = '';
      incidents.forEach(incident => {
        const severityClass = `severity-${(incident.severity || 'low').toLowerCase()}`;
        const statusClass = `status-${(incident.status || 'new').toLowerCase()}`;
        const location = incident.location || `${(incident.latitude || 0).toFixed(4)}°, ${(incident.longitude || 0).toFixed(4)}°`;
        const description = (incident.description || 'No description').substring(0, 80);
        const reporter = incident.reportedBy || incident.reporter || incident.userId || 'Anonymous';
        const timestamp = new Date(incident.timestamp || incident.createdAt).toLocaleString();
        
        tableRowsHTML += `
              <tr>
                <td><strong>${incident.id || 'N/A'}</strong></td>
                <td>${incident.type || 'Unknown'}</td>
                <td><span class="${severityClass}">${(incident.severity || 'LOW').toUpperCase()}</span></td>
                <td><span class="${statusClass}">${(incident.status || 'New').toUpperCase()}</span></td>
                <td>${location}</td>
                <td>${description}</td>
                <td>${reporter}</td>
                <td>${timestamp}</td>
              </tr>
        `;
      });

      // Build HTML document with proper structure
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              padding: 20px;
              background: white;
            }

            .header {
              background: linear-gradient(135deg, #B00020 0%, #8B0000 100%);
              color: white;
              padding: 25px;
              border-radius: 8px;
              margin-bottom: 30px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }

            .header h1 {
              font-size: 28px;
              margin-bottom: 15px;
              font-weight: 600;
              letter-spacing: 0.5px;
            }

            .header-info {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              font-size: 13px;
            }

            .header-info div {
              padding: 10px 0;
              border-right: 1px solid rgba(255,255,255,0.3);
            }

            .header-info div:last-child {
              border-right: none;
            }
            
            .stats-summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }

            .stat-card {
              background: white;
              padding: 20px;
              border-radius: 8px;
              border-left: 5px solid #B00020;
              box-shadow: 0 2px 4px rgba(0,0,0,0.08);
              text-align: center;
            }

            .stat-card .label {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
            }

            .stat-card .value {
              font-size: 28px;
              font-weight: 700;
              color: #B00020;
            }

            .stat-card.critical { border-left-color: #C62828; }
            .stat-card.high { border-left-color: #E65100; }
            .stat-card.medium { border-left-color: #F57F17; }
            .stat-card.low { border-left-color: #2E7D32; }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              border-radius: 8px;
              overflow: hidden;
            }

            thead {
              background: linear-gradient(135deg, #B00020 0%, #8B0000 100%);
              color: white;
            }

            th {
              padding: 15px;
              text-align: left;
              font-weight: 600;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            td {
              padding: 12px 15px;
              border-bottom: 1px solid #eee;
              font-size: 12px;
            }

            tbody tr:nth-child(odd) {
              background-color: #f9f9f9;
            }

            tbody tr:hover {
              background-color: #f0f0f0;
            }

            .severity-critical {
              background: linear-gradient(135deg, #B00020 0%, #8B0000 100%);
              color: white;
              padding: 6px 12px;
              border-radius: 4px;
              font-weight: 600;
              font-size: 11px;
              display: inline-block;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .severity-high {
              background: linear-gradient(135deg, #FF6F00 0%, #E65100 100%);
              color: white;
              padding: 6px 12px;
              border-radius: 4px;
              font-weight: 600;
              font-size: 11px;
              display: inline-block;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .severity-medium {
              background: linear-gradient(135deg, #FFB300 0%, #FFA000 100%);
              color: white;
              padding: 6px 12px;
              border-radius: 4px;
              font-weight: 600;
              font-size: 11px;
              display: inline-block;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .severity-low {
              background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
              color: white;
              padding: 6px 12px;
              border-radius: 4px;
              font-weight: 600;
              font-size: 11px;
              display: inline-block;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .status-new {
              background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%);
              color: white;
              padding: 6px 12px;
              border-radius: 4px;
              font-weight: 600;
              font-size: 11px;
              display: inline-block;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .status-resolved {
              background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
              color: white;
              padding: 6px 12px;
              border-radius: 4px;
              font-weight: 600;
              font-size: 11px;
              display: inline-block;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .status-pending {
              background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
              color: white;
              padding: 6px 12px;
              border-radius: 4px;
              font-weight: 600;
              font-size: 11px;
              display: inline-block;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .status-investigating {
              background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
              color: white;
              padding: 6px 12px;
              border-radius: 4px;
              font-weight: 600;
              font-size: 11px;
              display: inline-block;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .status-closed {
              background: linear-gradient(135deg, #757575 0%, #616161 100%);
              color: white;
              padding: 6px 12px;
              border-radius: 4px;
              font-weight: 600;
              font-size: 11px;
              display: inline-block;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .status-clear {
              background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%);
              color: white;
              padding: 6px 12px;
              border-radius: 4px;
              font-weight: 600;
              font-size: 11px;
              display: inline-block;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .footer {
              border-top: 2px solid #e0e0e0;
              padding-top: 25px;
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }

            .footer strong {
              color: #B00020;
            }
            
            @media print {
              body {
                padding: 15px;
                margin: 0;
              }
              table {
                page-break-inside: auto;
              }
              tr {
                page-break-inside: avoid;
              }
              th {
                background: linear-gradient(135deg, #B00020 0%, #8B0000 100%) !important;
                color: white !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .severity-critical, .severity-high, .severity-medium, .severity-low,
              .status-new, .status-resolved, .status-pending, .status-investigating, .status-closed, .status-clear {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title}</h1>
            <div class="header-info">
              <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
              <div><strong>Total Incidents:</strong> ${incidents.length}</div>
              <div><strong>Report Period:</strong> ${new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div class="stats-summary" id="statsContainer"></div>
          
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Location</th>
                <th>Description</th>
                <th>Reporter</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHTML}
            </tbody>
          </table>
          
          <div class="footer">
            <p><strong>Sentinel Incident Management System</strong></p>
            <p>This is an automated report. Please verify all details before taking action.</p>
            <p style="margin-top: 15px; font-size: 10px;">Generated automatically for incident tracking and analysis purposes.</p>
          </div>

          <script>
            // Calculate statistics
            const incidents = ${JSON.stringify(incidents)};
            const stats = {
              critical: incidents.filter(i => i.severity === 'CRITICAL').length,
              high: incidents.filter(i => i.severity === 'HIGH').length,
              medium: incidents.filter(i => i.severity === 'MEDIUM').length,
              low: incidents.filter(i => i.severity === 'LOW').length
            };

            // Populate stats
            const statsHTML = \`
              <div class="stat-card critical">
                <div class="label">Critical</div>
                <div class="value">\${stats.critical}</div>
              </div>
              <div class="stat-card high">
                <div class="label">High</div>
                <div class="value">\${stats.high}</div>
              </div>
              <div class="stat-card medium">
                <div class="label">Medium</div>
                <div class="value">\${stats.medium}</div>
              </div>
              <div class="stat-card low">
                <div class="label">Low</div>
                <div class="value">\${stats.low}</div>
              </div>
            \`;
            document.getElementById('statsContainer').innerHTML = statsHTML;
          </script>
        </body>
        </html>
      `;

      // Write to the print window
      printWindow.document.write(html);
      printWindow.document.close();

      // Wait for content to load, then open print dialog
      setTimeout(() => {
        printWindow.print();
      }, 250);

      console.log('[ExportService] ✅ PDF print dialog opened');
      window.toast?.success('Export Ready', 'Print dialog opened. Select "Save as PDF" to export');
    } catch (error) {
      console.error('[ExportService] Error exporting to PDF:', error);
      window.toast?.error('Export Failed', error.message);
    }
  }

  /**
   * Export incidents to JSON format
   * @param {Array} incidents - Array of incident objects to export
   * @param {string} filename - Optional custom filename
   */
  static exportToJSON(incidents, filename = null) {
    if (!incidents || incidents.length === 0) {
      console.warn('[ExportService] No incidents to export');
      window.toast?.warning('No Data', 'No incidents to export');
      return;
    }

    try {
      const jsonData = JSON.stringify(incidents, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const timestamp = new Date().toISOString().split('T')[0];
      const jsonFilename = filename || `incidents_${timestamp}.json`;

      link.setAttribute('href', url);
      link.setAttribute('download', jsonFilename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('[ExportService] ✅ JSON exported:', jsonFilename);
      window.toast?.success('Export Complete', `${incidents.length} incidents exported to JSON`);
    } catch (error) {
      console.error('[ExportService] Error exporting to JSON:', error);
      window.toast?.error('Export Failed', error.message);
    }
  }

  /**
   * Get export statistics summary
   */
  static getExportSummary(incidents) {
    return {
      total: incidents.length,
      critical: incidents.filter(i => i.severity === 'CRITICAL').length,
      high: incidents.filter(i => i.severity === 'HIGH').length,
      medium: incidents.filter(i => i.severity === 'MEDIUM').length,
      low: incidents.filter(i => i.severity === 'LOW').length,
      resolved: incidents.filter(i => i.status === 'resolved').length,
      pending: incidents.filter(i => i.status !== 'resolved').length,
    };
  }
}

console.log('[ExportService] Loaded - CSV, PDF, and JSON export functions available');
