import React, { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TheoryNoteCard, { TYPE_META } from './TheoryNoteCard';

// ─── TheoryNoteMarker ─────────────────────────────────────────────────────────
// Renders a glowing positional dot (note.x/note.y as 0-1 fractions) overlaid
// on the manga page. Hover or click reveals the note card.

const TheoryNoteMarker = memo(({ note, onUpvote, myUsername }) => {
  const [open, setOpen] = useState(false);

  const meta   = TYPE_META[note.type] || TYPE_META.theory;
  const color  = meta.color;
  const showLeft = note.x > 0.55;

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    setOpen((p) => !p);
  }, []);

  const handleMouseEnter = useCallback(() => setOpen(true), []);
  const handleMouseLeave = useCallback(() => setOpen(false), []);

  return (
    <div
      className="absolute z-30"
      style={{
        left:      `${note.x * 100}%`,
        top:       `${note.y * 100}%`,
        transform: 'translate(-50%, -50%)',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Pulsing ring */}
      <span
        className="absolute inline-flex w-full h-full rounded-full opacity-60 animate-ping"
        style={{ backgroundColor: color }}
      />

      {/* Dot */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={handleClick}
        className="relative w-3.5 h-3.5 rounded-full border-2 border-white/60 shadow-lg
                   flex items-center justify-center cursor-pointer z-10"
        style={{ backgroundColor: color }}
        title={meta.label}
      />

      {/* Upvote count badge */}
      {(note.upvotes || 0) > 0 && (
        <div
          className="absolute -top-2 -right-2 min-w-[16px] h-4 rounded-full
                     bg-[#0d0d14] border border-white/20 text-white/70 text-[9px]
                     font-black flex items-center justify-center px-1 z-20 pointer-events-none"
        >
          {note.upvotes}
        </div>
      )}

      {/* Note card */}
      <AnimatePresence>
        {open && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 z-40 ${showLeft ? 'right-6' : 'left-6'}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <TheoryNoteCard
              note={note}
              onUpvote={onUpvote}
              myUsername={myUsername}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});

TheoryNoteMarker.displayName = 'TheoryNoteMarker';
export default TheoryNoteMarker;
