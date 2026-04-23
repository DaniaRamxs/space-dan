'use client';

import React, { useMemo } from 'react';

interface FacebookPlayerProps {
  url: string;
  type: 'video' | 'reel';
}

/**
 * FacebookPlayer — reproduce video/reel de Facebook usando el plugin oficial
 * vía iframe (https://developers.facebook.com/docs/plugins/embedded-video-player/).
 *
 * Antes usábamos el SDK JS con FB.XFBML.parse(), pero el SDK:
 *  - Requiere un domain registrado en la app de Facebook Developers
 *  - Rechaza origins como https://localhost/ (donde corre Capacitor WebView)
 *  - Es 1.5MB de JS extra para un solo video
 *
 * El iframe plugin funciona sin SDK y sin registro previo.
 */
export const FacebookPlayer: React.FC<FacebookPlayerProps> = ({ url, type }) => {
  const embedUrl = useMemo(() => {
    if (!url) return null;
    const params = new URLSearchParams({
      href: url,
      show_text: 'false',
      autoplay: 'true',
      allowfullscreen: 'true',
      width: '1280',
      height: '720',
    });
    return `https://www.facebook.com/plugins/video.php?${params.toString()}`;
  }, [url]);

  if (!embedUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black/40 text-white/30">
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Sin video seleccionado</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-black overflow-hidden relative group">
      <iframe
        key={embedUrl}
        src={embedUrl}
        title="Facebook Video"
        className="w-full h-full"
        style={{ border: 'none', overflow: 'hidden' }}
        scrolling="no"
        frameBorder={0}
        allowFullScreen
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
      />

      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-bold text-white/50 uppercase tracking-widest">
          {type} Mode active
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-400">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
          LIVE SYNC
        </div>
      </div>
    </div>
  );
};
