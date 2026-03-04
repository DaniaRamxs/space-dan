import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { Zap, Flame, X, User, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StellarMap() {
    const canvasRef = useRef(null);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hoveredUser, setHoveredUser] = useState(null);
    const navigate = useNavigate();

    // Galactic centers and stars logic
    const stars = useMemo(() => {
        if (users.length === 0) return [];

        return users.map((u, i) => {
            // Spiral galaxy formula
            const angle = i * 0.4 + (Math.random() * 0.2);
            const distance = 50 + (i * 8) + (Math.random() * 20);
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;

            // Size based on Stellar Level (Zap)
            const size = Math.max(2, (u.level || 1) * 0.8 + 2);
            // Pulse based on Activity Level (Flame)
            const pulseSpeed = 0.02 + (u.activity_level || 1) * 0.005;

            return {
                ...u,
                baseX: x,
                baseY: y,
                angle,
                distance,
                size,
                pulseSpeed,
                pulseOffset: Math.random() * Math.PI * 2,
                color: u.activity_level > 10 ? '#a78bfa' : '#22d3ee', // Violet if high activity, Cyan if normal
                currentPulse: 1
            };
        });
    }, [users]);

    useEffect(() => {
        async function fetchMapData() {
            setLoading(true);
            const { data, error } = await supabase.rpc('get_stellar_map_data');
            if (!error && data) setUsers(data);
            setLoading(false);
        }
        fetchMapData();
    }, []);

    useEffect(() => {
        if (stars.length === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrame;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        let offsetX = 0;
        let offsetY = 0;
        let targetOffsetX = 0;
        let targetOffsetY = 0;
        let zoom = 1;

        const animate = (time) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const centerX = canvas.width / 2 + offsetX;
            const centerY = canvas.height / 2 + offsetY;

            // Interpolate camera
            offsetX += (targetOffsetX - offsetX) * 0.05;
            offsetY += (targetOffsetY - offsetY) * 0.05;

            // Draw Background Stars (Generic)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            for (let i = 0; i < 100; i++) {
                const bx = (Math.sin(i) * 5000) % canvas.width;
                const by = (Math.cos(i) * 5000) % canvas.height;
                ctx.beginPath();
                ctx.arc(bx, by, 0.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw User Stars
            stars.forEach(star => {
                const x = centerX + star.baseX * zoom;
                const y = centerY + star.baseY * zoom;

                // Calculate pulse
                const pulse = 1 + Math.sin(time * star.pulseSpeed + star.pulseOffset) * 0.3;
                star.currentPulse = pulse;
                star.screenX = x;
                star.screenY = y;

                // Glow
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, star.size * pulse * 4);
                gradient.addColorStop(0, star.color);
                gradient.addColorStop(0.2, star.color + '44');
                gradient.addColorStop(1, 'transparent');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, star.size * pulse * 4, 0, Math.PI * 2);
                ctx.fill();

                // Core
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(x, y, star.size / 2, 0, Math.PI * 2);
                ctx.fill();

                // Name if zoomed in or hovered
                if (zoom > 1.5 || hoveredUser?.id === star.id) {
                    ctx.fillStyle = 'rgba(255,255,255,0.5)';
                    ctx.font = 'bold 10px Inter';
                    ctx.textAlign = 'center';
                    ctx.fillText(star.username, x, y + star.size * 2 + 10);
                }
            });

            animationFrame = requestAnimationFrame(animate);
        };

        animate(0);
        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrame);
        };
    }, [stars, hoveredUser]);

    const handleMouseMove = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        let found = null;
        for (const star of stars) {
            const dx = mx - star.screenX;
            const dy = my - star.screenY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 20) {
                found = star;
                break;
            }
        }
        setHoveredUser(found);
    }

    const handleClick = () => {
        if (hoveredUser) {
            setSelectedUser(hoveredUser);
        } else {
            setSelectedUser(null);
        }
    }

    return (
        <div className="fixed inset-0 bg-[#020205] overflow-hidden cursor-crosshair">
            <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onClick={handleClick}
                className="w-full h-full"
            />

            {/* UI Overlays */}
            <div className="absolute top-8 left-8 p-6 glass-panel border border-white/10 rounded-3xl pointer-events-none">
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400 uppercase tracking-tighter">
                    Mapa Estelar
                </h1>
                <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] font-bold mt-1">
                    Explorando {users.length} pilotos activos
                </p>

                <div className="mt-6 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                        <span className="text-[9px] text-white/50 uppercase font-black">Niveles Estelares</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_#8b5cf6] animate-pulse" />
                        <span className="text-[9px] text-white/50 uppercase font-black">Actividad Social</span>
                    </div>
                </div>
            </div>

            <button
                onClick={() => navigate('/posts')}
                className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90"
            >
                <X size={20} />
            </button>

            {/* Selected User Modal */}
            <AnimatePresence>
                {selectedUser && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-sm"
                    >
                        <div className="glass-panel p-6 border border-cyan-500/30 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                            {/* Glow background */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 to-violet-500/5 pointer-events-none" />

                            <div className="flex items-center gap-5 relative">
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 bg-black/40">
                                    <img src={selectedUser.avatar_url || '/default-avatar.png'} className="w-full h-full object-cover" alt="" />
                                </div>

                                <div className="flex-1">
                                    <h2 className="text-xl font-black text-white">{selectedUser.username}</h2>
                                    <div className="flex gap-3 mt-1">
                                        <div className="flex items-center gap-1 text-[10px] font-black text-cyan-400 uppercase">
                                            <Zap size={10} className="fill-current" />
                                            Lvl {selectedUser.level}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] font-black text-violet-400 uppercase">
                                            <Flame size={10} className="fill-current" />
                                            Act {selectedUser.activity_level}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate(`/profile/${selectedUser.username}`)}
                                    className="w-10 h-10 bg-cyan-500 rounded-2xl flex items-center justify-center text-black hover:scale-110 active:scale-95 transition-transform"
                                >
                                    <User size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}
