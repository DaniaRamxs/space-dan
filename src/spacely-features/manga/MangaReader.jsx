import React, {
  useState, useEffect, useRef, useCallback, memo, useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ZoomIn, ZoomOut, Maximize2, BookOpen,
} from 'lucide-react';
import DrawingCanvas from './DrawingCanvas';
import ReactionsOverlay from './ReactionsOverlay';
import PanelNotesLayer from './PanelNotesLayer';
import GraffitiToolbar from './GraffitiToolbar';
import StickerLayer from './StickerLayer';

// ─── MangaReader ──────────────────────────────────────────────────────────────
// Vertical manga reader panel with zoom, scroll sync, page detection,
// collaborative drawing overlay, floating reactions, theory notes, and
// graffiti mode.
//
// Props (original):
//   pages            — array of image URLs
//   currentPage      — currently visible page index (0-based)
//   zoom             — zoom level (0.5 – 3.0)
//   isHost           — true = controls sync; false = receives sync
//   drawingEnabled   — toggles legacy drawing mode
//   onScroll         — (scrollY: number) => void  — debounced 80ms
//   onZoom           — (zoom: number) => void
//   onPageChange     — (pageIndex: number) => void
//   externalScrollY  — null = ignore (for host), number = guest scrolls here
//   drawEvents       — remote draw events array
//   onDrawEvent      — (event) => void
//   reactions        — Array<{id, emoji, x, y, fromUsername}>
//   chapterId        — used to reset draw canvas on chapter change
//
// Props (new — theory mode):
//   theoryMode       — whether theory annotation mode is active
//   theoryNotes      — array of note objects
//   onAddNote        — (noteData) => void
//   onNoteUpvote     — (noteId) => void
//   myUsername       — current user's username (for upvote gating)
//
// Props (new — graffiti mode):
//   graffitiMode     — whether the graffiti overlay toolbar is visible
//   canDraw          — whether this user can draw
//   graffitiTool     — 'pencil' | 'eraser'
//   graffitiColor    — current stroke color
//   graffitiSize     — current stroke width
//   onGraffitiToolChange   — (tool) => void
//   onGraffitiColorChange  — (color) => void
//   onGraffitiSizeChange   — (size) => void
//   onGraffitiUndo         — () => void  (wired to canvasRef.current.undo)
//   onGraffitiClear        — () => void  (wired to canvasRef.current.clear)

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.2;

// ─── Skeleton page placeholder ────────────────────────────────────────────────

const PageSkeleton = memo(() => (
  <div className="w-full bg-gray-800 animate-pulse rounded-sm" style={{ aspectRatio: '2/3' }} />
));
PageSkeleton.displayName = 'PageSkeleton';

// ─── Single page image ────────────────────────────────────────────────────────

