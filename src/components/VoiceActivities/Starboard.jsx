import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, MousePointer2, Pencil, Square, Circle, Type, Eraser,
    Layers, Image as ImageIcon, Trash2, Send, Plus, Eye, EyeOff,
    Sparkles, Palette, Minus
} from 'lucide-react';
import { useLocalParticipant } from '@livekit/components-react';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { Stage, Layer as KonvaLayer, Line, Rect, Circle as KonvaCircle, Text as KonvaText } from 'react-konva';
import toast from 'react-hot-toast';
import { GiphyFetch } from '@giphy/js-fetch-api';

const gf = new GiphyFetch('3k4Fdn6D040IQvIq1KquLZzJgutP3dGp');

const PALETTE = [
    '#ffffff', '#ff4d6d', '#ff9a3c', '#ffd166',
    '#06d6a0', '#118ab2', '#7b2cbf', '#e0aaff',
    '#000000', '#374151', '#ef4444', '#22c55e',
];

const TOOLS = {
    SELECT: 'select',
    PENCIL: 'pencil',
    ERASER: 'eraser',
    RECT: 'rect',
    CIRCLE: 'circle',
    TEXT: 'text',
};

const DEFAULT_LAYERS = [
    { id: 'bg', name: 'Fondo', visible: true },
    { id: 'main', name: 'Dibujo', visible: true },
    { id: 'fg', name: 'Capa 3', visible: true },
];

