import 'package:flutter/material.dart';
import '../services/settings_service.dart';
import '../services/raspberry_pi_gps_service.dart';
import '../services/battery_service.dart';
import '../widgets/on_screen_keyboard.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  late SettingsService _settingsService;
  late TextEditingController _piIpController;
  late TextEditingController _piPortController;
  late BatteryService _batteryService;
  bool _isSaved = false;
  bool _isTesting = false;
  String? _testStatus;
  RaspberryPiGpsService? _testGpsService;
  BatteryData? _batteryData;
  bool _firebaseConnected = false;

  @override
  void initState() {
    super.initState();
    _settingsService = SettingsService();
    _batteryService = BatteryService();
    _loadSettings();
    _listenToBatteryUpdates();
  }

  void _listenToBatteryUpdates() {
    // Listen to battery updates from the already-initialized BatteryService
    _batteryService.batteryDataStream.listen((data) {
      if (mounted) {
        setState(() {
          _batteryData = data;
          _firebaseConnected = true;
        });
      }
    });
    // Also check for existing data
    if (_batteryService.lastBatteryData != null) {
      if (mounted) {
        setState(() {
          _batteryData = _batteryService.lastBatteryData;
          _firebaseConnected = true;
        });
      }
    }
  }

  void resetSimulator() {
    if (mounted) {
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
  }

  Widget _buildBatteryStatRow(String label, String value, Color color) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            border: Border.all(color: color.withOpacity(0.5)),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            value,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ),
      ],
    );
  }

  void _loadSettings() {
    final ip = _settingsService.getPiAddress();
    final port = _settingsService.getPiPort();
    
    _piIpController = TextEditingController(text: ip ?? '192.168.0.111');
    _piPortController = TextEditingController(text: port.toString());
  }

  Future<void> _saveSettings() async {
    if (_piIpController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid IP address')),
      );
      return;
    }

    try {
      await _settingsService.setPiAddress(_piIpController.text);
      await _settingsService.setPiPort(int.parse(_piPortController.text));

      setState(() => _isSaved = true);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Settings saved successfully!')),
      );

      // Reset saved indicator after 2 seconds
      await Future.delayed(const Duration(seconds: 2));
      if (mounted) {
        setState(() => _isSaved = false);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error saving settings: $e')),
      );
    }
  }

  Future<void> _clearSettings() async {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear Pi Configuration?'),
        content: const Text('This will remove the saved Pi IP address.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              await _settingsService.clearPiConfig();
              _piIpController.text = '192.168.0.111';
              _piPortController.text = '5000';
              Navigator.pop(context);
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Configuration cleared')),
              );
            },
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }

  Future<void> _testSensorTransmission() async {
    if (_piIpController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid IP address')),
      );
      return;
    }

    setState(() {
      _isTesting = true;
      _testStatus = 'Testing connection...';
    });

    try {
      _testGpsService = RaspberryPiGpsService();
      final port = int.tryParse(_piPortController.text) ?? 5000;
      bool dataReceived = false;
      
      // Listen for GPS data BEFORE connecting
      final gpsSubscription = _testGpsService!.gpsDataStream.listen(
        (gpsData) {
          dataReceived = true;
          if (mounted) {
            setState(() => _testStatus = '✓ Receiving sensor data!\n${gpsData.toString()}');
          }
        },
        onError: (error) {
          if (mounted) {
            setState(() => _testStatus = '✗ Error receiving data: $error');
          }
        },
      );

      // Attempt to connect
      print('[TEST] Connecting to $_piIpController.text:$port');
      final isConnected = await _testGpsService!.connectToRaspberryPi(
        _piIpController.text,
        port,
      );

      if (!mounted) {
        gpsSubscription.cancel();
        return;
      }

      if (isConnected) {
        setState(() => _testStatus = '✓ Connected! Waiting for sensor data...');
        
        // Request GPS data
        _testGpsService!.requestGPSData();

        // Wait for response (5 seconds timeout - longer to account for socket delays)
        for (int i = 0; i < 10; i++) {
          if (dataReceived) break;
          await Future.delayed(const Duration(milliseconds: 500));
        }
        
        if (mounted && !dataReceived) {
          setState(() => _testStatus = '⚠ Connected but no data received\nEnsure GPS server is running on Raspberry Pi');
        }
      } else {
        setState(() => _testStatus = '✗ Failed to connect to sensor at ${_piIpController.text}:$port\nCheck if server is running');
      }
      
      gpsSubscription.cancel();
    } catch (e) {
      if (mounted) {
        setState(() => _testStatus = '✗ Error: $e');
      }
      print('[TEST] Exception: $e');
    } finally {
      await Future.delayed(const Duration(milliseconds: 500));
      _testGpsService?.disconnect();
      _testGpsService?.dispose();
      
      if (mounted) {
        setState(() => _isTesting = false);
      }
    }
  }

  @override
  void dispose() {
    _piIpController.dispose();
    _piPortController.dispose();
    _testGpsService?.disconnect();
    _testGpsService?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Raspberry Pi Configuration Card
              Card(
                elevation: 2,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Raspberry Pi GPS Configuration',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'These settings will be used automatically for all incident reports.',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                      const SizedBox(height: 16),
                      
                      // IP Address Field
                      KioskTextField(
                        controller: _piIpController,
                        hintText: '192.168.0.111',
                        icon: const Icon(Icons.router, color: Colors.purple),
                        keyboardType: KeyboardType.numeric,
                      ),
                      const SizedBox(height: 12),

                      // Port Field
                      KioskTextField(
                        controller: _piPortController,
                        hintText: '5000',
                        icon: const Icon(Icons.settings, color: Colors.purple),
                        keyboardType: KeyboardType.numeric,
                      ),

                      const SizedBox(height: 20),

                      // Save Button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _saveSettings,
                          icon: const Icon(Icons.save),
                          label: const Text('Save Settings'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _isSaved ? Colors.green : null,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),

                      // Clear Button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _clearSettings,
                          icon: const Icon(Icons.delete_outline),
                          label: const Text('Clear Configuration'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red[300],
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Test Sensor Transmission Button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _isTesting ? null : _testSensorTransmission,
                          icon: _isTesting
                              ? SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      Colors.blue[700] ?? Colors.blue,
                                    ),
                                  ),
                                )
                              : const Icon(Icons.sensors),
                          label: Text(_isTesting ? 'Testing...' : 'Test Sensor Transmission'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue[500],
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),

                      // Test Status Display
                      if (_testStatus != null) ...[
                        const SizedBox(height: 12),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: _testStatus!.startsWith('✓')
                                ? Colors.green[100]
                                : Colors.red[100],
                            border: Border.all(
                              color: _testStatus!.startsWith('✓')
                                  ? Colors.green
                                  : Colors.red,
                            ),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            _testStatus ?? '',
                            style: TextStyle(
                              fontSize: 12,
                              color: _testStatus!.startsWith('✓')
                                  ? Colors.green[800]
                                  : Colors.red[800],
                              fontFamily: 'monospace',
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // BMS (Battery Management System) Test Section
              Card(
                color: Colors.purple[50],
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Battery Management System (BMS) Test',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      // Battery Data Display
                      _buildBatteryStatRow('Percentage', '${_batteryData?.percentage ?? 0}%', Colors.blue),
                      const SizedBox(height: 8),
                      _buildBatteryStatRow('Voltage', '${_batteryData?.voltage.toStringAsFixed(2) ?? "0.00"}V', Colors.green),
                      const SizedBox(height: 8),
                      _buildBatteryStatRow('Current', '${_batteryData?.current.toStringAsFixed(2) ?? "0.00"}A', Colors.orange),
                      const SizedBox(height: 8),
                      _buildBatteryStatRow('Temperature', '${_batteryData?.temperature.toStringAsFixed(1) ?? "0"}°C', Colors.red),
                      const SizedBox(height: 8),
                      _buildBatteryStatRow('Status', _batteryData?.isBMSHealthy ?? true ? '✓ Healthy' : '✗ Unhealthy', 
                        _batteryData?.isBMSHealthy ?? true ? Colors.green : Colors.red),
                      const SizedBox(height: 8),
                      _buildBatteryStatRow('Firebase', _firebaseConnected ? '✓ Connected' : '○ Using Simulator', 
                        _firebaseConnected ? Colors.green : Colors.orange),
                      const SizedBox(height: 16),
                      // Buttons
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: resetSimulator,
                              icon: const Icon(Icons.refresh),
                              label: const Text('Reset Battery'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.purple,
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Status Card
              Card(
                color: Colors.blue[50],
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Configuration Status',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: _settingsService.isPiConfigured()
                                  ? Colors.green
                                  : Colors.red,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _settingsService.isPiConfigured()
                                  ? 'Pi GPS is configured: ${_settingsService.getFullPiAddress()}'
                                  : 'Pi GPS is not configured',
                              style: TextStyle(
                                fontSize: 12,
                                color: _settingsService.isPiConfigured()
                                    ? Colors.green[700]
                                    : Colors.red[700],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Info Card
              Card(
                color: Colors.orange[50],
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'How to Use',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        '1. Enter your Raspberry Pi IP address\n'
                        '2. Ensure the GPS server is running on the Pi\n'
                        '3. Save the settings\n'
                        '4. When filing incident reports, GPS will be automatically tracked\n'
                        '5. Location data will include Pi GPS coordinates',
                        style: TextStyle(fontSize: 12),
                      ),
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
}
