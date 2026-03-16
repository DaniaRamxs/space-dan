import React, {
  useState, useEffect, useRef, useCallback, memo, forwardRef, useImperativeHandle,
} from 'react';
import { Stage, Layer, Line } from 'react-konva';

// ─── DrawingCanvas ────────────────────────────────────────────────────────────
// Canvas overlay using react-konva for collaborative drawing on the manga reader.
//
// Props:
//   enabled       — whether drawing mode is active
//   width         — canvas width in pixels
//   height        — canvas height in pixels
//   isHost        — kept for backward-compat; permission to draw uses canDraw
//   canDraw       — actual draw permission (host or guests when allowed)
//   tool          — 'pencil' | 'eraser'  (controlled from parent)
//   color         — current stroke color  (controlled from parent)
//   strokeWidth   — current stroke width  (controlled from parent)
//   remoteEvents  — array of draw events from remote (host broadcasts)
//   onEvent       — callback(event) to broadcast a draw event upstream
//   chapterId     — when this changes, all lines are cleared
//
// Ref API:
//   ref.current.undo()   — remove last drawn line + broadcast draw_undo
//   ref.current.clear()  — clear all lines + broadcast draw_clear

const DrawingCanvas = memo(forwardRef(({
  enabled = false,
  width = 800,
  height = 600,
  isHost = false,
  canDraw = false,
  tool = 'pencil',
  color = '#ef4444',
  strokeWidth = 5,
  remoteEvents = [],
  onEvent,
  chapterId,
}, ref) => {
  const [lines, setLines]    = useState([]);
  const isDrawing            = useRef(false);
  const currentLine          = useRef(null);
  const processedIds         = useRef(new Set());

  // ── Expose undo / clear to parent via ref ─────────────────────────────────────
  useImperativeHandle(ref, () => ({
    undo: () => {
      setLines((prev) => prev.slice(0, -1));
      onEvent?.({ type: 'draw_undo' });
    },
    clear: () => {
      setLines([]);
      processedIds.current.clear();
      onEvent?.({ type: 'draw_clear' });
    },
  }), [onEvent]);

  // ── Reset on chapter change ───────────────────────────────────────────────────
  useEffect(() => {
    setLines([]);
    processedIds.current.clear();
    isDrawing.current   = false;
    currentLine.current = null;
  }, [chapterId]);

  // ── Apply remote draw events ──────────────────────────────────────────────────
  useEffect(() => {
    if (!remoteEvents || remoteEvents.length === 0) return;

    remoteEvents.forEach((ev) => {
      if (!ev) return;

      // undo / clear don't use ids
      if (ev.type === 'draw_undo') {
        setLines((prev) => prev.slice(0, -1));
        return;
      }
      if (ev.type === 'draw_clear') {
        setLines([]);
        processedIds.current.clear();
        return;
      }

      if (processedIds.current.has(ev.id)) return;
      processedIds.current.add(ev.id);

      if (ev.type === 'draw_start') {
        setLines((prev) => [
          ...prev,
          {
            id:          ev.id,
            points:      ev.points,
            color:       ev.color,
            strokeWidth: ev.strokeWidth,
            tool:        ev.tool || 'pencil',
          },
        ]);
      } else if (ev.type === 'draw_move') {
        setLines((prev) =>
          prev.map((l) =>
            l.id === ev.lineId
              ? { ...l, points: [...l.points, ...ev.points] }
              : l
          )
        );
      }
      // draw_end — finalized via id tracking; no extra state needed
    });
  }, [remoteEvents]);

  // ── Mouse / touch drawing handlers ───────────────────────────────────────────

  const handleMouseDown = useCallback((e) => {
    if (!enabled || !canDraw) return;
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    const id  = `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    currentLine.current = id;

    const effectiveStroke =
      tool === 'eraser' ? Math.max(strokeWidth * 2.5, 20) : strokeWidth;

    const newLine = { id, points: [pos.x, pos.y], color, strokeWidth: effectiveStroke, tool };
    setLines((prev) => [...prev, newLine]);

    onEvent?.({
      type:        'draw_start',
      id,
      points:      [pos.x, pos.y],
      color,
      strokeWidth: effectiveStroke,
      tool,
    });
  }, [enabled, canDraw, color, strokeWidth, tool, onEvent]);

  const handleMouseMove = useCallback((e) => {
    if (!isDrawing.current || !enabled || !canDraw) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const id    = currentLine.current;

    setLines((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, points: [...l.points, point.x, point.y] } : l
      )
    );

    onEvent?.({ type: 'draw_move', lineId: id, points: [point.x, point.y] });
  }, [enabled, canDraw, onEvent]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    onEvent?.({ type: 'draw_end', lineId: currentLine.current });
    currentLine.current = null;
  }, [onEvent]);

  const handleTouchStart = useCallback((e) => {
    e.evt.preventDefault();
    handleMouseDown(e);
  }, [handleMouseDown]);

  const handleTouchMove = useCallback((e) => {
    e.evt.preventDefault();
    handleMouseMove(e);
  }, [handleMouseMove]);

  const handleTouchEnd = useCallback(() => {
    handleMouseUp();
  }, [handleMouseUp]);

  // ── Cursor ────────────────────────────────────────────────────────────────────
  const cursor =
    enabled && canDraw
      ? (tool === 'eraser' ? 'cell' : 'crosshair')
      : 'default';

  return (
    <div
      className="absolute inset-0 z-20"
      style={{ pointerEvents: enabled ? 'auto' : 'none' }}
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
        style={{ cursor }}
      >
        <Layer>
          {lines.map((line) => (
            <Line
              key={line.id}
              points={line.points}
              stroke={line.tool === 'eraser' ? '#000000' : line.color}
              strokeWidth={line.strokeWidth}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={
                line.tool === 'eraser' ? 'destination-out' : 'source-over'
              }
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}));

DrawingCanvas.displayName = 'DrawingCanvas';
export default DrawingCanvas;
