import 'package:flutter/material.dart';
import '../services/battery_service.dart';

class BatteryTracker extends StatefulWidget {
  final TextStyle? textStyle;
  final MainAxisAlignment alignment;
  final bool showDetails;

  const BatteryTracker({
    super.key,
    this.textStyle,
    this.alignment = MainAxisAlignment.center,
    this.showDetails = true,
  });

  @override
  State<BatteryTracker> createState() => _BatteryTrackerState();
}

class _BatteryTrackerState extends State<BatteryTracker> {
  late BatteryService _batteryService;
  BatteryData? _batteryData;
  bool _useSimulator = true; // Toggle for simulator mode
  bool _firebaseConnected = false;

  @override
  void initState() {
    super.initState();
    // Initial test data
    _batteryData = BatteryData(
      voltage: 4.2,
      percentage: 100,
      current: 0.0,
      temperature: 25.0,
      isCharging: false,
      isBMSHealthy: true,
      timestamp: DateTime.now(),
    );
    
    _batteryService = BatteryService();
    _initializeBattery();
    if (_useSimulator) {
      _startSimulator();
    }
  }

  void _initializeBattery() {
    _batteryService.init().then((_) {
      _batteryService.batteryDataStream.listen((data) {
        if (mounted) {
          setState(() {
            _batteryData = data;
            _firebaseConnected = true;
            _useSimulator = false; // Switch to real data once Firebase connects
          });
        }
      });
      if (_batteryService.lastBatteryData != null) {
        if (mounted) {
          setState(() {
            _batteryData = _batteryService.lastBatteryData;
            _firebaseConnected = true;
            _useSimulator = false;
          });
        }
      }
    }).catchError((e) {
      print('[BatteryTracker] Firebase init error: $e');
      // Keep simulator running if Firebase fails
    });
  }

  void _startSimulator() {
    Future.delayed(const Duration(seconds: 2), () {
      if (!mounted || !_useSimulator) return;
      
      setState(() {
        if (_batteryData != null) {
          int newPercentage = (_batteryData!.percentage - 1).clamp(0, 100);
          _batteryData = BatteryData(
            voltage: 4.2 - (100 - newPercentage) * 0.004,
            percentage: newPercentage,
            current: 0.5 + (100 - newPercentage) * 0.005,
            temperature: 25.0 + (100 - newPercentage) * 0.1,
            isCharging: false,
            isBMSHealthy: true,
            timestamp: DateTime.now(),
          );
        }
      });
      _startSimulator(); // Continue simulation
    });
  }

  void resetSimulator() {
    setState(() {
      _batteryData = BatteryData(
        voltage: 4.2,
        percentage: 100,
        current: 0.0,
        temperature: 25.0,
        isCharging: false,
        isBMSHealthy: true,
        timestamp: DateTime.now(),
      );
    });
  }

  @override
  void dispose() {
    _batteryService.dispose();
    super.dispose();
  }

  Color _getBatteryColor(int percentage) {
    if (percentage >= 75) return Colors.green;
    if (percentage >= 50) return Colors.lime;
    if (percentage >= 25) return Colors.orange;
    return Colors.red;
  }

  @override
  Widget build(BuildContext context) {
    if (_batteryData == null) {
      return Text(
        '0%',
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: Colors.grey,
        ),
      );
    }

    final battery = _batteryData!;
    final batteryColor = _getBatteryColor(battery.percentage);

    return Text(
      '${battery.percentage}%',
      style: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: batteryColor,
      ),
    );
  }
}
