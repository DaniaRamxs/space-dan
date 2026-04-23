import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';

// Global stylesheets. En Next.js se importaban en _app.tsx o layout.tsx.
// Al migrar a Vite nadie los importaba → el hub, topbar, mobile nav y radio
// player se veían como texto plano sin estilos en el APK. Los importamos
// todos acá para que estén disponibles globalmente.
import './styles/globals.css';
import './styles/spacely.css';           // hub, topbar, mobile nav, radio player
import './styles/index.css';             // resets mínimos
import './styles/banner-effects.css';    // efectos de banners
import './styles/profile-v2.css';        // estilos de perfil
import './styles/NicknameStyles.css';    // estilos de nicknames custom
import './styles/lastfm-panel.css';      // panel de Last.fm
import './styles/spotify-stats.css';     // stats de Spotify
import './styles/global-music-feed.css'; // feed Ahora Suena
import './styles/snake-game.css';        // Snake game overlay

console.log('Spacely Booting — build v3 sin StrictMode + purge SW');

// Purgar service workers y caches residuales del viejo Next.js PWA.
// Si hubo un SW registrado antes de la migración a Vite, puede estar
// interceptando fetches y sirviendo una versión vieja que bloquea
// interacciones nuevas. Lo hacemos SIEMPRE (no solo en Tauri).
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => {
      if (regs.length > 0) {
        console.log('[Spacely] Purgando', regs.length, 'service workers residuales');
        return Promise.all(regs.map((r) => r.unregister()));
      }
    })
    .catch(() => {});
}
if (typeof window !== 'undefined' && 'caches' in window) {
  caches.keys()
    .then((names) => {
      if (names.length > 0) {
        console.log('[Spacely] Purgando', names.length, 'caches residuales');
        return Promise.all(names.map((n) => caches.delete(n)));
      }
    })
    .catch(() => {});
}

// IMPORTANTE: SIN React.StrictMode.
// StrictMode hace doble-mount en dev, y en APK (aunque sea production build)
// puede causar que listeners de pointer/touch se dupliquen de forma rara.
// Para una app móvil con Capacitor no aporta valor y sí puede introducir bugs
// difíciles de diagnosticar.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <App />
  </HashRouter>
);
