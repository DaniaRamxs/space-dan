import React, {
  useState, useEffect, useRef, useCallback, memo,
} from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  { label: 'Rojo',    value: '#ef4444' },
  { label: 'Azul',   value: '#3b82f6' },
  { label: 'Amarillo', value: '#fbbf24' },
  { label: 'Blanco', value: '#ffffff' },
  { label: 'Negro',  value: '#111111' },
];

const STROKE_WIDTHS = [
  { label: 'Fino',    value: 2 },
  { label: 'Medio',  value: 5 },
  { label: 'Grueso', value: 10 },
];

// ─── DrawingCanvas ────────────────────────────────────────────────────────────
// Canvas overlay using react-konva for collaborative drawing on the manga reader.
//
// Props:
//   enabled       — whether drawing mode is active
//   width         — canvas width in pixels
//   height        — canvas height in pixels
//   isHost        — true = can draw & clear; false = only receive remote lines
//   remoteEvents  — array of draw events from remote (host)
//   onEvent       — callback(event) to broadcast a draw event upstream
//   chapterId     — when this changes, all lines are cleared

const DrawingCanvas = memo(({
  enabled = false,
  width = 800,
  height = 600,
  isHost = false,
  remoteEvents = [],
  onEvent,
  chapterId,
}) => {
  const [lines, setLines]             = useState([]);
  const [color, setColor]             = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(5);
  const isDrawing    = useRef(false);
  const currentLine  = useRef(null);
  const processedIds = useRef(new Set());

  // Clear lines on chapter change
  useEffect(() => {
    setLines([]);
    processedIds.current.clear();
    isDrawing.current = false;
    currentLine.current = null;
  }, [chapterId]);

  // Process incoming remote draw events (guest side — render host lines)
  useEffect(() => {
    if (!remoteEvents || remoteEvents.length === 0) return;

    remoteEvents.forEach((ev) => {
      if (!ev || processedIds.current.has(ev.id)) return;
      processedIds.current.add(ev.id);

      if (ev.type === 'draw_start') {
        setLines((prev) => [
          ...prev,
          { id: ev.id, points: ev.points, color: ev.color, strokeWidth: ev.strokeWidth },
        ]);
      } else if (ev.type === 'draw_move') {
        setLines((prev) =>
          prev.map((l) =>
            l.id === ev.lineId
              ? { ...l, points: [...l.points, ...ev.points] }
              : l
          )
        );
      } else if (ev.type === 'draw_end') {
        // Finalize — already tracked
      } else if (ev.type === 'draw_clear') {
        setLines([]);
        processedIds.current.clear();
      }
    });
  }, [remoteEvents]);

  // ── Host drawing handlers ────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e) => {
    if (!enabled || !isHost) return;
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    const id = `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    currentLine.current = id;

    const newLine = { id, points: [pos.x, pos.y], color, strokeWidth };
    setLines((prev) => [...prev, newLine]);

    onEvent?.({
      type: 'draw_start',
      id,
      points: [pos.x, pos.y],
      color,
      strokeWidth,
    });
  }, [enabled, isHost, color, strokeWidth, onEvent]);

  const handleMouseMove = useCallback((e) => {
    if (!isDrawing.current || !enabled || !isHost) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const id = currentLine.current;

    setLines((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, points: [...l.points, point.x, point.y] } : l
      )
    );

    onEvent?.({
      type: 'draw_move',
      lineId: id,
      points: [point.x, point.y],
    });
  }, [enabled, isHost, onEvent]);

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

  const handleClear = useCallback(() => {
    if (!isHost) return;
    setLines([]);
    processedIds.current.clear();
    onEvent?.({ type: 'draw_clear' });
  }, [isHost, onEvent]);

  return (
    <div
      className="absolute inset-0 z-20"
      style={{ pointerEvents: enabled ? 'auto' : 'none' }}
    >
      {/* Konva Stage */}
      <Stage
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: enabled && isHost ? 'crosshair' : 'default' }}
      >
        <Layer>
          {lines.map((line) => (
            <Line
              key={line.id}
              points={line.points}
              stroke={line.color}
              strokeWidth={line.strokeWidth}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation="source-over"
            />
          ))}
        </Layer>
      </Stage>

      {/* Drawing toolbar — only visible when enabled and user is host */}
      {enabled && isHost && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2
                     bg-[#0d0d14]/90 border border-white/10 rounded-2xl px-3 py-2
                     backdrop-blur-md shadow-xl z-30"
        >
          {/* Color picker */}
          <div className="flex items-center gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.value}
                title={c.label}
                onClick={() => setColor(c.value)}
                className="w-5 h-5 rounded-full border-2 transition-transform"
                style={{
                  backgroundColor: c.value,
                  borderColor: color === c.value ? '#fff' : 'transparent',
                  transform: color === c.value ? 'scale(1.25)' : 'scale(1)',
                }}
              />
            ))}
          </div>

          <div className="w-px h-5 bg-white/10" />

          {/* Stroke width */}
          <div className="flex items-center gap-1.5">
            {STROKE_WIDTHS.map((sw) => (
              <button
                key={sw.value}
                title={sw.label}
                onClick={() => setStrokeWidth(sw.value)}
                className={`rounded-full bg-white transition-all ${
                  strokeWidth === sw.value ? 'opacity-100 ring-2 ring-violet-400' : 'opacity-40 hover:opacity-70'
                }`}
                style={{
                  width: `${sw.value + 6}px`,
                  height: `${sw.value + 6}px`,
                }}
              />
            ))}
          </div>

          <div className="w-px h-5 bg-white/10" />

          {/* Clear */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleClear}
            title="Limpiar dibujos"
            className="flex items-center gap-1 text-red-400 hover:text-red-300 text-xs font-bold transition-colors"
          >
            <Trash2 size={13} />
            <span>Limpiar</span>
          </motion.button>
        </motion.div>
      )}
    </div>
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;
