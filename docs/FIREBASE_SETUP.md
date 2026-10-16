# Firebase-Einrichtung für YUL-Multiplayer

Bestehendes Projekt: **guenter-sky-team**. Kein zweites Projekt erstellen.

## Voraussetzungen und manuelle Schritte

1. In der Firebase Console für `guenter-sky-team` unter **Authentication → Sign-in method** den Anbieter **Anonym** aktivieren.
2. Im selben Projekt eine **Realtime Database** erstellen (kein Firestore). Die exakte Datenbank-URL notieren. Die Datenbank mit `database.rules.json` absichern.
3. Eine **Web-App** und eine **Android-App** registrieren. Die Android-Paketkennung aus dem aktuell von der Pipeline generierten Flutter-Projekt lautet `de.skyteam.skyteam` (vor Registrierung im Build verifizieren). Konfigurationswerte sind Firebase-App-IDs, **keine Service-Account-Schlüssel**.
4. Cloud Functions der **zweiten Generation** benötigen ein Firebase-Projekt mit aktivierter Abrechnung (Blaze). Vor Aktivierung bewusst die Firebase-Preise und ein Budgetlimit prüfen. Die Cloud Functions bleiben solange noch nicht live.
5. In GitHub unter **Settings → Secrets and variables → Actions → Variables** folgende fünf Projektwerte setzen:

   - `SKYTEAM_FIREBASE_API_KEY` – Firebase Web API Key
   - `SKYTEAM_FIREBASE_WEB_APP_ID` – Web App ID
   - `SKYTEAM_FIREBASE_ANDROID_APP_ID` – Android App ID
   - `SKYTEAM_FIREBASE_SENDER_ID` – Messaging Sender ID / Project Number
   - `SKYTEAM_FIREBASE_DATABASE_URL` – vollständige URL der Realtime Database

   Firebase Client-API-Keys identifizieren die Firebase-App, sind **kein Ersatz** für Security Rules. Projektweite Operationen und Spielzüge laufen nur über authentifizierte Callable Functions.
6. Sobald Firebase/Blaze für Functions konfiguriert und die vorhandene `FIREBASE_SERVICE_ACCOUNT_GUENTER_SKY_TEAM`-Berechtigung für Functions und die RTDB-Regeln ausreichend ist, die GitHub-Actions-Variable `FIREBASE_DEPLOY_BACKEND=true` setzen. Dies erlaubt der bestehenden Pipeline, **zusätzlich** `functions,database` bereitzustellen. Vorher werden nur Tests und der bisherige Hosting-Build ausgeführt.
7. Bestehende GitHub-Pipelines für Web/PWA und GitHub-Releases bleiben bestehen; Firebase Spark blockiert weiterhin eine öffentliche `.apk`-Datei auf Firebase Hosting. GitHub Releases bleibt der APK-Download.

## Lokal entwickeln

Flutter braucht passende `--dart-define`-Werte bei jedem Build. Beispiel (Platzhalter durch echte Werte ersetzen):

```sh
flutter pub get
flutter run -d chrome \
  --dart-define=SKYTEAM_FIREBASE_API_KEY=... \
  --dart-define=SKYTEAM_FIREBASE_WEB_APP_ID=... \
  --dart-define=SKYTEAM_FIREBASE_SENDER_ID=... \
  --dart-define=SKYTEAM_FIREBASE_DATABASE_URL=...
```

Android zusätzlich mit `SKYTEAM_FIREBASE_ANDROID_APP_ID`. Für die Firebase Emulator Suite:

```sh
npm install --prefix functions
npm --prefix functions test
npx firebase-tools emulators:start --only auth,database,functions --project demo-skyteam
```

`functions/src/test/engine.test.ts` enthält deterministische Engine-Tests; `functions/test/rules.test.cjs` prüft Sicherheitsregeln mit der RTDB-Emulation. Die Android-/Web-App ist derzeit noch **nicht** auf Emulator-URLs umgeschaltet; vor einem Zwei-Geräte-Test müssen reale Firebase-Client-IDs und Backend-Deployment vorliegen.

## Sicherheitsmodell

- `rooms/<CODE>/public`: ausschließlich für zwei Room-Mitglieder lesbar; für Clients schreibgeschützt.
- `rooms/<CODE>/privateDice/<uid>`: ausschließlich für authentifizierte Besitzer lesbar. Kein Recht auf `rooms/<CODE>` oder `privateDice` als Elternknoten.
- `presence/<CODE>/<uid>`: eigene Anwesenheit beschreibbar, bei Verbindungsabbruch über `onDisconnect` aktualisiert.
- `userRooms/<uid>`: nur eigener Raumzeiger lesbar, serverseitig verwaltet.
- Aktionen: Cloud Functions prüfen Mitgliedschaft, Reihenfolge, Würfelbesitz, Feldregeln und Coffee-Guthaben in RTDB-Transaktionen; anonyme Authentifizierung wird vorausgesetzt.

## Fehlendes Cockpitmaterial

Im GitHub-Repository und im dem Assistenten zugänglichen Workspace lag **kein Cockpit-Kontrollpanel-PNG**. Die Funktion `debugHitboxes` markiert UI-Touchflächen; Koordinaten stehen in `lib/models/cockpit_slots.dart`. Diese müssen nach Bereitstellung des Original-Cockpits kalibriert werden. Eine automatisierte Pixel- oder Bilderkennung wird ausdrücklich nicht eingesetzt.

## Abnahme noch offen

Ohne zugängliches Firebase-Projekt (mit anonymer Auth, RTDB, Cloud Functions, registrierten App-IDs) und zwei Testgeräten kann keine reale Zwei-Geräte-Partie als erfolgreich verifiziert gelten. Die offizielle YUL-Anleitung bleibt Referenz für die fachliche Abnahme.
