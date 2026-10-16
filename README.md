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

Bei jedem Push auf `main` laufen Analyse, Widget-Tests und Web-Build. Anschließend erstellt GitHub Actions eine Release-APK und lädt sie als Asset der festen GitHub-Release `android-latest` hoch:

https://github.com/philip20794/skyTeam/releases/download/android-latest/SkyTeam.apk

**Achtung:** Das Repository ist privat. GitHub-Releases und damit die APK können ohne GitHub-Anmeldung nicht zuverlässig öffentlich heruntergeladen werden. Für Downloads von beliebigen Web-App-Nutzern das APK-Asset auf einen öffentlichen Hosting-Dienst spiegeln oder das Repository öffentlich machen. Die Web-App wird derzeit als GitHub-Actions-Artefakt gebaut und **noch nicht live gehostet**.

Die vorläufige APK nutzt ohne konfigurierte Release-Signierung das vom Flutter-Android-Template vorgesehene Debug-Key-Signing für Release-Builds. Für spätere, überinstallierbare Updates muss ein **dauerhaftes Release-Keystore** sicher in GitHub Actions Secrets hinterlegt und der Android-Build auf dieses Signing umgestellt werden.

Die PWA-Auswahl erscheint in unterstützten Android-Browsern bei `beforeinstallprompt`; sie ist nicht bei jedem Besuch erzwingbar. PWA-Installation setzt HTTPS und passende Installierbarkeitskriterien voraus.
