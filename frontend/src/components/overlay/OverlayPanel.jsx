/**
 * OverlayPanel — bottom sheet for controlling overlay elements.
 *
 * Allows adding GIFs, stickers, text overlays; toggling edit mode;
 * launching graffiti mode; and (for hosts) clearing all non-persistent elements.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers } from 'lucide-react';
import { useOverlay } from '@/contexts/OverlayContext';

// ─── Reusable input style ─────────────────────────────────────────────────────

const INPUT_CLASS =
  'flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-xs text-white placeholder:text-white/25 outline-none focus:border-cyan-400/40 transition';

// ─── AddRow ───────────────────────────────────────────────────────────────────

function AddRow({ placeholder, buttonLabel, onAdd }) {
  const [value, setValue] = useState('');

  const handleAdd = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={INPUT_CLASS}
      />
      <button
        onClick={handleAdd}
        disabled={!value.trim()}
        className="rounded-xl border border-cyan-400/30 bg-cyan-500/20 px-3 py-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition disabled:opacity-40 shrink-0"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
      {children}
    </p>
  );
}

// ─── OverlayPanel ─────────────────────────────────────────────────────────────

export default function OverlayPanel({ open, onClose }) {
  const {
    elements,
    editMode,
    graffitiMode,
    isHost,
    setEditMode,
    setGraffiti,
    addOverlay,
    removeOverlay,
  } = useOverlay();

  const handleAddGif = (url) => {
    addOverlay('gif', { src: url });
    onClose();
  };

  const handleAddSticker = (url) => {
    addOverlay('sticker', { src: url });
    onClose();
  };

  const handleAddText = (text) => {
    addOverlay('text', { text });
    onClose();
  };

  const handleDrawing = () => {
    setGraffiti(true);
    onClose();
  };

  const handleClearAll = () => {
    elements
      .filter(el => !el.isPersistent)
      .forEach(el => removeOverlay(el.id));
  };

  const activeCount = elements.length;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="overlay-panel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[390] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="overlay-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[400] bg-[#0c0c1e] rounded-t-[28px] border-t border-white/10 p-6"
            onClick={e => e.stopPropagation()}
          >
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-white/50" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">
                  Capas
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {/* Edit mode toggle */}
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                    editMode
                      ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-300'
                      : 'border-white/10 bg-white/[0.05] text-white/50 hover:bg-white/[0.08]'
                  }`}
                >
                  {editMode ? '✅ Editando' : '✏️ Editar'}
                </button>

                {/* Close */}
                <button
                  onClick={onClose}
                  className="rounded-full border border-white/10 bg-white/[0.05] p-1.5 text-white/50 hover:text-white transition"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* ── Agregar elemento ─────────────────────────────────────────── */}
            <div className="mb-5">
              <SectionLabel>Agregar elemento</SectionLabel>
              <div className="flex flex-col gap-2.5">
                <AddRow
                  placeholder="URL del GIF..."
                  buttonLabel="Agregar"
                  onAdd={handleAddGif}
                />
                <AddRow
                  placeholder="URL de imagen..."
                  buttonLabel="Agregar"
                  onAdd={handleAddSticker}
                />
                <AddRow
                  placeholder="Escribe algo..."
                  buttonLabel="Agregar"
                  onAdd={handleAddText}
                />
              </div>
            </div>

            {/* ── Dibujar ──────────────────────────────────────────────────── */}
            <div className="mb-5">
              <SectionLabel>Dibujar</SectionLabel>
              <button
                onClick={handleDrawing}
                className={`w-full rounded-xl border px-4 py-3 text-sm font-bold transition ${
                  graffitiMode
                    ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-300'
                    : 'border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
                }`}
              >
                {graffitiMode ? 'Dibujando...' : '🖊 Dibujar en el espacio'}
              </button>
            </div>

            {/* ── Elementos (host only) ─────────────────────────────────────── */}
            {isHost && (
              <div>
                <SectionLabel>Elementos</SectionLabel>
                <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
                  <span className="text-xs text-white/50">
                    {activeCount} {activeCount === 1 ? 'elemento activo' : 'elementos activos'}
                  </span>
                  {activeCount > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 transition"
                    >
                      Limpiar todo
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
