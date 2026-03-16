import React, { memo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Eraser, RotateCcw, Trash2 } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const STROKE_SIZES  = [2, 4, 7, 12];
const COLOR_SWATCHES = [
  '#ff4d4d', '#ff9f43', '#ffd43b', '#51cf66',
  '#339af0', '#cc5de8', '#ffffff', '#111111',
];

// ─── GraffitiToolbar ─────────────────────────────────────────────────────────
// Fixed vertical toolbar on the left edge for graffiti drawing controls.

const GraffitiToolbar = memo(({
  tool,
  setTool,
  color,
  setColor,
  size,
  setSize,
  onUndo,
  onClear,
  isHost,
  canDraw,
}) => {
  const colorInputRef = useRef(null);

  if (!canDraw) return null;

  const handleCustomColor = useCallback((e) => {
    setColor(e.target.value);
  }, [setColor]);

  const handleGradientClick = useCallback(() => {
    colorInputRef.current?.click();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: -32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -32 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      className="fixed left-4 top-1/2 -translate-y-1/2 z-[10030]
                 flex flex-col items-center gap-2
                 bg-[#0d0d14]/95 border border-white/10 rounded-2xl
                 px-2 py-3 shadow-2xl backdrop-blur-md"
    >
      {/* ── Tool buttons ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        {/* Pencil */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => setTool('pencil')}
          title="Lápiz"
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
            tool === 'pencil'
              ? 'bg-violet-600/40 border border-violet-500/50 text-violet-300'
              : 'text-white/40 hover:text-white/70 hover:bg-white/5'
          }`}
        >
          <Pencil size={15} />
        </motion.button>
        {/* Eraser */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => setTool('eraser')}
          title="Borrador"
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
            tool === 'eraser'
              ? 'bg-pink-600/40 border border-pink-500/50 text-pink-300'
              : 'text-white/40 hover:text-white/70 hover:bg-white/5'
          }`}
        >
          <Eraser size={15} />
        </motion.button>
      </div>

      <div className="w-5 h-px bg-white/10" />

      {/* ── Stroke sizes ────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2">
        {STROKE_SIZES.map((s) => {
          const active = size === s;
          const dim    = Math.max(6, Math.min(s + 4, 18));
          return (
            <motion.button
              key={s}
              whileTap={{ scale: 0.85 }}
              onClick={() => setSize(s)}
              title={`Tamaño ${s}`}
              className={`flex items-center justify-center rounded-full transition-all ${
                active ? 'ring-2 ring-violet-400 ring-offset-1 ring-offset-[#0d0d14]' : 'opacity-50 hover:opacity-80'
              }`}
              style={{ width: `${dim}px`, height: `${dim}px` }}
            >
              <span
                className="rounded-full"
                style={{
                  width:           `${dim}px`,
                  height:          `${dim}px`,
                  backgroundColor: tool === 'eraser' ? '#ffffff40' : color,
                }}
              />
            </motion.button>
          );
        })}
      </div>

      <div className="w-5 h-px bg-white/10" />

      {/* ── Color swatches ──────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-1.5">
        {COLOR_SWATCHES.map((c) => (
          <motion.button
            key={c}
            whileTap={{ scale: 0.85 }}
            onClick={() => setColor(c)}
            title={c}
            className="w-5 h-5 rounded-full border-2 transition-transform"
            style={{
              backgroundColor: c,
              borderColor:     color === c ? '#fff' : 'transparent',
              transform:       color === c ? 'scale(1.25)' : 'scale(1)',
            }}
          />
        ))}

        {/* Custom color picker */}
        <div
          className="w-5 h-5 rounded-full cursor-pointer border-2 border-white/20
                     hover:border-white/50 transition-all overflow-hidden relative"
          title="Color personalizado"
          onClick={handleGradientClick}
          style={{
            background: 'conic-gradient(from 0deg, #ff4d4d, #ffd43b, #51cf66, #339af0, #cc5de8, #ff4d4d)',
          }}
        />
        <input
          ref={colorInputRef}
          type="color"
          value={color}
          onChange={handleCustomColor}
          className="sr-only"
          tabIndex={-1}
        />
      </div>

      <div className="w-5 h-px bg-white/10" />

      {/* ── Undo ────────────────────────────────────────────────────────────── */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={onUndo}
        title="Deshacer"
        className="w-8 h-8 rounded-xl flex items-center justify-center
                   text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
      >
        <RotateCcw size={14} />
      </motion.button>

      {/* ── Clear (host only) ────────────────────────────────────────────────── */}
      {isHost && (
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onClear}
          title="Limpiar dibujos"
          className="w-8 h-8 rounded-xl flex items-center justify-center
                     text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <Trash2 size={14} />
        </motion.button>
      )}
    </motion.div>
  );
});

GraffitiToolbar.displayName = 'GraffitiToolbar';
export default GraffitiToolbar;
