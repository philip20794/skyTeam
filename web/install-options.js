(() => {
  'use strict';
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true;
  if (!isAndroid || isStandalone) return;
  const dialog = document.getElementById('install-options');
  const pwaButton = document.getElementById('install-pwa');
  const apkButton = document.getElementById('install-apk');
  const laterButton = document.getElementById('install-later');
  if (!dialog || !pwaButton || !apkButton || !laterButton) return;
  const key = 'skyteam-install-dismissed-v1';
  let pendingInstallPrompt = null;

  function dismiss() {
    sessionStorage.setItem(key, '1');
    if (dialog.open) dialog.close();
  }

  laterButton.addEventListener('click', dismiss);
  // A missing APK URL is rewritten by Firebase to index.html. Never offer that
  // HTML fallback as an Android download.
  apkButton.removeAttribute('href');
  apkButton.style.display = 'none';
  fetch('/downloads/SkyTeam.apk', { method: 'HEAD', cache: 'no-store' })
    .then((response) => {
      const bytes = Number(response.headers.get('content-length'));
      if (response.ok && Number.isFinite(bytes) && bytes > 1024 * 1024) {
        apkButton.href = '/downloads/SkyTeam.apk';
        apkButton.style.display = '';
      }
    })
    .catch(() => {
      // APK is not published yet. The PWA install option remains available.
    });

  apkButton.addEventListener('click', dismiss);
  dialog.addEventListener('cancel', dismiss);
  window.addEventListener('appinstalled', dismiss);

  pwaButton.addEventListener('click', async () => {
    if (!pendingInstallPrompt) return;
    const prompt = pendingInstallPrompt;
    pendingInstallPrompt = null;
    dismiss();
    try {
      await prompt.prompt();
    } catch (_) {
      // The browser menu may still offer installation.
    }
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    if (sessionStorage.getItem(key) === '1') return;
    event.preventDefault();
    pendingInstallPrompt = event;
    if (!dialog.open) dialog.showModal();
  });
})();
