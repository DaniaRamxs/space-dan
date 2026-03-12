import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eraser, Trash2, ZoomIn, ZoomOut, Home, Users, Trophy, Tv2, Menu, Palette } from 'lucide-react';
import { client } from '../../../services/colyseusClient';
import { useAuthContext } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_W = 128;
const CANVAS_H = 128;
const ZOOM_MIN = 1;
const ZOOM_MAX = 24;
const COOLDOWN_MS = 1000;

const PALETTE = [
    // Deep space
    '#000000', '#0d0d1a', '#1a0a2e', '#0a1628', '#0d1117', '#1e1e3a',
    // Stars / warm light
    '#ffffff', '#f8f9ff', '#ffeaa7', '#ffd700', '#ffb347', '#ff8c69',
    // Nebula purple / pink
    '#6c5ce7', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#ff6b6b',
    // Cosmic blue / cyan
    '#1d4ed8', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981',
    // Terrestrial accent
    '#65a30d', '#eab308', '#f97316', '#ef4444', '#374151', '#6b7280',
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function PixelGalaxyGame({ roomName, onClose, isTheater, onToggleTheater }) {
    const { user, profile } = useAuthContext();

    // ── Colyseus ────────────────────────────────────────────────────────────
    const [room, setRoom] = useState(null);
    const [state, setState] = useState(null);
    const [connecting, setConnect] = useState(true);
    // stateRef: espejo mutable para el loop de render del canvas (evita stale closures)
    const stateRef = useRef(null);

    // ── Canvas ──────────────────────────────────────────────────────────────
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    // zoom / pan as both refs (for draw) and state (for re-render trigger)
    const zoomRef = useRef(4);
    const panRef = useRef({ x: 0, y: 0 });
    const [zoom, _setZoom] = useState(4);
    const [pan, _setPan] = useState({ x: 0, y: 0 });

    function setZoom(z) { zoomRef.current = z; _setZoom(z); }
    function setPan(p) { panRef.current = p; _setPan(p); }

    // ── Interaction ─────────────────────────────────────────────────────────
    const [selectedColor, setSelectedColor] = useState('#8b5cf6');
    const [isEraser, setIsEraser] = useState(false);
    const [hoverPos, setHoverPos] = useState(null);  // { x, y } virtual
    const [tooltip, setTooltip] = useState(null);  // { sx, sy, text }
    const [cooldownUntil, setCooldown] = useState(0);
    const [onlineCount, setOnlineCount] = useState(0);
    const [menuOpen, setMenuOpen] = useState(window.innerWidth > 768); // Open by default on desktop

    // pointer tracking
    const isDragging = useRef(false);
    const dragMoved = useRef(false);
    const lastPointer = useRef({ x: 0, y: 0 });
    const lastPinchDist = useRef(0);
    const canvasInitialized = useRef(false);

    // ── Colyseus connection ──────────────────────────────────────────────────
    useEffect(() => {
        let mounted = true;
        let activeRoom = null;

        const join = async () => {
            try {
                const r = await client.joinOrCreate('pixel-galaxy', {
                    userId: user?.id,
                    name: profile?.username || user?.email?.split('@')[0] || 'Anon',
                    avatar: profile?.avatar_url || '/default-avatar.png',
                    roomName,
                });
                if (!mounted) { r.leave(); return; }
                activeRoom = r;
                setRoom(r);
                stateRef.current = r.state;
                setState(r.state);
                setConnect(false);

                r.onStateChange((s) => {
                    if (!mounted) return;
                    stateRef.current = s;
                    setState({ ...s });
                    setOnlineCount(s.players ? [...s.players.keys()].length : 0);
                });

                // Escuchar mensajes de error desde el servidor
                r.onMessage('save_error', (msg) => {
                    toast.error('Error al guardar píxel: ' + (msg.error || 'Desconocido'), { duration: 3000 });
                });
            } catch (e) {
                if (!mounted) return;
                console.error('[PixelGalaxy] error', e);
                toast.error('Error conectando al servidor');
                onClose();
            }
        };

        join();
        return () => { mounted = false; if (activeRoom) activeRoom.leave(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Initialize canvas size + zoom/pan on mount ───────────────────────────
    useEffect(() => {
        if (canvasInitialized.current) return;
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const w = container.clientWidth || 500;
        const h = container.clientHeight || 500;
        canvas.width = w;
        canvas.height = h;

        const fitZ = Math.max(ZOOM_MIN, Math.min(8, Math.floor(Math.min(w, h) / CANVAS_W * 0.82)));
        const px = (w - CANVAS_W * fitZ) / 2;
        const py = (h - CANVAS_H * fitZ) / 2;
        setZoom(fitZ);
        setPan({ x: px, y: py });

        canvasInitialized.current = true;
    });

    // ── Canvas draw ──────────────────────────────────────────────────────────
    useEffect(() => {
        draw();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state, zoom, pan, hoverPos, selectedColor, isEraser, cooldownUntil]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !canvas.width) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        // ── Background: deep space gradient ─────────────────────────────────
        const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.sqrt(W * W + H * H) / 2);
        grad.addColorStop(0, '#0c0c2a');
        grad.addColorStop(1, '#02020a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // ambient star dots in background
        const starSeed = [17, 43, 89, 137, 251, 317, 401, 503, 613, 709, 811, 907];
        for (let i = 0; i < 60; i++) {
            const sx = ((starSeed[i % 12] * (i + 7) * 1234567) % W + W) % W;
            const sy = ((starSeed[i % 12] * (i + 13) * 9876543) % H + H) % H;
            const alpha = 0.1 + (i % 5) * 0.04;
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.fillRect(sx, sy, 1, 1);
        }

        // ── Transform: zoom + pan ────────────────────────────────────────────
        ctx.save();
        ctx.translate(panRef.current.x, panRef.current.y);
        ctx.scale(zoomRef.current, zoomRef.current);
        ctx.imageSmoothingEnabled = false;

        // virtual canvas background
        ctx.fillStyle = '#02020a';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // ── Pixels ───────────────────────────────────────────────────────────
        const s = stateRef.current;
        if (s?.pixels) {
            s.pixels.forEach((pixel) => {
                ctx.fillStyle = pixel.color;
                ctx.fillRect(pixel.x, pixel.y, 1, 1);
            });
        }

        // ── Grid lines at high zoom ──────────────────────────────────────────
        if (zoomRef.current >= 8) {
            ctx.strokeStyle = 'rgba(255,255,255,0.035)';
            ctx.lineWidth = 1 / zoomRef.current;
            for (let x = 0; x <= CANVAS_W; x++) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
            }
            for (let y = 0; y <= CANVAS_H; y++) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
            }
        }

        // ── Hover preview ────────────────────────────────────────────────────
        const hp = hoverPos;
        if (hp && hp.x >= 0 && hp.x < CANVAS_W && hp.y >= 0 && hp.y < CANVAS_H) {
            const onCd = Date.now() < cooldownUntil;
            ctx.globalAlpha = onCd ? 0.2 : 0.65;
            ctx.fillStyle = isEraser ? '#ff3333' : selectedColor;
            ctx.fillRect(hp.x, hp.y, 1, 1);
            ctx.globalAlpha = 1;
            // cursor outline
            ctx.strokeStyle = isEraser ? 'rgba(255,80,80,0.7)' : 'rgba(255,255,255,0.65)';
            ctx.lineWidth = 1.5 / zoomRef.current;
            ctx.strokeRect(hp.x, hp.y, 1, 1);
        }

        // ── Canvas border glow ───────────────────────────────────────────────
        ctx.strokeStyle = 'rgba(108,92,231,0.4)';
        ctx.lineWidth = 2 / zoomRef.current;
        ctx.strokeRect(-0.5, -0.5, CANVAS_W + 1, CANVAS_H + 1);

        ctx.restore();
    }, [hoverPos, selectedColor, isEraser, cooldownUntil]);

    // ── Coordinate helpers ───────────────────────────────────────────────────
    const screenToVirtual = useCallback((clientX, clientY) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return null;
        // Account for CSS ↔ canvas pixel ratio
        const sx = canvasRef.current.width / rect.width;
        const sy = canvasRef.current.height / rect.height;
        const dx = (clientX - rect.left) * sx;
        const dy = (clientY - rect.top) * sy;
        return {
            x: Math.floor((dx - panRef.current.x) / zoomRef.current),
            y: Math.floor((dy - panRef.current.y) / zoomRef.current),
        };
    }, []);

    const applyZoomToward = useCallback((delta, cx, cy) => {
        const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomRef.current * delta));
        const ratio = newZoom / zoomRef.current;
        const newPan = {
            x: cx - (cx - panRef.current.x) * ratio,
            y: cy - (cy - panRef.current.y) * ratio,
        };
        setZoom(newZoom);
        setPan(newPan);
    }, []);

    // ── Pixel action ─────────────────────────────────────────────────────────
    const placeOrErase = useCallback((clientX, clientY) => {
        if (!room) return;
        if (Date.now() < cooldownUntil) {
            toast.error('Cooldown activo — espera 1 segundo', { id: 'cd', duration: 600 });
            return;
        }
        const v = screenToVirtual(clientX, clientY);
        if (!v || v.x < 0 || v.x >= CANVAS_W || v.y < 0 || v.y >= CANVAS_H) return;

        if (isEraser) {
            room.send('remove_pixel', { x: v.x, y: v.y });
        } else {
            room.send('place_pixel', { x: v.x, y: v.y, color: selectedColor });
        }
        setCooldown(Date.now() + COOLDOWN_MS);
    }, [room, cooldownUntil, isEraser, selectedColor, screenToVirtual]);

    // ── Mouse events ─────────────────────────────────────────────────────────
    const handleMouseDown = (e) => {
        if (e.button !== 0) return;
        isDragging.current = true;
        dragMoved.current = false;
        lastPointer.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
        const v = screenToVirtual(e.clientX, e.clientY);
        setHoverPos(v);

        // Tooltip: look up pixel owner
        if (v && stateRef.current?.pixels) {
            const key = `${v.x}_${v.y}`;
            const pixel = stateRef.current.pixels.get(key);
            if (pixel) {
                setTooltip({ sx: e.clientX, sy: e.clientY, text: `@${pixel.username || '?'}` });
            } else {
                setTooltip(null);
            }
        } else {
            setTooltip(null);
        }

        if (!isDragging.current) return;
        const dx = e.clientX - lastPointer.current.x;
        const dy = e.clientY - lastPointer.current.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved.current = true;
        const newPan = { x: panRef.current.x + dx, y: panRef.current.y + dy };
        panRef.current = newPan;
        _setPan(newPan);
        lastPointer.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = (e) => {
        if (e.button !== 0) return;
        if (isDragging.current && !dragMoved.current) {
            placeOrErase(e.clientX, e.clientY);
        }
        isDragging.current = false;
    };

    const handleMouseLeave = () => { setHoverPos(null); setTooltip(null); };

    const handleWheelRef = useRef(null);
    handleWheelRef.current = (e) => {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const cx = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
        const cy = (e.clientY - rect.top) * (canvasRef.current.height / rect.height);
        applyZoomToward(e.deltaY > 0 ? 0.85 : 1.15, cx, cy);
    };

    const handleTouchStartRef = useRef(null);
    handleTouchStartRef.current = (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            const t = e.touches[0];
            isDragging.current = true;
            dragMoved.current = false;
            lastPointer.current = { x: t.clientX, y: t.clientY };
        } else if (e.touches.length === 2) {
            isDragging.current = false;
            lastPinchDist.current = pinchDist(e.touches);
        }
    };

    const handleTouchMoveRef = useRef(null);
    handleTouchMoveRef.current = (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && isDragging.current) {
            const t = e.touches[0];
            const dx = t.clientX - lastPointer.current.x;
            const dy = t.clientY - lastPointer.current.y;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved.current = true;
            const newPan = { x: panRef.current.x + dx, y: panRef.current.y + dy };
            panRef.current = newPan;
            _setPan(newPan);
            lastPointer.current = { x: t.clientX, y: t.clientY };
            
            // Actualizar hover position en touch para preview
            const v = screenToVirtual(t.clientX, t.clientY);
            setHoverPos(v);
        } else if (e.touches.length === 2) {
            const dist = pinchDist(e.touches);
            const delta = lastPinchDist.current ? dist / lastPinchDist.current : 1;
            lastPinchDist.current = dist;
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;
            const cx = (midX - rect.left) * (canvasRef.current.width / rect.width);
            const cy = (midY - rect.top) * (canvasRef.current.height / rect.height);
            applyZoomToward(delta, cx, cy);
        }
    };

    // Attach wheel + touch listeners natively with { passive: false } to allow preventDefault
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const onWheel = (e) => handleWheelRef.current?.(e);
        const onTouchStart = (e) => handleTouchStartRef.current?.(e);
        const onTouchMove = (e) => handleTouchMoveRef.current?.(e);
        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        return () => {
            canvas.removeEventListener('wheel', onWheel);
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchmove', onTouchMove);
        };
    }, []);

    // ── Touch end (React prop is fine — no preventDefault needed) ────────────
    const handleTouchEnd = (e) => {
        if (e.changedTouches.length === 1 && !dragMoved.current && isDragging.current) {
            const t = e.changedTouches[0];
            placeOrErase(t.clientX, t.clientY);
        }
        isDragging.current = false;
    };

    function pinchDist(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // ── Zoom button helpers ───────────────────────────────────────────────────
    const zoomIn = () => { const nz = Math.min(ZOOM_MAX, zoomRef.current + (zoomRef.current < 4 ? 1 : 2)); setZoom(nz); };
    const zoomOut = () => { const nz = Math.max(ZOOM_MIN, zoomRef.current - (zoomRef.current <= 4 ? 1 : 2)); setZoom(nz); };
    const resetView = () => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const w = canvas.width;
        const h = canvas.height;
        const fz = Math.max(ZOOM_MIN, Math.min(8, Math.floor(Math.min(w, h) / CANVAS_W * 0.82)));
        setZoom(fz);
        setPan({ x: (w - CANVAS_W * fz) / 2, y: (h - CANVAS_H * fz) / 2 });
    };

    const handleClearMine = () => {
        if (!room) return;
        room.send('clear_mine');
        toast.success('Tus píxeles eliminados');
    };

    const onCooldown = Date.now() < cooldownUntil;

    // ── Loading state ────────────────────────────────────────────────────────
    if (connecting || !state || !room) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#02020a]">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 animate-pulse">
                    Cargando la galaxia...
                </p>
            </div>
        );
    }

    // Leaderboard desde el estado persistente de Colyseus
    const leaderboard = state.leaderboard
        ? [...state.leaderboard.entries()]
            .map(([userId, stats]) => ({ ...stats, userId }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8)
        : [];

    return (
        <div className="flex-1 flex flex-col bg-[#02020a] text-white overflow-hidden min-h-0">

            {/* ── Header ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/30 backdrop-blur-md z-50">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className={`p-2 rounded-xl transition-all ${menuOpen ? 'bg-purple-500/20 text-purple-400' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Menu size={20} />
                    </button>
                    <div>
                        <h2 className="text-[11px] font-black uppercase tracking-widest leading-none">Pixel Galaxy</h2>
                        <p className="text-[8px] text-white/30 uppercase tracking-widest mt-0.5">
                            {state.totalPixels} píxeles · {onlineCount} en línea
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {onToggleTheater && (
                        <button onClick={onToggleTheater} className="p-2 text-white/20 hover:text-white transition-colors" title="Modo Cine">
                            <Tv2 size={16} />
                        </button>
                    )}
                    <button onClick={onClose} className="p-2 text-white/20 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* ── Main area ── */}
            <div className="flex-1 flex overflow-hidden min-h-0">

                {/* Canvas container */}
                <div
                    ref={containerRef}
                    className="flex-1 relative overflow-hidden"
                    style={{ cursor: isDragging.current ? 'grabbing' : (isEraser ? 'crosshair' : 'cell') }}
                >
                    <canvas
                        ref={canvasRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onTouchEnd={handleTouchEnd}
                        className="absolute inset-0 w-full h-full"
                        style={{ touchAction: 'none', userSelect: 'none' }}
                    />

                    {/* Pixel tooltip */}
                    {tooltip && (
                        <div
                            className="fixed z-50 pointer-events-none bg-black/80 border border-white/15 rounded-lg px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur-md transition-opacity duration-150"
                            style={{ left: tooltip.sx + 14, top: tooltip.sy - 32 }}
                        >
                            {tooltip.text}
                        </div>
                    )}

                    {/* Cooldown overlay flash */}
                    {onCooldown && (
                        <div
                            className="absolute inset-0 pointer-events-none border-2 border-purple-500/50 rounded animate-fade-out"
                        />
                    )}

                    {/* Floating zoom controls */}
                    <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-20">
                        <button
                            onClick={zoomIn}
                            className="w-8 h-8 rounded-xl bg-black/60 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all backdrop-blur-md"
                        >
                            <ZoomIn size={14} />
                        </button>
                        <button
                            onClick={resetView}
                            className="w-8 h-8 rounded-xl bg-black/60 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all backdrop-blur-md"
                        >
                            <Home size={12} />
                        </button>
                        <button
                            onClick={zoomOut}
                            className="w-8 h-8 rounded-xl bg-black/60 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all backdrop-blur-md"
                        >
                            <ZoomOut size={14} />
                        </button>
                    </div>

                    {/* Zoom level badge */}
                    <div className="absolute bottom-3 left-3 z-20">
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 bg-black/60 border border-white/10 rounded-full text-white/30 backdrop-blur-md">
                            {Math.round(zoom)}×
                        </span>
                    </div>
                </div>

                {/* ── Sidebar (Menu) ── */}
                <AnimatePresence>
                    {menuOpen && (
                        <motion.div
                            initial={{ width: 0, opacity: 0, x: 20 }}
                            animate={{ width: window.innerWidth > 768 ? (isTheater ? 256 : 240) : '100%', opacity: 1, x: 0 }}
                            exit={{ width: 0, opacity: 0, x: 20 }}
                            className={`flex-shrink-0 border-l border-white/5 bg-black/40 backdrop-blur-2xl flex flex-col overflow-hidden z-40 ${window.innerWidth <= 768 ? 'absolute inset-y-0 right-0' : 'relative'}`}
                        >
                            {/* Color palette */}
                            <div className="flex-shrink-0 p-4 border-b border-white/5">
                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/25 mb-4 flex items-center gap-2">
                                    <Palette size={10} /> Paleta Galáctica
                                </p>
                                <div className="grid grid-cols-6 gap-2">
                                    {PALETTE.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => { setSelectedColor(color); setIsEraser(false); if (window.innerWidth <= 768) setMenuOpen(false); }}
                                            style={{ backgroundColor: color }}
                                            className={`aspect-square rounded-lg border-2 transition-all ${selectedColor === color && !isEraser
                                                ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                                                : 'border-white/5 hover:border-white/20'
                                                }`}
                                        />
                                    ))}
                                </div>

                                {/* Current color + tools */}
                                <div className="flex items-center gap-3 mt-5 p-2 bg-white/5 rounded-2xl border border-white/5">
                                    <div
                                        style={{ backgroundColor: selectedColor }}
                                        className="w-8 h-8 rounded-xl border border-white/10 flex-shrink-0 shadow-lg"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[7px] font-black text-white/20 uppercase tracking-widest">Color Actual</p>
                                        <p className="text-[9px] font-black text-white/60 uppercase font-mono">{selectedColor}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setIsEraser(e => !e)}
                                            className={`p-2 rounded-xl border transition-all ${isEraser
                                                ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                                                : 'bg-white/5 border-white/10 text-white/30 hover:text-white hover:bg-white/10'
                                                }`}
                                            title="Borrador"
                                        >
                                            <Eraser size={14} />
                                        </button>
                                        <button
                                            onClick={() => { handleClearMine(); setMenuOpen(false); }}
                                            className="p-2 rounded-xl border bg-white/5 border-white/10 text-white/30 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all"
                                            title="Limpiar mis píxeles"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Leaderboard */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
                                <div>
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/25 mb-4 flex items-center gap-2">
                                        <Trophy size={10} className="text-amber-400" /> Top Constructores
                                    </p>
                                    <div className="space-y-2">
                                        {leaderboard.length === 0 && (
                                            <p className="text-[9px] text-white/10 uppercase tracking-widest italic py-4 text-center">Iniciando registro...</p>
                                        )}
                                        {leaderboard.map((p, i) => (
                                            <div key={p.userId || i} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                                <span className={`text-[9px] font-black w-4 text-center ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-stone-300' : i === 2 ? 'text-amber-700' : 'text-white/20'}`}>
                                                    {i + 1}
                                                </span>
                                                <img
                                                    src={p.avatar || '/default_user_blank.png'}
                                                    className="w-6 h-6 rounded-lg border border-white/10 flex-shrink-0"
                                                    alt=""
                                                />
                                                <p className="text-[10px] font-black text-white/80 truncate flex-1 min-w-0">@{p.username}</p>
                                                <span className="text-[9px] font-black text-purple-400">
                                                    {p.count}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Online players */}
                                <div>
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/25 mb-3 flex items-center gap-2">
                                        <Users size={10} /> Pilotos Activos ({onlineCount})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {state.players && [...state.players.values()].map((p) => (
                                            <div key={p.id} className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-lg px-2 py-1">
                                                <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                                <span className="text-[9px] font-black text-white/40 uppercase tracking-tighter">{p.username}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer hint */}
                            <div className="p-4 border-t border-white/5">
                                <p className="text-[7px] text-white/10 uppercase tracking-[0.3em] text-center font-black">
                                    Modo: {roomName.toUpperCase()}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Bottom toolbar (compact, non-theater) ── */}
            {!isTheater && (
                <BottomToolbar
                    selectedColor={selectedColor}
                    setSelectedColor={setSelectedColor}
                    isEraser={isEraser}
                    setIsEraser={setIsEraser}
                    onClearMine={handleClearMine}
                    onCooldown={onCooldown}
                />
            )}
        </div>
    );
}

// ─── BottomToolbar ────────────────────────────────────────────────────────────

function BottomToolbar({ selectedColor, setSelectedColor, isEraser, setIsEraser, onClearMine, onCooldown }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="flex-shrink-0 border-t border-white/5 bg-black/40 backdrop-blur-md">
            {/* Compact row */}
            <div className="flex items-center gap-2 px-3 py-2">
                {/* Selected color swatch + expand */}
                <button
                    onClick={() => setExpanded(e => !e)}
                    style={{ backgroundColor: selectedColor }}
                    className={`w-8 h-8 rounded-lg border-2 flex-shrink-0 transition-all ${expanded ? 'border-white scale-110' : 'border-white/30 hover:border-white/60'
                        }`}
                />

                {/* Quick palette (6 colors) */}
                <div className="flex gap-1 overflow-x-auto scrollbar-none">
                    {PALETTE.slice(0, 12).map((color) => (
                        <button
                            key={color}
                            onClick={() => { setSelectedColor(color); setIsEraser(false); }}
                            style={{ backgroundColor: color }}
                            className={`w-6 h-6 flex-shrink-0 rounded border transition-all ${selectedColor === color && !isEraser
                                ? 'border-white scale-110'
                                : 'border-white/15 hover:scale-105'
                                }`}
                        />
                    ))}
                </div>

                {/* Tools */}
                <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                    <button
                        onClick={() => setIsEraser(e => !e)}
                        className={`p-2 rounded-lg border transition-all ${isEraser
                            ? 'bg-red-500/20 border-red-500/40 text-red-400'
                            : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                            }`}
                    >
                        <Eraser size={14} />
                    </button>
                    <button
                        onClick={onClearMine}
                        className="p-2 rounded-lg border bg-white/5 border-white/10 text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>

                {/* Cooldown dot */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${onCooldown ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
            </div>

            {/* Expanded full palette */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-10 gap-1.5 px-3 pb-3">
                            {PALETTE.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => { setSelectedColor(color); setIsEraser(false); setExpanded(false); }}
                                    style={{ backgroundColor: color }}
                                    className={`aspect-square rounded border transition-all ${selectedColor === color && !isEraser
                                        ? 'border-white scale-110 shadow-md'
                                        : 'border-white/10 hover:scale-105 hover:border-white/30'
                                        }`}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
