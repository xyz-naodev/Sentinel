import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_database/firebase_database.dart';
import 'dart:async';
import 'services/raspberry_pi_gps_service.dart';

class GPSTrackingPage extends StatefulWidget {
  const GPSTrackingPage({super.key});

  @override
  State<GPSTrackingPage> createState() => _GPSTrackingPageState();
}

class _GPSTrackingPageState extends State<GPSTrackingPage> {
  final _gpsService = RaspberryPiGpsService();
  GPSData? _currentGPSData;
  bool _isConnected = false;
  Timer? _updateDebounceTimer;
  
  final TextEditingController _piAddressController = TextEditingController(
    text: '192.168.1.29',
  );

  @override
  void initState() {
    super.initState();
    _setupGPSListener();
  }

  void _setupGPSListener() {
    // GPS updates should have higher priority and not be blocked by other services
    _gpsService.gpsDataStream.listen(
      (data) {
        // Update immediately (synchronous)
        _currentGPSData = data;
        
        // Save to Firebase async without blocking
        _saveGPSData(data).catchError((e) {
          print('[GPS] Error saving: $e');
        });
        
        // Debounce the UI update to avoid excessive rebuilds from keyboard/battery
        if (_updateDebounceTimer?.isActive ?? false) {
          _updateDebounceTimer!.cancel();
        }
        _updateDebounceTimer = Timer(const Duration(milliseconds: 200), () {
          if (mounted) {
            setState(() {
              // UI update happens here after debounce delay
            });
          }
        });
      },
      onError: (error) {
        print('[GPS] Stream error: $error');
      },
    );
  }

  Future<void> _connectToRaspberryPi() async {
    final piAddress = _piAddressController.text;
    final connected = await _gpsService.connectToRaspberryPi(piAddress, 5000);

    setState(() => _isConnected = connected);

    if (connected) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Connected to Raspberry Pi')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to connect')),
      );
    }
  }

  Future<void> _saveGPSData(GPSData data) async {
    try {
      // Save to Firebase Realtime Database under /locations
      await FirebaseDatabase.instance.ref('locations').push().set({
        'latitude': data.latitude,
        'longitude': data.longitude,
        'altitude': data.altitude,
        'speed': data.speed,
        'satellites': data.satellites,
        'fix_quality': data.fixQuality,
        'timestamp': data.timestamp.millisecondsSinceEpoch,
      });
      print('[GPS] Saved to Firebase: ${data.latitude}, ${data.longitude}');
    } catch (e) {
      print('[GPS] Error saving to Firebase: $e');
    }
  }

  @override
  void dispose() {
    _updateDebounceTimer?.cancel();
    _gpsService.disconnect();
    _gpsService.dispose();
    _piAddressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Raspberry Pi GPS Tracking'),
        actions: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Center(
              child: Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _isConnected ? Colors.green : Colors.red,
                ),
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              // Connection section
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Raspberry Pi Connection',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _piAddressController,
                        decoration: const InputDecoration(
                          labelText: 'Raspberry Pi IP Address',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: _isConnected ? null : _connectToRaspberryPi,
                        child: Text(_isConnected ? 'Connected' : 'Connect'),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              // GPS data section
              if (_currentGPSData == null)
                const Text('Waiting for GPS data...')
              else
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'GPS Data',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 12),
                        _buildDataRow('Latitude', _currentGPSData!.latitude.toStringAsFixed(6)),
                        _buildDataRow('Longitude', _currentGPSData!.longitude.toStringAsFixed(6)),
                        _buildDataRow('Altitude', '${_currentGPSData!.altitude.toStringAsFixed(2)} m'),
                        _buildDataRow('Speed', '${_currentGPSData!.speed.toStringAsFixed(2)} km/h'),
                        _buildDataRow('Satellites', '${_currentGPSData!.satellites}'),
                        _buildDataRow('Fix Quality', _currentGPSData!.fixQuality),
                        _buildDataRow('Time', _currentGPSData!.timestamp.toString().split('.')[0]),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDataRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
          Text(value, style: TextStyle(color: Colors.blue[700])),
        ],
      ),
    );
  }
}
