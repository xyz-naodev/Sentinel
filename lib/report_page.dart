import 'package:flutter/material.dart';
import 'login2.dart';
import 'services/firebase_service.dart';
import 'services/location_tracking_service.dart';
import 'services/settings_service.dart';
import 'widgets/real_time_clock.dart';

// ========================
// INCIDENT TYPE MODEL
// ========================

class IncidentType {
  final String name;
  final Color color;

  IncidentType({required this.name, required this.color});
}

// ------------------------
//      REPORT PAGE
// ------------------------

class ReportPage extends StatefulWidget {
  final String userId;

  const ReportPage({super.key, required this.userId});

  @override
  State<ReportPage> createState() => _ReportPageState();
}

class _ReportPageState extends State<ReportPage> {
  late LocationTrackingService locationService;
  String currentCoordinates = 'Location tracking enabled';

  @override
  void initState() {
    super.initState();
    _initializeLocationTracking();
  }

  Future<void> _initializeLocationTracking() async {
    locationService = LocationTrackingService();
    
    // Load Pi IP from settings if available
    final settingsService = SettingsService();
    final piIp = settingsService.getPiAddress();
    
    print('[ReportPage] Starting location tracking with Pi IP: $piIp');
    
    // Start tracking
    await locationService.startLocationTracking(
      widget.userId,
      piAddress: (piIp?.isNotEmpty ?? false) ? piIp : null,
    );
    
    // Update coordinates every second
    Future.doWhile(() async {
      if (!mounted) return false;
      
      setState(() {
        currentCoordinates = locationService.getCoordinatesString() ?? 'Getting location...';
      });
      
      await Future.delayed(const Duration(seconds: 1));
      return true;
    });
  }

