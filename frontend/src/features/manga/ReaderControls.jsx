import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ─── ReaderControls ───────────────────────────────────────────────────────────
// Page indicator + prev/next arrows for the paginated manga reader.
//
// Props:
//   currentPage — 0-based index
//   total       — total page count
//   isHost      — only host can navigate
//   onPrev      — () => void
//   onNext      — () => void

const ReaderControls = memo(({ currentPage, total, isHost, onPrev, onNext }) => {
  const canPrev = currentPage > 0;
  const canNext = currentPage < total - 1;

  return (
    <>
      {/* Page indicator — bottom center */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 6, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="bg-black/75 border border-white/10 text-white/80 text-xs font-bold
                     rounded-full px-4 py-1.5 backdrop-blur-md shadow-xl"
        >
          {currentPage + 1} / {total}
        </motion.div>
      </div>

      {/* Prev arrow — left edge (host only) */}
      {isHost && (
        <button
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Página anterior"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30
                     w-10 h-10 rounded-full bg-black/60 border border-white/10
                     flex items-center justify-center text-white/60 hover:text-white
                     hover:bg-black/80 transition-all backdrop-blur-sm active:scale-90
                     disabled:opacity-0 disabled:pointer-events-none"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Next arrow — right edge (host only) */}
      {isHost && (
        <button
          onClick={onNext}
          disabled={!canNext}
          aria-label="Página siguiente"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30
                     w-10 h-10 rounded-full bg-black/60 border border-white/10
                     flex items-center justify-center text-white/60 hover:text-white
                     hover:bg-black/80 transition-all backdrop-blur-sm active:scale-90
                     disabled:opacity-0 disabled:pointer-events-none"
        >
          <ChevronRight size={20} />
        </button>
      )}
    </>
  );
});

ReaderControls.displayName = 'ReaderControls';
export default ReaderControls;
