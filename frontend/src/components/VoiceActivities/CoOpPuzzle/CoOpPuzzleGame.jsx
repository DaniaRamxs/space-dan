import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Image as ImageIcon, RotateCw, Timer, Settings2, Upload, Play, Trophy, ChevronDown, ChevronUp, Crown } from 'lucide-react';
import { client } from '../../../services/colyseusClient';
import { useAuthContext } from '../../../contexts/AuthContext';
import { supabase } from '../../../supabaseClient';
import toast from 'react-hot-toast';

const DIFFICULTIES = [
    { label: '3x3', rows: 3, cols: 3 },
    { label: '4x4', rows: 4, cols: 4 },
    { label: '5x5', rows: 5, cols: 5 },
    { label: '8x8', rows: 8, cols: 8 },
];

export default function CoOpPuzzleGame({ roomName, onClose }) {
    const { user, profile } = useAuthContext();
    const [room, setRoom] = useState(null);
    const [state, setState] = useState(null);
    const [connecting, setConnecting] = useState(true);
    const [imageObj, setImageObj] = useState(null);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [showControls, setShowControls] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const [draggingPiece, setDraggingPiece] = useState(null);
    const [selectedPiece, setSelectedPiece] = useState(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    // ── Setup Room ──
    useEffect(() => {
        let activeRoom = null;
        const joinGame = async () => {
            try {
                activeRoom = await client.joinOrCreate('puzzle', {
                    userId: user?.id,
                    username: profile?.username || user?.displayName || 'Anon',
                    avatar: profile?.avatar_url || '/default-avatar.png',
                    roomName,
                });
                setRoom(activeRoom);
                // Spread para que React detecte nuevo objeto y re-renderice
                setState({ ...activeRoom.state });
                setConnecting(false);

                activeRoom.onStateChange((newState) => {
                    setState({ ...newState });
                });

                activeRoom.onMessage("puzzle_complete", (data) => {
                    toast.success(`¡Puzzle completado en ${data.time.toFixed(1)}s!`, { icon: '🎉', duration: 5000 });
                });

                activeRoom.onMessage("piece_grabbed", (data) => {
                    const piece = state?.pieces?.get?.(data.id);
                    const grabber = state?.players?.get?.(data.by);
                    if (piece && grabber && data.by !== room?.sessionId) {
                        toast(`${grabber.username} tomó la pieza`, { icon: '🤏', duration: 1000 });
                    }
                });

                activeRoom.onMessage("piece_released", (data) => {
                    // Could add visual feedback for piece release
                });

            } catch (err) {
                console.error('[CoOpPuzzle] Error al conectar:', err?.message);
                toast.error('Error al conectar con la sala');
                onClose();
            }
        };
        joinGame();
        return () => { if (activeRoom) activeRoom.leave(); };
    }, []);

    // ── Derived ──
    const isHost = state?.hostId === room?.sessionId;
    const myPlayer = state?.players?.get?.(room?.sessionId);

    // ── Load Image ──
    useEffect(() => {
        if (state?.imageUri) {
            const img = new Image();
            img.onload = () => { setImageObj(img); recalcSize(img); };
            img.src = state.imageUri;
        } else {
            setImageObj(null);
        }
    }, [state?.imageUri]);

    const recalcSize = useCallback((img) => {
        const container = containerRef.current;
        if (!container || !img) return;
        const maxW = container.clientWidth - 16;
        const maxH = container.clientHeight - 16;
        const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
        setCanvasSize({ width: Math.floor(img.width * ratio), height: Math.floor(img.height * ratio) });
    }, []);

    useEffect(() => {
        if (!imageObj) return;
        const ro = new ResizeObserver(() => recalcSize(imageObj));
        if (containerRef.current) ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, [imageObj, recalcSize]);

    // ── Image Upload ──
    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validaciones
        if (!file.type.startsWith('image/')) {
            toast.error("El archivo debe ser una imagen");
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error("La imagen es demasiado grande (máx 5MB)");
            return;
        }

        setIsUploading(true);
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
        // Sanitize room name for storage path (remove spaces and special chars)
        const sanitizedRoomName = roomName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
        const filePath = `${sanitizedRoomName}/${fileName}`;

        try {
            // Subir a bucket "puzzles"
            const { data, error } = await supabase.storage
                .from('puzzles')
                .upload(filePath, file);

            if (error) throw error;

            // Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('puzzles')
                .getPublicUrl(filePath);

            // Iniciar puzzle en Colyseus
            room.send("setup_puzzle", {
                imageUri: publicUrl,
                rows: state?.rows || 4,
                cols: state?.cols || 4
            });

            toast.success("Imagen subida con éxito");
        } catch (error) {
            console.error("Error uploading puzzle image:", error);
            toast.error("Error al subir la imagen");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSetup = (diff) => {
        if (!state.imageUri) return;
        room.send("setup_puzzle", { imageUri: state.imageUri, rows: diff.rows, cols: diff.cols });
    };

    // ── Touch/Mouse helpers ──
    const getPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const touch = e.touches?.[0] || e;
        return {
            x: ((touch.clientX - rect.left) / canvasSize.width) * 600,
            y: ((touch.clientY - rect.top) / canvasSize.height) * 400,
        };
    };

    const handlePointerDown = (e) => {
        if (!state || !imageObj) return;
        const { x, y } = getPos(e);
        let found = null;
        let closestDist = Infinity;
        
        // Find the closest unlocked piece (better for overlapping pieces)
        state.pieces?.forEach((p) => {
            if (p.isLocked || p.heldBy) return;
            if (x >= p.x && x <= p.x + p.width && y >= p.y && y <= p.y + p.height) {
                const centerX = p.x + p.width / 2;
                const centerY = p.y + p.height / 2;
                const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                if (dist < closestDist) {
                    found = p;
                    closestDist = dist;
                }
            }
        });
        
        if (found) { 
            setDraggingPiece(found.id);
            setSelectedPiece(found.id);
            setOffset({ x: x - found.x, y: y - found.y }); 
            room.send("grab_piece", { id: found.id });
        } else {
            setSelectedPiece(null);
        }
    };

    const handlePointerMove = (e) => {
        if (!draggingPiece || !room) return;
        const { x, y } = getPos(e);
        room.send("move_piece", { id: draggingPiece, x: x - offset.x, y: y - offset.y });
    };

    const handlePointerUp = () => {
        if (draggingPiece) { 
            room.send("release_piece", { id: draggingPiece }); 
            setDraggingPiece(null); 
        }
    };

    const handleRotate = (id) => { 
        if (room && id) room.send("rotate_piece", { id }); 
        else toast.error("Selecciona una pieza primero");
    };

    // ── Render Loop ──
    useEffect(() => {
        if (!imageObj || !canvasRef.current || !state || !canvasSize.width) return;
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
        ctx.globalAlpha = 0.1;
        ctx.drawImage(imageObj, 0, 0, canvasSize.width, canvasSize.height);
        ctx.globalAlpha = 1;

        const sw = imageObj.width / state.cols, sh = imageObj.height / state.rows;
        const dw = canvasSize.width / state.cols, dh = canvasSize.height / state.rows;

        const sorted = Array.from(state.pieces?.values() || []).sort((a, b) =>
            a.isLocked === b.isLocked ? 0 : a.isLocked ? -1 : 1
        );

        sorted.forEach((p) => {
            const px = (p.x / 600) * canvasSize.width;
            const py = (p.y / 400) * canvasSize.height;
            const [, r, c] = p.id.split('_').map(Number);
            const isSelected = selectedPiece === p.id;
            
            ctx.save();
            ctx.translate(px + dw / 2, py + dh / 2);
            
            // Dibujar borde de selección (antes de rotar para que sea recto)
            if (isSelected) {
                ctx.save();
                ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)'; // amber-400
                ctx.lineWidth = 4;
                ctx.shadowColor = 'rgba(251, 191, 36, 0.6)';
                ctx.shadowBlur = 12;
                ctx.strokeRect(-dw / 2 - 4, -dh / 2 - 4, dw + 8, dh + 8);
                ctx.restore();
            }
            
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.beginPath(); ctx.rect(-dw / 2, -dh / 2, dw, dh); ctx.clip();
            ctx.drawImage(imageObj, c * sw, r * sh, sw, sh, -dw / 2, -dh / 2, dw, dh);
            ctx.strokeStyle = p.isLocked ? 'rgba(34,197,94,0.5)' : (p.heldBy ? 'rgba(236,72,153,0.8)' : 'rgba(255,255,255,0.2)');
            ctx.lineWidth = p.isLocked ? 2 : 1;
            ctx.strokeRect(-dw / 2, -dh / 2, dw, dh);
            if (p.heldBy) {
                const holder = state.players?.get?.(p.heldBy);
                if (holder) { ctx.fillStyle = 'white'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center'; ctx.fillText(holder.username, 0, -dh / 2 - 5); }
            }
            ctx.restore();
        });
    }, [state, imageObj, canvasSize, selectedPiece]);

    if (connecting || !state) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#050510]">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/40">Sincronizando Puzzle...</p>
            </div>
        );
    }

    const isAdmin = profile?.role === 'admin';

    return (
        <div className="flex-1 flex flex-col bg-[#050510] text-white overflow-hidden relative">

            {/* ── Header ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/40 backdrop-blur-xl z-20 gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                        <ImageIcon size={16} className="text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-[11px] font-black uppercase tracking-widest leading-none">Co-Op Puzzle</h2>
                        <p className="text-[8px] text-white/30 uppercase tracking-widest mt-1 font-bold hidden sm:block">Resuelve en equipo</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-1 justify-center min-w-0">
                    <div className="flex flex-col gap-1 w-28 sm:w-36">
                        <div className="flex justify-between text-[8px] font-black uppercase text-white/40">
                            <span>Progreso</span>
                            <span className="text-emerald-400">{state.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div className="h-full bg-emerald-500" animate={{ width: `${state.progress}%` }} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-1.5 border border-white/5">
                        <Users size={12} className="text-white/20" />
                        <span className="text-[9px] font-black text-white/60">{state.players?.size || 0}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <AnimatePresence>
                        {state.isCompleted && (
                            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                                <Trophy size={12} />
                                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">¡Completado!</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button onClick={onClose} className="p-2 text-white/20 hover:text-white transition-colors bg-white/5 rounded-xl hover:bg-white/10">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* ── Main Area ── */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">

                {/* ── Canvas ── */}
                <div ref={containerRef}
                    className="flex-1 relative bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px] overflow-hidden flex items-center justify-center p-2 sm:p-4 md:p-8 min-h-0">
                    <div className="absolute inset-0 bg-[#050510]/70 -z-10" />

                    <div className="relative shadow-[0_0_60px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden bg-black/40 border border-white/5"
                        style={{ width: canvasSize.width || '100%', height: canvasSize.height || 300 }}>
                        {!state.imageUri ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                                <div className="w-16 h-16 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-4">
                                    <ImageIcon size={32} />
                                </div>
                                <h3 className="text-base font-black uppercase tracking-[0.2em] mb-3">Mesa de Trabajo</h3>
                                <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em] max-w-[220px] leading-relaxed">
                                    {isHost ? 'Sube una imagen en los controles para comenzar.' : 'Esperando que el anfitrión inicie el rompecabezas.'}
                                </p>
                            </div>
                        ) : (
                            <canvas
                                ref={canvasRef}
                                width={canvasSize.width}
                                height={canvasSize.height}
                                onMouseDown={handlePointerDown}
                                onMouseMove={handlePointerMove}
                                onMouseUp={handlePointerUp}
                                onMouseLeave={handlePointerUp}
                                onTouchStart={handlePointerDown}
                                onTouchMove={handlePointerMove}
                                onTouchEnd={handlePointerUp}
                                className="cursor-crosshair touch-none"
                            />
                        )}
                    </div>
                </div>

                {/* ── Controls Panel ── */}
                <div className="flex-shrink-0">
                    {/* Mobile toggle */}
                    <button
                        className="md:hidden w-full flex items-center justify-between px-4 py-2.5 bg-black/40 border-t border-white/5 text-[9px] font-black uppercase tracking-widest text-white/40"
                        onClick={() => setShowControls(v => !v)}
                    >
                        <span>Controles</span>
                        {showControls ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>

                    <div className={`${showControls ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-56 border-t md:border-t-0 md:border-l border-white/5 bg-black/20 p-4 gap-5 overflow-y-auto max-h-64 md:max-h-full`}>

                        {/* Preview */}
                        <div>
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 mb-2 flex items-center gap-1.5">
                                <Play size={8} /> Objetivo
                            </p>
                            <div className="aspect-square rounded-xl bg-white/5 border border-white/5 overflow-hidden">
                                {state.imageUri
                                    ? <img src={state.imageUri} className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity" alt="Preview" />
                                    : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={24} className="text-white/10" /></div>
                                }
                            </div>
                        </div>

                        {/* Host Controls */}
                        {isHost && (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 mb-2">Dificultad</p>
                                    <div className="grid grid-cols-4 md:grid-cols-2 gap-1.5">
                                        {DIFFICULTIES.map(d => (
                                            <button key={d.label} onClick={() => handleSetup(d)}
                                                className={`py-2 rounded-xl text-[9px] font-black transition-all border ${state.rows === d.rows
                                                    ? 'bg-emerald-500 text-black border-emerald-400'
                                                    : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}>
                                                {d.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 mb-2">Imagen</p>
                                    <label className={`flex flex-col items-center justify-center gap-2 w-full h-10 rounded-xl border border-dashed transition-all cursor-pointer group ${isUploading ? 'bg-white/5 border-white/5 cursor-wait opacity-50' : 'border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5'}`}>
                                        {isUploading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                                <span className="text-[8px] font-black text-white/20 uppercase">Subiendo...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <Upload size={14} className="text-white/20 group-hover:text-emerald-500 transition-colors" />
                                                    <span className="text-[9px] font-black text-white/20 uppercase group-hover:text-emerald-500/50">Subir Foto</span>
                                                </div>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Rotate */}
                        <button
                            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/5"
                            onClick={() => selectedPiece ? handleRotate(selectedPiece) : toast.error("Arrastra una pieza para seleccionarla")}>
                            <RotateCw size={13} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Rotar</span>
                        </button>

                        {/* Players */}
                        <div>
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 mb-2">Colaboradores</p>
                            <div className="space-y-1.5">
                                {state.players && Array.from(state.players.values()).map(p => (
                                    <div key={p.sessionId || p.id} className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/5">
                                        <img src={p.avatar} className="w-5 h-5 rounded-lg border border-white/10" alt="" />
                                        <span className="text-[9px] font-bold text-white/60 truncate">@{p.username}</span>
                                        {p.id === state.hostId && <Crown size={9} className="ml-auto text-amber-400 flex-shrink-0" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="text-[8px] font-black uppercase text-white/20 space-y-1 pt-2 border-t border-white/5">
                            <div className="flex items-center gap-1.5">
                                <Timer size={10} />
                                <span>{state.startTime ? (((state.completeTime || Date.now()) - state.startTime) / 1000).toFixed(0) : 0}s</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Settings2 size={10} />
                                <span>{state.pieces?.size || 0} piezas ({state.rows}×{state.cols})</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