const MangaPage = memo(({
  src,
  index,
  onVisible,
  pageIndex,
  theoryNotes,
  theoryMode,
  myUsername,
  onAddNote,
  onNoteUpvote,
  // stickers
  stickers = [],
  stickerMode = false,
  pendingGifUrl,
  pendingGifSize = 80,
  onPlaceSticker,
  onRemoveSticker,
  stickersVisible = true,
  isHost = false,
}) => {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
          onVisible?.(index);
        }
      },
      { threshold: [0.4] }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [index, onVisible]);

  return (
    <div ref={ref} className="relative w-full select-none" data-page={index}>
      {!loaded && <PageSkeleton />}
      <img
        src={src}
        alt={`Página ${index + 1}`}
        onLoad={() => setLoaded(true)}
        className={`w-full block transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
        draggable={false}
        loading="lazy"
      />
      {/* Theory notes overlay per page */}
      <PanelNotesLayer
        pageIndex={pageIndex}
        notes={theoryNotes}
        theoryMode={theoryMode}
        myUsername={myUsername}
        onAddNote={onAddNote}
        onUpvote={onNoteUpvote}
      />
      <StickerLayer
        stickers={stickers}
        placementMode={stickerMode}
        pendingGifUrl={pendingGifUrl}
        pendingGifSize={pendingGifSize}
        onPlace={(rx, ry) => onPlaceSticker?.(index, rx, ry)}
        onRemove={onRemoveSticker}
        visible={stickersVisible}
        myUsername={myUsername}
        isHost={isHost}
      />
    </div>
  );
});
MangaPage.displayName = 'MangaPage';

// ─── Main component ───────────────────────────────────────────────────────────

const MangaReader = memo(({
  pages = [],
  currentPage = 0,
  zoom = 1,
  isHost = false,
  drawingEnabled = false,
  onScroll,
  onZoom,
  onPageChange,
  externalScrollY = null,
  drawEvents = [],
  onDrawEvent,
  reactions = [],
  chapterId,
  // Theory mode
  theoryMode = false,
  theoryNotes = [],
  onAddNote,
  onNoteUpvote,
  myUsername = '',
  // Graffiti mode
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
  stickersByPage = {},
  stickerMode = false,
  pendingGifUrl,
  pendingGifSize = 80,
  onPlaceSticker,
  onRemoveSticker,
  stickersVisible = true,
}) => {
  const containerRef   = useRef(null);
  const innerRef       = useRef(null);
  const scrollTimerRef = useRef(null);
  const suppressRef    = useRef(false); // prevent feedback loop when applying external scroll
  const canvasRef      = useRef(null);  // imperative handle to DrawingCanvas

  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const [displayPage, setDisplayPage]     = useState(currentPage);

  // ── Wire graffiti undo/clear through canvasRef ────────────────────────────────
  const handleGraffitiUndo = useCallback(() => {
    canvasRef.current?.undo();
    onGraffitiUndo?.();
  }, [onGraffitiUndo]);

  const handleGraffitiClear = useCallback(() => {
    canvasRef.current?.clear();
    onGraffitiClear?.();
  }, [onGraffitiClear]);

  // ── Resize observer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Ctrl+scroll zoom ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const next  = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta));
      onZoom?.(parseFloat(next.toFixed(2)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom, onZoom]);

  // ── Host scroll → debounced broadcast ───────────────────────────────────────
  const handleScroll = useCallback(() => {
    if (!isHost || suppressRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      onScroll?.(el.scrollTop);
    }, 80);
  }, [isHost, onScroll]);

  // ── Guest: apply external scroll smoothly ───────────────────────────────────
  useEffect(() => {
    if (isHost || externalScrollY === null) return;
    const el = containerRef.current;
    if (!el) return;
    suppressRef.current = true;
    el.scrollTo({ top: externalScrollY, behavior: 'smooth' });
    const t = setTimeout(() => { suppressRef.current = false; }, 600);
    return () => clearTimeout(t);
  }, [externalScrollY, isHost]);

  // ── Page detection via IntersectionObserver ──────────────────────────────────
  const handlePageVisible = useCallback((index) => {
    setDisplayPage(index);
    onPageChange?.(index);
  }, [onPageChange]);

  // ── Zoom handlers ─────────────────────────────────────────────────────────────
  const handleZoomIn = useCallback(() => {
    const next = Math.min(MAX_ZOOM, parseFloat((zoom + ZOOM_STEP).toFixed(2)));
    onZoom?.(next);
  }, [zoom, onZoom]);

  const handleZoomOut = useCallback(() => {
    const next = Math.max(MIN_ZOOM, parseFloat((zoom - ZOOM_STEP).toFixed(2)));
    onZoom?.(next);
  }, [zoom, onZoom]);

  // ── Fullscreen ────────────────────────────────────────────────────────────────
  const handleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  // ── Memoized pages list — avoid remounting images on chat/zoom state changes ─
  const pagesList = useMemo(() => (
    pages.map((src, i) => (
      <MangaPage
        key={`${chapterId}-${i}`}
        src={src}
        index={i}
        onVisible={handlePageVisible}
        pageIndex={i}
        theoryNotes={theoryNotes}
        theoryMode={theoryMode}
        myUsername={myUsername}
        onAddNote={onAddNote}
        onNoteUpvote={onNoteUpvote}
        stickers={stickersByPage[i] || []}
        stickerMode={stickerMode}
        pendingGifUrl={pendingGifUrl}
        pendingGifSize={pendingGifSize}
        onPlaceSticker={onPlaceSticker}
        onRemoveSticker={onRemoveSticker}
        stickersVisible={stickersVisible}
        isHost={isHost}
      />
    ))
  ), [pages, chapterId, handlePageVisible, theoryNotes, theoryMode, myUsername, onAddNote, onNoteUpvote,
      stickersByPage, stickerMode, pendingGifUrl, pendingGifSize, onPlaceSticker, onRemoveSticker, stickersVisible, isHost]);

  const isEmpty = pages.length === 0;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="relative flex-1 overflow-y-auto overflow-x-hidden bg-[#0a0a0f] h-full"
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#7c3aed33 transparent' }}
    >
      {/* Zoom wrapper */}
      <div
        ref={innerRef}
        className="mx-auto transition-transform duration-150 origin-top"
        style={{
          transform:        `scale(${zoom})`,
          transformOrigin:  'top center',
          width:            zoom > 1 ? `${100 / zoom}%` : '100%',
          maxWidth:         zoom <= 1 ? '800px' : undefined,
        }}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-white/30">
            <BookOpen size={48} className="opacity-30" />
            <p className="text-sm font-medium">Selecciona un manga para comenzar</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            {pagesList}
          </div>
        )}
      </div>

      {/* Page indicator badge */}
      {pages.length > 0 && (
        <div className="sticky top-3 z-20 flex justify-end pr-3 pointer-events-none">
          <motion.div
            key={displayPage}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black/70 border border-white/10 text-white/80 text-xs font-bold
                       rounded-full px-3 py-1 backdrop-blur-md"
          >
            Página {displayPage + 1} / {pages.length}
          </motion.div>
        </div>
      )}

      {/* Zoom & fullscreen controls — bottom right */}
      <div className="fixed bottom-6 right-6 z-30 flex flex-col gap-2">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleFullscreen}
          title="Pantalla completa"
          className="w-9 h-9 rounded-xl bg-[#0d0d14]/90 border border-white/10
                     flex items-center justify-center text-white/60 hover:text-white
                     hover:border-violet-500/40 transition-all backdrop-blur-md shadow-xl"
        >
          <Maximize2 size={15} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
          title="Acercar"
          className="w-9 h-9 rounded-xl bg-[#0d0d14]/90 border border-white/10
                     flex items-center justify-center text-white/60 hover:text-white
                     hover:border-violet-500/40 transition-all backdrop-blur-md shadow-xl
                     disabled:opacity-30"
        >
          <ZoomIn size={15} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
          title="Alejar"
          className="w-9 h-9 rounded-xl bg-[#0d0d14]/90 border border-white/10
                     flex items-center justify-center text-white/60 hover:text-white
                     hover:border-violet-500/40 transition-all backdrop-blur-md shadow-xl
                     disabled:opacity-30"
        >
          <ZoomOut size={15} />
        </motion.button>
        {zoom !== 1 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onZoom?.(1)}
            title="Restablecer zoom"
            className="w-9 h-9 rounded-xl bg-violet-600/80 border border-violet-500/30
                       flex items-center justify-center text-white text-[10px] font-black
                       hover:bg-violet-500 transition-all backdrop-blur-md shadow-xl"
          >
            1x
          </motion.button>
        )}
      </div>

      {/* Graffiti toolbar — visible when graffitiMode and canDraw */}
      <AnimatePresence>
        {graffitiMode && (
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

      {/* Drawing canvas overlay — always mounted to avoid flicker */}
      <DrawingCanvas
        ref={canvasRef}
        enabled={graffitiMode || drawingEnabled}
        width={containerSize.w}
        height={containerSize.h}
        isHost={isHost}
        canDraw={canDraw}
        tool={graffitiTool}
        color={graffitiColor}
        strokeWidth={graffitiSize}
        remoteEvents={drawEvents}
        onEvent={onDrawEvent}
        chapterId={chapterId}
      />

      {/* Floating reactions overlay */}
      <ReactionsOverlay reactions={reactions} />
    </div>
  );
});

MangaReader.displayName = 'MangaReader';

export default MangaReader;
