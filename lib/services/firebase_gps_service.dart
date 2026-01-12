import 'package:firebase_database/firebase_database.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';
import 'dart:math' as math;

class FirebaseGPSData {
  final double latitude;
  final double longitude;
  final double altitude;
  final double speed;
  final DateTime timestamp;
  final int satellites;
  final String fixQuality;
  final String trackId;

  FirebaseGPSData({
    required this.latitude,
    required this.longitude,
    required this.altitude,
    required this.speed,
    required this.timestamp,
    required this.satellites,
    required this.fixQuality,
    required this.trackId,
  });

  Map<String, dynamic> toMap() {
    return {
      'latitude': latitude,
      'longitude': longitude,
      'altitude': altitude,
      'speed': speed,
      'timestamp': timestamp.millisecondsSinceEpoch,
      'satellites': satellites,
      'fixQuality': fixQuality,
      'formattedTime': DateFormat('yyyy-MM-dd HH:mm:ss').format(timestamp),
    };
  }

  factory FirebaseGPSData.fromMap(Map<dynamic, dynamic> map) {
    return FirebaseGPSData(
      latitude: (map['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (map['longitude'] as num?)?.toDouble() ?? 0.0,
      altitude: (map['altitude'] as num?)?.toDouble() ?? 0.0,
      speed: (map['speed'] as num?)?.toDouble() ?? 0.0,
      timestamp: DateTime.fromMillisecondsSinceEpoch((map['timestamp'] as num?)?.toInt() ?? 0),
      satellites: (map['satellites'] as num?)?.toInt() ?? 0,
      fixQuality: (map['fixQuality'] as String?) ?? 'Unknown',
      trackId: (map['trackId'] as String?) ?? '',
    );
  }

  @override
  String toString() {
    return 'GPS: ($latitude, $longitude) Alt: ${altitude}m Speed: ${speed}km/h Sats: $satellites';
  }
}

class FirebaseGPSService {
  static final FirebaseGPSService _instance = FirebaseGPSService._internal();
  
  final _database = FirebaseDatabase.instance;
  final _auth = FirebaseAuth.instance;
  
  late DatabaseReference _gpsDataRef;
  late DatabaseReference _userLocationsRef;
  late DatabaseReference _currentLocationRef;
  
  String? _userId;
  String? _currentTrackId;
  bool _isTracking = false;

  factory FirebaseGPSService() {
    return _instance;
  }

  FirebaseGPSService._internal() {
    _initializeReferences();
  }

  void _initializeReferences() {
    // Use the authenticated user's ID, or default to 'anonymous'
    _userId = _auth.currentUser?.uid ?? 'anonymous';
    
    // Store GPS data in the existing 'locations' node structure
    _userLocationsRef = _database.ref('locations/$_userId');
    _currentLocationRef = _userLocationsRef.child('current_gps');
    _gpsDataRef = _userLocationsRef.child('gps_history');
  }

  /// Start a new tracking session
  Future<String> startTracking(String sessionName) async {
    try {
      _currentTrackId = _database.ref('user_locations/$_userId/history').push().key;
      _isTracking = true;
      
      // Create track metadata
      await _userLocationsRef.child('history/$_currentTrackId/metadata').set({
        'name': sessionName,
        'startTime': DateTime.now().millisecondsSinceEpoch,
        'distance': 0.0,
        'pointCount': 0,
      });
      
      print('[Firebase] Started tracking session: $_currentTrackId');
      return _currentTrackId!;
    } catch (e) {
      print('[Firebase] Error starting track: $e');
      _isTracking = false;
      rethrow;
    }
  }

  /// Save single GPS point to both real-time and history
  Future<void> saveGPSPoint(
    double lat,
    double lon,
    double alt,
    double speed,
    int satellites,
    String fixQuality,
  ) async {
    try {
      if (!_isTracking) {
        print('[Firebase] Not tracking - call startTracking() first');
        return;
      }

      final now = DateTime.now();
      final gpsData = FirebaseGPSData(
        latitude: lat,
        longitude: lon,
        altitude: alt,
        speed: speed,
        timestamp: now,
        satellites: satellites,
        fixQuality: fixQuality,
        trackId: _currentTrackId ?? 'unknown',
      );

      // Save to current location (for real-time display)
      await _currentLocationRef.set(gpsData.toMap());

      // Save to history
      await _gpsDataRef.push().set(gpsData.toMap());

      // Add to current track
      if (_currentTrackId != null) {
        await _userLocationsRef
            .child('history/$_currentTrackId/points')
            .push()
            .set(gpsData.toMap());

        // Update track metadata
        await _userLocationsRef.child('history/$_currentTrackId/metadata/lastUpdate').set(
          now.millisecondsSinceEpoch,
        );
        await _userLocationsRef.child('history/$_currentTrackId/metadata/pointCount').transaction(
          (current) => ((current as num?)?.toInt() ?? 0) + 1,
        );
      }

      print('[Firebase] Saved GPS point: $gpsData');
    } catch (e) {
      print('[Firebase] Error saving GPS point: $e');
    }
  }

  /// Stop current tracking session
  Future<void> stopTracking() async {
    try {
      if (_currentTrackId != null) {
        await _userLocationsRef.child('history/$_currentTrackId/metadata/endTime').set(
          DateTime.now().millisecondsSinceEpoch,
        );
      }
      _isTracking = false;
      _currentTrackId = null;
      print('[Firebase] Stopped tracking');
    } catch (e) {
      print('[Firebase] Error stopping track: $e');
    }
  }

  /// Get current location
  Future<FirebaseGPSData?> getCurrentLocation() async {
    try {
      final snapshot = await _currentLocationRef.get();
      if (snapshot.exists) {
        return FirebaseGPSData.fromMap(
          Map<String, dynamic>.from(snapshot.value as Map),
        );
      }
      return null;
    } catch (e) {
      print('[Firebase] Error getting current location: $e');
      return null;
    }
  }

  /// Stream current location updates
  Stream<FirebaseGPSData?> getCurrentLocationStream() {
    return _currentLocationRef.onValue.map((event) {
      if (event.snapshot.exists) {
        return FirebaseGPSData.fromMap(
          Map<String, dynamic>.from(event.snapshot.value as Map),
        );
      }
      return null;
    });
  }

  /// Get all tracks for user
  Future<Map<String, dynamic>> getTrackHistory() async {
    try {
      final snapshot = await _userLocationsRef.child('history').get();
      if (snapshot.exists) {
        return Map<String, dynamic>.from(snapshot.value as Map);
      }
      return {};
    } catch (e) {
      print('[Firebase] Error getting track history: $e');
      return {};
    }
  }

  /// Delete a specific track
  Future<void> deleteTrack(String trackId) async {
    try {
      await _userLocationsRef.child('history/$trackId').remove();
      print('[Firebase] Deleted track: $trackId');
    } catch (e) {
      print('[Firebase] Error deleting track: $e');
    }
  }

  /// Get GPS data points for specific time range
  Future<List<FirebaseGPSData>> getGPSDataForRange(
    DateTime startTime,
    DateTime endTime,
  ) async {
    try {
      final snapshot = await _gpsDataRef.get();
      final List<FirebaseGPSData> results = [];

      if (snapshot.exists) {
        final data = Map<String, dynamic>.from(snapshot.value as Map);
        data.forEach((key, value) {
          final point = FirebaseGPSData.fromMap(Map<String, dynamic>.from(value));
          if (point.timestamp.isAfter(startTime) && point.timestamp.isBefore(endTime)) {
            results.add(point);
          }
        });
      }

      results.sort((a, b) => a.timestamp.compareTo(b.timestamp));
      return results;
    } catch (e) {
      print('[Firebase] Error getting GPS range: $e');
      return [];
    }
  }

  /// Calculate distance between two points (Haversine formula)
  static double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    const earthRadius = 6371; // km
    final dLat = _toRad(lat2 - lat1);
    final dLon = _toRad(lon2 - lon1);
    
    final a = (math.sin(dLat / 2) * math.sin(dLat / 2)) +
        math.cos(_toRad(lat1)) *
            math.cos(_toRad(lat2)) *
            math.sin(dLon / 2) *
            math.sin(dLon / 2);
    
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return earthRadius * c;
  }

  static double _toRad(double value) => value * (math.pi / 180);

  bool get isTracking => _isTracking;
  String? get currentTrackId => _currentTrackId;
}
