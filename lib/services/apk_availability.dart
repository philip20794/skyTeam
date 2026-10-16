import 'apk_availability_stub.dart'
    if (dart.library.html) 'apk_availability_web.dart' as platform;

Future<bool> isApkAvailable() => platform.isApkAvailable();
