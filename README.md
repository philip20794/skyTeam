# SkyTeam

Flutter-App für Android und als installierbare Web-App (PWA).

## Lokal starten

```sh
flutter pub get
flutter create --platforms=android --project-name skyteam --org de.skyteam .
flutter run -d chrome
# Alternativ auf Android: flutter run -d android
```

## Veröffentlichung per GitHub Actions

Bei jedem Push auf `main` läuft `.github/workflows/web.yml`. Der Workflow:

1. Analysiert den Flutter-Code und führt die Tests aus.
2. Baut die Android-Release-APK, prüft ihre ZIP-Struktur und `AndroidManifest.xml`.
3. Stellt die APK als GitHub-Actions-Artefakt **SkyTeam-Android-APK** bereit.
4. Veröffentlicht `SkyTeam.apk` in einer GitHub-Release mit dem festen Tag `android-latest`.
5. Baut die Flutter-PWA und stellt sie als GitHub-Actions-Artefakt bereit.
6. Veröffentlicht die Flutter-Web-App auf Firebase Hosting.

**Webseite:** https://guenter-sky-team.web.app/

**Android-APK (GitHub-Anmeldung mit Repository-Zugriff erforderlich):**
https://github.com/philip20794/skyTeam/releases/download/android-latest/SkyTeam.apk

Alternativ lässt sich die APK im [Actions-Build](https://github.com/philip20794/skyTeam/actions) als Artefakt herunterladen. Die GitHub-Release wird erst bei einem erfolgreichen Build auf `main` angelegt.

### Warum die APK nicht standardmäßig auf Firebase liegt

Firebase Hosting verbietet im kostenlosen **Spark-Tarif** `.apk`-Dateien. Deshalb veröffentlicht dieser Workflow die **PWA standardmäßig ohne APK**, damit das Firebase-Deployment nicht mit HTTP 400 fehlschlägt. Die APK liegt separat auf GitHub.

Das Repository ist privat. **Der GitHub-Release-Link ist daher nicht öffentlich**: Nur angemeldete Personen mit Repository-Zugriff können ihn nutzen. Der Web-Installationsdialog zeigt einen öffentlichen APK-Download erst dann, wenn tatsächlich eine APK unter `/downloads/SkyTeam.apk` erreichbar ist.

Für einen **öffentlichen Direktdownload von der Firebase-Website**: Das Firebase-Projekt `guenter-sky-team` auf den kostenpflichtigen Blaze-Tarif umstellen, danach im GitHub-Repository unter *Settings → Secrets and variables → Actions → Variables* die Variable `FIREBASE_HOST_APK` auf `true` setzen. Bei künftigen Deployments wird dann auch `build/web/downloads/SkyTeam.apk` hochgeladen und dessen öffentliche SHA-256-Prüfsumme geprüft. **Blaze kann Kosten verursachen.** Für einen kostenfreien öffentlichen Download wäre alternativ ein separater öffentlicher Download-Host nötig.

## Firebase-Zugang für GitHub Actions

Im Repository muss das GitHub-Secret `FIREBASE_SERVICE_ACCOUNT_GUENTER_SKY_TEAM` existieren. Die zugehörigen Zugangsdaten des Firebase-Service-Accounts dürfen **nicht** committed werden. Die Einrichtung ist über `firebase init hosting:github` möglich. Zusätzlich erzeugte Standard-Workflows, die `npm ci && npm run build` verwenden, werden nicht benötigt.

## Android-Signierung für Updates

Das via `flutter create` generierte Standardprojekt nutzt ohne konfigurierte Release-Signierung einen Debug-Schlüssel für das Release-APK. Dieser Schlüssel kann zwischen verschiedenen CI-Runs wechseln. Dadurch kann die Installation einer neuen APK über eine bereits installierte Version fehlschlagen. Für zuverlässige Updates muss ein **dauerhafter Release-Keystore** eingerichtet und sicher für GitHub Actions verfügbar gemacht werden.

Die PWA-Installation funktioniert nur in unterstützten Browsern und kann nicht bei jedem Seitenaufruf erzwungen werden.
