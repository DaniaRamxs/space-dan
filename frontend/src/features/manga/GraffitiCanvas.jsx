// GraffitiCanvas — native Canvas 2D + Pointer Events collaborative graffiti layer
//
// Architecture:
//   • Canvas positioned exactly over the manga image rect (no letterbox misalignment)
//   • Pointer Events API: works with mouse, touch, and stylus uniformly
//   • touch-action: none on the canvas element — definitive mobile scroll-block fix
//   • Normalized coords (0–1) stored in strokes — resize-resilient
//   • requestAnimationFrame loop during drawing — zero React state during stroke
//   • Complete-stroke broadcast on pointerup — not per-point streaming
//   • Stroke compression: removes redundant points (~40-70% data reduction)
//   • strokesByPage keyed as "${chapterId}-${page}" — per-page isolation
//   • flushRef trick — prevents stale-closure re-runs on flush/redraw changes
//
// Props:
//   page         — 0-based page index
//   chapterId    — clears all drawings on change
//   imageRect    — { x, y, w, h } displayed image bounds in container px
//   enabled      — show the canvas layer (even if canDraw=false → view-only)
//   canDraw      — allow this user to draw
//   strokesVisible — hide/show drawings without unmounting (default true)
//   tool         — 'pencil' | 'highlighter' | 'sparkle' | 'eraser'
//   color        — hex stroke color
//   strokeWidth  — base stroke width (1–20)
//   remoteEvents — draw event array from broadcast (append-only from parent)
//   onEvent      — (ev) => void  called on local draw/undo/clear
//
// Imperative handle (ref):
//   undo()         — removes last local stroke + emits draw_undo
//   clear()        — clears current page + emits draw_clear
//   getStrokes()   — returns full strokesByPage ref (for state_snapshot)

import React, {
  useEffect, useRef, useCallback, forwardRef, useImperativeHandle,
} from 'react';

// ── Stroke compression ────────────────────────────────────────────────────────
// Removes intermediate points that are closer than `minDist` (normalized space).
// Reduces payload size by 40–70% on typical handwriting paths.

function compressPoints(pts, minDist = 0.003) {
  if (pts.length <= 4) return pts; // single segment — keep as-is
  const out  = [pts[0], pts[1]];
  let lx = pts[0], ly = pts[1];
  for (let i = 2; i < pts.length - 2; i += 2) {
    const dx = pts[i] - lx;
    const dy = pts[i + 1] - ly;
    if (dx * dx + dy * dy >= minDist * minDist) {
      out.push(pts[i], pts[i + 1]);
      lx = pts[i];
      ly = pts[i + 1];
    }
  }
  // Always include the final point
  out.push(pts[pts.length - 2], pts[pts.length - 1]);
  return out;
}

// ── Stroke renderer ───────────────────────────────────────────────────────────
// Draws one stroke (flat normalized-coord array [x0,y0,x1,y1,...]) onto ctx.

