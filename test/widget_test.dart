import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:skyteam/main.dart';

void main() {
  testWidgets('SkyTeam shows Hello World and opens settings', (tester) async {
    await tester.pumpWidget(const SkyTeamApp());
    expect(find.text('Hello World'), findsOneWidget);
    await tester.tap(find.byIcon(Icons.settings_outlined));
    await tester.pumpAndSettle();
    expect(find.text('Einstellungen'), findsOneWidget);
  });
}
