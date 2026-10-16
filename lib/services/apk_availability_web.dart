// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

Future<bool> isApkAvailable() async {
  try {
    final response = await html.HttpRequest.request(
      Uri.base.resolve('/downloads/SkyTeam.apk').toString(),
      method: 'HEAD',
    );
    final bytes = int.tryParse(
      response.getResponseHeader('content-length') ?? '',
    );
    // Firebase rewrites unknown paths to index.html (a tiny HTML file).
    return response.status == 200 && bytes != null && bytes > 1024 * 1024;
  } catch (_) {
    return false;
  }
}
