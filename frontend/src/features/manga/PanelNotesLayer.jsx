import React, {
  memo, useState, useCallback, useRef, useEffect,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TheoryNoteMarker from './TheoryNoteMarker';
import { TYPE_META } from './TheoryNoteCard';

// ─── Note type selector button ────────────────────────────────────────────────

const NOTE_TYPES = ['theory', 'meme', 'question', 'detail'];

const TypeButton = memo(({ type, active, onClick }) => {
  const meta    = TYPE_META[type];
  const Icon    = meta.icon;
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => onClick(type)}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold
                  border transition-all ${
        active
          ? `${meta.bg} ${meta.border} ${meta.text}`
          : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
      }`}
    >
      <Icon size={11} style={active ? { color: meta.color } : {}} />
      {meta.label}
    </motion.button>
  );
});
TypeButton.displayName = 'TypeButton';

// ─── PanelNotesLayer ──────────────────────────────────────────────────────────
// Overlays theory-note markers and, in theoryMode, a click-to-annotate dialog.

const PanelNotesLayer = memo(({
  pageIndex,
  notes = [],
  theoryMode = false,
  myUsername,
  onAddNote,
  onUpvote,
}) => {
  const [dialog, setDialog]     = useState(null); // { x, y, clientX, clientY }
  const [noteType, setNoteType] = useState('theory');
  const [noteText, setNoteText] = useState('');
  const containerRef            = useRef(null);
  const textareaRef             = useRef(null);

  // Focus textarea when dialog opens
  useEffect(() => {
    if (dialog) {
      setTimeout(() => textareaRef.current?.focus(), 40);
    }
  }, [dialog]);

  // Close dialog on Escape
  useEffect(() => {
    if (!dialog) return;
    const onKey = (e) => { if (e.key === 'Escape') setDialog(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog]);

  const handleLayerClick = useCallback((e) => {
    if (!theoryMode) return;
    // Ignore clicks that originated from the dialog itself
    if (e.target.closest('[data-note-dialog]')) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const xFrac = (e.clientX - rect.left) / rect.width;
    const yFrac = (e.clientY - rect.top)  / rect.height;

    // Smart dialog position: flip near right/bottom edges
    const dialogRight  = xFrac > 0.6;
    const dialogBottom = yFrac > 0.7;

    setDialog({
      x:       xFrac,
      y:       yFrac,
      pxLeft:  e.clientX - rect.left,
      pxTop:   e.clientY - rect.top,
      flipX:   dialogRight,
      flipY:   dialogBottom,
    });
    setNoteText('');
    setNoteType('theory');
  }, [theoryMode]);

  const handleSubmit = useCallback(() => {
    const text = noteText.trim();
    if (!text || !dialog) return;
    onAddNote?.({
      pageIndex,
      x:    dialog.x,
      y:    dialog.y,
      type: noteType,
      text,
    });
    setDialog(null);
    setNoteText('');
  }, [noteText, dialog, noteType, pageIndex, onAddNote]);

  const handleTextKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const pageNotes = notes.filter((n) => n.pageIndex === pageIndex);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-10"
      style={{ pointerEvents: theoryMode ? 'auto' : 'none' }}
      onClick={handleLayerClick}
    >
      {/* Crosshair hint when theoryMode */}
      {theoryMode && (
        <div className="absolute inset-0" style={{ cursor: 'crosshair' }} />
      )}

      {/* Note markers — always visible, always interactive */}
      <div className="absolute inset-0" style={{ pointerEvents: 'auto' }}>
        {pageNotes.map((note) => (
          <TheoryNoteMarker
            key={note.id}
            note={note}
            onUpvote={onUpvote}
            myUsername={myUsername}
          />
        ))}
      </div>

      {/* Click-to-add dialog */}
      <AnimatePresence>
        {theoryMode && dialog && (
          <>
            {/* Preview dot at click position */}
            <div
              className="absolute w-3 h-3 rounded-full border-2 border-white z-40 pointer-events-none"
              style={{
                left:      dialog.pxLeft,
                top:       dialog.pxTop,
                transform: 'translate(-50%, -50%)',
                backgroundColor: TYPE_META[noteType]?.color || '#7c3aed',
              }}
            />

            {/* Dialog panel */}
            <motion.div
              data-note-dialog
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="absolute z-50 w-64 bg-[#0d0d14]/97 border border-white/10
                         rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden"
              style={{
                left: dialog.flipX
                  ? `calc(${dialog.pxLeft}px - 264px)`
                  : `calc(${dialog.pxLeft}px + 14px)`,
                top: dialog.flipY
                  ? `calc(${dialog.pxTop}px - 180px)`
                  : `calc(${dialog.pxTop}px + 14px)`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Type selector */}
              <div className="flex flex-wrap gap-1 p-2.5 border-b border-white/10">
                {NOTE_TYPES.map((t) => (
                  <TypeButton
                    key={t}
                    type={t}
                    active={noteType === t}
                    onClick={setNoteType}
                  />
                ))}
              </div>

              {/* Textarea */}
              <div className="p-2.5">
                <textarea
                  ref={textareaRef}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={handleTextKeyDown}
                  placeholder="Escribe tu nota... (Enter para guardar)"
                  rows={3}
                  maxLength={400}
                  className="w-full bg-white/5 border border-white/10 rounded-xl
                             px-3 py-2 text-xs text-white placeholder-white/30
                             outline-none focus:border-violet-500/50 transition-all
                             resize-none leading-relaxed"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between px-2.5 pb-2.5 -mt-1">
                <button
                  onClick={() => setDialog(null)}
                  className="text-white/30 hover:text-white/60 text-xs transition-colors px-2 py-1"
                >
                  Cancelar
                </button>
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  disabled={!noteText.trim()}
                  onClick={handleSubmit}
                  className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500
                             text-white text-xs font-black transition-colors
                             disabled:opacity-30"
                >
                  Guardar
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
});

PanelNotesLayer.displayName = 'PanelNotesLayer';
export default PanelNotesLayer;
