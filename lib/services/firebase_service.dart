import 'package:firebase_database/firebase_database.dart';

class FirebaseService {
  static final FirebaseService _instance = FirebaseService._internal();
  late DatabaseReference _database;

  FirebaseService._internal() {
    _database = FirebaseDatabase.instance.ref();
  }

  factory FirebaseService() {
    return _instance;
  }

  Future<Map<String, dynamic>?> verifyLogin(
      String username, String password) async {
    try {
      print('[Firebase] Verifying login for user: $username with password: $password');

      final snapshot = await _database.child('users').get();

      if (!snapshot.exists) {
        print('[Firebase] Users collection not found');
        return null;
      }

      final users = snapshot.value as Map<dynamic, dynamic>;
      print('[Firebase] Found ${users.length} users in database');

      for (var entry in users.entries) {
        final userData = entry.value as Map<dynamic, dynamic>;
        final dbUsername = userData['name'] ?? '';
        final dbPassword = userData['password'] ?? '';
        final role = userData['role'] ?? 'tanod';
        final status = userData['status'] ?? 'active';

        print('[Firebase] Checking user: "$dbUsername" (id: ${entry.key})');
        print('[Firebase] DB Password: "$dbPassword", Input Password: "$password"');
        print('[Firebase] Username match: ${dbUsername == username}, Password match: ${dbPassword == password}');

        if (dbUsername == username && dbPassword == password) {
          print('[Firebase] ✅ Login successful for $username with role $role');
          return {
            'userId': entry.key,
            'username': dbUsername,
            'role': role,
            'status': status,
          };
        }
      }

      print('[Firebase] ❌ No matching user found');
      return null;
    } catch (e) {
      print('[Firebase] Error verifying login: $e');
      return null;
    }
  }

  Future<void> submitIncidentReport({
    required String userId,
    required String incidentType,
    required String severity,
    required double latitude,
    required double longitude,
    required String description,
    String? imageUrl,
  }) async {
    try {
      final incidentId = _database.child('incidents').push().key ?? '';

      await _database.child('incidents/$incidentId').set({
        'userId': userId,
        'type': incidentType,
        'severity': severity,
        'latitude': latitude,
        'longitude': longitude,
        'description': description,
        'imageUrl': imageUrl ?? '',
        'status': 'new',
        'timestamp': DateTime.now().toIso8601String(),
        'createdAt': DateTime.now().millisecondsSinceEpoch,
      });

      print('[Firebase] Incident submitted: $incidentId');
    } catch (e) {
      print('[Firebase] Error submitting incident: $e');
      rethrow;
    }
  }

  Future<void> updateTanodLocation({
    required String userId,
    required double latitude,
    required double longitude,
  }) async {
    try {
      await _database.child('locations/$userId').set({
        'latitude': latitude,
        'longitude': longitude,
        'timestamp': DateTime.now().toIso8601String(),
        'updatedAt': DateTime.now().millisecondsSinceEpoch,
      });

      print('[Firebase] Location updated for $userId');
    } catch (e) {
      print('[Firebase] Error updating location: $e');
    }
  }

  Future<void> logActivity({
    required String userId,
    required String action,
  }) async {
    try {
      final logId = _database.child('activityLogs').push().key ?? '';

      await _database.child('activityLogs/$logId').set({
        'userId': userId,
        'action': action,
        'timestamp': DateTime.now().toIso8601String(),
        'createdAt': DateTime.now().millisecondsSinceEpoch,
      });

      print('[Firebase] Activity logged: $action');
    } catch (e) {
      print('[Firebase] Error logging activity: $e');
    }
  }

  Future<List<Map<String, dynamic>>> getAllIncidents() async {
    try {
      final snapshot = await _database.child('incidents').get();

      if (!snapshot.exists) {
        return [];
      }

      final incidents = <Map<String, dynamic>>[];
      final data = snapshot.value as Map<dynamic, dynamic>;

      data.forEach((key, value) {
        if (value is Map<dynamic, dynamic>) {
          incidents.add({
            'id': key,
            ...Map<String, dynamic>.from(value),
          });
        }
      });

      return incidents;
    } catch (e) {
      print('[Firebase] Error fetching incidents: $e');
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> getUserIncidents(String userId) async {
    try {
      final snapshot = await _database.child('incidents').get();

      if (!snapshot.exists) {
        return [];
      }

      final incidents = <Map<String, dynamic>>[];
      final data = snapshot.value as Map<dynamic, dynamic>;

      data.forEach((key, value) {
        if (value is Map<dynamic, dynamic> &&
            value['userId'] == userId) {
          incidents.add({
            'id': key,
            ...Map<String, dynamic>.from(value),
          });
        }
      });

      return incidents;
    } catch (e) {
      print('[Firebase] Error fetching user incidents: $e');
      return [];
    }
  }

  Stream<List<Map<String, dynamic>>> incidentsStream() {
    return _database.child('incidents').onValue.map((event) {
      if (!event.snapshot.exists) {
        return [];
      }

      final incidents = <Map<String, dynamic>>[];
      final data = event.snapshot.value as Map<dynamic, dynamic>;

      data.forEach((key, value) {
        if (value is Map<dynamic, dynamic>) {
          incidents.add({
            'id': key,
            ...Map<String, dynamic>.from(value),
          });
        }
      });

      return incidents;
    });
  }

  Future<List<Map<String, dynamic>>> getTanodLocations() async {
    try {
      final snapshot = await _database.child('locations').get();

      if (!snapshot.exists) {
        return [];
      }

      final locations = <Map<String, dynamic>>[];
      final data = snapshot.value as Map<dynamic, dynamic>;

      data.forEach((key, value) {
        if (value is Map<dynamic, dynamic>) {
          locations.add({
            'userId': key,
            ...Map<String, dynamic>.from(value),
          });
        }
      });

      return locations;
    } catch (e) {
      print('[Firebase] Error fetching tanod locations: $e');
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> getActivityLogs({
    String? userId,
    int? limit,
  }) async {
    try {
      var query = _database.child('activityLogs');

      final snapshot = await query.get();

      if (!snapshot.exists) {
        return [];
      }

      final logs = <Map<String, dynamic>>[];
      final data = snapshot.value as Map<dynamic, dynamic>;

      data.forEach((key, value) {
        if (value is Map<dynamic, dynamic>) {
          if (userId == null || value['userId'] == userId) {
            logs.add({
              'id': key,
              ...Map<String, dynamic>.from(value),
            });
          }
        }
      });

      // Sort by timestamp descending (using createdAt milliseconds)
      logs.sort((a, b) {
        final aTime = a['createdAt'] ?? 0;
        final bTime = b['createdAt'] ?? 0;
        return (bTime as int).compareTo(aTime as int);
      });

      if (limit != null && logs.length > limit) {
        logs.removeRange(limit, logs.length);
      }

      return logs;
    } catch (e) {
      print('[Firebase] Error fetching activity logs: $e');
      return [];
    }
  }

  Future<void> updateIncidentStatus({
    required String incidentId,
    required String status,
  }) async {
    try {
      await _database.child('incidents/$incidentId/status').set(status);

      print('[Firebase] Incident $incidentId status updated to $status');
    } catch (e) {
      print('[Firebase] Error updating incident status: $e');
      rethrow;
    }
  }
}
