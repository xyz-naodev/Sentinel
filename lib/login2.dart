import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'services/firebase_service.dart';
import 'services/location_tracking_service.dart';
import 'services/battery_service.dart';
import 'report_page.dart';
import 'pages/settings_page.dart';
import 'widgets/real_time_clock.dart';
import 'widgets/battery_tracker.dart';
import 'widgets/wifi_signal.dart';
import 'widgets/on_screen_keyboard.dart';

// ========================
// LOCATION SERVICE
// ========================

class LocationService {
  static final LocationService _instance = LocationService._internal();
  Position? _lastPosition;

  factory LocationService() {
    return _instance;
  }

  LocationService._internal();

  Future<bool> requestLocationPermission() async {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    return permission == LocationPermission.whileInUse ||
        permission == LocationPermission.always;
  }

  Future<Position?> getCurrentLocation() async {
    try {
      bool hasPermission = await requestLocationPermission();
      if (!hasPermission) return _lastPosition;

      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      _lastPosition = position;
      return position;
    } catch (e) {
      print('Error getting location: $e');
      return _lastPosition;
    }
  }

  String? getCoordinatesString() {
    if (_lastPosition == null) {
      return null;
    }
    return '${_lastPosition!.latitude.toStringAsFixed(4)}° N, ${_lastPosition!.longitude.toStringAsFixed(4)}° E';
  }

  Position? getLastPosition() => _lastPosition;
}

// ========================
// ACTIVITY MODEL
// ========================

class Activity {
  final String action;
  final DateTime timestamp;
  final String userId;
  final String? details;

  Activity({
    required this.action,
    required this.timestamp,
    required this.userId,
    this.details,
  });

  @override
  String toString() => '$action - $userId (${timestamp.toString()})';
}

// ========================
// ACTIVITY SERVICE
// ========================

class ActivityService {
  static final ActivityService _instance = ActivityService._internal();
  final List<Activity> _activities = [];

  factory ActivityService() {
    return _instance;
  }

  ActivityService._internal();

  // Add activity to log
  void logActivity({
    required String action,
    required String userId,
    String? details,
  }) {
    _activities.add(
      Activity(
        action: action,
        timestamp: DateTime.now(),
        userId: userId,
        details: details,
      ),
    );
  }

  // Get all activities
  List<Activity> getActivities() => List.from(_activities);

  // Get activities for a specific user
  List<Activity> getActivitiesByUser(String userId) {
    return _activities.where((a) => a.userId == userId).toList();
  }

  // Clear all activities
  void clearActivities() {
    _activities.clear();
  }

  // Get activity count
  int getActivityCount() => _activities.length;
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final TextEditingController userController = TextEditingController();
  final TextEditingController passController = TextEditingController();
  bool _isLoading = false;

