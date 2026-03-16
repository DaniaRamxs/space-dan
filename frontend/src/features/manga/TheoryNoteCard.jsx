import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Brain, Laugh, HelpCircle, Search, ThumbsUp } from 'lucide-react';

// ─── Type metadata ────────────────────────────────────────────────────────────

export const TYPE_META = {
  theory:   { icon: Brain,       label: 'Teoría',    color: '#7c3aed', bg: 'bg-violet-500/20', border: 'border-violet-500/30', text: 'text-violet-400' },
  meme:     { icon: Laugh,       label: 'Meme',      color: '#fbbf24', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  question: { icon: HelpCircle,  label: 'Pregunta',  color: '#22d3ee', bg: 'bg-cyan-500/20',   border: 'border-cyan-500/30',   text: 'text-cyan-400'   },
  detail:   { icon: Search,      label: 'Detalle',   color: '#10b981', bg: 'bg-green-500/20',  border: 'border-green-500/30',  text: 'text-green-400'  },
};

const AVATAR_COLORS = ['#7c3aed', '#22d3ee', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];
const authorColor = (name) =>
  AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

// ─── TheoryNoteCard ───────────────────────────────────────────────────────────

const TheoryNoteCard = memo(({ note, onUpvote, myUsername, style }) => {
  if (!note) return null;

  const meta      = TYPE_META[note.type] || TYPE_META.theory;
  const TypeIcon  = meta.icon;
  const alreadyUpvoted = note.upvotedBy?.includes(myUsername);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: 6 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className="w-56 bg-[#0d0d14]/95 border border-white/10 rounded-2xl
                 shadow-2xl backdrop-blur-md overflow-hidden"
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Type badge */}
      <div className={`flex items-center gap-1.5 px-3 py-2 border-b border-white/10 ${meta.bg}`}>
        <TypeIcon size={12} style={{ color: meta.color }} />
        <span className={`text-[10px] font-black uppercase tracking-wider ${meta.text}`}>
          {meta.label}
        </span>
      </div>

      {/* Note text */}
      <div className="px-3 py-2.5">
        <p className="text-white/80 text-xs leading-relaxed break-words line-clamp-6">
          {note.text}
        </p>
      </div>

      {/* Footer: author + upvote */}
      <div className="flex items-center gap-2 px-3 pb-2.5 pt-0">
        {/* Author avatar */}
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-white font-black flex-shrink-0"
          style={{ backgroundColor: authorColor(note.author), fontSize: '9px' }}
        >
          {note.author?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <span className="text-white/40 text-[10px] font-bold truncate flex-1">
          {note.author}
        </span>

        {/* Upvote button */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          disabled={alreadyUpvoted}
          onClick={() => onUpvote?.(note.id)}
          className={`flex items-center gap-1 text-[10px] font-black rounded-lg px-2 py-1 transition-all
            ${alreadyUpvoted
              ? 'text-violet-400 bg-violet-500/20 cursor-default'
              : 'text-white/40 hover:text-violet-400 hover:bg-violet-500/10'
            }`}
        >
          <ThumbsUp size={10} />
          {(note.upvotes || 0) > 0 && <span>{note.upvotes}</span>}
        </motion.button>
      </div>
    </motion.div>
  );
});

TheoryNoteCard.displayName = 'TheoryNoteCard';
export default TheoryNoteCard;
