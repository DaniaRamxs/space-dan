import React, { memo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Eraser, RotateCcw, Trash2, Highlighter, Sparkles, Eye, EyeOff } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const STROKE_SIZES   = [2, 4, 7, 12];
const COLOR_SWATCHES = [
  '#ff4d4d', '#ff9f43', '#ffd43b', '#51cf66',
  '#339af0', '#cc5de8', '#ffffff', '#111111',
];

// ─── GraffitiToolbar ─────────────────────────────────────────────────────────
// Fixed horizontal toolbar at the bottom-center for graffiti drawing controls.
// Renders only when canDraw is true (caller wraps in AnimatePresence).

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
  graffitiVisible = true,
  onToggleVisible,
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
    // Positioning wrapper — separated from motion.div to avoid Framer Motion's
    // transform overwriting Tailwind's -translate-x-1/2 centering.
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[10030]">
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 32 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      className="flex flex-row items-center gap-2
                 bg-[#0d0d14]/95 border border-white/10 rounded-2xl
                 px-3 py-2 shadow-2xl backdrop-blur-md"
    >
      {/* ── Tool buttons ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        <ToolBtn
          active={tool === 'pencil'}
          onClick={() => setTool('pencil')}
          title="Lápiz"
          activeClass="bg-violet-600/40 border border-violet-500/50 text-violet-300"
        >
          <Pencil size={14} />
        </ToolBtn>
        <ToolBtn
          active={tool === 'highlighter'}
          onClick={() => setTool('highlighter')}
          title="Resaltador"
          activeClass="bg-yellow-600/40 border border-yellow-500/50 text-yellow-300"
        >
          <Highlighter size={14} />
        </ToolBtn>
        <ToolBtn
          active={tool === 'sparkle'}
          onClick={() => setTool('sparkle')}
          title="Destellos"
          activeClass="bg-cyan-600/40 border border-cyan-500/50 text-cyan-300"
        >
          <Sparkles size={14} />
        </ToolBtn>
        <ToolBtn
          active={tool === 'eraser'}
          onClick={() => setTool('eraser')}
          title="Borrador"
          activeClass="bg-pink-600/40 border border-pink-500/50 text-pink-300"
        >
          <Eraser size={14} />
        </ToolBtn>
      </div>

      <div className="h-6 w-px bg-white/10" />

      {/* ── Stroke sizes ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
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
              style={{ width: '20px', height: '20px' }}
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

      <div className="h-6 w-px bg-white/10" />

      {/* ── Color swatches ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5">
        {COLOR_SWATCHES.map((c) => (
          <motion.button
            key={c}
            whileTap={{ scale: 0.85 }}
            onClick={() => setColor(c)}
            title={c}
            className="w-5 h-5 rounded-full border-2 flex-shrink-0 transition-transform"
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
                     hover:border-white/50 transition-all overflow-hidden relative flex-shrink-0"
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

      <div className="h-6 w-px bg-white/10" />

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        {/* Visibility toggle */}
        {onToggleVisible && (
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onToggleVisible}
            title={graffitiVisible ? 'Ocultar dibujos' : 'Mostrar dibujos'}
            className="w-8 h-8 rounded-xl flex items-center justify-center
                       text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
          >
            {graffitiVisible ? <Eye size={14} /> : <EyeOff size={14} />}
          </motion.button>
        )}

        {/* Undo */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onUndo}
          title="Deshacer"
          className="w-8 h-8 rounded-xl flex items-center justify-center
                     text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
        >
          <RotateCcw size={14} />
        </motion.button>

        {/* Clear (host only) */}
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
      </div>
    </motion.div>
    </div>
  );
});

// ─── Small helper ─────────────────────────────────────────────────────────────

const ToolBtn = ({ active, onClick, title, activeClass, children }) => (
  <motion.button
    whileTap={{ scale: 0.88 }}
    onClick={onClick}
    title={title}
    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
      active ? activeClass : 'text-white/40 hover:text-white/70 hover:bg-white/5'
    }`}
  >
    {children}
  </motion.button>
);

GraffitiToolbar.displayName = 'GraffitiToolbar';
export default GraffitiToolbar;
