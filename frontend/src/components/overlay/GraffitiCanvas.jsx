/**
 * GraffitiCanvas — canvas-based freehand drawing overlay.
 *
 * Only mounts/renders when graffitiMode === true. Uses requestAnimationFrame
 * to batch pointer move events for smooth stroke rendering. Saves the result
 * as a PNG dataURL overlay element.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useOverlay } from '@/contexts/OverlayContext';

// ─── Palette & defaults ───────────────────────────────────────────────────────

const PALETTE = [
  '#ffffff',
  '#ff6b6b',
  '#ffd93d',
  '#6bcb77',
  '#4d96ff',
  '#c77dff',
  '#ff9a3c',
  '#00f5d4',
];

const DEFAULT_COLOR      = '#ffffff';
const DEFAULT_BRUSH_SIZE = 5;

// ─── GraffitiCanvas ───────────────────────────────────────────────────────────

export default function GraffitiCanvas({ containerRef }) {
  const { graffitiMode, addOverlay, setGraffiti } = useOverlay();

  const canvasRef  = useRef(null);
  const isDrawing  = useRef(false);
  const rafRef     = useRef(null);
  const pendingRef = useRef([]); // queued pointer positions for RAF batch

  const [color,     setColor]     = useState(DEFAULT_COLOR);
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE);

  // ── Resize canvas to match container ──────────────────────────────────────

  useEffect(() => {
    if (!graffitiMode) return;
    const canvas    = canvasRef.current;
    const container = containerRef?.current;
    if (!canvas || !container) return;

    const rect       = container.getBoundingClientRect();
    canvas.width     = Math.round(rect.width);
    canvas.height    = Math.round(rect.height);

    // Re-size on window resize too
    const handleResize = () => {
      const ctx      = canvas.getContext('2d');
      // Preserve drawing by snapshotting
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const r2       = container.getBoundingClientRect();
      canvas.width   = Math.round(r2.width);
      canvas.height  = Math.round(r2.height);
      ctx.putImageData(snapshot, 0, 0);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [graffitiMode, containerRef]);

  // ── RAF-based stroke renderer ─────────────────────────────────────────────

  const flushStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    const points = pendingRef.current.splice(0);

    if (points.length === 0) return;

    ctx.strokeStyle = color;
    ctx.lineWidth   = brushSize;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    rafRef.current = null;
  }, [color, brushSize]);

  const scheduleFlush = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(flushStrokes);
  }, [flushStrokes]);

  // ── Pointer helpers ───────────────────────────────────────────────────────

  const getCanvasPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  // ── Pointer events ────────────────────────────────────────────────────────

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    isDrawing.current = true;
    const pos = getCanvasPos(e);
    pendingRef.current.push(pos);
    scheduleFlush();
  }, [getCanvasPos, scheduleFlush]);

  const handlePointerMove = useCallback((e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const pos = getCanvasPos(e);
    pendingRef.current.push(pos);
    scheduleFlush();
  }, [getCanvasPos, scheduleFlush]);

  const stopDrawing = useCallback((e) => {
    e.preventDefault();
    isDrawing.current = false;
    // Flush remaining points
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    flushStrokes();
  }, [flushStrokes]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Toolbar actions ───────────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataURL = canvas.toDataURL('image/png');
    addOverlay('drawing', {
      src:      dataURL,
      position: { x: 0, y: 0 },
      width:    canvas.width,
      height:   canvas.height,
    });
    setGraffiti(false);
    handleClear();
  }, [addOverlay, setGraffiti, handleClear]);

  const handleCancel = useCallback(() => {
    setGraffiti(false);
    handleClear();
  }, [setGraffiti, handleClear]);

  // ── Render guard ─────────────────────────────────────────────────────────

  if (!graffitiMode) return null;

  return (
    <>
      {/* Drawing canvas — fills the container absolutely */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{
          zIndex:      160,
          cursor:      'crosshair',
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
      />

      {/* Toolbar pill */}
      <div
        className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/70 px-4 py-3 backdrop-blur-xl"
        style={{ zIndex: 161 }}
      >
        {/* Color palette */}
        <div className="flex items-center gap-1.5">
          {PALETTE.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              title={c}
              style={{
                background:  c,
                width:       20,
                height:      20,
                borderRadius: '50%',
                border:      color === c ? '2px solid white' : '2px solid transparent',
                outline:     color === c ? '1px solid rgba(255,255,255,0.4)' : 'none',
                flexShrink:  0,
                transition:  'border 0.1s ease',
              }}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-white/15" />

        {/* Brush size slider */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40">Trazo</span>
          <input
            type="range"
            min={2}
            max={24}
            step={1}
            value={brushSize}
            onChange={e => setBrushSize(Number(e.target.value))}
            className="w-20 accent-cyan-400"
          />
          <span className="w-4 text-[10px] text-white/40 text-right">{brushSize}</span>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-white/15" />

        {/* Action buttons */}
        <button
          onClick={handleClear}
          className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-white/60 hover:bg-white/[0.12] transition"
        >
          Borrar
        </button>
        <button
          onClick={handleSave}
          className="rounded-xl border border-cyan-400/30 bg-cyan-500/20 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition"
        >
          Guardar
        </button>
        <button
          onClick={handleCancel}
          className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-white/50 hover:bg-white/[0.12] transition"
        >
          Cancelar
        </button>
      </div>
    </>
  );
}
