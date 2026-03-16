// StickerLayer — renderiza GIF stickers sobre la página del manga con posicionamiento relativo
import React, { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Computes the displayed image rect (object-contain, centered) inside the container.
// Returns { x, y, w, h } in container pixels.
export function getImageRect(containerW, containerH, imgNatW, imgNatH) {
  if (!containerW || !containerH || !imgNatW || !imgNatH) {
    return { x: 0, y: 0, w: containerW || 0, h: containerH || 0 };
  }
  const imgAspect = imgNatW / imgNatH;
  const ctnAspect = containerW / containerH;
  let w, h, x, y;
  if (imgAspect > ctnAspect) {
    w = containerW;
    h = containerW / imgAspect;
    x = 0;
    y = (containerH - h) / 2;
  } else {
    h = containerH;
    w = containerH * imgAspect;
    x = (containerW - w) / 2;
    y = 0;
  }
  return { x, y, w, h };
}

// ─── StickerLayer ─────────────────────────────────────────────────────────────
// Renders GIF stickers over the manga page.
//
// Props:
//   stickers       — [{id, gifUrl, x, y, width, username}] for current page
//   imageRect      — {x, y, w, h} displayed image bounds in container pixels
//   placementMode  — bool: shows crosshair cursor, click places sticker
//   onPlace        — (rx, ry) called with relative (0-1) coords when placing
//   onRemove       — (stickerId) => void
//   visible        — bool: hides all stickers
//   myUsername     — current user (can remove own stickers)
//   isHost         — host can remove any sticker

const StickerLayer = memo(({
  stickers = [],
  imageRect,
  placementMode = false,
  onPlace,
  onRemove,
  visible = true,
  myUsername = '',
  isHost = false,
}) => {
  const handleContainerClick = useCallback((e) => {
    if (!placementMode || !onPlace || !imageRect || imageRect.w === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px   = e.clientX - rect.left  - imageRect.x;
    const py   = e.clientY - rect.top   - imageRect.y;
    const rx   = Math.max(0, Math.min(1, px / imageRect.w));
    const ry   = Math.max(0, Math.min(1, py / imageRect.h));
    onPlace(rx, ry);
  }, [placementMode, onPlace, imageRect]);

  return (
    <div
      className="absolute inset-0 z-[25]"
      style={{ cursor: placementMode ? 'crosshair' : 'default' }}
      onClick={handleContainerClick}
    >
      {visible && (
        <AnimatePresence>
          {stickers.map((s) => {
            const canRemove = isHost || s.username === myUsername;
            const ir = imageRect ?? { x: 0, y: 0, w: 0, h: 0 };
            const leftPx = ir.x + s.x * ir.w;
            const topPx  = ir.y + s.y * ir.h;

            return (
              <motion.div
                key={s.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 440, damping: 22 }}
                className="absolute group"
                style={{
                  left: `${leftPx}px`,
                  top:  `${topPx}px`,
                  transform: 'translate(-50%, -50%)',
                  width: `${s.width ?? 80}px`,
                  pointerEvents: placementMode ? 'none' : 'auto',
                  zIndex: 1,
                }}
              >
                {/* Floating animation wrapper */}
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: Math.random() * 2 }}
                >
                  <img
                    src={s.gifUrl}
                    alt="sticker"
                    draggable={false}
                    className="w-full h-auto rounded-lg select-none"
                    style={{ filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.7))' }}
                  />
                </motion.div>

                {/* Remove button on hover */}
                {canRemove && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove?.(s.id); }}
                    className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full
                               bg-black/80 border border-white/20 text-white/60
                               flex items-center justify-center
                               opacity-0 group-hover:opacity-100 transition-opacity
                               hover:bg-red-500/80 hover:text-white z-10"
                  >
                    <X size={10} />
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}

      {/* Placement hint */}
      {placementMode && (
        <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-10">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/75 backdrop-blur-sm border border-violet-500/40
                       rounded-full px-4 py-2 flex items-center gap-2 shadow-xl"
          >
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse flex-shrink-0" />
            <span className="text-white/80 text-xs font-bold">Toca para colocar — ESC para cancelar</span>
          </motion.div>
        </div>
      )}
    </div>
  );
});

StickerLayer.displayName = 'StickerLayer';
export default StickerLayer;
