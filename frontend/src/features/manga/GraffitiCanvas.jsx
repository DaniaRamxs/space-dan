// GraffitiCanvas — native Canvas 2D + Pointer Events graffiti layer
// Replaces react-konva PageCanvas.
//
// Key improvements over PageCanvas:
//   • Positioned exactly over the manga image rect (no letterbox misalignment)
//   • Native Pointer Events API — works with mouse, touch, stylus uniformly
//   • touch-action: none on the canvas element itself (definitive mobile fix)
//   • Complete-stroke broadcast (draw_stroke) — not per-point streaming
//   • Normalized coords (0–1) — drawings survive canvas resize
//   • requestAnimationFrame render loop — no React state during drawing
//   • 4 tools: pencil, eraser, highlighter, sparkle
//
// Props:
//   page          — 0-based page index
//   chapterId     — clears all drawings on change
//   imageRect     — { x, y, w, h } displayed image bounds in container px
//   enabled       — render the canvas at all
//   canDraw       — this user can draw
//   tool          — 'pencil' | 'eraser' | 'highlighter' | 'sparkle'
//   color         — stroke color hex
//   strokeWidth   — base stroke width (1–20)
//   remoteEvents  — array of draw events from broadcast
//   onEvent       — (ev) => void  to broadcast upstream
//
// Imperative handle:
//   ref.undo()       — removes last stroke + broadcasts draw_undo
//   ref.clear()      — clears current page  + broadcasts draw_clear
//   ref.getStrokes() — returns strokesByPage ref (for state snapshot)

import React, {
  useEffect, useRef, useCallback, forwardRef, useImperativeHandle,
} from 'react';

// ── Stroke renderer ───────────────────────────────────────────────────────────
// Draws a single stroke (normalized coords 0-1) onto the given 2D context.

