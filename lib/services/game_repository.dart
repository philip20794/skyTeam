import 'dart:async';
import 'dart:math';

import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter/foundation.dart';

Map<String, dynamic> jsonObject(dynamic value) {
  if (value is! Map) return {};
  return value.map((key, item) => MapEntry(key.toString(), item));
}

/// Owns Firebase listeners, action calls and presence. Widgets never write game state.
class GameRepository extends ChangeNotifier {
  GameRepository()
      : _database = FirebaseDatabase.instance,
        _functions = FirebaseFunctions.instanceFor(region: 'europe-west1');
  final FirebaseDatabase _database;
  final FirebaseFunctions _functions;

  String? roomId;
  Map<String, dynamic> publicState = {};
  Map<String, dynamic> privateState = {};
  Map<String, dynamic> presence = {};
  String? error;
  bool busy = false;
  StreamSubscription<DatabaseEvent>? _publicListener;
  StreamSubscription<DatabaseEvent>? _privateListener;
  StreamSubscription<DatabaseEvent>? _presenceListener;

  String get uid => FirebaseAuth.instance.currentUser?.uid ?? '';
  String get phase => publicState['phase']?.toString() ?? '';
  String get role => jsonObject(jsonObject(publicState['members'])[uid])['role']?.toString() ?? '';
  String get activeRole => publicState['activeRole']?.toString() ?? '';
  bool get host => publicState['host'] == uid;
  Map<String, dynamic> get board => jsonObject(publicState['board']);
  Map<String, dynamic> get placements => jsonObject(board['slots']);
  List<dynamic> get dice => privateState['dice'] is List ? privateState['dice'] as List<dynamic> : [];
  int get coffee => (board['coffee'] as num?)?.toInt() ?? 0;
  int get rerolls => (board['rerolls'] as num?)?.toInt() ?? 0;
  int get round => (board['round'] as num?)?.toInt() ?? 1;
  int get altitude => (board['altitude'] as num?)?.toInt() ?? 6000;

  bool get partnerOnline {
    final others = jsonObject(publicState['members']).keys.where((key) => key != uid);
    if (others.isEmpty) return false;
    return jsonObject(presence[others.first])['connected'] == true;
  }

  String newActionId() {
    final random = Random.secure();
    return DateTime.now().microsecondsSinceEpoch.toString() +
        '-' + random.nextInt(0x7fffffff).toString();
  }

  Future<Map<String, dynamic>> invoke(String method, [Map<String, dynamic> args = const {}]) async {
    error = null;
    busy = true;
    notifyListeners();
    try {
      final result = await _functions.httpsCallable(method).call(args);
      return jsonObject(result.data);
    } on FirebaseFunctionsException catch (e) {
      error = e.message ?? 'Aktion wurde vom Server abgelehnt.';
      rethrow;
    } catch (e) {
      error = 'Verbindungsfehler: $e';
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> create() async {
    final result = await invoke('createRoom');
    final id = result['roomId']?.toString();
    if (id == null) throw StateError('Keine Lobby-ID erhalten.');
    await attach(id);
  }

  Future<void> join(String inviteCode) async {
    final result = await invoke('joinRoom', {'code': inviteCode.trim().toUpperCase()});
    final id = result['roomId']?.toString();
    if (id == null) throw StateError('Beitritt fehlgeschlagen.');
    await attach(id);
  }

  Future<void> resume() async {
    final result = await invoke('resumeGame');
    final id = result['roomId']?.toString();
    if (id != null && id.isNotEmpty) await attach(id);
  }

  Future<void> attach(String id) async {
    await _closeListeners();
    roomId = id;
    publicState = {};
    privateState = {};
    presence = {};
    notifyListeners();
    final root = _database.ref('rooms/$id');
    _publicListener = root.child('public').onValue.listen(
      (event) {
        publicState = jsonObject(event.snapshot.value);
        notifyListeners();
      },
      onError: (Object e) {
        error = 'Öffentlicher Spielstand nicht lesbar: $e';
        notifyListeners();
      },
    );
    _privateListener = root.child('privateDice/$uid').onValue.listen(
      (event) {
        privateState = jsonObject(event.snapshot.value);
        notifyListeners();
      },
      onError: (Object e) {
        error = 'Geheime Würfel nicht lesbar: $e';
        notifyListeners();
      },
    );
    final base = _database.ref('presence/$id');
    _presenceListener = base.onValue.listen((event) {
      presence = jsonObject(event.snapshot.value);
      notifyListeners();
    });
    final own = base.child(uid);
    await own.onDisconnect().set({
      'connected': false,
      'lastSeen': ServerValue.timestamp,
    });
    await own.set({'connected': true, 'lastSeen': ServerValue.timestamp});
  }

  Future<void> action(String method, [Map<String, dynamic> params = const {}]) async {
    if (roomId == null) throw StateError('Keine Partie ausgewählt.');
    await invoke(method, {'roomId': roomId, 'actionId': newActionId(), ...params});
  }

  Future<void> leave() async {
    await action('leaveRoom');
    await _closeListeners();
    roomId = null;
    publicState = {};
    privateState = {};
    notifyListeners();
  }

  Future<void> _closeListeners() async {
    if (roomId != null && uid.isNotEmpty) {
      try {
        final myPresence = _database.ref('presence/$roomId/$uid');
        await myPresence.onDisconnect().cancel();
        await myPresence.set({'connected': false, 'lastSeen': ServerValue.timestamp});
      } catch (_) {
        // Losing connectivity cannot block reconnect.
      }
    }
    await _publicListener?.cancel();
    await _privateListener?.cancel();
    await _presenceListener?.cancel();
    _publicListener = null;
    _privateListener = null;
    _presenceListener = null;
  }

  @override
  void dispose() {
    _publicListener?.cancel();
    _privateListener?.cancel();
    _presenceListener?.cancel();
    super.dispose();
  }
}
