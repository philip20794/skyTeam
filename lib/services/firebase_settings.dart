import 'package:firebase_core/firebase_core.dart';

/// Non-secret Firebase app IDs, supplied via --dart-define for both platforms.
class SkyFirebaseSettings {
  static const apiKey = String.fromEnvironment('SKYTEAM_FIREBASE_API_KEY');
  static const webAppId = String.fromEnvironment('SKYTEAM_FIREBASE_WEB_APP_ID');
  static const androidAppId = String.fromEnvironment('SKYTEAM_FIREBASE_ANDROID_APP_ID');
  static const senderId = String.fromEnvironment('SKYTEAM_FIREBASE_SENDER_ID');
  static const databaseUrl = String.fromEnvironment('SKYTEAM_FIREBASE_DATABASE_URL');
  static const projectId = 'guenter-sky-team';

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