  Future<void> login() async {
    String user = userController.text.trim();
    String pass = passController.text.trim();

    if (user.isEmpty || pass.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Please enter username and password"),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      // Verify login using Firebase
      final firebaseService = FirebaseService();
      final userData = await firebaseService.verifyLogin(user, pass);

      if (userData != null) {
        // Login successful
        print('[Login] userData: $userData');
        String userId = userData['userId'];
        String userName = userData['username'];
        print('[Login] Extracted userId: $userId, userName: $userName');

        // Log the login activity
        await firebaseService.logActivity(
          userId: userId,
          action: 'User $userName logged in',
        );

        // Initialize Battery Service after successful authentication
        try {
          // Add a small delay to ensure Firebase auth is fully propagated
          await Future.delayed(const Duration(milliseconds: 500));
          
          print('[Login] About to init BatteryService with userId: $userId');
          final batteryService = BatteryService();
          await batteryService.init(userId: userId);
          print('[Login] BatteryService initialized successfully');
        } catch (e) {
          print('[Login] Error initializing BatteryService: $e');
        }

        // Start location tracking in the background
        LocationTrackingService().startLocationTracking(userId);

        if (mounted) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => DashboardPage(userId: userId),
            ),
          );
        }
      } else {
        // Login failed
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("Invalid username or password"),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Error logging in: $e"),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
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

          Expanded(
            child: Center(
              child: SingleChildScrollView(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // LOGO
                    Image.asset(
                      "assets/images/Sentinel.png",
                      height: 340,
                    ),

                    const SizedBox(height: 10),

                    

                    const SizedBox(height: 50),

                    // USERNAME FIELD
                    KioskTextField(
                      controller: userController,
                      hintText: "Username",
                      icon: const Icon(Icons.person, color: Colors.purple),
                      keyboardType: KeyboardType.alphanumeric,
                    ),

                    const SizedBox(height: 20),

                    // PASSWORD FIELD
                    KioskTextField(
                      controller: passController,
                      hintText: "Password",
                      icon: const Icon(Icons.lock, color: Colors.purple),
                      obscureText: true,
                      keyboardType: KeyboardType.alphanumeric,
                    ),

                    const SizedBox(height: 35),

                    // LOGIN BUTTON (GRADIENT)
                    GestureDetector(
                      onTap: login,
                      child: Container(
                        width: 200,
                        height: 50,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [
                              Color(0xFFB00020),
                              Color(0xFF6A0D51),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(30),
                        ),
                        child: const Center(
                          child: Text(
                            "LOGIN",
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.2,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
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

// ------------------------
//       DASHBOARD
// ------------------------

class DashboardPage extends StatelessWidget {
  final String userId;

  const DashboardPage({super.key, required this.userId});

  void _showLogoutConfirmation(BuildContext context) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          child: Container(
            padding: const EdgeInsets.all(30),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              color: Colors.white,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Image.asset(
                  "assets/images/Sentinel.png",
                  height: 150,
                ),
                const SizedBox(height: 20),
                const Text(
                  "Logging out?",
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 25),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // YES BUTTON
                    GestureDetector(
                      onTap: () {
                        // Log logout activity
                        ActivityService().logActivity(
                          action: 'Logout',
                          userId: userId,
                        );
                        Navigator.pop(context); // Close dialog
                        Navigator.pop(context); // Go back to login
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 30,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [
                              Color(0xFFB00020),
                              Color(0xFF6A0D51),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text(
                          "YES",
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 20),
                    // NO BUTTON
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 30,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: const Color(0xFFB00020),
                            width: 2,
                          ),
                        ),
                        child: const Text(
                          "NO",
                          style: TextStyle(
                            color: Color(0xFFB00020),
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
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

          // HEADER WITH CLOCK, STATUS INDICATORS, AND LOGOUT BUTTON
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // LEFT: SETTINGS BUTTON
                GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const SettingsPage(),
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: Colors.grey,
                        width: 2,
                      ),
                    ),
                    child: const Text(
                      "⚙ SETTINGS",
                      style: TextStyle(
                        color: Colors.grey,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
                // CENTER: CLOCK WITH STATUS INDICATORS
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // REAL-TIME CLOCK (centered)
                      RealTimeClock(
                        textStyle: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Colors.black,
                          fontFamily: 'Roboto',
                        ),
                        alignment: MainAxisAlignment.center,
                      ),
                      const SizedBox(height: 6),
                      // STATUS INDICATORS (WiFi & Battery in boxes below clock)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // WiFi Box
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(6),
                              color: Colors.white.withOpacity(0.8),
                            ),
                            child: const WiFiSignal(),
                          ),
                          const SizedBox(width: 8),
                          // Battery Box
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(6),
                              color: Colors.white.withOpacity(0.8),
                            ),
                            child: const BatteryTracker(
                              showDetails: false,
                              alignment: MainAxisAlignment.center,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // RIGHT: LOGOUT BUTTON
                GestureDetector(
                  onTap: () => _showLogoutConfirmation(context),
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
                      "LOGOUT",
                      style: TextStyle(
                        color: Color(0xFFB00020),
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // MAIN CONTENT
          Expanded(
            child: Center(
              child: SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(
                    maxWidth: 500,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // LOGO
                      Image.asset(
                        "assets/images/Sentinel.png",
                        height: 280,
                      ),

                      const SizedBox(height: 60),

                      // ACTIVITY LOG BUTTON
                    GestureDetector(
                      onTap: () {
                        // Log the button click
                        ActivityService().logActivity(
                          action: 'Viewed Activity Log',
                          userId: userId,
                        );
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => ActivityLogPage(userId: userId),
                          ),
                        );
                      },
                      child: Container(
                        width: 160,
                        height: 120,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [
                              Color(0xFFB00020),
                              Color(0xFF6A0D51),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(15),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.description,
                              size: 50,
                              color: Colors.white.withOpacity(0.8),
                            ),
                            const SizedBox(height: 10),
                            const Text(
                              "ACTIVITY LOG",
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 30),

                    // REPORT BUTTON
                    GestureDetector(
                      onTap: () {
                        // Log the button click
                        ActivityService().logActivity(
                          action: 'Clicked Report',
                          userId: userId,
                        );
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => ReportPage(userId: userId),
                          ),
                        );
                      },
                      child: Container(
                        width: 160,
                        height: 120,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(15),
                          border: Border.all(
                            color: const Color(0xFFB00020),
                            width: 3,
                          ),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.warning_rounded,
                              size: 50,
                              color: const Color(0xFFB00020),
                            ),
                            const SizedBox(height: 10),
                            const Text(
                              "REPORT",
                              style: TextStyle(
                                color: Color(0xFFB00020),
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 60),
                  ],
                ),
                ),
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

// ------------------------
//    ACTIVITY LOG PAGE
// ------------------------

class ActivityLogPage extends StatefulWidget {
  final String userId;

  const ActivityLogPage({super.key, required this.userId});

  @override
  State<ActivityLogPage> createState() => _ActivityLogPageState();
}

class _ActivityLogPageState extends State<ActivityLogPage> {
  late Future<List<Map<String, dynamic>>> activityLogsFuture;

  @override
  void initState() {
    super.initState();
    // Fetch activity logs from Firebase
    activityLogsFuture = FirebaseService().getActivityLogs(userId: widget.userId);
  }

  @override
  Widget build(BuildContext context) {
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

          // HEADER WITH BACK BUTTON
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
                      "← BACK",
                      style: TextStyle(
                        color: Color(0xFFB00020),
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
                const Text(
                  "ACTIVITY LOG",
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(width: 80), // Spacer for alignment
              ],
            ),
          ),

          // ACTIVITY LIST OR EMPTY STATE
          Expanded(
            child: FutureBuilder<List<Map<String, dynamic>>>(
              future: activityLogsFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(
                    child: CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(
                        Color(0xFFB00020),
                      ),
                    ),
                  );
                }

                if (snapshot.hasError) {
                  return Center(
                    child: Text(
                      'Error loading activities: ${snapshot.error}',
                      style: const TextStyle(color: Colors.red),
                    ),
                  );
                }

                final activities = snapshot.data ?? [];

                if (activities.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.info_outline,
                          size: 60,
                          color: Colors.grey[400],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          "No activities yet",
                          style: TextStyle(
                            fontSize: 18,
                            color: Colors.grey[600],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: activities.length,
                  itemBuilder: (context, index) {
                    final activity = activities[index];
                    // Parse timestamp - could be ISO string or needs conversion
                    DateTime timestamp;
                    try {
                      final tsValue = activity['timestamp'];
                      if (tsValue is String) {
                        timestamp = DateTime.parse(tsValue);
                      } else {
                        // Fallback to current time if parsing fails
                        timestamp = DateTime.now();
                      }
                    } catch (e) {
                      timestamp = DateTime.now();
                    }
                    
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: Colors.grey[300]!,
                          width: 1,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  activity['action'] ?? 'Activity',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                    color: Color(0xFFB00020),
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Text(
                                '${timestamp.hour}:${timestamp.minute.toString().padLeft(2, '0')}',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey[600],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            timestamp.toString().split('.')[0],
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[500],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
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
