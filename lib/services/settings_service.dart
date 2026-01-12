import 'package:shared_preferences/shared_preferences.dart';

class SettingsService {
  static final SettingsService _instance = SettingsService._internal();
  late SharedPreferences _prefs;
  
  // Keys for SharedPreferences
  static const String _piIpKey = 'pi_ip_address';
  static const String _piPortKey = 'pi_port';

  SettingsService._internal();

  factory SettingsService() {
    return _instance;
  }

  /// Initialize SharedPreferences
  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    print('[Settings] Initialized');
  }

  /// Save Pi IP address
  Future<void> setPiAddress(String ipAddress) async {
    await _prefs.setString(_piIpKey, ipAddress);
    print('[Settings] Saved Pi IP: $ipAddress');
  }

  /// Get saved Pi IP address
  String? getPiAddress() {
    final ip = _prefs.getString(_piIpKey);
    print('[Settings] Retrieved Pi IP: $ip');
    return ip;
  }

  /// Save Pi port
  Future<void> setPiPort(int port) async {
    await _prefs.setInt(_piPortKey, port);
    print('[Settings] Saved Pi Port: $port');
  }

  /// Get saved Pi port (default 5000)
  int getPiPort() {
    return _prefs.getInt(_piPortKey) ?? 5000;
  }

  /// Clear Pi configuration
  Future<void> clearPiConfig() async {
    await _prefs.remove(_piIpKey);
    await _prefs.remove(_piPortKey);
    print('[Settings] Cleared Pi configuration');
  }

  /// Get full Pi address with port
  String? getFullPiAddress() {
    final ip = getPiAddress();
    if (ip != null && ip.isNotEmpty) {
      return '$ip:${getPiPort()}';
    }
    return null;
  }

  /// Check if Pi is configured
  bool isPiConfigured() {
    final ip = getPiAddress();
    return ip != null && ip.isNotEmpty;
  }
}
