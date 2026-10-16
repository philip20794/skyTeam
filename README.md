# SkyTeam

Flutter-App für Android und als installierbare Web-App (PWA).

## Lokale Entwicklung

```sh
flutter pub get
flutter create --platforms=android --project-name skyteam --org de.skyteam .
flutter run -d chrome
# alternativ: flutter run -d android
```

## Automatische Veröffentlichung

Die GitHub Action `.github/workflows/web.yml` führt bei jedem Push auf `main` Folgendes aus:

1. Flutter-Abhängigkeiten laden, statische Analyse und Tests ausführen.
2. Eine Release-APK für Android und die Flutter-Web-App bauen.
3. Die APK nach `build/web/downloads/SkyTeam.apk` kopieren.
4. Beide Builds als GitHub-Actions-Artefakte speichern.
5. Den kompletten Inhalt von `build/web` auf den Firebase-Hosting-Live-Kanal von `guenter-sky-team` deployen.

Pull Requests führen dieselben Build-Checks aus, veröffentlichen aber nichts. Ein manueller Start des Workflows ist ebenfalls möglich.

Nach erfolgreichem Deployment lautet der öffentliche APK-Pfad **`/downloads/SkyTeam.apk` auf der Domain der Web-App**. Die Installationsauswahl im Android-Browser und der APK-Eintrag in den Einstellungen verwenden beide diesen Pfad. Das private GitHub-Repository muss dafür nicht öffentlich werden.

## Einmalige Firebase-Berechtigung für GitHub Actions

Die Action benötigt das GitHub-Repository-Secret **`FIREBASE_SERVICE_ACCOUNT_GUENTER_SKY_TEAM`**. Dieses enthält die JSON-Zugangsdaten eines Firebase-Service-Accounts mit Berechtigung zum Deployment auf das Firebase-Hosting-Projekt `guenter-sky-team`.

Die offizielle Firebase-Einrichtung kann dieses Secret anlegen:

```sh
firebase login
firebase init hosting:github
```

Dabei das bestehende Projekt `guenter-sky-team` und das Repository `philip20794/skyTeam` wählen. Firebase erstellt gegebenenfalls weitere Workflow-Dateien: Diese nicht zusätzlich übernehmen, da die vorhandene `.github/workflows/web.yml` bereits baut und deployed. Falls das Setup einen anderen Secret-Namen anlegt, das Secret in GitHub umbenennen oder den Namen im vorhandenen Workflow angleichen. Den JSON-Schlüssel niemals committen.

Secret-Verwaltung: https://github.com/philip20794/skyTeam/settings/secrets/actions

Bis das Secret eingerichtet ist, produziert die Pipeline nach jedem Push weiterhin die APK und Web-Artefakte, meldet aber den Firebase-Deploy-Schritt als fehlgeschlagen. Der öffentliche APK-Link funktioniert erst nach einem erfolgreichen Firebase-Deployment.

## Android-Signierung

Die aktuelle Android-Release-APK wird vom durch `flutter create` erzeugten Standardprojekt mit dessen Debug-Signing gebaut. Diese APK ist installierbar, **aber wegen der wechselnden Debug-Schlüssel von GitHub-Runnern nicht zuverlässig als Update über eine vorherige Version installierbar**. Für dauerhafte, updatefähige APK-Versionen muss später ein fester Release-Keystore als GitHub-Secret eingerichtet und im Android-Build verwendet werden. Bis dahin kann eine Deinstallation der vorherigen Version erforderlich sein.

Die PWA-Installation auf Android funktioniert nur in unterstützten Browsern, sobald deren Installationsbedingungen erfüllt sind. Der Browser-Installationsdialog lässt sich nicht erzwingen.
