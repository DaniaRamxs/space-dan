'use client';

import React, { useEffect, useRef } from 'react';
import { useFacebookSDK } from '../hooks/useFacebookSDK';
import { Loader2, AlertCircle } from 'lucide-react';

interface FacebookPlayerProps {
  url: string;
  type: 'video' | 'reel';
}

export const FacebookPlayer: React.FC<FacebookPlayerProps> = ({ url, type }) => {
  const { isLoaded, FB } = useFacebookSDK();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoaded && FB && containerRef.current) {
      FB.XFBML.parse(containerRef.current);
    }
  }, [isLoaded, FB, url]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-black/40 overflow-hidden relative group">
      {/* Skeleton / Loading State */}
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0c0c1e] z-10 transition-opacity">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Sincronizando con Facebook...</p>
        </div>
      )}

      {/* Actual FB Content */}
      <div 
        className="fb-video" 
        data-href={url} 
        data-width="auto" 
        data-show-text="false"
        data-allowfullscreen="true"
        data-autoplay="true"
      ></div>
      
      {/* Hints for Host/Users */}
      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
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
