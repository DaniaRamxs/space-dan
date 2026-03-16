import React, {
  useState, useEffect, useRef, useCallback, memo,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import PageCanvas from './PageCanvas';
import PanelNotesLayer from './PanelNotesLayer';
import ReactionsOverlay from './ReactionsOverlay';
import GraffitiToolbar from './GraffitiToolbar';
import ReaderControls from './ReaderControls';
import StickerLayer, { getImageRect } from './StickerLayer';

// ─── PaginatedReader ──────────────────────────────────────────────────────────
// Mobile-first one-page-at-a-time manga reader.
//
// Navigation (host only):
//   • Swipe left/right (react-swipeable)
//   • Arrow keys (← → ↑ ↓)
//   • Arrow buttons rendered by ReaderControls
//
// Guests: receive page changes via onPageChange sync, can draw if canDraw=true.
//
// Props:
//   pages            — array of image URLs for the current chapter
//   currentPage      — 0-based page index (controlled by parent)
//   isHost           — host can navigate; guests are read-only on navigation
//   onPageChange     — (pageIndex: number) => void  (host calls this)
//   drawEvents       — remote draw events array
//   onDrawEvent      — (event) => void
//   reactions        — Array<{ id, emoji, x, fromUsername }>
//   chapterId        — resets canvas on chapter change
//   theoryMode       — annotation mode active
//   theoryNotes      — array of note objects
//   onAddNote        — (noteData) => void
//   onNoteUpvote     — (noteId) => void
//   myUsername       — current user's display name
//   graffitiMode     — graffiti canvas enabled
//   canDraw          — this user can draw
//   graffitiTool / graffitiColor / graffitiSize — toolbar state
//   onGraffitiToolChange / onGraffitiColorChange / onGraffitiSizeChange
//   onGraffitiUndo / onGraffitiClear

const PaginatedReader = memo(({
  pages = [],
  currentPage = 0,
  isHost = false,
  onPageChange,
  drawEvents = [],
  onDrawEvent,
  reactions = [],
  chapterId,
  // Theory
  theoryMode = false,
  theoryNotes = [],
  onAddNote,
  onNoteUpvote,
  myUsername = '',
  // Graffiti
  graffitiMode = false,
  canDraw = false,
  graffitiTool = 'pencil',
  graffitiColor = '#ef4444',
  graffitiSize = 5,
  onGraffitiToolChange,
  onGraffitiColorChange,
  onGraffitiSizeChange,
  onGraffitiUndo,
  onGraffitiClear,
  // Stickers
  stickers = [],
  stickerMode = false,
  onPlaceSticker,
  onRemoveSticker,
  stickersVisible = true,
}) => {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const [imgLoaded, setImgLoaded]   = useState(false);
  const [imgError, setImgError]     = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [imgNatSize, setImgNatSize] = useState({ w: 0, h: 0 });

  const total = pages.length;
  const src   = pages[currentPage] ?? null;

  // ── Reset image loaded/error state on page/chapter change ────────────────────
  useEffect(() => { setImgLoaded(false); setImgError(false); }, [currentPage, chapterId]);

  useEffect(() => { setImgNatSize({ w: 0, h: 0 }); }, [currentPage, chapterId]);

  // ── Preload adjacent pages ────────────────────────────────────────────────────
  useEffect(() => {
    if (!pages.length) return;
    [-1, 1].forEach((delta) => {
      const idx = currentPage + delta;
      if (idx >= 0 && idx < pages.length) {
        const img = new Image();
        img.src = pages[idx];
      }
    });
  }, [currentPage, pages]);

  // ── Container resize observer (drives canvas dimensions) ─────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Computed image rect for sticker positioning ───────────────────────────────
  const imageRect = getImageRect(containerSize.w, containerSize.h, imgNatSize.w, imgNatSize.h);

  // ── Host navigation helpers ───────────────────────────────────────────────────
  const goPrev = useCallback(() => {
    if (!isHost || currentPage <= 0) return;
    onPageChange?.(currentPage - 1);
  }, [isHost, currentPage, onPageChange]);

  const goNext = useCallback(() => {
    if (!isHost || currentPage >= total - 1) return;
    onPageChange?.(currentPage + 1);
  }, [isHost, currentPage, total, onPageChange]);

  // ── Keyboard navigation (host only) ──────────────────────────────────────────
  useEffect(() => {
    if (!isHost) return;
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goNext(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goPrev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isHost, goPrev, goNext]);

  // ── Swipe gestures (host only, mobile) ───────────────────────────────────────
  const swipeHandlers = useSwipeable({
    onSwipedLeft:  () => goNext(),
    onSwipedRight: () => goPrev(),
    preventScrollOnSwipe: true,
    trackMouse: false,
    delta: 50,
  });

  // ── Graffiti undo/clear wired to PageCanvas imperative handle ─────────────────
  const handleGraffitiUndo = useCallback(() => {
    canvasRef.current?.undo();
    onGraffitiUndo?.();
  }, [onGraffitiUndo]);

  const handleGraffitiClear = useCallback(() => {
    canvasRef.current?.clear();
    onGraffitiClear?.();
  }, [onGraffitiClear]);

  // ── Empty state ───────────────────────────────────────────────────────────────
  if (!total) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-3 text-white/20">
          <BookOpen size={48} className="opacity-20" />
          <p className="text-sm">Selecciona un manga para comenzar</p>
        </div>
      </div>
    );
  }

  const drawing = graffitiMode && canDraw;

  return (
    <div
      ref={containerRef}
      {...(drawing ? {} : swipeHandlers)}
      className="relative w-full h-full overflow-hidden bg-black select-none"
      style={{ touchAction: drawing ? 'none' : 'pan-y' }}
    >
      {/* ── Manga page image — centered, object-fit: contain ─────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center bg-black">
        {/* Loading skeleton */}
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 bg-gray-900 animate-pulse" />
        )}

        {/* Error state */}
        {imgError && (
          <div className="flex flex-col items-center gap-2 text-white/30 z-10">
            <BookOpen size={36} className="opacity-30" />
            <p className="text-xs">No se pudo cargar la página</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {src && !imgError && (
            <motion.img
              key={`${chapterId ?? ''}-${currentPage}`}
              src={src}
              alt={`Página ${currentPage + 1}`}
              onLoad={(e) => { setImgLoaded(true); setImgNatSize({ w: e.target.naturalWidth, h: e.target.naturalHeight }); }}
              onError={() => { setImgError(true); setImgLoaded(false); }}
              initial={{ opacity: 0 }}
              animate={{ opacity: imgLoaded ? 1 : 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── Theory notes overlay ──────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <PanelNotesLayer
          pageIndex={currentPage}
          notes={theoryNotes}
          theoryMode={theoryMode}
          myUsername={myUsername}
          onAddNote={onAddNote}
          onUpvote={onNoteUpvote}
        />
      </div>

      {/* ── Per-page graffiti canvas ──────────────────────────────────────────── */}
      <PageCanvas
        ref={canvasRef}
        page={currentPage}
        chapterId={chapterId}
        width={containerSize.w}
        height={containerSize.h}
        enabled={graffitiMode}
        canDraw={canDraw}
        tool={graffitiTool}
        color={graffitiColor}
        strokeWidth={graffitiSize}
        remoteEvents={drawEvents}
        onEvent={onDrawEvent}
      />

      {/* ── Graffiti toolbar ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {graffitiMode && canDraw && (
          <GraffitiToolbar
            tool={graffitiTool}
            setTool={onGraffitiToolChange}
            color={graffitiColor}
            setColor={onGraffitiColorChange}
            size={graffitiSize}
            setSize={onGraffitiSizeChange}
            onUndo={handleGraffitiUndo}
            onClear={handleGraffitiClear}
            isHost={isHost}
            canDraw={canDraw}
          />
        )}
      </AnimatePresence>

      {/* ── TikTok-style floating reactions ───────────────────────────────────── */}
      <ReactionsOverlay reactions={reactions} />

      {/* ── GIF Sticker layer ─────────────────────────────────────────────────── */}
      <StickerLayer
        stickers={stickers}
        imageRect={imageRect}
        placementMode={stickerMode}
        onPlace={onPlaceSticker}
        onRemove={onRemoveSticker}
        visible={stickersVisible}
        myUsername={myUsername}
        isHost={isHost}
      />

      {/* ── Page indicator + navigation arrows ───────────────────────────────── */}
      <ReaderControls
        currentPage={currentPage}
        total={total}
        isHost={isHost}
        onPrev={goPrev}
        onNext={goNext}
      />
    </div>
  );
});

PaginatedReader.displayName = 'PaginatedReader';
export default PaginatedReader;
