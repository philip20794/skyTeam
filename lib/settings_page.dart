import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

const apkDownloadUrl =
    'https://github.com/philip20794/skyTeam/releases/download/android-latest/SkyTeam.apk';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  Future<void> _downloadApk(BuildContext context) async {
    final uri = Uri.parse(apkDownloadUrl);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('APK-Download konnte nicht geöffnet werden.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final canDownload = kIsWeb &&
        defaultTargetPlatform == TargetPlatform.android;

    return Scaffold(
      appBar: AppBar(title: const Text('Einstellungen')),
      body: ListView(
        children: [
          if (canDownload)
            ListTile(
              leading: const Icon(Icons.android),
              title: const Text('Android-App installieren'),
              subtitle: const Text('Aktuelle APK herunterladen'),
              trailing: const Icon(Icons.download_outlined),
              onTap: () => _downloadApk(context),
            ),
          FutureBuilder<PackageInfo>(
            future: PackageInfo.fromPlatform(),
            builder: (context, snapshot) {
              final info = snapshot.data;
              return ListTile(
                leading: const Icon(Icons.info_outline),
                title: const Text('Version'),
                subtitle: Text(info == null
                    ? 'Wird geladen'
                    : '${info.version} (${info.buildNumber})'),
              );
            },
          ),
        ],
      ),
    );
  }
}
