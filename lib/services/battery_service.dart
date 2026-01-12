import 'dart:async';
import 'package:firebase_database/firebase_database.dart';
import 'package:firebase_auth/firebase_auth.dart';

class BatteryData {
  final double voltage; // Voltage in volts (2.7V - 4.2V for 1S)
  final int percentage; // Battery percentage (0-100)
  final double current; // Current in amperes (positive = charging, negative = discharging)
  final double temperature; // Temperature in Celsius
  final bool isCharging;
  final bool isBMSHealthy; // BMS health status
  final DateTime timestamp;

  BatteryData({
    required this.voltage,
    required this.percentage,
    required this.current,
    required this.temperature,
    required this.isCharging,
    required this.isBMSHealthy,
    required this.timestamp,
  });

  Map<String, dynamic> toMap() {
    return {
      'voltage': voltage,
      'percentage': percentage,
      'current': current,
      'temperature': temperature,
      'isCharging': isCharging,
      'isBMSHealthy': isBMSHealthy,
      'timestamp': timestamp.millisecondsSinceEpoch,
    };
  }

  factory BatteryData.fromMap(Map<dynamic, dynamic> map) {
    return BatteryData(
      voltage: (map['voltage'] as num?)?.toDouble() ?? 0.0,
      percentage: (map['percentage'] as num?)?.toInt() ?? 0,
      current: (map['current'] as num?)?.toDouble() ?? 0.0,
      temperature: (map['temperature'] as num?)?.toDouble() ?? 20.0,
      isCharging: (map['isCharging'] as bool?) ?? false,
      isBMSHealthy: (map['isBMSHealthy'] as bool?) ?? true,
      timestamp: DateTime.fromMillisecondsSinceEpoch((map['timestamp'] as num?)?.toInt() ?? 0),
    );
  }

  // Convert 1S voltage (2.7V - 4.2V) to percentage
  static int voltageToPercentage(double voltage) {
    const minVoltage = 2.7;
    const maxVoltage = 4.2;
    
    if (voltage <= minVoltage) return 0;
    if (voltage >= maxVoltage) return 100;
    
    return ((voltage - minVoltage) / (maxVoltage - minVoltage) * 100).toInt();
  }
}

class BatteryService {
  static final BatteryService _instance = BatteryService._internal();
  late FirebaseDatabase _database;
  StreamSubscription<DatabaseEvent>? _batteryStreamSubscription;
  
  final _batteryDataController = StreamController<BatteryData>.broadcast();
  Stream<BatteryData> get batteryDataStream => _batteryDataController.stream;
  
  BatteryData? _lastBatteryData;
  BatteryData? get lastBatteryData => _lastBatteryData;
  
  String? _userId;
  bool _initialized = false;
  int _lastUpdateTime = 0;
  static const int _updateThrottleMs = 5000; // Throttle to avoid overwhelming event loop

  factory BatteryService() {
    return _instance;
  }

  BatteryService._internal();

  Future<void> init({String? userId}) async {
    // Prevent re-initialization if already initialized
    if (_initialized) {
      print('[BatteryService] Already initialized with userId: $_userId, skipping re-initialization');
      return;
    }
    
    try {
      _database = FirebaseDatabase.instance;
      _userId = userId ?? FirebaseAuth.instance.currentUser?.uid;
      _initialized = true;
      print('[BatteryService] Initialized with userId: $_userId');
      
      // Ensure we start listening after userId is set
      if (_userId != null) {
        startListening();
      }
    } catch (e) {
      print('[BatteryService] Error initializing: $e');
    }
  }

  void startListening() {
    try {
      final userId = _userId;
      print('[BatteryService] startListening - userId: $userId');
      if (userId == null) {
        print('[BatteryService] No userId available, cannot listen to battery data');
        return;
      }

      final batteryRef = _database.ref('battery_data/$userId');

      _batteryStreamSubscription = batteryRef.onValue.listen(
        (DatabaseEvent event) {
          if (event.snapshot.exists) {
            final now = DateTime.now().millisecondsSinceEpoch;
            // Throttle updates to avoid overwhelming the event loop and blocking GPS
            if (now - _lastUpdateTime >= _updateThrottleMs) {
              try {
                final data = BatteryData.fromMap(event.snapshot.value as Map<dynamic, dynamic>);
                _lastBatteryData = data;
                // Use microtask to prevent blocking GPS stream
                Future.microtask(() {
                  _batteryDataController.add(data);
                });
                _lastUpdateTime = now;
                print('[BatteryService] Battery data updated: ${data.percentage}% - ${data.voltage}V');
              } catch (e) {
                print('[BatteryService] Error parsing battery data: $e');
              }
            }
          }
        },
        onError: (error) {
          print('[BatteryService] Error listening to battery data: $error');
        },
      );
    } catch (e) {
      print('[BatteryService] Error starting to listen: $e');
    }
  }

  Future<void> updateBatteryData(BatteryData data) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        print('[BatteryService] No authenticated user, cannot update battery data');
        return;
      }

      final userId = user.uid;
      await _database.ref('battery_data/$userId').set(data.toMap());
      _lastBatteryData = data;
      _batteryDataController.add(data);
      print('[BatteryService] Battery data saved to Firebase');
    } catch (e) {
      print('[BatteryService] Error updating battery data: $e');
    }
  }

  void stopListening() {
    _batteryStreamSubscription?.cancel();
    _batteryStreamSubscription = null;
  }

  void dispose() {
    _batteryDataController.close();
    stopListening();
  }
}
