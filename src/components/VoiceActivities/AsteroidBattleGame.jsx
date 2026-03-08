import React, { useEffect, useRef, useState } from 'react';
import { client } from '../../services/colyseusClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { useLocalParticipant } from '@livekit/components-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Trophy, Heart, Zap, X, Move, Rocket, Timer } from 'lucide-react';
import toast from 'react-hot-toast';

const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 700;

export default function AsteroidBattleGame({ roomName, onClose }) {
    const { user, profile } = useAuthContext();
    const { localParticipant } = useLocalParticipant();
    const canvasRef = useRef(null);
    const [room, setRoom] = useState(null);
    const [state, setState] = useState(null);
    const [myId, setMyId] = useState(null);
    const [connecting, setConnecting] = useState(true);

    const keysRef = useRef({ w: false, a: false, s: false, d: false });
    const mouseRef = useRef({ x: 0, y: 0 });
    const joystickRef = useRef({ active: false, x: 0, y: 0 });

    useEffect(() => {
        const connect = async () => {
            try {
                const r = await client.joinOrCreate("asteroid-battle", {
                    roomName,
                    name: profile?.username || user?.user_metadata?.username || "Pilot",
                    color: profile?.accent_color || "#0ea5e9"
                });
                setRoom(r);
                setMyId(r.sessionId);
                setConnecting(false);

                r.onStateChange((s) => setState({
                    players: Array.from(s.players.values()),
                    asteroids: Array.from(s.asteroids.values()),
                    bullets: Array.from(s.bullets.values()),
                    timeLeft: s.timeLeft,
                    phase: s.phase
                }));
            } catch (e) {
                console.error(e);
                toast.error("Error al conectar al campo de batalla");
            }
        };
        connect();
        return () => { if (room) room.leave(); };
    }, [roomName]);

    // Loop for sending inputs
    useEffect(() => {
        if (!room) return;
        const interval = setInterval(() => {
            const myPlayer = state?.players?.find(p => p.sessionId === myId);
            if (!myPlayer) return;

            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();

            let rotation = myPlayer.rotation;
            if (!joystickRef.current.active) {
                const relX = mouseRef.current.x - rect.left;
                const relY = mouseRef.current.y - rect.top;
                const scaleX = WORLD_WIDTH / rect.width;
                const scaleY = WORLD_HEIGHT / rect.height;
                rotation = Math.atan2(relY * scaleY - myPlayer.y, relX * scaleX - myPlayer.x);
            } else {
                if (Math.abs(joystickRef.current.x) > 0.1 || Math.abs(joystickRef.current.y) > 0.1) {
                    rotation = Math.atan2(joystickRef.current.y, joystickRef.current.x);
                }
            }

            const keys = { ...keysRef.current };
            if (joystickRef.current.active) {
                keys.w = joystickRef.current.y < -0.3;
                keys.s = joystickRef.current.y > 0.3;
                keys.a = joystickRef.current.x < -0.3;
                keys.d = joystickRef.current.x > 0.3;
            }

            room.send("input", { keys, rotation });
        }, 32);
        return () => clearInterval(interval);
    }, [room, state, myId]);

    // Input handlers
    useEffect(() => {
        const handleDown = (e) => {
            const key = e.key.toLowerCase();
            if (['w', 'a', 's', 'd'].includes(key)) keysRef.current[key] = true;
        };
        const handleUp = (e) => {
            const key = e.key.toLowerCase();
            if (['w', 'a', 's', 'd'].includes(key)) keysRef.current[key] = false;
        };
        const handleMouseMove = (e) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };
        const handleClick = (e) => {
            if (e.target.closest('button')) return;
            room?.send("shoot");
        };

        window.addEventListener('keydown', handleDown);
        window.addEventListener('keyup', handleUp);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleClick);
        return () => {
            window.removeEventListener('keydown', handleDown);
            window.removeEventListener('keyup', handleUp);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleClick);
        };
    }, [room]);

    // Rendering
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !state) return;
        const ctx = canvas.getContext('2d');
        let frame;

        const render = () => {
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

            // Grid
            ctx.strokeStyle = 'rgba(34, 211, 238, 0.04)';
            ctx.lineWidth = 1;
            for (let x = 0; x < WORLD_WIDTH; x += 100) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_HEIGHT); ctx.stroke(); }
            for (let y = 0; y < WORLD_HEIGHT; y += 100) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_WIDTH, y); ctx.stroke(); }

            // Bullets
            state.bullets.forEach(b => {
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#fff';
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
            });

            // Asteroids
            state.asteroids.forEach(ast => {
                ctx.save();
                ctx.translate(ast.x, ast.y);
                ctx.strokeStyle = '#64748b';
                ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
                ctx.lineWidth = 2;
                const r = ast.size * 20;
                ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const seed = (parseInt(ast.id.slice(-4)) || 0) + i;
                    const d = r * (0.8 + ((seed % 5) / 10));
                    const px = Math.cos(angle) * d;
                    const py = Math.sin(angle) * d;
                    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // CRACKS inside asteroids based on HP
                if (ast.hp < 40) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                    ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(5, 5); ctx.stroke();
                }

                ctx.restore();
            });

            // Players
            state.players.forEach(p => {
                if (p.hp <= 0 || p.lives <= 0) return;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);

                // Ship Glow
                ctx.shadowBlur = 15;
                ctx.shadowColor = p.color;

                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.moveTo(20, 0); ctx.lineTo(-12, 14); ctx.lineTo(-6, 0); ctx.lineTo(-12, -14);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.restore();

                // Player Info Overlay
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px Inter';
                ctx.textAlign = 'center';
                ctx.fillText(p.name, p.x, p.y - 32);

                // Mini HP Bar
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(p.x - 20, p.y - 24, 40, 4);
                ctx.fillStyle = p.hp > 30 ? p.color : '#ef4444';
                ctx.fillRect(p.x - 20, p.y - 24, 40 * (p.hp / 100), 4);
            });

            frame = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(frame);
    }, [state]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleJoystick = (e) => {
        const touch = e.touches[0];
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const dx = (touch.clientX - rect.left) - centerX;
        const dy = (touch.clientY - rect.top) - centerY;
        const max = centerX;
        joystickRef.current = { active: true, x: dx / max, y: dy / max };
    };

    if (connecting) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#020617]">
                <div className="w-16 h-16 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin mb-6" />
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-cyan-400">Iniciando Sistemas de Combate...</p>
            </div>
        );
    }

    const myPlayer = state?.players?.find(p => p.sessionId === myId);
    const sortedPlayers = [...(state?.players || [])].sort((a, b) => b.score - a.score);
    const isSpectating = !myPlayer;
    const canJoin = isSpectating && (state?.players?.length || 0) < 4;

    const handleJoin = () => {
        if (!room) return;
        room.send("join_game", {
            name: profile?.username || user?.user_metadata?.username || "Pilot",
            color: profile?.accent_color || "#0ea5e9"
        });
    };

    return (
        <div className="flex-1 flex flex-col bg-[#020617] h-full overflow-hidden relative font-sans select-none">
            <style>{styles}</style>

            {/* Join Overlay / Game Finished / Out of Lives */}
            <AnimatePresence>
                {(isSpectating || state?.phase === 'finished' || (myPlayer && myPlayer.lives <= 0)) && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md pointer-events-none"
                    >
                        <div className="bg-[#050518]/90 border border-white/10 p-12 rounded-[4rem] shadow-2xl flex flex-col items-center pointer-events-auto max-w-sm w-full text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />

                            {state?.phase === 'finished' ? (
                                <>
                                    <Trophy size={64} className="text-amber-400 mb-6 drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]" />
                                    <h3 className="text-2xl font-black text-white uppercase tracking-[0.2em] mb-4">Batalla Finalizada</h3>
                                    <div className="w-full bg-white/5 rounded-3xl p-6 mb-8 border border-white/5">
                                        <p className="text-[10px] text-white/40 uppercase tracking-widest mb-4">Ganador de la Ronda</p>
                                        <div className="flex items-center justify-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/20">
                                                <Rocket size={24} className="text-amber-400" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-xl font-black text-white uppercase truncate">{sortedPlayers[0]?.name || "Nadie"}</p>
                                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{sortedPlayers[0]?.score || 0} PTS</p>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={handleJoin} className="w-full py-5 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-cyan-400 transition-all active:scale-95">Reiniciar Partida</button>
                                </>
                            ) : myPlayer && myPlayer.lives <= 0 ? (
                                <>
                                    <X size={64} className="text-rose-500 mb-6 drop-shadow-[0_0_20px_rgba(244,63,94,0.4)]" />
                                    <h3 className="text-2xl font-black text-rose-500 uppercase tracking-[0.2em] mb-4">Misión Fallida</h3>
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-8">Has perdido todas tus unidades</p>
                                    <button onClick={handleJoin} className="w-full py-5 bg-rose-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-rose-500 transition-all active:scale-95">Re-intentar Despegue</button>
                                </>
                            ) : (
                                <>
                                    <Rocket size={56} className="text-cyan-400 mb-8 animate-rocket-float" />
                                    <h3 className="text-2xl font-black text-white uppercase tracking-[0.3em] mb-3">Arena Estelar</h3>
                                    <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-10 leading-relaxed px-4">
                                        {canJoin
                                            ? "Sistemas en línea. Tienes 3 vidas para dominar la galaxia."
                                            : "Arena saturada por interferencias. Espera a que un piloto caiga."}
                                    </p>

                                    {canJoin ? (
                                        <button
                                            onClick={handleJoin}
                                            className="group relative w-full py-5 bg-cyan-600 text-black font-black uppercase tracking-[0.2em] rounded-3xl overflow-hidden active:scale-95 transition-all shadow-2xl shadow-cyan-500/20"
                                        >
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                                            <span className="relative">Iniciar Despegue</span>
                                        </button>
                                    ) : (
                                        <div className="w-full py-5 bg-white/5 border border-white/10 rounded-3xl text-[10px] font-black text-white/20 uppercase tracking-widest">Puestos Agotados</div>
                                    )}
                                </>
                            )}
                            <p className="mt-8 text-[9px] text-white/20 uppercase tracking-[0.4em] font-black">Spacely Asteroid Battle — v2.0</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* TOP HUD - Timer & Ranking Center */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-6">
                <div className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-full px-8 py-3 flex items-center gap-4 shadow-2xl">
                    <Timer size={18} className="text-cyan-400" />
                    <span className="text-2xl font-black text-white font-mono tracking-wider w-16 text-center">{formatTime(state?.timeLeft || 0)}</span>
                </div>
            </div>

            {/* HUD Left - Player Stats (Score, HP, Lives) */}
            {!isSpectating && (
                <div className="absolute top-6 left-6 flex flex-col gap-4 z-30 pointer-events-none max-w-[280px]">
                    {/* Score Panel */}
                    <div className="flex items-center gap-4 bg-black/70 backdrop-blur-2xl border border-white/10 p-4 rounded-[2rem] shadow-2xl">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                            <Zap size={20} className="text-cyan-400" />
                        </div>
                        <div>
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">Puntuación</p>
                            <p className="text-xl font-black text-white leading-none tracking-tight">{myPlayer?.score || 0}</p>
                        </div>
                    </div>

                    {/* Integrated HP & Lives Panel */}
                    <div className="bg-black/70 backdrop-blur-2xl border border-white/10 p-4 rounded-[2rem] shadow-2xl flex flex-col gap-3">
                        {/* HP Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-white/60">
                                <div className="flex items-center gap-2">
                                    <Heart size={10} className={`fill-current ${myPlayer?.hp > 30 ? 'text-rose-500' : 'text-rose-600 animate-pulse'}`} />
                                    <span>Integridad</span>
                                </div>
                                <span className={myPlayer?.hp <= 30 ? 'text-rose-500' : 'text-white'}>{Math.ceil(myPlayer?.hp || 0)}%</span>
                            </div>
                            <div className="w-full h-2 bg-black/40 border border-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: '100%' }}
                                    animate={{ width: `${myPlayer?.hp || 0}%` }}
                                    className={`h-full rounded-full ${myPlayer?.hp > 30 ? 'bg-cyan-500' : 'bg-rose-500'}`}
                                />
                            </div>
                        </div>

                        {/* Lives Icons */}
                        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                            {[...Array(3)].map((_, i) => (
                                <Rocket
                                    key={i}
                                    size={14}
                                    className={`transition-all ${i < (myPlayer?.lives || 0) ? 'text-cyan-400' : 'text-white/5'}`}
                                    strokeWidth={i < (myPlayer?.lives || 0) ? 3 : 1}
                                />
                            ))}
                            <span className="ml-auto text-[7px] font-black text-white/30 uppercase tracking-widest leading-none">Vidas</span>
                        </div>
                    </div>
                </div>
            )}

            {/* HUD Right - Full Leaderboard */}
            <div className="absolute top-6 right-6 flex flex-col items-end gap-3 z-30">
                <button onClick={onClose} className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center hover:bg-rose-500/20 transition-all pointer-events-auto backdrop-blur-xl">
                    <X size={28} />
                </button>

                <div className="bg-black/90 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 w-64 shadow-2xl pointer-events-none hidden lg:block">
                    <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                        <Trophy size={16} className="text-amber-400" />
                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/60">Ranking Global</span>
                    </div>
                    <div className="space-y-4">
                        {sortedPlayers.map((p, i) => (
                            <div key={p.sessionId} className={`flex justify-between items-center p-4 rounded-3xl border transition-all ${p.sessionId === myId ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/5 border-transparent'}`}>
                                <div className="flex items-center gap-4 truncate">
                                    <span className={`text-[10px] font-black ${i < 3 ? 'text-amber-400' : 'text-white/20'}`}>{i + 1}</span>
                                    <div className="flex flex-col">
                                        <span className={`text-[11px] font-black truncate uppercase tracking-widest ${p.id === myId ? 'text-cyan-400' : 'text-white'}`}>{p.name}</span>
                                        <span className="text-[8px] font-black text-white/30 uppercase">{p.lives} VIDAS</span>
                                    </div>
                                </div>
                                <span className="text-[11px] font-black text-amber-500/90">{p.score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Alerts Center */}
            {!isSpectating && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center">
                    <AnimatePresence>
                        {myPlayer?.hp <= 0 && myPlayer?.lives > 0 && (
                            <motion.p initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-500 animate-pulse p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 backdrop-blur-xl">
                                Alerta: Nave Destruida · Re-generando...
                            </motion.p>
                        )}
                        {myPlayer?.lives <= 0 && (
                            <motion.p initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-600 p-3 rounded-2xl bg-black/80 border border-rose-600/40 backdrop-blur-xl shadow-2xl">
                                Batalla Finalizada · Sin Vidas
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Mobile Controls */}
            {!isSpectating && myPlayer?.lives > 0 && (
                <div className="absolute inset-0 z-20 sm:hidden pointer-events-none">
                    <div
                        className="absolute bottom-10 left-10 w-36 h-36 rounded-full bg-white/5 border border-white/10 backdrop-blur-md pointer-events-auto flex items-center justify-center p-4 shadow-2xl"
                        onTouchMove={handleJoystick}
                        onTouchEnd={() => joystickRef.current = { active: false, x: 0, y: 0 }}
                    >
                        <div className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shadow-inner">
                            <Move size={24} className="text-cyan-400 opacity-50" />
                        </div>
                    </div>
                    <div
                        className="absolute bottom-10 right-10 w-28 h-28 rounded-full bg-rose-500/10 border border-rose-500/30 backdrop-blur-md pointer-events-auto flex items-center justify-center active:scale-90 transition-all shadow-[0_0_50px_rgba(244,63,94,0.15)] shadow-rose-500/10"
                        onPointerDown={() => room?.send("shoot")}
                    >
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-t border-white/20">
                            <Zap size={32} className="text-white drop-shadow-md" />
                        </div>
                    </div>
                </div>
            )}

            {/* Canvas Area */}
            <div className="flex-1 relative cursor-none overflow-hidden touch-none">
                <canvas
                    ref={canvasRef}
                    width={WORLD_WIDTH}
                    height={WORLD_HEIGHT}
                    className="w-full h-full object-contain"
                />
                {!isSpectating && (
                    <div
                        className="fixed pointer-events-none z-50 text-cyan-400 -translate-x-1/2 -translate-y-1/2 hidden sm:block shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                        style={{ left: mouseRef.current.x, top: mouseRef.current.y }}
                    >
                        <div className="relative">
                            <Crosshair size={44} strokeWidth={1.5} className="animate-spin-slow opacity-60" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_5px_white]" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = `
.animate-spin-slow { animation: spin 10s linear infinite; }
.animate-rocket-float { animation: float 3s ease-in-out infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes float { 
    0%, 100% { transform: translateY(0) rotate(0deg); } 
    50% { transform: translateY(-15px) rotate(5deg); } 
}
`;
