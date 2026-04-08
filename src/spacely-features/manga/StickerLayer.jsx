// StickerLayer — renders GIF stickers over the manga page
import React, { memo, useCallback, useRef, useState } from 'react';
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
// Props:
//   stickers       — [{id, gifUrl, x, y, width, username}] for current page
//   imageRect      — kept for API compat (not used for placement/rendering coords)
//   placementMode  — bool: GIF selected, waiting for user to place it
//   pendingGifUrl  — URL of the GIF being placed (for drag preview)
//   pendingGifSize — width in px of the preview GIF
//   onPlace        — (rx, ry) called with container-relative (0-1) coords
//   onRemove       — (stickerId) => void
//   visible        — bool: hides all placed stickers
//   myUsername     — current user
//   isHost         — host can remove any sticker

const StickerLayer = memo(({
  stickers = [],
  imageRect,          // API compat only
  placementMode = false,
  pendingGifUrl,
  pendingGifSize = 80,
  onPlace,
  onRemove,
  visible = true,
  myUsername = '',
  isHost = false,
}) => {
  const containerRef   = useRef(null);
  const isDragging     = useRef(false);
  const [dragPos, setDragPos] = useState(null); // { x, y } in % (0-1)

  // ── Pointer handlers for drag-to-place ───────────────────────────────────────

  const getContainerRelative = useCallback((e) => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left)  / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top)   / rect.height)),
    };
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (!placementMode || !onPlace) return;
    if (e.button !== 0 && e.button !== undefined) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
    const pos = getContainerRelative(e);
    if (pos) setDragPos(pos);
  }, [placementMode, onPlace, getContainerRelative]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current || !placementMode) return;
    e.preventDefault();
    const pos = getContainerRelative(e);
    if (pos) setDragPos(pos);
  }, [placementMode, getContainerRelative]);

  const handlePointerUp = useCallback((e) => {
    if (!isDragging.current || !placementMode || !onPlace) return;
    isDragging.current = false;
    const pos = getContainerRelative(e) || dragPos;
    setDragPos(null);
    if (pos) onPlace(pos.x, pos.y);
  }, [placementMode, onPlace, getContainerRelative, dragPos]);

  const handlePointerCancel = useCallback(() => {
    isDragging.current = false;
    setDragPos(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[25]"
      style={{
        cursor:        placementMode ? 'crosshair' : 'default',
        pointerEvents: placementMode ? 'auto' : 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {/* ── Drag preview (shown while placing) ───────────────────────────────── */}
      {placementMode && dragPos && pendingGifUrl && (
        <img
          src={pendingGifUrl}
          alt="preview"
          draggable={false}
          style={{
            position:      'absolute',
            left:          `${dragPos.x * 100}%`,
            top:           `${dragPos.y * 100}%`,
            transform:     'translate(-50%, -50%)',
            width:         `${pendingGifSize}px`,
            opacity:       0.85,
            pointerEvents: 'none',
            borderRadius:  '8px',
            filter:        'drop-shadow(0 4px 12px rgba(0,0,0,0.6))',
            userSelect:    'none',
          }}
        />
      )}

      {/* ── Placed stickers ───────────────────────────────────────────────────── */}
      {visible && (
        <AnimatePresence>
          {stickers.map((s) => {
            const canRemove = isHost || s.username === myUsername;
            return (
              <motion.div
                key={s.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 440, damping: 22 }}
                className="absolute group"
                style={{
                  left:          `${s.x * 100}%`,
                  top:           `${s.y * 100}%`,
                  transform:     'translate(-50%, -50%)',
                  width:         `${s.width ?? 80}px`,
                  pointerEvents: placementMode ? 'none' : 'auto',
                  zIndex:        1,
                }}
              >
                {/* Floating animation */}
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
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ opacity: 1, scale: 1 }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full
                               bg-red-500 border-2 border-white flex items-center justify-center
                               opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={(e) => { e.stopPropagation(); onRemove?.(s.id); }}
                  >
                    <X size={10} className="text-white" />
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
});

StickerLayer.displayName = 'StickerLayer';
export default StickerLayer;
