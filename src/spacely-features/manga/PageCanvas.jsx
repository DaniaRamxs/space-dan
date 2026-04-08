import React, {
  useEffect, useRef, useCallback, forwardRef, useImperativeHandle,
  useState,
} from 'react';
import { Stage, Layer, Line } from 'react-konva';

// ─── PageCanvas ───────────────────────────────────────────────────────────────
// Per-page drawing canvas. Drawings are stored per page number in a ref so
// switching pages loads the correct layer without losing any artwork.
//
// Props:
//   page        — current page index (0-based)
//   chapterId   — clears all drawings on chapter change
//   width / height — container size in px
//   enabled     — show the canvas at all
//   canDraw     — this user can draw (host or guest with graffiti perm)
//   tool        — 'pencil' | 'eraser'
//   color       — stroke color hex
//   strokeWidth — base stroke width
//   remoteEvents — array of draw events received from broadcast
//   onEvent     — (event) => void  broadcast upstream
//
// Imperative handle (via ref):
//   ref.current.undo()  — removes last stroke for current page + broadcasts
//   ref.current.clear() — clears current page + broadcasts

const PageCanvas = forwardRef(({
  page = 0,
  chapterId,
  width = 800,
  height = 600,
  enabled = false,
  canDraw = false,
  tool = 'pencil',
  color = '#ef4444',
  strokeWidth = 5,
  remoteEvents = [],
  onEvent,
}, ref) => {
  // drawingsRef: { [pageNum]: Line[] } — persists across page changes
  const drawingsRef  = useRef({});
  const [pageLines, setPageLines] = useState([]);
  const isDrawing    = useRef(false);
  const currentLine  = useRef(null);
  const processedIds = useRef(new Set());
  const throttleTs   = useRef(0);

  // ── Load drawings for current page whenever page changes ─────────────────────
  useEffect(() => {
    setPageLines(drawingsRef.current[page] || []);
  }, [page]);

  // ── Keep drawingsRef in sync with pageLines ───────────────────────────────────
  useEffect(() => {
    drawingsRef.current[page] = pageLines;
  }, [pageLines, page]);

  // ── Clear everything on chapter change ───────────────────────────────────────
  useEffect(() => {
    drawingsRef.current = {};
    processedIds.current.clear();
    isDrawing.current = false;
    currentLine.current = null;
    setPageLines([]);
  }, [chapterId]);

  // ── Imperative handle ─────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    undo() {
      setPageLines((prev) => {
        const next = prev.slice(0, -1);
        drawingsRef.current[page] = next;
        return next;
      });
      onEvent?.({ type: 'draw_undo', page });
    },
    clear() {
      setPageLines([]);
      drawingsRef.current[page] = [];
      onEvent?.({ type: 'draw_clear', page });
    },
  }), [page, onEvent]);

  // ── Process remote draw events ────────────────────────────────────────────────
  useEffect(() => {
    if (!remoteEvents?.length) return;
    remoteEvents.forEach((ev) => {
      if (!ev) return;
      // Unique dedup key
      const dedup = ev.id ? `start-${ev.id}` : `${ev.type}-${ev.lineId ?? ''}-${ev.page ?? 0}-${JSON.stringify(ev.points ?? [])}`;
      if (processedIds.current.has(dedup)) return;
      processedIds.current.add(dedup);

      const evPage = ev.page ?? 0;

      const mutate = (updater) => {
        const current = drawingsRef.current[evPage] || [];
        const next = updater(current);
        drawingsRef.current[evPage] = next;
        if (evPage === page) setPageLines([...next]);
      };

      if (ev.type === 'draw_start') {
        mutate((prev) => [
          ...prev,
          { id: ev.id, points: ev.points, color: ev.color, strokeWidth: ev.strokeWidth, tool: ev.tool || 'pencil' },
        ]);
      } else if (ev.type === 'draw_move') {
        mutate((prev) =>
          prev.map((l) => l.id === ev.lineId
            ? { ...l, points: [...l.points, ...ev.points] }
            : l
          )
        );
      } else if (ev.type === 'draw_undo') {
        mutate((prev) => prev.slice(0, -1));
      } else if (ev.type === 'draw_clear') {
        mutate(() => []);
        processedIds.current.clear(); // allow re-drawing same coords after clear
      }
      // draw_end has no local action needed
    });
  }, [remoteEvents, page]);

  // ── Local drawing handlers ────────────────────────────────────────────────────

  const getPos = (e) => e.target.getStage().getPointerPosition();
  const isEraser = tool === 'eraser';

  const handleMouseDown = useCallback((e) => {
    if (!enabled || !canDraw) return;
    isDrawing.current = true;
    const pos = getPos(e);
    const id  = `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    currentLine.current = id;

    const effectiveColor  = isEraser ? '#000000' : color;
    const effectiveStroke = isEraser ? Math.max(20, strokeWidth * 3) : strokeWidth;
    const newLine = { id, points: [pos.x, pos.y], color: effectiveColor, strokeWidth: effectiveStroke, tool };

    setPageLines((prev) => {
      const next = [...prev, newLine];
      drawingsRef.current[page] = next;
      return next;
    });

    onEvent?.({
      type: 'draw_start', id,
      points: [pos.x, pos.y],
      color: effectiveColor,
      strokeWidth: effectiveStroke,
      tool, page,
    });
  }, [enabled, canDraw, color, strokeWidth, tool, isEraser, page, onEvent]);

  const handleMouseMove = useCallback((e) => {
    if (!isDrawing.current || !enabled || !canDraw) return;
    const pos = getPos(e);
    const id  = currentLine.current;

    setPageLines((prev) => {
      const next = prev.map((l) =>
        l.id === id ? { ...l, points: [...l.points, pos.x, pos.y] } : l
      );
      drawingsRef.current[page] = next;
      return next;
    });

    // Throttle broadcast to ~30 fps
    const now = Date.now();
    if (now - throttleTs.current < 33) return;
    throttleTs.current = now;
    onEvent?.({ type: 'draw_move', lineId: id, points: [pos.x, pos.y], page });
  }, [enabled, canDraw, page, onEvent]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    onEvent?.({ type: 'draw_end', lineId: currentLine.current, page });
    currentLine.current = null;
  }, [page, onEvent]);

  const handleTouchStart = useCallback((e) => { e.evt.preventDefault(); handleMouseDown(e); }, [handleMouseDown]);
  const handleTouchMove  = useCallback((e) => { e.evt.preventDefault(); handleMouseMove(e); }, [handleMouseMove]);
  const handleTouchEnd   = useCallback(() => { handleMouseUp(); }, [handleMouseUp]);

  if (!enabled) return null;

  return (
    <div
      className="absolute inset-0 z-20"
      style={{ pointerEvents: canDraw ? 'auto' : 'none' }}
    >
      <Stage
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: canDraw ? (isEraser ? 'cell' : 'crosshair') : 'default' }}
      >
        <Layer>
          {pageLines.map((line) => (
            <Line
              key={line.id}
              points={line.points}
              stroke={line.color}
              strokeWidth={line.strokeWidth}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={line.tool === 'eraser' ? 'destination-out' : 'source-over'}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
});

PageCanvas.displayName = 'PageCanvas';
export default PageCanvas;
