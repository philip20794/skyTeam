import 'package:flutter/material.dart';
import 'package:skyteam/models/cockpit_slots.dart';
import 'package:skyteam/services/game_repository.dart';

class GameScreen extends StatefulWidget {
  const GameScreen({super.key, required this.game, required this.submit});
  final GameRepository game;
  final Future<void> Function(Future<void> Function()) submit;
  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  String? selectedId;
  int? finalValue;
  bool debugHitboxes = false;
  final Set<String> rerollSelection = {};

  Future<void> send(String name, [Map<String, dynamic> params = const {}]) async {
    await widget.submit(() => widget.game.action(name, params));
  }
  int get originalValue {
    for (final die in widget.game.dice) {
      final info = jsonObject(die);
      if (info['id'] == selectedId) return (info['value'] as num?)?.toInt() ?? 0;
    }
    return 0;
  }
  bool canPlace(CockpitSlot slot) {
    final game = widget.game;
    if (game.busy || game.phase != 'placing' || game.activeRole != game.role ||
        selectedId == null || game.placements.containsKey(slot.id)) return false;
    if (slot.owner != 'both' && slot.owner != game.role) return false;
    final value = finalValue ?? originalValue;
    if (value < 1 || value > 6 || (value - originalValue).abs() > game.coffee) return false;
    if (slot.values.isNotEmpty && !slot.values.contains(value)) return false;
    if (slot.kind == 'flaps' || slot.kind == 'brake') {
      final progress = game.board[slot.kind == 'flaps' ? 'flaps' : 'brakes'] as List?;
      if (progress != null && slot.order != progress.indexWhere((item) => item == false)) {
        return false;
      }
    }
    return true;
  }
  Future<void> place(CockpitSlot slot) async {
    if (!canPlace(slot)) return;
    final id = selectedId!;
    final value = finalValue ?? originalValue;
    setState(() { selectedId = null; finalValue = null; });
    await send('placeDie', {'dieId': id, 'slotId': slot.id, 'value': value});
  }
  @override
  Widget build(BuildContext context) {
    final game = widget.game;
    if (game.phase == 'finished') {
      final result = jsonObject(game.publicState['result']);
      final won = result['won'] == true;
      return Center(child: ListView(shrinkWrap: true, padding: const EdgeInsets.all(24), children: [
        Icon(won ? Icons.emoji_events : Icons.warning_amber, size: 88,
            color: won ? Colors.lightGreenAccent : Colors.redAccent),
        Text(won ? 'Erfolgreich gelandet!' : 'Partie verloren',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 14),
        Text(result['reason']?.toString() ?? '', textAlign: TextAlign.center),
        if (game.host) FilledButton(
          onPressed: game.busy ? null : () => send('restartGame'),
          child: const Text('Neue Partie'),
        ),
      ]));
    }
    final own = jsonObject(jsonObject(game.publicState['members'])[game.uid]);
    final ownReady = own['ready'] == true;
    final ownRolled = jsonObject(game.publicState['rolled'])[game.role] == true;
    return Column(children: [
      status(game),
      if (game.phase == 'discussion')
        FilledButton(
          onPressed: ownReady || game.busy ? null : () => send('setReady'),
          child: Text(ownReady ? 'Warte auf Partner …' : 'Absprache beenden · Bereit'),
        ),
      if (game.phase == 'rolling')
        FilledButton(
          onPressed: ownRolled || game.busy ? null : () => send('rollMyDice'),
          child: Text(ownRolled ? 'Warte auf Partner …' : 'Meine 4 Würfel werfen'),
        ),
      if (game.phase == 'reroll') rerollControls(game),
      Expanded(child: Center(child: InteractiveViewer(
        constrained: false, minScale: .6, maxScale: 3,
        boundaryMargin: const EdgeInsets.all(55),
        child: SizedBox(width: 370, height: 520, child: cockpit(game)),
      ))),
      dicePanel(game),
    ]);
  }
  Widget status(GameRepository game) {
    final partner = game.partnerOnline ? 'verbunden' : 'offline';
    final current = game.activeRole == 'pilot' ? 'Pilot' : 'Co-Pilot';
    String label = game.phase == 'discussion' ? 'Absprache'
        : game.phase == 'rolling' ? 'Würfeln'
        : game.phase == 'reroll' ? 'Gemeinsamer Neuwurf'
        : game.activeRole == game.role ? 'Du bist am Zug' : current + ' ist am Zug';
    return Container(
      color: const Color(0xff193e52), padding: const EdgeInsets.all(7),
      child: Column(children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
          Text('YUL · Runde ' + game.round.toString() + '/7'),
          Text(game.altitude.toString() + ' Fuß'),
          Text(partner, style: TextStyle(
              color: game.partnerOnline ? Colors.lightGreenAccent : Colors.orangeAccent)),
        ]),
        Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
          Text('Kaffee ' + game.coffee.toString() + ' · Neuwurf ' + game.rerolls.toString()),
          IconButton(tooltip: 'Touchflächen anzeigen',
              onPressed: () => setState(() => debugHitboxes = !debugHitboxes),
              icon: const Icon(Icons.grid_4x4, size: 18)),
        ]),
        if (game.error != null) Text(game.error!, style: const TextStyle(color: Colors.redAccent)),
      ]),
    );
  }
  Widget cockpit(GameRepository game) {
    final b = game.board;
    final axis = (b['axis'] as num?)?.toDouble() ?? 0;
    final approach = (b['approach'] as num?)?.toInt() ?? 0;
    final destination = (b['airportIndex'] as num?)?.toInt() ?? 7;
    final traffic = b['traffic'] as List? ?? [];
    var remaining = 0;
    for (final marker in traffic) {
      remaining += (marker as num).toInt();
    }
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xff35536a), Color(0xff0d1f2c), Color(0xff233848)],
          begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.blueGrey, width: 2),
      ),
      child: Stack(children: [
        Positioned(top: 10, left: 40, right: 40, child: Column(children: [
          const Text('ANFLUG · YUL', style: TextStyle(letterSpacing: 2)),
          Text('Position ' + approach.toString() + '/' + destination.toString() +
              ' · Flugverkehr: ' + remaining.toString(), style: const TextStyle(fontSize: 12)),
        ])),
        Positioned(top: 56, left: 16, right: 16,
          child: Row(children: [
            for (var i = 0; i < traffic.length; i++)
              Expanded(child: Container(
                padding: const EdgeInsets.symmetric(vertical: 2),
                margin: const EdgeInsets.symmetric(horizontal: 1),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(4),
                  color: i == approach ? Colors.green.shade800 : const Color(0xff233b51),
                  border: Border.all(color: i == approach ? Colors.lightGreenAccent : Colors.white24),
                ),
                child: Text(i == destination ? 'YUL'
                    : (traffic[i] as num).toInt() == 0 ? '—'
                    : '✈' + (traffic[i] as num).toInt().toString(),
                    textAlign: TextAlign.center, style: const TextStyle(fontSize: 9)),
              )),
          ]),
        ),
        Positioned(top: 130, left: 106, width: 158, height: 158,
          child: Container(
            decoration: BoxDecoration(shape: BoxShape.circle,
                border: Border.all(color: Colors.blueGrey, width: 5),
                gradient: const LinearGradient(
                  colors: [Color(0xff28769a), Color(0xff132534)],
                  begin: Alignment.topCenter, end: Alignment.bottomCenter,
                )),
            alignment: Alignment.center,
            child: Transform.rotate(angle: axis * -.16,
                child: const Icon(Icons.flight, size: 90, color: Colors.white)),
          ),
        ),
        Positioned(top: 320, left: 75, width: 220, child:
          Text('Aerodynamik: ' + (b['blueThreshold']?.toString() ?? '') +
              ' / ' + (b['orangeThreshold']?.toString() ?? ''),
              textAlign: TextAlign.center, style: const TextStyle(fontSize: 12))),
        ...cockpitSlots.map((slot) {
          final placed = jsonObject(game.placements[slot.id]);
          final occupied = placed.isNotEmpty;
          final enabled = canPlace(slot);
          final progress = slot.kind == 'gear'
              ? b['gear'] as List? : slot.kind == 'flaps'
                  ? b['flaps'] as List? : slot.kind == 'brake'
                      ? b['brakes'] as List? : null;
          final activated = progress != null && slot.order != null
              && slot.order! < progress.length && progress[slot.order!] == true;
          final color = slot.owner == 'pilot' ? const Color(0xff0b4fb9)
              : slot.owner == 'copilot' ? const Color(0xffbf6516)
              : const Color(0xff4a788d);
          return Positioned(
            left: 370 * slot.x, top: 520 * slot.y,
            width: 370 * slot.width, height: 520 * slot.height,
            child: GestureDetector(
              onTap: enabled ? () => place(slot) : null,
              child: Container(
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: occupied ? 1 : .75),
                  borderRadius: BorderRadius.circular(7),
                  border: Border.all(
                    color: enabled ? Colors.lightGreenAccent
                        : activated ? Colors.greenAccent
                        : debugHitboxes ? Colors.pinkAccent : Colors.white38,
                    width: enabled ? 3 : 1,
                  ),
                ),
                child: Text(
                  occupied ? placed['value'].toString()
                      : debugHitboxes ? slot.id : activated ? '✓ ' + slot.title : slot.title,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: debugHitboxes ? 8 : 13,
                      fontWeight: occupied ? FontWeight.bold : FontWeight.normal),
                ),
              ),
            ),
          );
        }),
      ]),
    );
  }
  Widget rerollControls(GameRepository game) {
    final pending = game.publicState['rerollPending'] as List? ?? [];
    return Column(children: [
      const Text('Eigene Würfel für den Neuwurf auswählen'),
      if (pending.contains(game.role))
        FilledButton(
          onPressed: game.busy ? null : () {
            final ids = rerollSelection.toList();
            rerollSelection.clear();
            send('submitRerollSelection', {'selection': ids});
          },
          child: const Text('Neuwurf bestätigen'),
        )
      else const Text('Warte auf die Auswahl des Partners …'),
    ]);
  }
  Widget dicePanel(GameRepository game) {
    final mayPlace = game.phase == 'placing' && game.role == game.activeRole;
    final mayReroll = game.phase == 'reroll' &&
        (game.publicState['rerollPending'] as List? ?? []).contains(game.role);
    return Container(
      color: const Color(0xff193e52),
      padding: const EdgeInsets.all(10),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        if (game.phase == 'placing' && !mayPlace)
          const Text('Partner ist am Zug · bitte warten'),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          for (final item in game.dice)
            Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: ChoiceChip(
              selected: jsonObject(item)['id'] == selectedId ||
                  rerollSelection.contains(jsonObject(item)['id']),
              label: Text(jsonObject(item)['value'].toString(),
                  style: const TextStyle(fontSize: 21)),
              onSelected: mayPlace ? (_) => setState(() {
                selectedId = jsonObject(item)['id'].toString();
                finalValue = (jsonObject(item)['value'] as num).toInt();
              }) : mayReroll ? (_) => setState(() {
                final id = jsonObject(item)['id'].toString();
                if (!rerollSelection.add(id)) rerollSelection.remove(id);
              }) : null,
            )),
        ]),
        if (selectedId != null && mayPlace && finalValue != null)
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            IconButton(
              onPressed: finalValue! > 1 && (finalValue! - 1 - originalValue).abs() <= game.coffee
                ? () => setState(() => finalValue = finalValue! - 1) : null,
              icon: const Icon(Icons.remove_circle_outline)),
            Text('Wert ' + finalValue.toString() + ' · Kaffee: ' +
                (finalValue! - originalValue).abs().toString()),
            IconButton(
              onPressed: finalValue! < 6 && (finalValue! + 1 - originalValue).abs() <= game.coffee
                ? () => setState(() => finalValue = finalValue! + 1) : null,
              icon: const Icon(Icons.add_circle_outline)),
          ]),
        if (mayPlace && game.rerolls > 0)
          TextButton(
            onPressed: game.busy ? null : () => send('requestReroll'),
            child: const Text('Gemeinsamen Neuwurf einsetzen'),
          ),
      ]),
    );
  }
}
