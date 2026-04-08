/**
 * Abre una URL externa.
 * - Tauri: usa @tauri-apps/plugin-opener
 * - Capacitor (Android/iOS): usa @capacitor/browser
 * - Web: window.open normal
 */

export const isTauri =
  typeof window !== 'undefined' &&
  (window.__TAURI_INTERNALS__ !== undefined ||
    window.__TAURI__ !== undefined ||
    window.location.hostname === 'tauri.localhost' ||
    window.location.protocol === 'tauri:');

export const isCapacitor =
  typeof window !== 'undefined' &&
  (window.Capacitor !== undefined || typeof Capacitor !== 'undefined');

export async function openUrl(url) {
  if (!url) return;

  if (isTauri) {
    try {
      const { openUrl: tauriOpenUrl } = await import('@tauri-apps/plugin-opener');
      await tauriOpenUrl(url);
      return;
    } catch (e) {
      console.warn('[openUrl] Tauri opener failed, fallback to window.open', e);
    }
  }

  if (isCapacitor) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
      return;
    } catch (e) {
      console.warn('[openUrl] Capacitor browser failed, fallback to window.open', e);
    }
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
