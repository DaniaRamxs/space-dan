import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, MousePointer2, Pencil, Square, Circle, Type, Eraser,
    Layers, Image as ImageIcon, Trash2, Send, Plus, Eye, EyeOff,
    Sparkles, Palette, Minus
} from 'lucide-react';
import { useLocalParticipant } from '@livekit/components-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { Stage, Layer as KonvaLayer, Line, Rect, Circle as KonvaCircle, Text as KonvaText } from 'react-konva';
import toast from 'react-hot-toast';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { client } from '../../services/colyseusClient';

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
    const [color, setColor] = useState('#000000');
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
    const [room, setRoom] = useState(null);
    const [connecting, setConnecting] = useState(true);

    const containerRef = useRef(null);
    const stageRef = useRef(null);
    const isDrawingRef = useRef(false);
    const draggedGifIdRef = useRef(null);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const currentIdRef = useRef(null);
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

    useEffect(() => {
        if (!roomName) return;
        let colyseusRoom;
        const connect = async () => {
            try {
                colyseusRoom = await client.joinOrCreate("starboard", {
                    roomName,
                    userId: myId,
                    name: myName,
                    color: color
                });
                setRoom(colyseusRoom);
                setConnecting(false);
                colyseusRoom.onStateChange((state) => {
                    const newCursors = {};
                    state.players.forEach((p, sessionId) => {
                        if (sessionId === colyseusRoom.sessionId) return;
                        newCursors[sessionId] = { userId: p.id, name: p.name, color: p.color, nx: p.nx, ny: p.ny };
                    });
                    setCursors(newCursors);
                    const newObjs = [];
                    state.objects.forEach(obj => {
                        newObjs.push({
                            id: obj.id, tool: obj.tool, layerId: obj.layerId, userId: obj.userId,
                            x: obj.x, y: obj.y, width: obj.width, height: obj.height,
                            stroke: obj.stroke, strokeWidth: obj.strokeWidth, fill: obj.fill,
                            points: Array.from(obj.points), text: obj.text, src: obj.src,
                            tension: obj.tension, lineCap: obj.lineCap, lineJoin: obj.lineJoin,
                            globalCompositeOperation: obj.globalCompositeOperation,
                            fontSize: obj.fontSize, fontStyle: obj.fontStyle
                        });
                    });
                    setObjects(newObjs);
                });
            } catch (e) {
                console.error("Starboard Colyseus Error:", e);
                toast.error("Error conectando a la pizarra");
            }
        };
        connect();
        return () => { if (colyseusRoom) colyseusRoom.leave(); };
    }, [roomName]);

    const handlePointerDown = useCallback((e) => {
        if (!room) return;
        const t = toolRef.current;
        const stage = e.target.getStage();
        const pos = stage.getPointerPosition();
        if (!pos) return;
        if (t === TOOLS.TEXT) {
            setTextInput({ show: true, x: pos.x, y: pos.y, value: '' });
            return;
        }
        if (t === TOOLS.SELECT) {
            const gif = objects.slice().reverse().find(o => o.tool === 'gif' &&
                pos.x >= o.x && pos.x <= o.x + o.width &&
                pos.y >= o.y && pos.y <= o.y + o.height);
            if (gif) {
                draggedGifIdRef.current = gif.id;
                dragOffsetRef.current = { x: pos.x - gif.x, y: pos.y - gif.y };
            }
            return;
        }
        isDrawingRef.current = true;
        const id = `${myId}_${Date.now()}`;
        currentIdRef.current = id;
        const layerId = activeLayerRef.current;
        const c = colorRef.current;
        const sw = strokeRef.current;
        const baseObj = {
            id, tool: t, layerId, userId: myId,
            x: pos.x, y: pos.y, width: 0, height: 0,
            stroke: t === TOOLS.ERASER ? '#ffffff' : c,
            strokeWidth: t === TOOLS.ERASER ? sw * 4 : sw,
            fill: 'transparent',
            points: [pos.x, pos.y],
            tension: 0.5, lineCap: 'round', lineJoin: 'round',
            globalCompositeOperation: t === TOOLS.ERASER ? 'destination-out' : 'source-over',
        };
        room.send("obj_add", baseObj);
    }, [room, objects, myId]);

    const handlePointerMove = useCallback((e) => {
        if (!room) return;
        const stage = e.target.getStage();
        const pos = stage.getPointerPosition();
        if (!pos) return;
        room.send("cursor", { nx: pos.x / (stageSize.width || 1), ny: pos.y / (stageSize.height || 1), color: colorRef.current });

        if (draggedGifIdRef.current) {
            const newX = pos.x - dragOffsetRef.current.x;
            const newY = pos.y - dragOffsetRef.current.y;
            room.send("obj_update", { id: draggedGifIdRef.current, x: newX, y: newY });
            return;
        }

        if (!isDrawingRef.current) return;
        const t = toolRef.current;
        const id = currentIdRef.current;
        const currentObj = objects.find(o => o.id === id);
        if (!currentObj) return;

        if (t === TOOLS.RECT || t === TOOLS.CIRCLE) {
            room.send("obj_update", { id, width: pos.x - currentObj.x, height: pos.y - currentObj.y });
        } else if (t === TOOLS.PENCIL || t === TOOLS.ERASER) {
            const newPoints = [...currentObj.points, pos.x, pos.y];
            room.send("obj_update", { id, points: newPoints });
        }
    }, [room, objects, stageSize]);

    const handlePointerUp = useCallback(() => {
        isDrawingRef.current = false;
        draggedGifIdRef.current = null;
        currentIdRef.current = null;
    }, []);

    const addTextObject = () => {
        if (!textInput.value.trim() || !room) { setTextInput(t => ({ ...t, show: false })); return; }
        const obj = {
            id: `${myId}_${Date.now()}`, tool: 'text', layerId: activeLayerId,
            userId: myId, x: textInput.x, y: textInput.y,
            text: textInput.value, stroke: color, fill: color,
            fontSize: 16 + strokeWidth * 2, fontStyle: 'bold',
        };
        room.send("obj_add", obj);
        setTextInput({ show: false, x: 0, y: 0, value: '' });
    };

    const addGif = (url) => {
        if (!room) return;
        const obj = {
            id: `${myId}_gif_${Date.now()}`, tool: 'gif', layerId: activeLayerId,
            userId: myId, src: url, x: 100, y: 100, width: 250, height: 180,
            points: [], stroke: '#000000', fill: 'transparent'
        };
        room.send("obj_add", obj);
        setShowGifSearch(false);
        toast.success("¡GIF añadido!");
    };

    const searchGifs = async () => {
        if (!gifSearch.trim()) return;
        try {
            const { data } = await gf.search(gifSearch, { limit: 12 });
            setGifResults(data);
        } catch { toast.error('Error buscando GIFs'); }
    };

    const deleteObject = (id) => { room?.send("obj_delete", { id }); };
    const clearBoard = () => { if (window.confirm('¿Limpiar pizarra para todos?')) room?.send("board_clear"); };
    const addLayer = () => {
        const id = `layer_${Date.now()}`;
        setLayers(prev => [...prev, { id, name: `Capa ${prev.length + 1}`, visible: true }]);
        setActiveLayerId(id);
    };

    const visibleLayerIds = new Set(layers.filter(l => l.visible).map(l => l.id));

    if (connecting) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-white">
                <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Iniciando Starboard Colyseus...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-100 text-slate-800 overflow-hidden font-sans">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500 flex items-center justify-center text-white shadow-lg">
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <h2 className="text-[11px] font-black uppercase tracking-widest leading-none text-slate-900">Starboard</h2>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Colaboración tiempo real</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2 mr-2">
                        {Object.values(cursors).map((c, i) => (
                            <div key={i} title={c.name} className="w-7 h-7 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[9px] font-black text-white" style={{ backgroundColor: c.color }}>
                                {c.name?.charAt(0).toUpperCase()}
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setShowLayers(!showLayers)} className={`p-2 rounded-xl transition-all ${showLayers ? 'bg-cyan-50 text-cyan-500' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                        <Layers size={16} />
                    </button>
                    <button onClick={onClose} className="p-2 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all">
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Tools */}
                <div className="w-16 flex-shrink-0 flex flex-col items-center py-4 gap-2 bg-white border-r border-slate-200 z-20">
                    <ToolBtn active={tool === TOOLS.SELECT} onClick={() => setTool(TOOLS.SELECT)} icon={<MousePointer2 size={18} />} title="Seleccionar" />
                    <ToolBtn active={tool === TOOLS.PENCIL} onClick={() => setTool(TOOLS.PENCIL)} icon={<Pencil size={18} />} title="Lapiz" />
                    <ToolBtn active={tool === TOOLS.RECT} onClick={() => setTool(TOOLS.RECT)} icon={<Square size={18} />} title="Rectangulo" />
                    <ToolBtn active={tool === TOOLS.CIRCLE} onClick={() => setTool(TOOLS.CIRCLE)} icon={<Circle size={18} />} title="Circulo" />
                    <ToolBtn active={tool === TOOLS.TEXT} onClick={() => setTool(TOOLS.TEXT)} icon={<Type size={18} />} title="Texto" />
                    <ToolBtn active={tool === TOOLS.ERASER} onClick={() => setTool(TOOLS.ERASER)} icon={<Eraser size={18} />} title="Borrador" />
                    <div className="w-8 h-px bg-slate-100 my-2" />
                    <ToolBtn active={showGifSearch} onClick={() => setShowGifSearch(!showGifSearch)} icon={<ImageIcon size={18} />} title="GIFs" variant="amber" />
                    <ToolBtn onClick={clearBoard} icon={<Trash2 size={18} />} title="Limpiar" variant="rose" />
                </div>

                {/* Canvas container */}
                <div ref={containerRef} className="flex-1 relative bg-white overflow-hidden touch-none" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '24px 24px' }}>

                    {/* GIFs (Layer beneath the drawing canvas) */}
                    {objects.filter(o => o.tool === 'gif' && visibleLayerIds.has(o.layerId)).map(obj => (
                        <div key={obj.id} className="absolute group" style={{ left: obj.x, top: obj.y, width: obj.width, height: obj.height, pointerEvents: 'none', zIndex: 5 }}>
                            <img src={obj.src} draggable={false} className="w-full h-full object-cover rounded-2xl border-4 border-white shadow-xl" alt="" />
                            {tool === TOOLS.SELECT && (
                                <button onClick={(e) => { e.stopPropagation(); deleteObject(obj.id); }} className="absolute -top-3 -right-3 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition shadow-lg pointer-events-auto">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    ))}

                    <Stage
                        ref={stageRef}
                        width={stageSize.width}
                        height={stageSize.height}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        style={{ cursor: tool === TOOLS.ERASER ? 'cell' : tool === TOOLS.SELECT ? 'default' : 'crosshair', position: 'relative', zIndex: 10 }}
                    >
                        {layers.map(layer => {
                            if (!layer.visible) return null;
                            const layerObjs = objects.filter(o => o.layerId === layer.id && o.tool !== 'gif');
                            return (
                                <KonvaLayer key={layer.id}>
                                    {layerObjs.map(obj => {
                                        if (obj.tool === TOOLS.PENCIL || obj.tool === TOOLS.ERASER) {
                                            return <Line key={obj.id} points={obj.points} stroke={obj.stroke} strokeWidth={obj.strokeWidth} tension={obj.tension} lineCap={obj.lineCap} lineJoin={obj.lineJoin} globalCompositeOperation={obj.globalCompositeOperation} />;
                                        }
                                        if (obj.tool === TOOLS.RECT) {
                                            return <Rect key={obj.id} x={obj.x} y={obj.y} width={obj.width} height={obj.height} stroke={obj.stroke} strokeWidth={obj.strokeWidth} fill={obj.fill} />;
                                        }
                                        if (obj.tool === TOOLS.CIRCLE) {
                                            const r = Math.sqrt(Math.pow(obj.width, 2) + Math.pow(obj.height, 2)) / 2;
                                            return <KonvaCircle key={obj.id} x={obj.x + obj.width / 2} y={obj.y + obj.height / 2} radius={Math.max(1, r)} stroke={obj.stroke} strokeWidth={obj.strokeWidth} fill={obj.fill} />;
                                        }
                                        if (obj.tool === 'text') {
                                            return <KonvaText key={obj.id} x={obj.x} y={obj.y} text={obj.text} fill={obj.stroke} fontSize={obj.fontSize} fontStyle={obj.fontStyle} />;
                                        }
                                        return null;
                                    })}
                                </KonvaLayer>
                            );
                        })}
                    </Stage>

                    {/* Cursors */}
                    {Object.entries(cursors).map(([id, c]) => (
                        <motion.div key={id} className="absolute top-0 left-0 pointer-events-none z-30" animate={{ x: c.nx * stageSize.width, y: c.ny * stageSize.height }} transition={{ type: 'spring', damping: 35, stiffness: 300 }}>
                            <MousePointer2 size={22} fill={c.color} style={{ color: c.color, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
                            <div className="mt-1 px-3 py-1 rounded-full text-[10px] font-black uppercase text-white shadow-lg border-2 border-white" style={{ backgroundColor: c.color }}>{c.name}</div>
                        </motion.div>
                    ))}

                    {/* GIF Search Panel */}
                    <AnimatePresence>
                        {showGifSearch && (
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute left-4 top-4 w-72 bg-white rounded-[2.5rem] p-5 shadow-2xl z-50 border border-slate-100">
                                <div className="flex gap-2 mb-4">
                                    <input value={gifSearch} onChange={e => setGifSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchGifs()} placeholder="Buscar GIFs..." className="flex-1 bg-slate-50 rounded-2xl px-4 py-3 text-xs font-bold outline-none border border-transparent focus:border-cyan-500 transition" />
                                    <button onClick={searchGifs} className="p-3 bg-cyan-500 rounded-2xl text-white shadow-lg hover:bg-cyan-600"><Send size={16} /></button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-2 no-scrollbar">
                                    {gifResults.map(g => (
                                        <button key={g.id} onClick={() => addGif(g.images.fixed_height_small.url)} className="aspect-square rounded-2xl overflow-hidden active:scale-95 transition border-2 border-transparent hover:border-cyan-500 shadow-sm"><img src={g.images.fixed_height_small.url} className="w-full h-full object-cover" alt="" /></button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Layers Panel */}
                    <AnimatePresence>
                        {showLayers && (
                            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} className="absolute right-4 top-4 w-48 bg-white rounded-3xl p-4 shadow-2xl z-40 border border-slate-100">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <span className="text-[10px] font-black uppercase text-slate-400">Capas</span>
                                    <button onClick={addLayer} className="p-1.5 bg-cyan-50 text-cyan-500 rounded-lg"><Plus size={14} /></button>
                                </div>
                                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto no-scrollbar">
                                    {[...layers].reverse().map(l => (
                                        <div key={l.id} onClick={() => setActiveLayerId(l.id)} className={`flex items-center gap-2 p-3 rounded-2xl cursor-pointer transition ${activeLayerId === l.id ? 'bg-cyan-50 border border-cyan-100' : 'bg-slate-50 hover:bg-slate-100'}`}>
                                            <button onClick={(e) => { e.stopPropagation(); setLayers(prev => prev.map(lay => lay.id === l.id ? { ...lay, visible: !lay.visible } : lay)); }} className="text-slate-400">
                                                {l.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                                            </button>
                                            <span className="text-[10px] font-black uppercase truncate flex-1">{l.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-white border-t border-slate-200">
                <div className="flex items-center gap-2">
                    {PALETTE.map(c => (
                        <button key={c} onClick={() => { setColor(c); setTool(TOOLS.PENCIL); }} style={{ backgroundColor: c }} className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-slate-800 scale-125 shadow-lg' : 'border-white hover:scale-110 shadow-sm'}`} />
                    ))}
                    <div className="w-px h-6 bg-slate-100 mx-2" />
                    <label className="relative w-8 h-8 rounded-full border-2 border-dashed border-slate-200 cursor-pointer flex items-center justify-center hover:border-slate-400" style={!PALETTE.includes(color) ? { backgroundColor: color, borderStyle: 'solid', borderColor: color } : {}}>
                        <input type="color" className="absolute opacity-0 pointer-events-none" value={color} onChange={e => setColor(e.target.value)} />
                        <Palette size={14} className="text-slate-400" />
                    </label>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 bg-slate-50 px-5 py-2 rounded-2xl">
                        <Minus size={14} className="text-slate-300" />
                        <input type="range" min={1} max={30} value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))} className="w-32 accent-cyan-500" />
                        <Plus size={14} className="text-slate-300" />
                        <span className="text-[10px] font-black text-slate-400 w-4">{strokeWidth}</span>
                    </div>

                    <div className="flex gap-2">
                        {['🔥', '⭐', '😂', '👑', '🚀'].map(emoji => (
                            <button key={emoji} onClick={() => toast(emoji, { duration: 1200, position: 'top-center', style: { fontSize: 32, background: 'transparent', boxShadow: 'none' } })} className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-xl hover:bg-slate-100 hover:scale-110 transition shadow-sm">
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Text Overlay */}
            <AnimatePresence>
                {textInput.show && (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute z-50 bg-white p-4 rounded-3xl shadow-2xl border border-slate-100 flex gap-2" style={{ left: textInput.x, top: textInput.y }}>
                        <input autoFocus value={textInput.value} onChange={e => setTextInput(t => ({ ...t, value: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addTextObject()} className="bg-slate-50 px-4 py-2 rounded-xl text-xs font-black outline-none w-48 focus:border-cyan-500 border border-transparent" placeholder="Escribe algo..." />
                        <button onClick={addTextObject} className="bg-cyan-500 px-4 py-2 rounded-xl text-white text-[10px] font-black">OK</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ToolBtn({ active, onClick, icon, title, variant }) {
    const variantColor = variant === 'rose' ? 'rose' : variant === 'amber' ? 'amber' : 'cyan';
    return (
        <button
            onClick={onClick}
            title={title}
            className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all ${active
                ? `bg-${variantColor}-500 text-white shadow-xl scale-110`
                : `text-slate-400 bg-slate-50 hover:bg-slate-100 active:scale-95`
                }`}
        >
            {icon}
        </button>
    );
}