export default function Starboard({ roomName, onClose }) {
    const { user, profile } = useAuthContext();
    const { localParticipant } = useLocalParticipant();

    const [tool, setTool] = useState(TOOLS.PENCIL);
    const [color, setColor] = useState('#ff4d6d');
    const [strokeWidth, setStrokeWidth] = useState(4);
    const [objects, setObjects] = useState([]);
    const [cursors, setCursors] = useState({});
    const [layers, setLayers] = useState(DEFAULT_LAYERS);
    const [activeLayerId, setActiveLayerId] = useState('main');
    const [showLayers, setShowLayers] = useState(false);
    const [showGifSearch, setShowGifSearch] = useState(false);
    const [gifSearch, setGifSearch] = useState('');
    const [gifResults, setGifResults] = useState([]);
    const [textInput, setTextInput] = useState({ show: false, x: 0, y: 0, value: '' });
    const [stageSize, setStageSize] = useState({ width: 1200, height: 700 });

    const containerRef = useRef(null);
    const stageRef = useRef(null);
    const channelRef = useRef(null);
    const isDrawingRef = useRef(false);
    const colorRef = useRef(color);
    const toolRef = useRef(tool);
    const strokeRef = useRef(strokeWidth);
    const activeLayerRef = useRef(activeLayerId);

    useEffect(() => { colorRef.current = color; }, [color]);
    useEffect(() => { toolRef.current = tool; }, [tool]);
    useEffect(() => { strokeRef.current = strokeWidth; }, [strokeWidth]);
    useEffect(() => { activeLayerRef.current = activeLayerId; }, [activeLayerId]);

    const myId = localParticipant?.identity || user?.id || 'anon';
    const myName = profile?.username || 'Piloto';

    // Measure container
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const obs = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            if (width > 10 && height > 10) setStageSize({ width, height });
        });
        obs.observe(el);
        const r = el.getBoundingClientRect();
        if (r.width > 10) setStageSize({ width: r.width, height: r.height });
        return () => obs.disconnect();
    }, []);

    // Supabase channel
    useEffect(() => {
        if (!roomName) return;
        const chan = supabase.channel(`starboard3:${roomName.toLowerCase().trim()}`);
        channelRef.current = chan;
        chan
            .on('broadcast', { event: 'cursor' }, ({ payload }) => {
                if (payload.userId === myId) return;
                setCursors(prev => ({ ...prev, [payload.userId]: { ...payload, ts: Date.now() } }));
            })
            .on('broadcast', { event: 'obj_add' }, ({ payload }) => {
                setObjects(prev => [...prev.filter(o => o.id !== payload.id), payload]);
            })
            .on('broadcast', { event: 'obj_move' }, ({ payload }) => {
                setObjects(prev => prev.map(o => o.id === payload.id ? { ...o, x: payload.x, y: payload.y } : o));
            })
            .on('broadcast', { event: 'obj_delete' }, ({ payload }) => {
                setObjects(prev => prev.filter(o => o.id !== payload.id));
            })
            .on('broadcast', { event: 'board_clear' }, () => setObjects([]))
            .subscribe();
        return () => { supabase.removeChannel(chan); };
    }, [roomName, myId]);

    // Prune stale cursors
    useEffect(() => {
        const t = setInterval(() => {
            setCursors(prev => {
                const now = Date.now();
                const next = {};
                Object.entries(prev).forEach(([k, v]) => { if (now - v.ts < 6000) next[k] = v; });
                return next;
            });
        }, 3000);
        return () => clearInterval(t);
    }, []);

    const broadcast = useCallback((event, payload) => {
        channelRef.current?.send({ type: 'broadcast', event, payload });
    }, []);

    // Drawing handlers — use refs to avoid stale closures
    const handlePointerDown = useCallback((e) => {
        const t = toolRef.current;
        const stage = e.target.getStage();
        const pos = stage.getPointerPosition();
        if (!pos) return;

        if (t === TOOLS.TEXT) {
            setTextInput({ show: true, x: pos.x, y: pos.y, value: '' });
            return;
        }
        if (t === TOOLS.SELECT) return;

        isDrawingRef.current = true;
        const id = `${myId}_${Date.now()}`;
        const layerId = activeLayerRef.current;
        const c = colorRef.current;
        const sw = strokeRef.current;

        if (t === TOOLS.RECT || t === TOOLS.CIRCLE) {
            setObjects(prev => [...prev, {
                id, tool: t, layerId, userId: myId,
                x: pos.x, y: pos.y, width: 0, height: 0,
                stroke: c, strokeWidth: sw, fill: 'transparent',
            }]);
        } else {
            setObjects(prev => [...prev, {
                id, tool: t, layerId, userId: myId,
                stroke: t === TOOLS.ERASER ? '#000000' : c,
                strokeWidth: t === TOOLS.ERASER ? sw * 3 : sw,
                points: [pos.x, pos.y],
                tension: 0.5, lineCap: 'round', lineJoin: 'round',
                globalCompositeOperation: t === TOOLS.ERASER ? 'destination-out' : 'source-over',
            }]);
        }
    }, [myId]);

    const handlePointerMove = useCallback((e) => {
        const stage = e.target.getStage();
        const pos = stage.getPointerPosition();
        if (!pos) return;

        // Broadcast cursor position (normalized)
        broadcast('cursor', {
            userId: myId, name: myName,
            color: colorRef.current,
            nx: pos.x / (stageRef.current?.width() || 1),
            ny: pos.y / (stageRef.current?.height() || 1),
        });

        if (!isDrawingRef.current) return;
        const t = toolRef.current;

        setObjects(prev => {
            const last = prev[prev.length - 1];
            if (!last) return prev;
            if (t === TOOLS.RECT || t === TOOLS.CIRCLE) {
                return [...prev.slice(0, -1), { ...last, width: pos.x - last.x, height: pos.y - last.y }];
            }
            if (t === TOOLS.PENCIL || t === TOOLS.ERASER) {
                return [...prev.slice(0, -1), { ...last, points: [...last.points, pos.x, pos.y] }];
            }
            return prev;
        });
    }, [myId, myName, broadcast]);

    const handlePointerUp = useCallback(() => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        setObjects(prev => {
            const last = prev[prev.length - 1];
            if (last) broadcast('obj_add', last);
            return prev;
        });
    }, [broadcast]);

    const addTextObject = () => {
        if (!textInput.value.trim()) { setTextInput(t => ({ ...t, show: false })); return; }
        const obj = {
            id: `${myId}_${Date.now()}`, tool: 'text', layerId: activeLayerId,
            userId: myId, x: textInput.x, y: textInput.y,
            text: textInput.value, fill: color,
            fontSize: 14 + strokeWidth * 2, fontStyle: 'bold',
        };
        setObjects(prev => [...prev, obj]);
        broadcast('obj_add', obj);
        setTextInput({ show: false, x: 0, y: 0, value: '' });
    };

    const addGif = (url) => {
        const obj = {
            id: `${myId}_gif_${Date.now()}`, tool: 'gif', layerId: activeLayerId,
            userId: myId, src: url, x: 60, y: 60, width: 200, height: 150,
        };
        setObjects(prev => [...prev, obj]);
        broadcast('obj_add', obj);
        setShowGifSearch(false);
    };

    const deleteObject = (id) => {
        setObjects(prev => prev.filter(o => o.id !== id));
        broadcast('obj_delete', { id });
    };

    const searchGifs = async () => {
        if (!gifSearch.trim()) return;
        try {
            const { data } = await gf.search(gifSearch, { limit: 12 });
            setGifResults(data);
        } catch { toast.error('Error buscando GIFs'); }
    };

    const clearBoard = () => {
        if (!window.confirm('Limpiar pizarra para todos?')) return;
        setObjects([]);
        broadcast('board_clear', {});
    };

    const addLayer = () => {
        const id = `layer_${Date.now()}`;
        setLayers(prev => [...prev, { id, name: `Capa ${prev.length + 1}`, visible: true }]);
        setActiveLayerId(id);
    };

    const toggleLayerVisibility = (id) => {
        setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
    };

    const deleteLayer = (id) => {
        if (layers.length <= 1) return;
        const next = layers.filter(l => l.id !== id);
        setLayers(next);
        setObjects(prev => prev.filter(o => o.layerId !== id));
        if (activeLayerId === id) setActiveLayerId(next[0]?.id || 'main');
    };

    // GIF drag (mouse-based, HTML overlay)
    const handleGifMouseDown = (e, obj) => {
        if (toolRef.current !== TOOLS.SELECT) return;
        e.preventDefault();
        const startX = e.clientX - obj.x;
        const startY = e.clientY - obj.y;

        const move = (me) => {
            setObjects(prev => prev.map(o =>
                o.id === obj.id ? { ...o, x: me.clientX - startX, y: me.clientY - startY } : o
            ));
        };
        const up = (ue) => {
            broadcast('obj_move', { id: obj.id, x: ue.clientX - startX, y: ue.clientY - startY });
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
    };

    const visibleLayerIds = new Set(layers.filter(l => l.visible).map(l => l.id));

    return (
        <div className="flex flex-col h-full bg-[#050518] text-white overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-black/30 z-10">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/20">
                        <Sparkles size={14} />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-white">Starboard</span>
                    {/* Online users */}
                    <div className="flex -space-x-1">
                        {Object.values(cursors).map(c => (
                            <div
                                key={c.userId}
                                title={c.name}
                                className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[7px] font-black"
                                style={{ backgroundColor: c.color + '30', borderColor: c.color, color: c.color }}
                            >
                                {c.name?.charAt(0).toUpperCase()}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setShowLayers(!showLayers)}
                        className={`p-1.5 rounded-xl border transition-all ${showLayers ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                    >
                        <Layers size={14} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Main area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left toolbar */}
                <div className="flex-shrink-0 flex flex-col gap-1 p-2 bg-black/40 border-r border-white/5 z-10">
                    <ToolBtn active={tool === TOOLS.SELECT} onClick={() => setTool(TOOLS.SELECT)} icon={<MousePointer2 size={15} />} title="Seleccionar" />
                    <ToolBtn active={tool === TOOLS.PENCIL} onClick={() => setTool(TOOLS.PENCIL)} icon={<Pencil size={15} />} title="Lapiz" />
                    <ToolBtn active={tool === TOOLS.RECT} onClick={() => setTool(TOOLS.RECT)} icon={<Square size={15} />} title="Rectangulo" />
                    <ToolBtn active={tool === TOOLS.CIRCLE} onClick={() => setTool(TOOLS.CIRCLE)} icon={<Circle size={15} />} title="Circulo" />
                    <ToolBtn active={tool === TOOLS.TEXT} onClick={() => setTool(TOOLS.TEXT)} icon={<Type size={15} />} title="Texto" />
                    <ToolBtn active={tool === TOOLS.ERASER} onClick={() => setTool(TOOLS.ERASER)} icon={<Eraser size={15} />} title="Borrador" />
                    <div className="h-px bg-white/10 my-0.5" />
                    <ToolBtn active={showGifSearch} onClick={() => setShowGifSearch(!showGifSearch)} icon={<ImageIcon size={15} />} title="GIFs" variant="amber" />
                    <ToolBtn onClick={clearBoard} icon={<Trash2 size={15} />} title="Limpiar" variant="rose" />
                </div>

                {/* Canvas container */}
                <div ref={containerRef} className="flex-1 relative bg-[#02020a] overflow-hidden touch-none">
                    <Stage
                        ref={stageRef}
                        width={stageSize.width}
                        height={stageSize.height}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        style={{ cursor: tool === TOOLS.ERASER ? 'cell' : tool === TOOLS.SELECT ? 'default' : 'crosshair' }}
                    >
                        {layers.map(layer => {
                            if (!layer.visible) return null;
                            const layerObjs = objects.filter(o => o.layerId === layer.id && o.tool !== 'gif');
                            return (
                                <KonvaLayer key={layer.id}>
                                    {layerObjs.map(obj => {
                                        if (obj.tool === TOOLS.PENCIL || obj.tool === TOOLS.ERASER) {
                                            return (
                                                <Line
                                                    key={obj.id}
                                                    points={obj.points}
                                                    stroke={obj.stroke}
                                                    strokeWidth={obj.strokeWidth}
                                                    tension={obj.tension}
                                                    lineCap={obj.lineCap}
                                                    lineJoin={obj.lineJoin}
                                                    globalCompositeOperation={obj.globalCompositeOperation}
                                                />
                                            );
                                        }
                                        if (obj.tool === TOOLS.RECT) {
                                            return (
                                                <Rect
                                                    key={obj.id}
                                                    x={obj.x} y={obj.y}
                                                    width={obj.width} height={obj.height}
                                                    stroke={obj.stroke}
                                                    strokeWidth={obj.strokeWidth}
                                                    fill={obj.fill}
                                                />
                                            );
                                        }
                                        if (obj.tool === TOOLS.CIRCLE) {
                                            const r = Math.sqrt(Math.pow(obj.width, 2) + Math.pow(obj.height, 2)) / 2;
                                            return (
                                                <KonvaCircle
                                                    key={obj.id}
                                                    x={obj.x + obj.width / 2}
                                                    y={obj.y + obj.height / 2}
                                                    radius={Math.max(1, r)}
                                                    stroke={obj.stroke}
                                                    strokeWidth={obj.strokeWidth}
                                                    fill={obj.fill}
                                                />
                                            );
                                        }
                                        if (obj.tool === 'text') {
                                            return (
                                                <KonvaText
                                                    key={obj.id}
                                                    x={obj.x} y={obj.y}
                                                    text={obj.text}
                                                    fill={obj.fill}
                                                    fontSize={obj.fontSize}
                                                    fontStyle={obj.fontStyle}
                                                />
                                            );
                                        }
                                        return null;
                                    })}
                                </KonvaLayer>
                            );
                        })}
                    </Stage>

                    {/* GIF HTML overlay (keeps GIFs animated, no Konva freeze) */}
                    {objects.filter(o => o.tool === 'gif' && visibleLayerIds.has(o.layerId)).map(obj => (
                        <div
                            key={obj.id}
                            className="absolute group"
                            style={{
                                left: obj.x, top: obj.y,
                                width: obj.width, height: obj.height,
                                pointerEvents: tool === TOOLS.SELECT ? 'auto' : 'none',
                                cursor: tool === TOOLS.SELECT ? 'move' : 'default',
                                zIndex: 5,
                            }}
                            onMouseDown={(e) => handleGifMouseDown(e, obj)}
                        >
                            <img
                                src={obj.src}
                                alt=""
                                draggable={false}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, display: 'block', userSelect: 'none' }}
                            />
                            {tool === TOOLS.SELECT && (
                                <button
                                    onMouseDown={e => e.stopPropagation()}
                                    onClick={() => deleteObject(obj.id)}
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                >
                                    <X size={10} className="text-white" />
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Remote cursors */}
                    {Object.values(cursors).map(c => (
                        <motion.div
                            key={c.userId}
                            className="absolute top-0 left-0 pointer-events-none z-20"
                            animate={{ x: c.nx * stageSize.width, y: c.ny * stageSize.height }}
                            transition={{ type: 'spring', damping: 30, stiffness: 250 }}
                        >
                            <MousePointer2
                                size={18}
                                fill={c.color}
                                style={{ color: c.color, filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.9))' }}
                            />
                            <div
                                className="mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight whitespace-nowrap shadow-lg"
                                style={{ backgroundColor: c.color + '28', color: c.color, border: `1px solid ${c.color}55` }}
                            >
                                {c.name}
                            </div>
                        </motion.div>
                    ))}

                    {/* Text input overlay */}
                    <AnimatePresence>
                        {textInput.show && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute z-30 bg-black/85 backdrop-blur-xl border border-white/10 rounded-xl p-2 flex gap-2"
                                style={{ left: textInput.x, top: textInput.y }}
                            >
                                <input
                                    autoFocus
                                    value={textInput.value}
                                    onChange={e => setTextInput(t => ({ ...t, value: e.target.value }))}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') addTextObject();
                                        if (e.key === 'Escape') setTextInput(t => ({ ...t, show: false }));
                                    }}
                                    className="bg-transparent text-white outline-none text-xs w-36"
                                    placeholder="Escribe algo..."
                                />
                                <button onClick={addTextObject} className="px-2 py-0.5 bg-cyan-500 rounded-lg text-black text-[9px] font-black">OK</button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* GIF search panel */}
                    <AnimatePresence>
                        {showGifSearch && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                className="absolute left-2 top-2 w-60 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 z-30 shadow-2xl"
                            >
                                <div className="flex gap-2 mb-3">
                                    <input
                                        value={gifSearch}
                                        onChange={e => setGifSearch(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && searchGifs()}
                                        placeholder="Buscar GIF..."
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-white outline-none focus:border-cyan-500 transition-all"
                                    />
                                    <button onClick={searchGifs} className="p-1.5 bg-cyan-500 rounded-xl text-black hover:bg-cyan-400 transition-all">
                                        <Send size={12} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto no-scrollbar">
                                    {gifResults.map(g => (
                                        <button
                                            key={g.id}
                                            onClick={() => addGif(g.images.fixed_height_small.url)}
                                            className="aspect-square rounded-lg overflow-hidden border border-white/5 hover:border-cyan-500 transition-all active:scale-95"
                                        >
                                            <img src={g.images.fixed_height_small.url} className="w-full h-full object-cover" alt="" />
                                        </button>
                                    ))}
                                </div>
                                {gifResults.length === 0 && (
                                    <p className="text-center text-[9px] text-white/30 py-4">Busca un GIF arriba</p>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right: Layers panel */}
                <AnimatePresence>
                    {showLayers && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 156, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                            className="flex-shrink-0 flex flex-col bg-black/60 border-l border-white/5 overflow-hidden z-10"
                        >
                            <div className="p-2 border-b border-white/5 flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Capas</span>
                                <button onClick={addLayer} className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-all">
                                    <Plus size={12} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 no-scrollbar">
                                {[...layers].reverse().map(layer => (
                                    <div
                                        key={layer.id}
                                        onClick={() => setActiveLayerId(layer.id)}
                                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl cursor-pointer transition-all border ${activeLayerId === layer.id ? 'bg-cyan-500/15 border-cyan-500/30' : 'bg-white/3 border-transparent hover:bg-white/5'}`}
                                    >
                                        <button
                                            onMouseDown={e => e.stopPropagation()}
                                            onClick={e => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                                            className="text-white/40 hover:text-white transition-colors flex-shrink-0"
                                        >
                                            {layer.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                                        </button>
                                        <span className="text-[9px] text-white/70 font-medium truncate flex-1">{layer.name}</span>
                                        {layers.length > 1 && (
                                            <button
                                                onMouseDown={e => e.stopPropagation()}
                                                onClick={e => { e.stopPropagation(); deleteLayer(layer.id); }}
                                                className="text-white/20 hover:text-rose-400 transition-colors flex-shrink-0"
                                            >
                                                <X size={10} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom toolbar */}
            <div className="flex-shrink-0 flex items-center gap-3 px-3 py-2 bg-black/40 border-t border-white/5 flex-wrap gap-y-1">
                {/* Color palette */}
                <div className="flex items-center gap-1 flex-wrap">
                    {PALETTE.map(c => (
                        <button
                            key={c}
                            onClick={() => { setColor(c); if (tool === TOOLS.ERASER) setTool(TOOLS.PENCIL); }}
                            style={{ backgroundColor: c }}
                            className={`w-5 h-5 rounded-full border-2 transition-all flex-shrink-0 ${
                                color === c && tool !== TOOLS.ERASER
                                    ? 'border-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                                    : 'border-transparent opacity-60 hover:opacity-100 hover:scale-110'
                            }`}
                        />
                    ))}
                    {/* Custom color picker */}
                    <label
                        title="Color personalizado"
                        className="relative w-5 h-5 rounded-full border-2 border-dashed border-white/30 cursor-pointer hover:border-white/60 transition-all flex items-center justify-center overflow-hidden flex-shrink-0"
                        style={!PALETTE.includes(color) ? { backgroundColor: color, borderColor: color, borderStyle: 'solid' } : {}}
                    >
                        <input
                            type="color"
                            value={color}
                            onChange={e => { setColor(e.target.value); if (tool === TOOLS.ERASER) setTool(TOOLS.PENCIL); }}
                            className="absolute opacity-0 w-0 h-0 pointer-events-none"
                        />
                        {PALETTE.includes(color) && <Palette size={9} className="text-white/40" />}
                    </label>
                    {/* Color swatch indicator */}
                    <div
                        className="w-5 h-5 rounded-full border-2 border-white/20 flex-shrink-0"
                        style={{ backgroundColor: color }}
                        title={`Color actual: ${color}`}
                    />
                </div>

                {/* Stroke width */}
                <div className="flex items-center gap-1.5 ml-auto">
                    <Minus size={10} className="text-white/30 flex-shrink-0" />
                    <input
                        type="range"
                        min={1} max={20}
                        value={strokeWidth}
                        onChange={e => setStrokeWidth(Number(e.target.value))}
                        className="w-20 accent-cyan-500 h-1 cursor-pointer"
                    />
                    <Plus size={10} className="text-white/30 flex-shrink-0" />
                    <span className="text-[9px] text-white/30 w-4 text-right">{strokeWidth}</span>
                </div>

                {/* Reactions */}
                <div className="flex gap-1 flex-shrink-0">
                    {['fire', 'star', 'laugh', 'crown', 'rocket'].map((name, i) => {
                        const emojis = ['🔥', '⭐', '😂', '👑', '🚀'];
                        return (
                            <button
                                key={name}
                                onClick={() => toast(emojis[i], { duration: 1200, position: 'top-center', style: { fontSize: 32, background: 'transparent', boxShadow: 'none' } })}
                                className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm hover:bg-white/10 transition-all active:scale-90"
                            >
                                {emojis[i]}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function ToolBtn({ active, onClick, icon, title, variant }) {
    const variantClass = variant === 'rose'
        ? 'hover:text-rose-400 hover:bg-rose-500/10'
        : variant === 'amber'
            ? 'hover:text-amber-400 hover:bg-amber-500/10'
            : 'hover:bg-white/5 hover:text-white';
    return (
        <button
            onClick={onClick}
            title={title}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                active
                    ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,214,160,0.35)] scale-105'
                    : `text-white/40 ${variantClass} active:scale-95`
            }`}
        >
            {icon}
        </button>
    );
}
