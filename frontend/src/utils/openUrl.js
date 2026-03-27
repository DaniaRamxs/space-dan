/**
 * Abre una URL externa. En Tauri usa el plugin opener (abre el navegador/app del sistema).
 * En web usa window.open normal.
 */
export async function openUrl(url) {
  if (!url) return;

  const isTauri =
    typeof window !== 'undefined' &&
    (window.__TAURI_INTERNALS__ !== undefined ||
      window.__TAURI__ !== undefined ||
      window.location.hostname === 'tauri.localhost' ||
      window.location.protocol === 'tauri:');

  if (isTauri) {
    try {
      const { openUrl: tauriOpenUrl } = await import('@tauri-apps/plugin-opener');
      await tauriOpenUrl(url);
      return;
    } catch (e) {
      console.warn('[openUrl] Tauri opener failed, fallback to window.open', e);
    }
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
