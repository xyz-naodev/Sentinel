import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'dart:async';

class GPSData {
  final double latitude;
  final double longitude;
  final double altitude;
  final double speed;
  final DateTime timestamp;
  final int satellites;
  final String fixQuality;

  GPSData({
    required this.latitude,
    required this.longitude,
    required this.altitude,
    required this.speed,
    required this.timestamp,
    required this.satellites,
    required this.fixQuality,
  });

  factory GPSData.fromJson(Map<String, dynamic> json) {
    return GPSData(
      latitude: json['latitude'] ?? 0.0,
      longitude: json['longitude'] ?? 0.0,
      altitude: json['altitude'] ?? 0.0,
      speed: json['speed'] ?? 0.0,
      timestamp: DateTime.parse(json['timestamp'] ?? DateTime.now().toIso8601String()),
      satellites: json['satellites'] ?? 0,
      fixQuality: json['fix_quality'] ?? 'Unknown',
    );
  }

  @override
  String toString() {
    return 'GPS: ($latitude, $longitude) Alt: ${altitude}m Speed: ${speed}km/h Sats: $satellites';
  }
}

class RaspberryPiGpsService {
  late IO.Socket socket;
  final _gpsDataController = StreamController<GPSData>.broadcast();
  bool _isConnected = false;

  Stream<GPSData> get gpsDataStream => _gpsDataController.stream;
  bool get isConnected => _isConnected;

  /// Connect to Raspberry Pi GPS server
  Future<bool> connectToRaspberryPi(String piAddress, int port) async {
    try {
      final url = 'http://$piAddress:$port';
      
      socket = IO.io(url, <String, dynamic>{
        'transports': ['websocket'],
        'autoConnect': true,
      });

      socket.on('connect', (_) {
        print('[GPS] Connected to Raspberry Pi');
        _isConnected = true;
      });

      socket.on('gps_update', (data) {
        print('[GPS] Received: $data');
        if (data is Map) {
          GPSData gpsData = GPSData.fromJson(Map<String, dynamic>.from(data));
          _gpsDataController.add(gpsData);
        }
      });

      socket.on('disconnect', (_) {
        print('[GPS] Disconnected from Raspberry Pi');
        _isConnected = false;
      });

      socket.on('error', (error) {
        print('[GPS] Error: $error');
      });

      // Wait for connection
      await Future.delayed(Duration(seconds: 2));
      return _isConnected;
    } catch (e) {
      print('[GPS] Error connecting: $e');
      return false;
    }
  }

  /// Request current GPS data
  void requestGPSData() {
    if (_isConnected) {
      socket.emit('request_gps_data');
    }
  }

  /// Disconnect from server
  void disconnect() {
    socket.disconnect();
    _isConnected = false;
  }

  void dispose() {
    _gpsDataController.close();
  }
}
