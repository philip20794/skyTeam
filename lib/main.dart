import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:skyteam/features/game_screen.dart';
import 'package:skyteam/services/firebase_settings.dart';
import 'package:skyteam/services/game_repository.dart';
import 'package:skyteam/settings_page.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SkyTeamApp());
}
class SkyTeamApp extends StatelessWidget {
  const SkyTeamApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'SkyTeam',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      brightness: Brightness.dark,
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff2c9dca), brightness: Brightness.dark),
      scaffoldBackgroundColor: const Color(0xff0a1b29),
      useMaterial3: true,
    ),
    home: const HomePage(),
  );
}
class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  State<HomePage> createState() => _HomePageState();
}
class _HomePageState extends State<HomePage> {
  final code = TextEditingController();
  GameRepository? game;
  String? startupError;
  bool loading = true;

  @override
  void initState() { super.initState(); initialize(); }
  Future<void> initialize() async {
    try {
      if (!SkyFirebaseSettings.configured(kIsWeb)) {
        throw StateError('Firebase-App-IDs fehlen. Siehe docs/FIREBASE_SETUP.md.');
      }
      await Firebase.initializeApp(options: SkyFirebaseSettings.forPlatform(kIsWeb));
      if (SkyFirebaseSettings.useEmulator) {
        final host = SkyFirebaseSettings.emulatorHost;
        await FirebaseAuth.instance.useAuthEmulator(host, 9099);
        FirebaseDatabase.instance.useDatabaseEmulator(host, 9000);
        FirebaseFunctions.instanceFor(region: 'europe-west1')
            .useFunctionsEmulator(host, 5001);
      }
      if (FirebaseAuth.instance.currentUser == null) {
        await FirebaseAuth.instance.signInAnonymously();
      }
      final service = GameRepository();
      await service.resume();
      final invite = Uri.base.queryParameters['room'];
      if (service.roomId == null && invite != null) code.text = invite.toUpperCase();
      if (mounted) setState(() => game = service);
    } catch (error) {
      if (mounted) setState(() => startupError = error.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }
  Future<void> run(Future<void> Function() operation) async {
    try { await operation(); }
    catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(game?.error ?? error.toString())));
    }
  }
  @override
  void dispose() { code.dispose(); game?.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    final service = game;
    return Scaffold(
      appBar: AppBar(title: const Text('SkyTeam'), actions: [
        IconButton(tooltip:'Einstellungen', icon: const Icon(Icons.settings_outlined),
          onPressed: () => Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const SettingsPage()))),
      ]),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : service == null
              ? Center(child: Padding(padding: const EdgeInsets.all(20),
                  child: SelectableText(startupError ?? 'Firebase nicht eingerichtet.',
                    textAlign: TextAlign.center)))
              : AnimatedBuilder(animation: service, builder: (context, _) {
                  if (service.roomId == null) return home(service);
                  if (service.publicState.isEmpty) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (service.phase == 'lobby') return lobby(service);
                  return GameScreen(game: service, submit: run);
                }),
    );
  }
  Widget home(GameRepository service) => ListView(padding: const EdgeInsets.all(20), children: [
    const SizedBox(height: 35),
    const Icon(Icons.flight_land, size: 90, color: Colors.lightBlueAccent),
    const SizedBox(height: 20),
    const Text('YUL Montréal-Trudeau', textAlign: TextAlign.center,
        style: TextStyle(fontSize: 23, fontWeight: FontWeight.w700)),
    const Text('Kooperativer Landeanflug für zwei Personen', textAlign: TextAlign.center),
    const SizedBox(height: 28),
    FilledButton.icon(onPressed: service.busy ? null : () => run(service.create),
        icon: const Icon(Icons.add), label: const Text('Spiel erstellen')),
    const SizedBox(height: 22),
    TextField(controller: code, maxLength: 9, textCapitalization: TextCapitalization.characters,
        decoration: const InputDecoration(border: OutlineInputBorder(), labelText: 'Einladungscode')),
    OutlinedButton.icon(onPressed: service.busy ? null : () => run(() => service.join(code.text)),
        icon: const Icon(Icons.login), label: const Text('Spiel beitreten')),
  ]);
  Widget lobby(GameRepository service) {
    final members = jsonObject(service.publicState['members']);
    final allReady = members.length == 2 &&
        members.values.every((member) => jsonObject(member)['ready'] == true);
    final invite = Uri.base.replace(queryParameters: {'room': service.roomId ?? ''}).toString();
    return ListView(padding: const EdgeInsets.all(20), children: [
      const Text('Warteraum · Montréal', style: TextStyle(fontSize: 22)),
      const SizedBox(height: 18),
      SelectableText(service.roomId ?? '', textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 31, letterSpacing: 4)),
      TextButton.icon(onPressed: () => Clipboard.setData(ClipboardData(text: service.roomId ?? '')),
          icon: const Icon(Icons.copy), label: const Text('Code kopieren')),
      TextButton.icon(onPressed: () => Clipboard.setData(ClipboardData(text: invite)),
          icon: const Icon(Icons.link), label: const Text('Einladungslink kopieren')),
      const Divider(),
      Text('Spieler: ' + members.length.toString() + ' / 2'),
      ...members.entries.map((entry) {
        final member = jsonObject(entry.value);
        final pilot = member['role'] == 'pilot';
        return ListTile(
          leading: Icon(Icons.person, color: pilot ? Colors.lightBlueAccent : Colors.orangeAccent),
          title: Text(pilot ? 'Pilot (blau)' : 'Co-Pilot (orange)'),
          subtitle: Text(entry.key == service.uid ? 'Du' : 'Partner'),
          trailing: Icon(member['ready'] == true ? Icons.check_circle : Icons.hourglass_empty),
        );
      }),
      if (service.host)
        OutlinedButton(onPressed: members.length == 2 && !service.busy
          ? () => run(() => service.action('changeRoles')) : null,
          child: const Text('Rollen tauschen')),
      FilledButton(onPressed: members.length == 2 && !service.busy
          ? () => run(() => service.action('setReady')) : null,
          child: const Text('Ich bin bereit')),
      if (service.host)
        FilledButton.tonal(onPressed: allReady && !service.busy
          ? () => run(() => service.action('startGame')) : null,
          child: const Text('Partie starten')),
      TextButton(onPressed: !service.busy ? () => run(service.leave) : null,
          child: const Text('Lobby verlassen')),
    ]);
  }
}
