import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eraser, Trash2, ZoomIn, ZoomOut, Home, Users, Trophy, Tv2 } from 'lucide-react';
import { client } from '../../../services/colyseusClient';
import { useAuthContext } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_W    = 128;
const CANVAS_H    = 128;
const ZOOM_MIN    = 1;
const ZOOM_MAX    = 24;
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
    const [room, setRoom]         = useState(null);
    const [state, setState]       = useState(null);
    const [connecting, setConnect] = useState(true);
    const [tick, setTick]         = useState(0);
    const stateRef                = useRef(null); // mutable ref for canvas draw

    // ── Canvas ──────────────────────────────────────────────────────────────
    const canvasRef   = useRef(null);
    const containerRef = useRef(null);

    // zoom / pan as both refs (for draw) and state (for re-render trigger)
    const zoomRef = useRef(4);
    const panRef  = useRef({ x: 0, y: 0 });
    const [zoom, _setZoom] = useState(4);
    const [pan,  _setPan]  = useState({ x: 0, y: 0 });

    function setZoom(z) { zoomRef.current = z; _setZoom(z); }
    function setPan(p)  { panRef.current  = p; _setPan(p);  }

    // ── Interaction ─────────────────────────────────────────────────────────
    const [selectedColor, setSelectedColor] = useState('#8b5cf6');
    const [isEraser,      setIsEraser]      = useState(false);
    const [hoverPos,      setHoverPos]      = useState(null);  // { x, y } virtual
    const [tooltip,       setTooltip]       = useState(null);  // { sx, sy, text }
    const [cooldownUntil, setCooldown]      = useState(0);
    const [onlineCount,   setOnlineCount]   = useState(0);

    // pointer tracking
    const isDragging      = useRef(false);
    const dragMoved       = useRef(false);
    const lastPointer     = useRef({ x: 0, y: 0 });
    const lastPinchDist   = useRef(0);
    const canvasInitialized = useRef(false);

    // ── Colyseus connection ──────────────────────────────────────────────────
    useEffect(() => {
        let mounted  = true;
        let activeRoom = null;

        const join = async () => {
            try {
                const r = await client.joinOrCreate('pixel-galaxy', {
                    name:     profile?.username || user?.email?.split('@')[0] || 'Anon',
                    avatar:   profile?.avatar_url || '/default-avatar.png',
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
                    setState(s);
                    setTick(t => t + 1);
                    setOnlineCount(s.players ? [...s.players.keys()].length : 0);
                });

                r.onLeave(() => console.log('[PixelGalaxy] left room'));
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
        const canvas    = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const w = container.clientWidth  || 500;
        const h = container.clientHeight || 500;
        canvas.width  = w;
        canvas.height = h;

        const fitZ = Math.max(ZOOM_MIN, Math.min(8, Math.floor(Math.min(w, h) / CANVAS_W * 0.82)));
        const px   = (w - CANVAS_W * fitZ) / 2;
        const py   = (h - CANVAS_H * fitZ) / 2;
        setZoom(fitZ);
        setPan({ x: px, y: py });

        canvasInitialized.current = true;
    });

    // ── Canvas draw ──────────────────────────────────────────────────────────
    useEffect(() => {
        draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tick, zoom, pan, hoverPos, selectedColor, isEraser, cooldownUntil]);

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
            ctx.lineWidth   = 1 / zoomRef.current;
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
            ctx.fillStyle   = isEraser ? '#ff3333' : selectedColor;
            ctx.fillRect(hp.x, hp.y, 1, 1);
            ctx.globalAlpha = 1;
            // cursor outline
            ctx.strokeStyle = isEraser ? 'rgba(255,80,80,0.7)' : 'rgba(255,255,255,0.65)';
            ctx.lineWidth   = 1.5 / zoomRef.current;
            ctx.strokeRect(hp.x, hp.y, 1, 1);
        }

        // ── Canvas border glow ───────────────────────────────────────────────
        ctx.strokeStyle = 'rgba(108,92,231,0.4)';
        ctx.lineWidth   = 2 / zoomRef.current;
        ctx.strokeRect(-0.5, -0.5, CANVAS_W + 1, CANVAS_H + 1);

        ctx.restore();
    }, [hoverPos, selectedColor, isEraser, cooldownUntil]);

    // ── Coordinate helpers ───────────────────────────────────────────────────
    const screenToVirtual = useCallback((clientX, clientY) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return null;
        // Account for CSS ↔ canvas pixel ratio
        const sx = canvasRef.current.width  / rect.width;
        const sy = canvasRef.current.height / rect.height;
        const dx = (clientX - rect.left) * sx;
        const dy = (clientY - rect.top)  * sy;
        return {
            x: Math.floor((dx - panRef.current.x) / zoomRef.current),
            y: Math.floor((dy - panRef.current.y) / zoomRef.current),
        };
    }, []);

    const applyZoomToward = useCallback((delta, cx, cy) => {
        const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomRef.current * delta));
        const ratio   = newZoom / zoomRef.current;
        const newPan  = {
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
        isDragging.current  = true;
        dragMoved.current   = false;
        lastPointer.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
        const v = screenToVirtual(e.clientX, e.clientY);
        setHoverPos(v);

        // Tooltip: look up pixel owner
        if (v && stateRef.current?.pixels) {
            const key    = `${v.x}_${v.y}`;
            const pixel  = stateRef.current.pixels.get(key);
            if (pixel) {
                const player = stateRef.current.players?.get(pixel.userId);
                setTooltip({ sx: e.clientX, sy: e.clientY, text: `@${player?.name || '?'}` });
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

    const handleWheel = (e) => {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const cx = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
        const cy = (e.clientY - rect.top)  * (canvasRef.current.height / rect.height);
        applyZoomToward(e.deltaY > 0 ? 0.85 : 1.15, cx, cy);
    };

    // ── Touch events ─────────────────────────────────────────────────────────
    const handleTouchStart = (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            const t = e.touches[0];
            isDragging.current  = true;
            dragMoved.current   = false;
            lastPointer.current = { x: t.clientX, y: t.clientY };
        } else if (e.touches.length === 2) {
            isDragging.current    = false;
            lastPinchDist.current = pinchDist(e.touches);
        }
    };

    const handleTouchMove = (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && isDragging.current) {
            const t  = e.touches[0];
            const dx = t.clientX - lastPointer.current.x;
            const dy = t.clientY - lastPointer.current.y;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved.current = true;
            const newPan = { x: panRef.current.x + dx, y: panRef.current.y + dy };
            panRef.current = newPan;
            _setPan(newPan);
            lastPointer.current = { x: t.clientX, y: t.clientY };
        } else if (e.touches.length === 2) {
            const dist  = pinchDist(e.touches);
            const delta = lastPinchDist.current ? dist / lastPinchDist.current : 1;
            lastPinchDist.current = dist;
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const rect  = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;
            const cx = (midX - rect.left) * (canvasRef.current.width  / rect.width);
            const cy = (midY - rect.top)  * (canvasRef.current.height / rect.height);
            applyZoomToward(delta, cx, cy);
        }
    };

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
    const zoomIn  = () => { const nz = Math.min(ZOOM_MAX, zoomRef.current + (zoomRef.current < 4 ? 1 : 2)); setZoom(nz); };
    const zoomOut = () => { const nz = Math.max(ZOOM_MIN, zoomRef.current - (zoomRef.current <= 4 ? 1 : 2)); setZoom(nz); };
    const resetView = () => {
        const canvas    = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const w  = canvas.width;
        const h  = canvas.height;
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

    // ── Leaderboard ──────────────────────────────────────────────────────────
    const leaderboard = state.players
        ? [...state.players.entries()]
            .map(([sid, p]) => ({ ...p, sid }))
            .sort((a, b) => b.contributions - a.contributions)
            .slice(0, 8)
        : [];

    return (
        <div className="flex-1 flex flex-col bg-[#02020a] text-white overflow-hidden min-h-0">

            {/* ── Header ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/30 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-base select-none">
                        ✦
                    </div>
                    <div>
                        <h2 className="text-[11px] font-black uppercase tracking-widest leading-none">Pixel Galaxy</h2>
                        <p className="text-[8px] text-white/30 uppercase tracking-widest mt-0.5">
                            {state.totalPixels} píxeles · {onlineCount} en línea · Sala: {roomName}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {onToggleTheater && (
                        <button onClick={onToggleTheater} className="p-2 text-white/20 hover:text-white transition-colors">
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
                        onWheel={handleWheel}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        className="absolute inset-0 w-full h-full"
                        style={{ touchAction: 'none', userSelect: 'none' }}
                    />

                    {/* Pixel tooltip */}
                    <AnimatePresence>
                        {tooltip && (
                            <motion.div
                                key="tooltip"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed z-50 pointer-events-none bg-black/80 border border-white/15 rounded-lg px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur-md"
                                style={{ left: tooltip.sx + 14, top: tooltip.sy - 32 }}
                            >
                                {tooltip.text}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Cooldown overlay flash */}
                    <AnimatePresence>
                        {onCooldown && (
                            <motion.div
                                key="cd"
                                initial={{ opacity: 0.3 }}
                                animate={{ opacity: 0 }}
                                transition={{ duration: 1 }}
                                className="absolute inset-0 pointer-events-none border-2 border-purple-500/50 rounded"
                            />
                        )}
                    </AnimatePresence>

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

                {/* ── Sidebar (theater mode) ── */}
                {isTheater && (
                    <div className="w-56 xl:w-64 flex-shrink-0 border-l border-white/5 bg-black/30 flex flex-col overflow-hidden">

                        {/* Color palette */}
                        <div className="flex-shrink-0 p-3 border-b border-white/5">
                            <p className="text-[7px] font-black uppercase tracking-widest text-white/25 mb-2">Paleta Galáctica</p>
                            <div className="grid grid-cols-6 gap-1">
                                {PALETTE.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => { setSelectedColor(color); setIsEraser(false); }}
                                        style={{ backgroundColor: color }}
                                        className={`aspect-square rounded-md border transition-all ${
                                            selectedColor === color && !isEraser
                                                ? 'border-white scale-110 shadow-lg'
                                                : 'border-white/10 hover:scale-105 hover:border-white/30'
                                        }`}
                                    />
                                ))}
                            </div>
                            {/* Current color + tools */}
                            <div className="flex items-center gap-2 mt-2">
                                <div
                                    style={{ backgroundColor: selectedColor }}
                                    className="w-7 h-7 rounded-lg border border-white/20 flex-shrink-0 shadow-inner"
                                />
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest flex-1">
                                    {selectedColor}
                                </span>
                                <button
                                    onClick={() => setIsEraser(e => !e)}
                                    className={`p-1.5 rounded-lg border transition-all ${
                                        isEraser
                                            ? 'bg-red-500/20 border-red-500/40 text-red-400'
                                            : 'bg-white/5 border-white/10 text-white/30 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <Eraser size={12} />
                                </button>
                                <button
                                    onClick={handleClearMine}
                                    className="p-1.5 rounded-lg border bg-white/5 border-white/10 text-white/30 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
                                    title="Borrar todos mis píxeles"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>

                        {/* Leaderboard */}
                        <div className="flex-1 overflow-y-auto p-3">
                            <p className="text-[7px] font-black uppercase tracking-widest text-white/25 mb-2 flex items-center gap-1.5">
                                <Trophy size={9} /> Constructores
                            </p>
                            <div className="space-y-1.5">
                                {leaderboard.length === 0 && (
                                    <p className="text-[8px] text-white/15 uppercase tracking-widest">Sin datos aún</p>
                                )}
                                {leaderboard.map((p, i) => (
                                    <div key={p.id} className="flex items-center gap-2">
                                        <span className={`text-[8px] font-black w-4 text-right flex-shrink-0 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-stone-300' : i === 2 ? 'text-amber-700' : 'text-white/20'}`}>
                                            {i + 1}
                                        </span>
                                        <img
                                            src={p.avatar || '/default_user_blank.png'}
                                            className="w-5 h-5 rounded-full flex-shrink-0"
                                            alt=""
                                        />
                                        <p className="text-[9px] font-black text-white/70 truncate flex-1 min-w-0">
                                            @{p.name}
                                        </p>
                                        <span className="text-[8px] font-black text-purple-400 flex-shrink-0">
                                            {p.contributions}px
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Online players */}
                            <p className="text-[7px] font-black uppercase tracking-widest text-white/25 mt-4 mb-2 flex items-center gap-1.5">
                                <Users size={9} /> En línea
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {state.players && [...state.players.values()].map((p) => (
                                    <div key={p.id} className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-1.5 py-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span className="text-[7px] font-black text-white/50">{p.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
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
                    className={`w-8 h-8 rounded-lg border-2 flex-shrink-0 transition-all ${
                        expanded ? 'border-white scale-110' : 'border-white/30 hover:border-white/60'
                    }`}
                />

                {/* Quick palette (6 colors) */}
                <div className="flex gap-1 overflow-x-auto scrollbar-none">
                    {PALETTE.slice(0, 12).map((color) => (
                        <button
                            key={color}
                            onClick={() => { setSelectedColor(color); setIsEraser(false); }}
                            style={{ backgroundColor: color }}
                            className={`w-6 h-6 flex-shrink-0 rounded border transition-all ${
                                selectedColor === color && !isEraser
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
                        className={`p-2 rounded-lg border transition-all ${
                            isEraser
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
                                    className={`aspect-square rounded border transition-all ${
                                        selectedColor === color && !isEraser
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