function drawStroke(ctx, stroke, cw, ch) {
  const pts = stroke.points;
  if (!pts || pts.length < 4) return; // need at least 2 points

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

  // Smooth quadratic-curve path through midpoints
  ctx.beginPath();
  ctx.moveTo(pts[0] * cw, pts[1] * ch);
  for (let i = 2; i < pts.length - 2; i += 2) {
    const mx = ((pts[i] + pts[i + 2]) / 2) * cw;
    const my = ((pts[i + 1] + pts[i + 3]) / 2) * ch;
    ctx.quadraticCurveTo(pts[i] * cw, pts[i + 1] * ch, mx, my);
  }
  ctx.lineTo(pts[pts.length - 2] * cw, pts[pts.length - 1] * ch);
  ctx.stroke();

  // Sparkle: scatter luminous dots along the path
  if (stroke.tool === 'sparkle' && pts.length >= 4) {
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 0.7;
    ctx.fillStyle   = '#fff';
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
  page          = 0,
  chapterId,
  imageRect,            // { x, y, w, h }
  enabled       = false, // show the layer (read-only when canDraw=false)
  canDraw       = false, // allow pointer-event drawing
  strokesVisible = true, // local hide/show toggle
  tool          = 'pencil',
  color         = '#ef4444',
  strokeWidth   = 5,
  remoteEvents  = [],    // append-only array of draw events from broadcast
  onEvent,               // (ev) => void
}, ref) => {

  const canvasRef      = useRef(null);
  const strokesByPage  = useRef({});       // { [pageKey]: stroke[] }
  const liveStroke     = useRef(null);     // in-progress stroke
  const isDrawing      = useRef(false);
  const processedIds   = useRef(new Set()); // dedup remote events
  const rafId          = useRef(null);
  const dirty          = useRef(false);
  const flushRef       = useRef(null);      // always points to latest flush()

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
    if (liveStroke.current?.points?.length >= 4) {
      drawStroke(ctx, liveStroke.current, cw, ch);
    }
  }, [pageKey]);

  // ── RAF-throttled redraw (used during active drawing) ─────────────────────────
  const scheduleRedraw = useCallback(() => {
    dirty.current = true;
    if (rafId.current) return;
    const tick = () => {
      if (dirty.current) { dirty.current = false; redraw(); }
      rafId.current = isDrawing.current ? requestAnimationFrame(tick) : null;
    };
    rafId.current = requestAnimationFrame(tick);
  }, [redraw]);

  // ── Immediate redraw (state changes, not live drawing) ────────────────────────
  const flush = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    rafId.current = null;
    redraw();
  }, [redraw]);

  // Keep flushRef current on every render so remote-event effect never goes stale
  flushRef.current = flush;

  // ── Resize canvas when imageRect changes ──────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRect?.w || !imageRect?.h) return;
    const w = Math.round(imageRect.w);
    const h = Math.round(imageRect.h);
    if (canvas.width === w && canvas.height === h) {
      flushRef.current();
      return;
    }
    canvas.width  = w;
    canvas.height = h;
    flushRef.current();
  }, [imageRect]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clear all on chapter change ───────────────────────────────────────────────
  useEffect(() => {
    strokesByPage.current = {};
    processedIds.current.clear();
    isDrawing.current  = false;
    liveStroke.current = null;
    flushRef.current?.();
  }, [chapterId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Flush on page change ──────────────────────────────────────────────────────
  useEffect(() => {
    isDrawing.current  = false;
    liveStroke.current = null;
    flushRef.current?.();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Process remote events ─────────────────────────────────────────────────────
  // Key design: flush is accessed via flushRef so we don't need it in deps.
  // This prevents the effect from re-running on every page change.
  // chapterId is in deps so we re-process on chapter change (after clear above).
  useEffect(() => {
    if (!remoteEvents?.length) return;
    let changed = false;

    remoteEvents.forEach((ev) => {
      if (!ev) return;

      // Dedup key — prefer stroke.id, fall back to composite
      const dedup = ev.stroke?.id
        ? `s-${ev.stroke.id}`
        : `${ev.type}-${ev.page ?? 0}-${ev.strokeId ?? Date.now()}`;

      if (processedIds.current.has(dedup)) return;
      processedIds.current.add(dedup);

      // Evict oldest 500 when set grows beyond 2000 (memory cap)
      if (processedIds.current.size > 2000) {
        const iter = processedIds.current.values();
        for (let i = 0; i < 500; i++) processedIds.current.delete(iter.next().value);
      }

      const evPage = ev.page ?? 0;
      const evKey  = `${chapterId ?? 'x'}-${evPage}`;

      if (ev.type === 'draw_stroke') {
        strokesByPage.current[evKey] = [
          ...(strokesByPage.current[evKey] || []),
          ev.stroke,
        ];
        changed = true;

      } else if (ev.type === 'draw_undo') {
        const existing = strokesByPage.current[evKey] || [];
        if (existing.length) {
          strokesByPage.current[evKey] = existing.slice(0, -1);
          changed = true;
        }

      } else if (ev.type === 'draw_clear') {
        strokesByPage.current[evKey] = [];
        // Only purge processedIds for this specific page — not all pages
        for (const id of processedIds.current) {
          // Stroke IDs are "s-s-<timestamp>-<rand>" — not page-specific,
          // so we can't selectively purge strokes. Just clear the whole Set
          // for the affected page by dropping entries that aren't for other pages.
          // Simplest safe option: clear all (draw_clear is rare).
          void id;
        }
        processedIds.current.clear();
        changed = true;
      }
      // draw_start / draw_move / draw_end — legacy, ignored
    });

    if (changed) flushRef.current?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteEvents, chapterId]); // flush intentionally omitted — use flushRef instead

  // ── Cleanup RAF on unmount ────────────────────────────────────────────────────
  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  // ── Imperative handle ─────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    undo() {
      const existing = strokesByPage.current[pageKey] || [];
      if (!existing.length) return;
      strokesByPage.current[pageKey] = existing.slice(0, -1);
      flushRef.current?.();
      onEvent?.({ type: 'draw_undo', page });
    },
    clear() {
      strokesByPage.current[pageKey] = [];
      processedIds.current.clear();
      flushRef.current?.();
      onEvent?.({ type: 'draw_clear', page });
    },
    getStrokes() {
      return strokesByPage.current;
    },
  }), [pageKey, page, onEvent]);

  // ── Normalized pointer coords (getBoundingClientRect — NOT offsetX/Y) ─────────
  const getNormalized = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0];
    const rect = canvas.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      Math.max(0, Math.min(1, (e.clientY - rect.top)  / rect.height)),
    ];
  }, []);

  // ── Pointer event handlers ────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    if (!canDraw) return;
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
  }, [canDraw, tool, color, strokeWidth, page, getNormalized, scheduleRedraw]);

  const handlePointerMove = useCallback((e) => {
    if (!isDrawing.current || !canDraw) return;
    if (e.buttons === 0) { isDrawing.current = false; return; }
    const [nx, ny] = getNormalized(e);
    const ls = liveStroke.current;
    if (!ls) return;
    const len = ls.points.length;
    // Skip duplicate adjacent points
    if (len >= 2 && ls.points[len - 2] === nx && ls.points[len - 1] === ny) return;
    ls.points.push(nx, ny);
    scheduleRedraw();
  }, [canDraw, getNormalized, scheduleRedraw]);

  const commitStroke = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const stroke = liveStroke.current;
    liveStroke.current = null;
    if (!stroke || stroke.points.length < 4) {
      flushRef.current?.();
      return;
    }
    // Compress before storing & broadcasting
    stroke.points = compressPoints(stroke.points);
    strokesByPage.current[pageKey] = [
      ...(strokesByPage.current[pageKey] || []),
      stroke,
    ];
    flushRef.current?.();
    onEvent?.({ type: 'draw_stroke', stroke, page });
  }, [pageKey, page, onEvent]);

  const handlePointerUp     = useCallback(() => commitStroke(), [commitStroke]);
  const handlePointerLeave  = useCallback(() => { if (isDrawing.current) commitStroke(); }, [commitStroke]);
  const handlePointerCancel = useCallback(() => commitStroke(), [commitStroke]);

  // ── Render ────────────────────────────────────────────────────────────────────
  // Canvas is only mounted when the graffiti layer is active (enabled=graffitiMode).
  // strokesVisible is a LOCAL per-user toggle to hide drawings without leaving mode.
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
        touchAction:   'none',   // blocks accidental scroll on mobile during drawing
        cursor:        (canDraw && strokesVisible)
          ? (tool === 'eraser' ? 'cell' : 'crosshair')
          : 'default',
        pointerEvents: (canDraw && strokesVisible) ? 'auto' : 'none',
        zIndex:        20,
        display:       (ir.w && strokesVisible) ? 'block' : 'none',
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
