import React, { useEffect, useRef, useState } from 'react';
import { client } from '../../services/colyseusClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { useLocalParticipant } from '@livekit/components-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Trophy, Heart, Zap, X, Move, Rocket, Timer, Crown, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { getLeaderboard } from '../../services/supabaseScores';

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
    const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);
    const [lbTab, setLbTab] = useState('match'); // 'match' or 'global'
    const [globalLevels, setGlobalLevels] = useState([]);

    const keysRef = useRef({ w: false, a: false, s: false, d: false });
    const mouseRef = useRef({ x: 0, y: 0 });
    const joystickRef = useRef({ active: false, x: 0, y: 0 });

    useEffect(() => {
        let activeRoom = null;
        const connect = async () => {
            try {
                const r = await client.joinOrCreate("asteroid-battle", {
                    roomName,
                    userId: user?.id,
                    username: profile?.username || user?.user_metadata?.username || "Pilot",
                    avatar: profile?.avatar_url || "/default-avatar.png",
                    color: profile?.accent_color || "#0ea5e9"
                });
                activeRoom = r;
                setRoom(r);
                setMyId(r.sessionId);
                setConnecting(false);

                r.onStateChange((s) => {
                    setState(s);
                });
            } catch (e) {
                console.error(e);
                toast.error("Error al conectar al campo de batalla");
            }
        };
        connect();
        return () => { if (activeRoom) activeRoom.leave(); };
    }, [roomName]);

    useEffect(() => {
        const fetchGlobal = async () => {
            const data = await getLeaderboard('asteroid_battle', 10);
            setGlobalLevels(data);
        };
        fetchGlobal();
        // Refresh when game ends
        if (state?.phase === 'finished') fetchGlobal();
    }, [state?.phase]);

    // Loop for sending inputs
    useEffect(() => {
        if (!room) return;
        const interval = setInterval(() => {
            const playersArr = Array.from(state?.players?.values() || []);
            const myPlayer = playersArr.find(p => p.sessionId === myId);
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
            Array.from(state.bullets || []).forEach(b => {
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2); ctx.fill();
            });

            // Asteroids
            Array.from(state.asteroids?.values() || []).forEach(ast => {
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
                if (ast.hp < 40) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                    ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(5, 5); ctx.stroke();
                }
                ctx.restore();
            });

            // Players
            Array.from(state.players?.values() || []).forEach(p => {
                if (p.hp <= 0 || p.lives <= 0 || !p.isParticipating) return;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.moveTo(20, 0); ctx.lineTo(-12, 14); ctx.lineTo(-6, 0); ctx.lineTo(-12, -14);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
                ctx.restore();

                // Name
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px Inter';
                ctx.textAlign = 'center';
                ctx.fillText(p.username || "Piloto", p.x, p.y - 32);

                // HP Bar
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

    if (connecting || !state) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#020617]">
                <div className="w-16 h-16 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin mb-6" />
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-cyan-400">Sincronizando Órbita...</p>
            </div>
        );
    }

    const playersArr = Array.from(state?.players?.values() || []);
    const myPlayer = playersArr.find(p => p.sessionId === myId);
    const sortedPlayers = [...playersArr].filter(p => p.isParticipating).sort((a, b) => b.score - a.score);
    const isSpectating = !myPlayer || !myPlayer.isParticipating;
    const currentParticipating = playersArr.filter(p => p.isParticipating);
    const canJoin = isSpectating && currentParticipating.length < 4;

    const handleJoin = () => {
        if (!room) return;
        room.send("join_game", {
            username: profile?.username || user?.user_metadata?.username || "Pilot",
            color: profile?.accent_color || "#0ea5e9"
        });
    };

    return (
        <div className="flex-1 flex flex-col bg-[#02020a] h-full overflow-hidden relative font-sans select-none">
            <style>{styles}</style>

            {/* Overlays */}
            <AnimatePresence>
                {(isSpectating || state?.phase === 'finished' || (myPlayer && myPlayer.lives <= 0)) && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6"
                    >
                        <div className="bg-[#050518]/90 border border-white/10 p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[4rem] shadow-2xl flex flex-col items-center max-w-sm w-full text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />

                            {state?.phase === 'finished' ? (
                                <>
                                    <Trophy size={48} className="text-amber-400 mb-6" />
                                    <h3 className="text-xl font-black text-white uppercase tracking-widest mb-4">Batalla Finalizada</h3>
                                    <div className="w-full bg-white/5 rounded-2xl p-4 mb-6">
                                        <p className="text-[14px] font-black text-white">{sortedPlayers[0]?.username || "Nadie"}</p>
                                        <p className="text-[10px] text-amber-500 font-bold uppercase">{sortedPlayers[0]?.score || 0} PTS</p>
                                    </div>
                                    <button onClick={handleJoin} className="w-full py-4 bg-white text-black font-black uppercase rounded-xl">Revancha</button>
                                </>
                            ) : myPlayer && myPlayer.lives <= 0 ? (
                                <>
                                    <X size={48} className="text-rose-500 mb-6" />
                                    <h3 className="text-xl font-black text-rose-500 uppercase tracking-widest mb-2">Misión Fallida</h3>
                                    <p className="text-[9px] text-white/40 uppercase mb-6">Unidades agotadas</p>
                                    <button onClick={handleJoin} className="w-full py-4 bg-rose-600 text-white font-black uppercase rounded-xl">Intentar de nuevo</button>
                                </>
                            ) : (
                                <>
                                    <Rocket size={48} className="text-cyan-400 mb-6 animate-rocket-float" />
                                    <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">Arena Estelar</h3>
                                    <p className="text-[9px] text-white/30 uppercase mb-8">Sobrevive y destruye los asteroides</p>
                                    <button onClick={handleJoin} className="w-full py-4 bg-cyan-600 text-black font-black uppercase rounded-xl active:scale-95 transition-transform">Iniciar Despegue</button>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header HUD */}
            <div className="absolute top-4 left-0 w-full px-4 sm:px-6 flex justify-between items-center z-40 pointer-events-none">
                <div className="flex items-center gap-3">
                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-3">
                        <Timer size={14} className="text-cyan-400" />
                        <span className="text-lg font-black text-white font-mono">{formatTime(state?.timeLeft || 0)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                    <button
                        onClick={() => setShowMobileLeaderboard(!showMobileLeaderboard)}
                        className="lg:hidden w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-cyan-400 flex items-center justify-center backdrop-blur-xl"
                    >
                        <Users size={18} />
                    </button>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center backdrop-blur-xl">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Player Stats HUD (Bottom Left on Mobile) */}
            {!isSpectating && (
                <div className="absolute bottom-44 left-4 lg:top-24 lg:left-6 flex flex-col gap-3 z-30 pointer-events-none max-w-[200px]">
                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-3 rounded-2xl flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center"><Zap size={16} className="text-cyan-400" /></div>
                        <span className="text-lg font-black text-white">{myPlayer?.score || 0}</span>
                    </div>

                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-3 rounded-2xl space-y-2">
                        <div className="flex justify-between text-[8px] font-black uppercase text-white/40">
                            <span>Integridad</span>
                            <span>{Math.ceil(myPlayer?.hp || 0)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                            <motion.div animate={{ width: `${myPlayer?.hp || 0}%` }} className={`h-full ${myPlayer?.hp > 30 ? 'bg-cyan-500' : 'bg-rose-500'}`} />
                        </div>
                        <div className="flex gap-1 pt-1 opacity-60">
                            {[...Array(3)].map((_, i) => (
                                <Rocket key={i} size={10} className={i < (myPlayer?.lives || 0) ? 'text-cyan-400' : 'text-white/10'} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard (Desktop Sidebar / Mobile Overlay) */}
            <AnimatePresence>
                {showMobileLeaderboard && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setShowMobileLeaderboard(false)}
                        className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]"
                    />
                )}
                {(showMobileLeaderboard || (window.innerWidth >= 1024)) && (
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        className={`fixed lg:absolute top-0 right-0 h-full lg:h-auto lg:top-24 lg:right-6 lg:w-64 z-[60] lg:z-30 p-6 pt-24 lg:p-0 
                        ${showMobileLeaderboard ? 'w-[280px] bg-[#050518] border-l border-white/10' : 'hidden lg:block'}`}
                    >
                        <div className="bg-black/40 lg:bg-black/60 lg:backdrop-blur-xl lg:border border-white/10 rounded-3xl lg:p-6 space-y-4 relative">
                            {showMobileLeaderboard && (
                                <button
                                    onClick={() => setShowMobileLeaderboard(false)}
                                    className="absolute top-0 right-0 p-2 text-white/40 hover:text-white lg:hidden"
                                >
                                    <X size={16} />
                                </button>
                            )}
                            <div className="flex items-center gap-2 text-amber-400 pb-2 border-b border-white/5">
                                <Trophy size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Líderes Galácticos</span>
                            </div>
                            <div className="flex border-b border-white/5 pb-2">
                                <button
                                    onClick={() => setLbTab('match')}
                                    className={`flex-1 text-[9px] font-black uppercase tracking-widest py-1 transition-colors ${lbTab === 'match' ? 'text-cyan-400' : 'text-white/40'}`}
                                >
                                    Partida
                                </button>
                                <button
                                    onClick={() => setLbTab('global')}
                                    className={`flex-1 text-[9px] font-black uppercase tracking-widest py-1 transition-colors ${lbTab === 'global' ? 'text-amber-400' : 'text-white/40'}`}
                                >
                                    Global
                                </button>
                            </div>

                            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                                {lbTab === 'match' ? (
                                    sortedPlayers.map((p, i) => (
                                        <div key={p.sessionId} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                            <div className="flex flex-col">
                                                <span className={`text-[10px] font-black uppercase ${p.sessionId === myId ? 'text-cyan-400' : 'text-white'}`}>
                                                    {i + 1}. {p.username || "Piloto"}
                                                </span>
                                                <div className="flex gap-1 mt-1 opacity-40">
                                                    {[...Array(p.lives)].map((_, j) => <div key={j} className="w-1 h-1 bg-white rounded-full" />)}
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-amber-500">{p.score}</span>
                                        </div>
                                    ))
                                ) : (
                                    globalLevels.map((p, i) => (
                                        <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <img src={p.avatar_url || "/default-avatar.png"} className="w-6 h-6 rounded-lg bg-white/10" alt="" />
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-black uppercase ${p.user_id === user?.id ? 'text-amber-400' : 'text-white'}`}>
                                                        {i + 1}. {p.username || "Piloto"}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-amber-500">{p.max_score}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Canvas / Mobile Controls */}
            <div className="flex-1 relative overflow-hidden touch-none">
                <canvas ref={canvasRef} width={WORLD_WIDTH} height={WORLD_HEIGHT} className="w-full h-full object-contain" />

                {!isSpectating && myPlayer?.lives > 0 && (
                    <div className="absolute inset-0 z-20 pointer-events-none lg:hidden">
                        {/* Joystick */}
                        <div
                            className="absolute bottom-8 left-8 w-32 h-32 rounded-full bg-white/5 border border-white/10 backdrop-blur-md pointer-events-auto flex items-center justify-center"
                            onTouchMove={handleJoystick}
                            onTouchEnd={() => joystickRef.current = { active: false, x: 0, y: 0 }}
                        >
                            <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.2)]" />
                        </div>
                        {/* Shooting Button */}
                        <button
                            onPointerDown={() => room?.send("shoot")}
                            className="absolute bottom-10 right-10 w-24 h-24 rounded-full bg-rose-500/20 border-2 border-rose-500/40 backdrop-blur-xl pointer-events-auto flex items-center justify-center active:scale-90 transition-transform shadow-[0_0_40px_rgba(244,63,94,0.2)]"
                        >
                            <Zap size={32} className="text-white fill-current" />
                        </button>
                    </div>
                )}

                {/* Desktop Cursor */}
                {!isSpectating && (
                    <div className="fixed pointer-events-none z-50 text-cyan-400 -translate-x-1/2 -translate-y-1/2 hidden lg:block" style={{ left: mouseRef.current.x, top: mouseRef.current.y }}>
                        <Crosshair size={40} strokeWidth={1.5} className="animate-spin-slow opacity-50" />
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = `
.animate-spin-slow { animation: spin 12s linear infinite; }
.animate-rocket-float { animation: float 4s ease-in-out infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
`;
