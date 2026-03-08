import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Image as ImageIcon, RotateCw, CheckCircle2, Timer, Settings2, Upload, Play, Trophy } from 'lucide-react';
import { client } from '../../../services/colyseusClient';
import { useAuthContext } from '../../../contexts/AuthContext';
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
    const canvasRef = useRef(null);

    // Local interaction state
    const [draggingPiece, setDraggingPiece] = useState(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const [tick, setTick] = useState(0);

    // ── Setup Room ──
    useEffect(() => {
        const joinGame = async () => {
            try {
                const puzzleRoom = await client.joinOrCreate("puzzle", {
                    name: profile?.username || user?.displayName || "Anon",
                    avatar: profile?.avatar_url || "/default-avatar.png",
                    roomName: roomName
                });
                setRoom(puzzleRoom);
                setState(puzzleRoom.state);
                setConnecting(false);

                puzzleRoom.onStateChange((newState) => {
                    setState(newState);
                    setTick(t => t + 1);
                });

                puzzleRoom.onMessage("puzzle_complete", (data) => {
                    toast.success(`¡Puzzle completado en ${data.time.toFixed(1)} segundos!`, {
                        icon: '🎉',
                        duration: 5000
                    });
                });

            } catch (e) {
                console.error("Colyseus Error", e);
                toast.error("Error al conectar con la sala");
                onClose();
            }
        };
        joinGame();
        return () => { if (room) room.leave(); };
    }, []);

    // ── Load Image when state.imageUri changes ──
    useEffect(() => {
        if (state?.imageUri) {
            const img = new Image();
            img.onload = () => {
                setImageObj(img);
                calculateCanvasSize(img);
            };
            img.src = state.imageUri;
        } else {
            setImageObj(null);
        }
    }, [state?.imageUri]);

    const calculateCanvasSize = (img) => {
        const container = canvasRef.current?.parentElement;
        if (!container) return;

        const maxWidth = container.clientWidth;
        const maxHeight = container.clientHeight;
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);

        setCanvasSize({
            width: img.width * ratio,
            height: img.height * ratio
        });
    };

    // ── Image Upload (Host Only) ──
    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Resize image to max 1280px to avoid large payload errors
                const maxDim = 1000;
                let w = img.width;
                let h = img.height;
                if (w > maxDim || h > maxDim) {
                    const ratio = maxDim / Math.max(w, h);
                    w *= ratio;
                    h *= ratio;
                }
                const offCanvas = document.createElement('canvas');
                offCanvas.width = w;
                offCanvas.height = h;
                const ctx = offCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const smallUri = offCanvas.toDataURL('image/jpeg', 0.8);

                room.send("setup_puzzle", {
                    imageUri: smallUri,
                    rows: 4,
                    cols: 4
                });
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleSetup = (diff) => {
        if (!state.imageUri) return;
        room.send("setup_puzzle", {
            imageUri: state.imageUri,
            rows: diff.rows,
            cols: diff.cols
        });
    };

    // ── Canvas Interaction ──
    const handleMouseDown = (e) => {
        if (!state || !imageObj) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Scale coordinates from canvas pixels to normalized 0-100 range? 
        // No, let's work in canvas pixels and normalize back to 100-based state.
        const normalizedX = (mouseX / canvasSize.width) * (state.cols * 100);
        const normalizedY = (mouseY / canvasSize.height) * (state.rows * 100);

        // Find piece under mouse (topmost first)
        let found = null;
        state.pieces?.forEach((p) => {
            if (p.isLocked) return;
            if (normalizedX >= p.x && normalizedX <= p.x + p.width &&
                normalizedY >= p.y && normalizedY <= p.y + p.height) {
                found = p;
            }
        });

        if (found) {
            setDraggingPiece(found.id);
            setOffset({
                x: normalizedX - found.x,
                y: normalizedY - found.y
            });
        }
    };

    const handleMouseMove = (e) => {
        if (!draggingPiece || !room) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const normalizedX = (mouseX / canvasSize.width) * (state.cols * 100);
        const normalizedY = (mouseY / canvasSize.height) * (state.rows * 100);

        room.send("move_piece", {
            id: draggingPiece,
            x: normalizedX - offset.x,
            y: normalizedY - offset.y
        });
    };

    const handleMouseUp = () => {
        if (draggingPiece) {
            room.send("release_piece", { id: draggingPiece });
            setDraggingPiece(null);
        }
    };

    const handleRotate = (id) => {
        if (room) room.send("rotate_piece", { id });
    };

    // ── Rendering Loop ──
    useEffect(() => {
        if (!imageObj || !canvasRef.current || !state) return;
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

        // Draw shadow/blueprint
        ctx.globalAlpha = 0.1;
        ctx.drawImage(imageObj, 0, 0, canvasSize.width, canvasSize.height);
        ctx.globalAlpha = 1;

        // Draw pieces
        const sw = imageObj.width / state.cols;
        const sh = imageObj.height / state.rows;
        const dw = canvasSize.width / state.cols;
        const dh = canvasSize.height / state.rows;

        // Sort: locked on bottom, active on top
        const sortedPieces = Array.from(state.pieces?.values() || []).sort((a, b) => {
            if (a.isLocked && !b.isLocked) return -1;
            if (!a.isLocked && b.isLocked) return 1;
            return 0;
        });

        sortedPieces.forEach((p) => {
            const px = (p.x / (state.cols * 100)) * canvasSize.width;
            const py = (p.y / (state.rows * 100)) * canvasSize.height;

            ctx.save();
            ctx.translate(px + dw / 2, py + dh / 2);
            ctx.rotate((p.rotation * Math.PI) / 180);

            // Source coordinates from ID piece_r_c
            const [, r, c] = p.id.split('_').map(Number);

            // Piece Clipping
            ctx.beginPath();
            ctx.rect(-dw / 2, -dh / 2, dw, dh);
            ctx.clip();

            ctx.drawImage(
                imageObj,
                c * sw, r * sh, sw, sh,
                -dw / 2, -dh / 2, dw, dh
            );

            // Border
            ctx.strokeStyle = p.isLocked ? 'rgba(34, 197, 94, 0.5)' : (p.heldBy ? 'rgba(236, 72, 153, 0.8)' : 'rgba(255, 255, 255, 0.2)');
            ctx.lineWidth = p.isLocked ? 2 : 1;
            ctx.strokeRect(-dw / 2, -dh / 2, dw, dh);

            if (p.heldBy) {
                const holder = state.players?.get?.(p.heldBy);
                if (holder) {
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 10px Inter';
                    ctx.textAlign = 'center';
                    ctx.fillText(holder.name, 0, -dh / 2 - 5);
                }
            }

            ctx.restore();
        });
    }, [tick, imageObj, canvasSize]);

    if (connecting || !state) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#050510]">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/40">Sincronizando Puzzle...</p>
            </div>
        );
    }

    const isHost = state.hostId === room.sessionId;

    return (
        <div className="flex-1 flex flex-col bg-[#050510] text-white overflow-hidden relative">
            {/* ── Header ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur-xl z-20">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                            <ImageIcon size={20} className="text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-xs font-black uppercase tracking-widest leading-none">Co-Op Puzzle</h2>
                            <p className="text-[9px] text-white/30 uppercase tracking-widest mt-1.5 font-bold">Resuelve en equipo</p>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-white/5" />

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1 w-32">
                            <div className="flex justify-between text-[8px] font-black uppercase text-white/40">
                                <span>Progreso</span>
                                <span className="text-emerald-400">{state.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                                    animate={{ width: `${state.progress}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2 border border-white/5">
                            <Users size={14} className="text-white/20" />
                            <span className="text-[10px] font-black text-white/60">{state.players?.size || 0} en línea</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <AnimatePresence>
                        {state.isCompleted && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/20"
                            >
                                <Trophy size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">¡Completado!</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button onClick={onClose} className="p-2 text-white/20 hover:text-white transition-colors bg-white/5 rounded-xl hover:bg-white/10">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* ── Main Area ── */}
            <div className="flex-1 flex overflow-hidden">
                {/* ── Left Sidebar (Tools) ── */}
                <div className="w-64 border-r border-white/5 bg-black/20 flex flex-col p-6 z-10">
                    <div className="flex-1 space-y-8">
                        {/* Image Preview */}
                        <div>
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 mb-3 flex items-center gap-2">
                                <Play size={10} /> Objetivo
                            </p>
                            <div className="aspect-square rounded-2xl bg-white/5 border border-white/5 overflow-hidden relative group">
                                {state.imageUri ? (
                                    <img src={state.imageUri} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="Preview" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                                        <ImageIcon size={32} className="text-white/10 mb-2" />
                                        <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest">Esperando imagen...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Host Controls */}
                        {isHost && (
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 mb-3">Dificultad</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {DIFFICULTIES.map(d => (
                                            <button
                                                key={d.label}
                                                onClick={() => handleSetup(d)}
                                                className={`py-2.5 rounded-xl text-[10px] font-black transition-all border ${state.rows === d.rows
                                                    ? 'bg-emerald-500 text-black border-emerald-400'
                                                    : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                                                    }`}
                                            >
                                                {d.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 mb-3">Nueva Imagen</p>
                                    <label className="flex flex-col items-center justify-center w-full h-32 rounded-2xl border-2 border-dashed border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all cursor-pointer group">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload size={24} className="text-white/10 mb-2 group-hover:text-emerald-500 transition-colors" />
                                            <p className="text-[9px] font-black text-white/20 uppercase group-hover:text-emerald-500/50 transition-colors">Subir Foto</p>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Players List */}
                        <div>
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 mb-3">Colaboradores</p>
                            <div className="space-y-2">
                                {state.players && Array.from(state.players.values()).map(p => (
                                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
                                        <img src={p.avatar} className="w-6 h-6 rounded-lg border border-white/10" alt="" />
                                        <span className="text-[10px] font-bold text-white/60 truncate">@{p.name}</span>
                                        {p.id === state.hostId && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="Host" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-white/5">
                        <button
                            className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/5"
                            onClick={() => {
                                if (draggingPiece) handleRotate(draggingPiece);
                                else toast.error("Arrastra una pieza para rotarla");
                            }}
                        >
                            <RotateCw size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Rotar Selección</span>
                        </button>
                    </div>
                </div>

                {/* ── Game Canvas ── */}
                <div className="flex-1 relative bg-[url('/bg_grid.png')] bg-repeat bg-center overflow-hidden flex items-center justify-center p-12">
                    <div className="absolute inset-0 bg-[#050510]/80 backdrop-blur-sm -z-10" />

                    <div
                        className="relative shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden bg-black/40 border border-white/5"
                        style={{ width: canvasSize.width || 400, height: canvasSize.height || 400 }}
                    >
                        {!state.imageUri ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
                                <div className="w-20 h-20 rounded-[2.5rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-6">
                                    <ImageIcon size={40} />
                                </div>
                                <h3 className="text-xl font-black uppercase tracking-[0.2em] mb-4">Mesa de Trabajo</h3>
                                <p className="text-[11px] text-white/30 font-bold uppercase tracking-[0.3em] max-w-[240px] leading-relaxed">
                                    {isHost ? 'Selecciona una imagen en el panel lateral para comenzar el puzzle.' : 'Esperando que el anfitrión inicie el rompecabezas.'}
                                </p>
                            </div>
                        ) : (
                            <canvas
                                ref={canvasRef}
                                width={canvasSize.width}
                                height={canvasSize.height}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                className="cursor-crosshair"
                            />
                        )}
                    </div>

                    {/* Background Visuals */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-emerald-500/5 rounded-full -z-20 pointer-events-none" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-emerald-500/10 rounded-full -z-20 pointer-events-none" />
                </div>
            </div>

            {/* ── Footer Stats ── */}
            <div className="flex-shrink-0 px-6 py-3 border-t border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between z-20">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Timer size={14} className="text-white/20" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                            Tiempo: {state.startTime ? ((state.completeTime || Date.now()) - state.startTime) / 1000 : 0}s
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Settings2 size={14} className="text-white/20" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                            Piezas: {state.pieces?.size || 0} ({state.rows}x{state.cols})
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Servidor Activo • Latencia Estable</p>
                </div>
            </div>
        </div>
    );
}
