import 'package:geolocator/geolocator.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:http/http.dart' as http;
import 'package:flutter/material.dart';
import 'dart:convert';
import 'firebase_service.dart';
import 'settings_service.dart';
import 'dart:async';

class LocationTrackingService {
  static final LocationTrackingService _instance =
      LocationTrackingService._internal();
  bool _isTracking = false;
  String? _currentUserId;
  Position? _lastPosition;
  Timer? _gpsUpdateTimer; // Replace while loop with Timer
  
  // Pi GPS tracking
  late IO.Socket _socket;
  bool _piConnected = false;
  String? _piAddress;
  double? _piLatitude;
  double? _piLongitude;
  double? _piAltitude;
  int _piSatellites = 0;
  String _piFixQuality = 'Unknown';

  LocationTrackingService._internal();

  factory LocationTrackingService() {
    return _instance;
  }

  /// Start location tracking with device GPS or Pi GPS
  Future<void> startLocationTracking(String userId, {String? piAddress}) async {
    if (_isTracking) {
      print('[LocationTracking] Already tracking');
      return;
    }

    _currentUserId = userId;
    _isTracking = true;
    
    // Use provided piAddress, or try to load from settings
    String? addressToUse = piAddress;
    if (addressToUse == null || addressToUse.isEmpty) {
      addressToUse = SettingsService().getPiAddress();
    }
    
    _piAddress = addressToUse;

    print('[LocationTracking] Starting location tracking for $userId');
    print('[LocationTracking] Pi GPS: ${addressToUse ?? "Not configured"}');

    // Use Timer instead of while loop to avoid blocking the event loop
    _gpsUpdateTimer = Timer.periodic(
      const Duration(seconds: 10),
      (_) async {
        if (!_isTracking) return;
        
        try {
          // If Pi address available, try REST API first
          if (addressToUse != null && addressToUse.isNotEmpty) {
            await _pollPiGPS(addressToUse);
          }

          // Prefer Pi GPS if available, fallback to device GPS
          final latitude = _piLatitude;
          final longitude = _piLongitude;

          if (latitude != null && longitude != null) {
            // Use Pi GPS
            await FirebaseService().updateTanodLocation(
              userId: userId,
              latitude: latitude,
              longitude: longitude,
            );
            print('[LocationTracking] Pi GPS: $latitude, $longitude');
          } else {
            // Fallback to device GPS
            final position = await _getCurrentLocation();
            if (position != null && _isTracking) {
              _lastPosition = position;
              await FirebaseService().updateTanodLocation(
                userId: userId,
                latitude: position.latitude,
                longitude: position.longitude,
              );
              print(
                  '[LocationTracking] Device GPS: ${position.latitude}, ${position.longitude}');
            }
          }
        } catch (e) {
          print('[LocationTracking] Error updating location: $e');
        }
      },
    );
  }

  /// Poll Pi GPS via REST API
  Future<void> _pollPiGPS(String piAddress) async {
    try {
      final url = Uri.parse('http://$piAddress:5000/gps/latest');
      
      final response = await Future.delayed(
        const Duration(seconds: 2),
        () => _makeRequest(url),
      ).timeout(const Duration(seconds: 5));
      
      if (response != null && response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        _piLatitude = (data['latitude'] as num?)?.toDouble();
        _piLongitude = (data['longitude'] as num?)?.toDouble();
        _piAltitude = (data['altitude'] as num?)?.toDouble();
        _piSatellites = (data['satellites'] as num?)?.toInt() ?? 0;
        _piFixQuality = data['fix_quality'] as String? ?? 'Unknown';
        print('[Pi GPS] Polled: $_piLatitude, $_piLongitude (Sats: $_piSatellites)');
      }
    } catch (e) {
      print('[Pi GPS] Polling error: $e');
    }
  }

  Future<http.Response?> _makeRequest(Uri url) async {
    try {
      return await http.get(url);
    } catch (e) {
      return null;
    }
  }

  void stopLocationTracking() {
    _isTracking = false;
    _currentUserId = null;
    
    // Cancel the GPS update timer
    _gpsUpdateTimer?.cancel();
    _gpsUpdateTimer = null;
    
    // Disconnect from Pi if connected
    if (_piConnected) {
      _socket.disconnect();
      _piConnected = false;
    }
    
    print('[LocationTracking] Stopped location tracking');
  }

  Future<Position?> _getCurrentLocation() async {
    try {
      final permission = await Geolocator.requestPermission();

      if (permission == LocationPermission.denied) {
        print('[LocationTracking] Location permission denied');
        return null;
      }

      if (permission == LocationPermission.deniedForever) {
        print('[LocationTracking] Location permission denied forever');
        return null;
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      return position;
    } catch (e) {
      print('[LocationTracking] Error getting location: $e');
      return null;
    }
  }

  String? getCoordinatesString() {
    // Prefer Pi GPS
    if (_piLatitude != null && _piLongitude != null) {
      return '${_piLatitude!.toStringAsFixed(6)}, ${_piLongitude!.toStringAsFixed(6)}';
    }
    
    // Fallback to device GPS
    if (_lastPosition != null) {
      return '${_lastPosition!.latitude.toStringAsFixed(6)}, ${_lastPosition!.longitude.toStringAsFixed(6)}';
    }
    return null;
  }

  // Getters for GPS data
  double? get latitude => _piLatitude ?? _lastPosition?.latitude;
  double? get longitude => _piLongitude ?? _lastPosition?.longitude;
  double? get altitude => _piAltitude ?? _lastPosition?.altitude;
  bool get isPiConnected => _piConnected;
  int get satellites => _piSatellites;
  String get fixQuality => _piFixQuality;
  
  String get gpsQualityLabel {
    if (_piSatellites < 4) return '🔴 Poor (< 4 sats)';
    if (_piSatellites < 6) return '🟡 Fair (4-5 sats)';
    if (_piSatellites < 8) return '🟢 Good (6-7 sats)';
    return '🟢✓ Excellent (8+ sats)';
  }
  
  Color get gpsQualityColor {
    if (_piSatellites < 4) return Color(0xFFDC2626); // Red
    if (_piSatellites < 6) return Color(0xFFEAB308); // Amber
    if (_piSatellites < 8) return Color(0xFF16A34A); // Green
    return Color(0xFF059669); // Dark Green
  }
  
  String get locationSource {
    if (_piLatitude != null && _piLongitude != null) {
      return 'Pi GPS';
    }
    if (_lastPosition != null) {
      return 'Device GPS';
    }
    return 'Unknown';
  }
}
