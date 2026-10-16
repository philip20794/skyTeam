import 'package:firebase_core/firebase_core.dart';

/// Non-secret Firebase app IDs, supplied via --dart-define for both platforms.
class SkyFirebaseSettings {
  static const apiKey = String.fromEnvironment('SKYTEAM_FIREBASE_API_KEY', defaultValue: 'AIzaSyD9QtKycplmKvXT1i8sdDNMjkCiM2SeH-g');
  static const webAppId = String.fromEnvironment('SKYTEAM_FIREBASE_WEB_APP_ID', defaultValue: '1:772729294994:web:ce0adb587dff2efe8e164b');
  static const androidAppId = String.fromEnvironment('SKYTEAM_FIREBASE_ANDROID_APP_ID');
  static const senderId = String.fromEnvironment('SKYTEAM_FIREBASE_SENDER_ID', defaultValue: '772729294994');
  static const databaseUrl = String.fromEnvironment('SKYTEAM_FIREBASE_DATABASE_URL', defaultValue: 'https://guenter-sky-team-default-rtdb.europe-west1.firebasedatabase.app');
  static const projectId = 'guenter-sky-team';
  static const useEmulator = bool.fromEnvironment('SKYTEAM_USE_EMULATOR');
  static const emulatorHost = String.fromEnvironment(
    'SKYTEAM_EMULATOR_HOST',
    defaultValue: 'localhost',
  );

  static bool configured(bool web) =>
      apiKey.isNotEmpty && senderId.isNotEmpty && databaseUrl.isNotEmpty &&
      (web ? webAppId : androidAppId).isNotEmpty;

  static FirebaseOptions forPlatform(bool web) => FirebaseOptions(
        apiKey: apiKey,
        appId: web ? webAppId : androidAppId,
        messagingSenderId: senderId,
        projectId: projectId,
        databaseURL: databaseUrl,
      );
}
