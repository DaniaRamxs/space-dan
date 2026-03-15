import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── ReactionsOverlay ─────────────────────────────────────────────────────────
// TikTok-style floating reactions that animate upward and fade out.
// Props:
//   reactions: Array<{ id, emoji, x, y, fromUsername }>

const ReactionItem = memo(({ id, emoji, x, fromUsername }) => (
  <motion.div
    key={id}
    initial={{ opacity: 0, y: 0, scale: 1 }}
    animate={{ opacity: [0, 1, 1, 0], y: -200, scale: [1, 1.5, 1.5, 1] }}
    transition={{ duration: 2.5, ease: 'easeOut', times: [0, 0.15, 0.7, 1] }}
    className="absolute pointer-events-none select-none flex flex-col items-center gap-0.5"
    style={{ left: `${x}%`, bottom: 0 }}
  >
    <span className="text-3xl leading-none drop-shadow-lg">{emoji}</span>
    {fromUsername && (
      <span className="text-[10px] text-white/60 font-medium bg-black/40 rounded px-1">
        {fromUsername}
      </span>
    )}
  </motion.div>
));

ReactionItem.displayName = 'ReactionItem';

const ReactionsOverlay = memo(({ reactions = [] }) => {
  // Cap at 20 visible reactions
  const visible = reactions.slice(-20);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      <AnimatePresence>
        {visible.map((r) => (
          <ReactionItem
            key={r.id}
            id={r.id}
            emoji={r.emoji}
            x={r.x ?? Math.floor(10 + Math.random() * 80)}
            fromUsername={r.fromUsername}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});

ReactionsOverlay.displayName = 'ReactionsOverlay';

export default ReactionsOverlay;