function drawStroke(ctx, stroke, cw, ch) {
  const pts = stroke.points;
  if (!pts || pts.length < 2) return;

  const baseWidth = (stroke.width || 5) * Math.sqrt(cw * ch) / 700;

  ctx.save();
  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';

  switch (stroke.tool) {
    case 'eraser':
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth   = baseWidth * 4;
      ctx.globalAlpha = 1;
      break;

    case 'highlighter':
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color || '#ffff00';
      ctx.lineWidth   = baseWidth * 6;
      ctx.globalAlpha = 0.28;
      break;

    case 'sparkle':
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color || '#fff';
      ctx.lineWidth   = baseWidth * 1.2;
      ctx.globalAlpha = 1;
      ctx.shadowBlur  = 10;
      ctx.shadowColor = stroke.color || '#fff';
      break;

    default: // pencil
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color || '#ef4444';
      ctx.lineWidth   = baseWidth;
      ctx.globalAlpha = 1;
      break;
  }

  // Smooth path via midpoint quadratic curves
  ctx.beginPath();
  ctx.moveTo(pts[0] * cw, pts[1] * ch);
  for (let i = 2; i < pts.length - 2; i += 2) {
    const mx = ((pts[i] + pts[i + 2]) / 2) * cw;
    const my = ((pts[i + 1] + pts[i + 3]) / 2) * ch;
    ctx.quadraticCurveTo(pts[i] * cw, pts[i + 1] * ch, mx, my);
  }
  if (pts.length >= 4) {
    ctx.lineTo(pts[pts.length - 2] * cw, pts[pts.length - 1] * ch);
  }
  ctx.stroke();

  // Sparkle: scatter glowing dots along the path
  if (stroke.tool === 'sparkle' && pts.length >= 4) {
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#fff';
    const step = Math.max(2, Math.floor(pts.length / 16));
    for (let i = 0; i < pts.length - 1; i += step) {
      const ox = (Math.random() - 0.5) * 18;
      const oy = (Math.random() - 0.5) * 18;
      ctx.beginPath();
      ctx.arc(pts[i] * cw + ox, pts[i + 1] * ch + oy, 1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// ── GraffitiCanvas ────────────────────────────────────────────────────────────

const GraffitiCanvas = forwardRef(({
  page = 0,
  chapterId,
  imageRect,        // { x, y, w, h }
  enabled = false,
  canDraw = false,
  tool = 'pencil',
  color = '#ef4444',
  strokeWidth = 5,
  remoteEvents = [],
  onEvent,
}, ref) => {
  const canvasRef    = useRef(null);
  const strokesByPage = useRef({});  // { [`${chapterId}-${page}`]: stroke[] }
  const liveStroke   = useRef(null); // current in-progress stroke
  const isDrawing    = useRef(false);
  const processedIds = useRef(new Set());
  const rafId        = useRef(null);
  const dirty        = useRef(false);

  // ── Page key ─────────────────────────────────────────────────────────────────
  const pageKey = `${chapterId ?? 'x'}-${page}`;

  // ── Redraw all strokes for current page ───────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cw  = canvas.width;
    const ch  = canvas.height;
    if (!cw || !ch) return;

    ctx.clearRect(0, 0, cw, ch);
    (strokesByPage.current[pageKey] || []).forEach((s) => drawStroke(ctx, s, cw, ch));
    if (liveStroke.current?.points?.length >= 2) {
      drawStroke(ctx, liveStroke.current, cw, ch);
    }
  }, [pageKey]);

  // ── Schedule redraw via RAF ───────────────────────────────────────────────────
  const scheduleRedraw = useCallback(() => {
    dirty.current = true;
    if (rafId.current) return;
    const tick = () => {
      if (dirty.current) { dirty.current = false; redraw(); }
      rafId.current = isDrawing.current ? requestAnimationFrame(tick) : null;
    };
    rafId.current = requestAnimationFrame(tick);
  }, [redraw]);

  // ── Immediate redraw (for state changes, not live drawing) ────────────────────
  const flush = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    rafId.current = null;
    redraw();
  }, [redraw]);

  // ── Resize canvas when imageRect changes ──────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRect?.w || !imageRect?.h) return;
    const w = Math.round(imageRect.w);
    const h = Math.round(imageRect.h);
    if (canvas.width === w && canvas.height === h) { flush(); return; }
    canvas.width  = w;
    canvas.height = h;
    flush();
  }, [imageRect, flush]);

  // ── Clear all on chapter change ───────────────────────────────────────────────
  useEffect(() => {
    strokesByPage.current  = {};
    processedIds.current.clear();
    isDrawing.current  = false;
    liveStroke.current = null;
    flush();
  }, [chapterId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load page strokes when page changes ───────────────────────────────────────
  useEffect(() => {
    isDrawing.current  = false;
    liveStroke.current = null;
    flush();
  }, [page, pageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Process remote events ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!remoteEvents?.length) return;
    let changed = false;

    remoteEvents.forEach((ev) => {
      if (!ev) return;
      const dedup = ev.stroke?.id
        ? `stroke-${ev.stroke.id}`
        : `${ev.type}-${ev.page ?? 0}-${ev.strokeId ?? ''}`;
      if (processedIds.current.has(dedup)) return;
      processedIds.current.add(dedup);

      const evPage = ev.page ?? 0;
      const evKey  = `${chapterId ?? 'x'}-${evPage}`;

      if (ev.type === 'draw_stroke') {
        strokesByPage.current[evKey] = [
          ...(strokesByPage.current[evKey] || []),
          ev.stroke,
        ];
        changed = true;
      } else if (ev.type === 'draw_undo') {
        strokesByPage.current[evKey] = (strokesByPage.current[evKey] || []).slice(0, -1);
        changed = true;
      } else if (ev.type === 'draw_clear') {
        strokesByPage.current[evKey] = [];
        processedIds.current.clear();
        changed = true;
      }
      // Legacy draw_start / draw_move / draw_end — ignored in new protocol
    });

    if (changed) flush();
  }, [remoteEvents, chapterId, flush]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────────
  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  // ── Imperative handle ─────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    undo() {
      const existing = strokesByPage.current[pageKey] || [];
      if (!existing.length) return;
      strokesByPage.current[pageKey] = existing.slice(0, -1);
      flush();
      onEvent?.({ type: 'draw_undo', page });
    },
    clear() {
      strokesByPage.current[pageKey] = [];
      processedIds.current.clear();
      flush();
      onEvent?.({ type: 'draw_clear', page });
    },
    getStrokes() {
      return strokesByPage.current;
    },
  }), [pageKey, page, onEvent, flush]);

  // ── Pointer helpers ───────────────────────────────────────────────────────────
  const getNormalized = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0];
    const rect = canvas.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1, (e.clientX - rect.left)  / rect.width)),
      Math.max(0, Math.min(1, (e.clientY - rect.top)   / rect.height)),
    ];
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (!enabled || !canDraw) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    const [nx, ny] = getNormalized(e);
    liveStroke.current = {
      id:     `s-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      tool,
      color,
      width:  strokeWidth,
      points: [nx, ny],
      page,
    };
    scheduleRedraw();
  }, [enabled, canDraw, tool, color, strokeWidth, page, getNormalized, scheduleRedraw]);

  const handlePointerMove = useCallback((e) => {
    if (!isDrawing.current || !enabled || !canDraw) return;
    if (e.buttons === 0) { isDrawing.current = false; return; }
    const [nx, ny] = getNormalized(e);
    const ls = liveStroke.current;
    if (!ls) return;
    // Deduplicate adjacent identical points
    const len = ls.points.length;
    if (len >= 2 && ls.points[len - 2] === nx && ls.points[len - 1] === ny) return;
    ls.points.push(nx, ny);
    scheduleRedraw();
  }, [enabled, canDraw, getNormalized, scheduleRedraw]);

  const commitStroke = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const stroke = liveStroke.current;
    liveStroke.current = null;
    if (!stroke || stroke.points.length < 2) { flush(); return; }
    strokesByPage.current[pageKey] = [
      ...(strokesByPage.current[pageKey] || []),
      stroke,
    ];
    flush();
    onEvent?.({ type: 'draw_stroke', stroke, page });
  }, [pageKey, page, onEvent, flush]);

  const handlePointerUp     = useCallback(() => commitStroke(), [commitStroke]);
  const handlePointerLeave  = useCallback(() => { if (isDrawing.current) commitStroke(); }, [commitStroke]);
  const handlePointerCancel = useCallback(() => commitStroke(), [commitStroke]);

  if (!enabled) return null;

  const ir = imageRect || { x: 0, y: 0, w: 0, h: 0 };

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'absolute',
        left:          `${ir.x}px`,
        top:           `${ir.y}px`,
        width:         `${ir.w}px`,
        height:        `${ir.h}px`,
        touchAction:   'none',
        cursor:        canDraw ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default',
        pointerEvents: canDraw ? 'auto' : 'none',
        zIndex:        20,
        display:       ir.w ? 'block' : 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerCancel}
    />
  );
});

GraffitiCanvas.displayName = 'GraffitiCanvas';
export default GraffitiCanvas;