  void _showIncidentReportForm(
    BuildContext context,
    IncidentType incident,
    String userId,
  ) {
    String selectedSeverity = 'CRITICAL';
    final severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

    showDialog(
      context: context,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return Dialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  color: Colors.white,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Red bar at top
                    Container(
                      height: 4,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: const Color(0xFFB00020),
                        borderRadius: BorderRadius.circular(2),
                      ),
                      margin: const EdgeInsets.only(bottom: 16),
                    ),
                    // Close button
                    Align(
                      alignment: Alignment.topRight,
                      child: GestureDetector(
                        onTap: () => Navigator.pop(context),
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: Colors.grey[400]!,
                              width: 1.5,
                            ),
                          ),
                          child: const Icon(
                            Icons.close,
                            size: 18,
                            color: Colors.black,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Type of Incident Label
                    const Text(
                      'Type of Incident',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                        color: Colors.grey,
                      ),
                    ),
                    const SizedBox(height: 8),
                    // Incident Type Button (Read-only)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: incident.color,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: Text(
                          incident.name,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    // GPS Quality Indicator
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: locationService.gpsQualityColor.withOpacity(0.1),
                        border: Border.all(
                          color: locationService.gpsQualityColor,
                          width: 2,
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            locationService.gpsQualityLabel,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: locationService.gpsQualityColor,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Satellites: ${locationService.satellites} | Quality: ${locationService.fixQuality}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Colors.grey,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    // Severity Label
                    const Text(
                      'Severity',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                        color: Colors.grey,
                      ),
                    ),
                    const SizedBox(height: 8),
                    // Severity Dropdown
                    Container(
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: const Color(0xFFB00020),
                          width: 2,
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 4,
                      ),
                      child: DropdownButton<String>(
                        value: selectedSeverity,
                        isExpanded: true,
                        underline: const SizedBox(),
                        items: severities.map((String value) {
                          return DropdownMenuItem<String>(
                            value: value,
                            child: Text(value),
                          );
                        }).toList(),
                        onChanged: (String? newValue) {
                          if (newValue != null) {
                            setState(() {
                              selectedSeverity = newValue;
                            });
                          }
                        },
                      ),
                    ),
                    const SizedBox(height: 20),
                    // Location Label
                    const Text(
                      'Location',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                        color: Colors.grey,
                      ),
                    ),
                    const SizedBox(height: 8),
                    // Location (Read-only)
                    Container(
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: const Color(0xFFB00020),
                          width: 2,
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 14,
                      ),
                      child: Center(
                        child: Text(
                          currentCoordinates,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Colors.black87,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    // SUBMIT Button
                    GestureDetector(
                      onTap: () async {
                        Navigator.pop(context); // Close form dialog
                        
                        // Submit to Firebase
                        try {
                          // Parse coordinates (format: "14.278485, 121.0519145")
                          final parts = currentCoordinates.split(',');
                          final lat = double.parse(parts[0].trim());
                          final lng = double.parse(parts[1].trim());
                          
                          await FirebaseService().submitIncidentReport(
                            userId: userId,
                            incidentType: incident.name,
                            severity: selectedSeverity,
                            latitude: lat,
                            longitude: lng,
                            description: '${incident.name} - Severity: $selectedSeverity',
                          );
                          
                          // Log the incident report activity
                          await FirebaseService().logActivity(
                            userId: widget.userId,
                            action: 'Reported incident: ${incident.name} (Severity: $selectedSeverity) at $currentCoordinates',
                          );
                          
                          print('[App] Incident submitted: ${incident.name}');
                          
                          // Check if context is still valid before showing dialog
                          if (context.mounted) {
                            _showSubmissionConfirmation(
                              context,
                              incident,
                              selectedSeverity,
                              currentCoordinates,
                              widget.userId,
                            );
                          }
                        } catch (e) {
                          print('[App] Error submitting incident: $e');
                        }
                      },
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFB00020),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Center(
                          child: Text(
                            'SUBMIT',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showSubmissionConfirmation(
    BuildContext context,
    IncidentType incident,
    String severity,
    String coordinates,
    String userId,
  ) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              color: Colors.white,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Red bar at top
                Container(
                  height: 4,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: const Color(0xFFB00020),
                    borderRadius: BorderRadius.circular(2),
                  ),
                  margin: const EdgeInsets.only(bottom: 16),
                ),
                // Close button
                Align(
                  alignment: Alignment.topRight,
                  child: GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Colors.grey[400]!,
                          width: 1.5,
                        ),
                      ),
                      child: const Icon(
                        Icons.close,
                        size: 18,
                        color: Colors.black,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                // "INCIDENT REPORT" text
                const Text(
                  'INCIDENT REPORT',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 4),
                // "SUBMITTED!" in red
                const Text(
                  'SUBMITTED!',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFB00020),
                  ),
                ),
                const SizedBox(height: 20),
                // Coordinates
                Text(
                  coordinates,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Colors.black87,
                    fontWeight: FontWeight.w500,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 28),
                // Close button
                GestureDetector(
                  onTap: () {
                    Navigator.pop(context);
                  },
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFB00020),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Center(
                      child: Text(
                        'OK',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );

    // Log the incident report
    // TODO: Implement activity logging through Firebase
    // ActivityService().logActivity(
    //   action: 'Reported: ${incident.name} (Severity: $severity) at $coordinates',
    //   userId: userId,
    // );
  }

  @override
  Widget build(BuildContext context) {
    final List<IncidentType> incidents = [
      IncidentType(name: 'FIRE', color: const Color(0xFFB00020)),
      IncidentType(name: 'FLOOD', color: const Color(0xFFB00020)),
      IncidentType(name: 'SEISMIC DAMAGE', color: const Color(0xFFB00020)),
      IncidentType(name: 'BOMB THREAT', color: const Color(0xFFB00020)),
      IncidentType(name: 'THEFT', color: const Color(0xFFB00020)),
      IncidentType(name: 'MEDICAL EMERGENCY', color: const Color(0xFFB00020)),
      IncidentType(name: 'ROAD ACCIDENT', color: const Color(0xFFF59E0B)),
      IncidentType(name: 'STREET FIGHTS', color: const Color(0xFFF59E0B)),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFE3E3E3),
      body: Column(
        children: [
          // TOP GRADIENT BAR
          Container(
            height: 25,
            width: double.infinity,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFFB00020), Color(0xFF6A0D51)],
              ),
            ),
          ),

          // HEADER
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: const Color(0xFFB00020),
                        width: 2,
                      ),
                    ),
                    child: const Text(
                      "← BACK TO HOME",
                      style: TextStyle(
                        color: Color(0xFFB00020),
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: Center(
                    child: const Text(
                      "SENTINEL",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFB00020),
                      ),
                    ),
                  ),
                ),
                RealTimeClock(
                  textStyle: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.black,
                    fontFamily: 'Roboto',
                  ),
                  alignment: MainAxisAlignment.center,
                ),
              ],
            ),
          ),

          // CLEAR BUTTON
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 8),
            child: GestureDetector(
              onTap: () async {
                // Get current location
                final coordinates = currentCoordinates;
                final latitude = locationService.latitude ?? 0.0;
                final longitude = locationService.longitude ?? 0.0;

                if (!context.mounted) return;

                // Submit clear event to Firebase
                await FirebaseService().submitIncidentReport(
                  userId: widget.userId,
                  latitude: latitude,
                  longitude: longitude,
                  incidentType: 'CLEAR',
                  severity: 'INFO',
                  description: 'Area cleared - no incidents',
                );

                // Log the activity
                await FirebaseService().logActivity(
                  userId: widget.userId,
                  action: 'Cleared area at $coordinates',
                );

                if (!context.mounted) return;

                showDialog(
                  context: context,
                  builder: (BuildContext context) {
                    return Dialog(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          color: Colors.white,
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Red bar at top
                            Container(
                              height: 4,
                              width: double.infinity,
                              decoration: BoxDecoration(
                                color: const Color(0xFFB00020),
                                borderRadius: BorderRadius.circular(2),
                              ),
                              margin: const EdgeInsets.only(bottom: 16),
                            ),
                            // Close button
                            Align(
                              alignment: Alignment.topRight,
                              child: GestureDetector(
                                onTap: () => Navigator.pop(context),
                                child: Container(
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: Colors.grey[400]!,
                                      width: 1.5,
                                    ),
                                  ),
                                  child: const Icon(
                                    Icons.close,
                                    size: 18,
                                    color: Colors.black,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            // "The Area is" text
                            const Text(
                              "The Area is",
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 8),
                            // "CLEARED!" in green
                            const Text(
                              "CLEARED!",
                              style: TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF2E7D32),
                              ),
                            ),
                            const SizedBox(height: 20),
                            // Coordinates
                            Text(
                              coordinates,
                              style: const TextStyle(
                                fontSize: 14,
                                color: Colors.black87,
                                fontWeight: FontWeight.w500,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 24),
                          ],
                        ),
                      ),
                    );
                  },
                );

                print('[App] Area cleared: $coordinates');
              },
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: const Color(0xFF2E7D32),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Center(
                  child: Text(
                    "CLEAR",
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      letterSpacing: 1.2,
                    ),
                  ),
                ),
              ),
            ),
          ),

          // TYPES OF INCIDENT HEADER
          Padding(
            padding: const EdgeInsets.fromLTRB(40, 20, 40, 12),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                "Types of Incident",
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey[700],
                ),
              ),
            ),
          ),

          // INCIDENT BUTTONS LIST
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 8),
              child: Column(
                children: incidents.map((incident) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: GestureDetector(
                      onTap: () async {
                        if (!context.mounted) return;
                        _showIncidentReportForm(
                          context,
                          incident,
                          widget.userId,
                        );
                      },
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: incident.color,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.1),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Text(
                            incident.name,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),

          // BOTTOM GRADIENT BAR
          Container(
            height: 25,
            width: double.infinity,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFFB00020), Color(0xFF6A0D51)],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
