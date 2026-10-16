# SkyTeam

Flutter-App für Android und das Web, installierbar als PWA.

## Lokal starten

Flutter SDK installieren, dann:

```sh
flutter pub get
flutter create --platforms=android --project-name skyteam --org de.skyteam .
flutter run -d chrome
# oder: flutter run -d android
```

Das Android-Plattformgerüst wird beim ersten lokalen Start und in CI aus dem Flutter-SDK erzeugt, damit die Vorlage reproduzierbar bleibt.

## Veröffentlichungen

## Firebase Hosting automatisch veröffentlichen

Die GitHub Action `.github/workflows/web.yml` baut bei jedem Push auf `main` die Flutter-Web-App und veröffentlicht `build/web` im Live-Kanal des Firebase-Projekts `guenter-sky-team`. Das Web-Build bleibt zusätzlich als GitHub-Actions-Artefakt verfügbar.

**Einmalige Einrichtung:** GitHub Actions benötigt einen Firebase-Service-Account. Empfohlen ist, im Projektverzeichnis lokal `firebase init hosting:github` auszuführen, dabei `guenter-sky-team` und das Repository `philip20794/skyTeam` auszuwählen und die Einrichtung abzuschließen. Der Firebase-Assistent richtet einen geeigneten Service-Account und ein verschlüsseltes GitHub-Secret ein. Alternativ kann der JSON-Schlüssel eines geeigneten Service-Accounts direkt unter [GitHub Actions Secrets](https://github.com/philip20794/skyTeam/settings/secrets/actions) hinterlegt werden.

Der bereits eingecheckte Workflow erwartet exakt den Secret-Namen `FIREBASE_SERVICE_ACCOUNT_GUENTER_SKY_TEAM`. Wenn der Firebase-Assistent einen anderen Namen verwendet, den Secret-Namen oder die Referenz im Workflow entsprechend angleichen.

**Wichtig:** Der Firebase-Assistent erzeugt gegebenenfalls zusätzliche Workflow-Dateien. Diese nicht ungeprüft committen, sonst kann Firebase zweimal deployt werden. Der vorhandene Workflow übernimmt den automatischen Deploy bereits.

Nach dem Einrichten des Secrets genügt ein Push auf `main` oder ein manueller Start des Workflows unter [GitHub Actions](https://github.com/philip20794/skyTeam/actions/workflows/web.yml). Der Build und der Deploy müssen erfolgreich abschließen. Ohne Secret bricht der Deploy-Schritt mit einer konkreten Fehlermeldung ab.

Bei jedem Push auf `main` laufen Analyse, Widget-Tests und Web-Build. Anschließend erstellt GitHub Actions eine Release-APK und lädt sie als Asset der festen GitHub-Release `android-latest` hoch:

https://github.com/philip20794/skyTeam/releases/download/android-latest/SkyTeam.apk

**Achtung:** Das Repository ist privat. GitHub-Releases und damit die APK können ohne GitHub-Anmeldung nicht zuverlässig öffentlich heruntergeladen werden. Für Downloads von beliebigen Web-App-Nutzern das APK-Asset auf einen öffentlichen Hosting-Dienst spiegeln oder das Repository öffentlich machen. Für den automatischen Web-Deploy auf Firebase Hosting siehe den folgenden Abschnitt.

Die vorläufige APK nutzt ohne konfigurierte Release-Signierung das vom Flutter-Android-Template vorgesehene Debug-Key-Signing für Release-Builds. Für spätere, überinstallierbare Updates muss ein **dauerhaftes Release-Keystore** sicher in GitHub Actions Secrets hinterlegt und der Android-Build auf dieses Signing umgestellt werden.

Die PWA-Auswahl erscheint in unterstützten Android-Browsern bei `beforeinstallprompt`; sie ist nicht bei jedem Besuch erzwingbar. PWA-Installation setzt HTTPS und passende Installierbarkeitskriterien voraus.
