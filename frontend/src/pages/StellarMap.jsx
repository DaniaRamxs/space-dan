import { useEffect, useRef, useState, useMemo } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { Zap, Flame, X, User, Orbit, Plus, Minus, Move, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { animate as animeAnim } from 'animejs';
import { Capacitor } from '@capacitor/core';

// Detección de plataforma
const isMobile = Capacitor.isNativePlatform();

// Configuración adaptativa por plataforma
const MOBILE_CONFIG = {
    maxStars: 1000, // Ahora todas las estrellas posibles
    particleCount: 50, // Menos partículas
    targetFPS: 30, // FPS más bajo para ahorro de batería
    renderQuality: 0.7, // Calidad reducida
    touchSensitivity: 1.2, // Más sensible al touch
    zoomSpeed: 0.8, // Zoom más suave
    dragFriction: 0.92, // Más fricción en móvil
    viewportBuffer: 1.5 // Buffer extra para smooth scrolling
};

const DESKTOP_CONFIG = {
    maxStars: 1000,
    particleCount: 200,
    targetFPS: 60,
    renderQuality: 1.0,
    touchSensitivity: 1.0,
    zoomSpeed: 1.0,
    dragFriction: 0.95,
    viewportBuffer: 1.2
};

const CONFIG = isMobile ? MOBILE_CONFIG : DESKTOP_CONFIG;

export default function StellarMap({ onClose }) {
    const canvasRef = useRef(null);
    const [mapData, setMapData] = useState({ users: [], hall_of_fame: [] });
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hoveredUser, setHoveredUser] = useState(null);
    const [, forceUpdate] = useState({});
    const shootingStarsRef = useRef([]);
    const haloRef = useRef({ id: null, radius: 0 });
    const nebulas = useMemo(() => {
        const colors = [
            'rgba(49, 46, 129, 0.08)', // Deep Indigo
            'rgba(88, 28, 135, 0.08)', // Deep Purple
            'rgba(30, 58, 138, 0.08)', // Deep Blue
            'rgba(83, 21, 67, 0.08)',  // Deep Pink
        ];
        return Array.from({ length: 4 }).map((_, i) => ({
            x: (i % 2) * 100 - 50,
            y: Math.floor(i / 2) * 100 - 50,
            radius: 300 + Math.random() * 200,
            color: colors[i % colors.length]
        }));
    }, []);
    const navigate = useNavigate();

    // Camera State
    const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });
    const canvasSizeRef = useRef({ width: 0, height: 0 });

    // Virtual Scrolling: Calcular estrellas visibles en viewport
    const getVisibleStars = useMemo(() => () => {
        if (!mapData.users || mapData.users.length === 0) return [];

        // En desktop mostrar todas las estrellas
        if (!isMobile) {
            return mapData.users.filter(u => u && u.id).map((u, i) => {
                const seed = (u.id.split('-').reduce((acc, char) => acc + char.charCodeAt(0), 0)) / 1000;
                const angle = i * 0.4 + (Math.sin(seed * 10) * 0.2);
                const distance = 80 + (i * 12) + (Math.cos(seed * 5) * 20);
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;

                let size = Math.max(2, (u.level || 1) * 0.8 + 2);
                if (!Number.isFinite(size) || Number.isNaN(size)) size = 2;
                size = Math.min(50, size);

                const balance = u.balance || u.starlys || 0;
                let brightness = Math.min(Math.log10(Math.max(0, balance) + 1), 4);
                if (!Number.isFinite(brightness) || Number.isNaN(brightness)) brightness = 0;

                const pulseSpeed = 0.02 + (u.activity_level || 1) * 0.005;

                let starColor = u.activity_level > 10 ? '#a78bfa' : '#22d3ee';
                if (u.is_online) starColor = '#00ffa3';
                if (u.xp_boost) starColor = '#facc15';
                if (u.is_playing) {
                    const mood = u.music_mood?.toLowerCase() || '';
                    if (mood.includes('euforia') || mood.includes('energía')) starColor = '#ef4444';
                    if (mood.includes('calma') || mood.includes('luminosa')) starColor = '#10b981';
                    if (mood.includes('introspección') || mood.includes('melancólica')) starColor = '#6366f1';
                }

                const isRich = balance > 10000;

                return {
                    ...u,
                    baseX: x,
                    baseY: y,
                    size,
                    brightness,
                    isRich,
                    pulseSpeed,
                    pulseOffset: seed * Math.PI,
                    color: starColor || '#fff',
                };
            });
        }

        // En móvil: Virtual Scrolling - solo estrellas en viewport
        const { width, height } = canvasSizeRef.current;
        const zoom = cameraRef.current.zoom;
        const cameraX = cameraRef.current.x;
        const cameraY = cameraRef.current.y;
        
        // Calcular viewport con buffer
        const viewportWidth = (width / zoom) * CONFIG.viewportBuffer;
        const viewportHeight = (height / zoom) * CONFIG.viewportBuffer;
        const viewportLeft = -cameraX / zoom - viewportWidth / 2;
        const viewportRight = -cameraX / zoom + viewportWidth / 2;
        const viewportTop = -cameraY / zoom - viewportHeight / 2;
        const viewportBottom = -cameraY / zoom + viewportHeight / 2;

        // Filtrar estrellas visibles
        return mapData.users.filter(u => u && u.id).map((u, i) => {
            const seed = (u.id.split('-').reduce((acc, char) => acc + char.charCodeAt(0), 0)) / 1000;
            const angle = i * 0.4 + (Math.sin(seed * 10) * 0.2);
            const distance = 80 + (i * 12) + (Math.cos(seed * 5) * 20);
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;

            // Virtual Scrolling: solo renderizar si está en viewport
            const isVisible = 
                x >= viewportLeft && 
                x <= viewportRight && 
                y >= viewportTop && 
                y <= viewportBottom;

            if (!isVisible) return null; // No renderizar esta estrella

            let size = Math.max(2, (u.level || 1) * 0.8 + 2);
            if (!Number.isFinite(size) || Number.isNaN(size)) size = 2;
            size = Math.min(50, size);

            const balance = u.balance || u.starlys || 0;
            let brightness = Math.min(Math.log10(Math.max(0, balance) + 1), 4);
            if (!Number.isFinite(brightness) || Number.isNaN(brightness)) brightness = 0;

            const pulseSpeed = 0.02 + (u.activity_level || 1) * 0.005;

            let starColor = u.activity_level > 10 ? '#a78bfa' : '#22d3ee';
            if (u.is_online) starColor = '#00ffa3';
            if (u.xp_boost) starColor = '#facc15';
            if (u.is_playing) {
                const mood = u.music_mood?.toLowerCase() || '';
                if (mood.includes('euforia') || mood.includes('energía')) starColor = '#ef4444';
                if (mood.includes('calma') || mood.includes('luminosa')) starColor = '#10b981';
                if (mood.includes('introspección') || mood.includes('melancólica')) starColor = '#6366f1';
            }

            const isRich = balance > 10000;

            return {
                ...u,
                baseX: x,
                baseY: y,
                size,
                brightness,
                isRich,
                pulseSpeed,
                pulseOffset: seed * Math.PI,
                color: starColor || '#fff',
            };
        }).filter(star => star !== null); // Eliminar estrellas nulas
    }, [mapData]);

    // Galactic centers and stars logic - Ahora usa virtual scrolling
    const stars = useMemo(() => getVisibleStars(), [getVisibleStars]);

    useEffect(() => {
        async function fetchMapData() {
            setLoading(true);
            try {
                const { data, error } = await supabase.rpc('get_stellar_map_data');
                if (!error && data) {
                    setMapData({
                        users: data.users || [],
                        hall_of_fame: data.hall_of_fame || []
                    });
                }
            } catch (err) {
                console.error('[StellarMap] Data Fetch Error:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchMapData();
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrame;

        const resize = () => {
            const ratio = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * ratio;
            canvas.height = window.innerHeight * ratio;
            ctx.scale(ratio, ratio);
            // Actualizar canvasSizeRef para virtual scrolling
            canvasSizeRef.current = { 
                width: window.innerWidth, 
                height: window.innerHeight 
            };
        };
        window.addEventListener('resize', resize);
        resize();

        const animate = (time) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const currentZoom = cameraRef.current.zoom;
            const centerX = window.innerWidth / 2 + cameraRef.current.x;
            const centerY = window.innerHeight / 2 + cameraRef.current.y;

            // 0. Background Nebulas (Atmospheric)
            nebulas.forEach(neb => {
                const nx = (window.innerWidth / 2) + (neb.x * 5) + (cameraRef.current.x * 0.05);
                const ny = (window.innerHeight / 2) + (neb.y * 5) + (cameraRef.current.y * 0.05);

                const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, neb.radius);
                grad.addColorStop(0, neb.color);
                grad.addColorStop(1, 'transparent');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(nx, ny, neb.radius, 0, Math.PI * 2);
                ctx.fill();
            });

            // 0.1 Background Starfield (Parallax)
            ctx.fillStyle = 'white';
            const starfieldCount = 200;
            for (let i = 0; i < starfieldCount; i++) {
                const px = ((i * 123.456) + cameraRef.current.x * 0.2) % window.innerWidth;
                const py = ((i * 654.321) + cameraRef.current.y * 0.2) % window.innerHeight;
                const size = (i % 3) * 0.5;
                // respiracion del fondo (twinkle)
                const op = 0.05 + (Math.sin(time * 0.0005 + i) * 0.05);
                ctx.globalAlpha = op;
                ctx.beginPath();
                ctx.arc(px < 0 ? px + window.innerWidth : px, py < 0 ? py + window.innerHeight : py, size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;

            // 0.1 Shooting Stars (Using Ref for performance)
            shootingStarsRef.current.forEach(ss => {
                ctx.strokeStyle = `rgba(255, 255, 255, ${ss.opacity})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(ss.x, ss.y);
                ctx.lineTo(ss.x - ss.vx * 10, ss.y - ss.vy * 10);
                ctx.stroke();
            });

            // 1. Draw Hall of Fame
            if (mapData.hall_of_fame?.length) {
                const stationPulse = 1 + Math.sin(time * 0.0008) * 0.15; // Pulso del nucleo central
                const radius = 60 * currentZoom * stationPulse;

                ctx.strokeStyle = 'rgba(167, 139, 250, 0.15)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.stroke();

                const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 50 * currentZoom * stationPulse);
                grad.addColorStop(0, 'rgba(167, 139, 250, 0.3)');
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(centerX, centerY, 50 * currentZoom * stationPulse, 0, Math.PI * 2);
                ctx.fill();

                mapData.hall_of_fame.forEach((h, i) => {
                    const angle = (time * 0.0002) + (i * Math.PI * 2 / 3);
                    const hx = centerX + Math.cos(angle) * radius;
                    const hy = centerY + Math.sin(angle) * radius;

                    ctx.fillStyle = i === 0 ? '#facc15' : i === 1 ? '#e2e8f0' : '#cd7f32';
                    ctx.beginPath();
                    ctx.arc(hx, hy, 3 * currentZoom, 0, Math.PI * 2);
                    ctx.fill();
                });
            }

            // 2. User Stars
            stars.forEach(star => {
                const x = centerX + star.baseX * currentZoom;
                const y = centerY + star.baseY * currentZoom;

                // Optimization: Don't draw if off-screen (with buffer)
                if (x < -200 || x > window.innerWidth + 200 || y < -200 || y > window.innerHeight + 200) return;

                const pulse = 1 + Math.sin(time * star.pulseSpeed + star.pulseOffset) * 0.2;
                star.screenX = x;
                star.screenY = y;

                // Outer Glow (Detallado y suavizado para evitar saturación - Fix Supernova)
                const baseGlow = 15 + (star.brightness * 12);
                const glowSize = baseGlow * pulse * Math.min(1.5, currentZoom);
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);

                // Usamos colores con mucha transparencia desde el origen (0)
                gradient.addColorStop(0, star.color + '88'); // Max 50% opacidad en el centro
                gradient.addColorStop(0.3, star.color + '33'); // 20% opacidad
                gradient.addColorStop(1, 'transparent');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, glowSize, 0, Math.PI * 2);
                ctx.fill();

                // Halo suave para usuarios ricos (Req 8)
                if (star.isRich) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(x, y, (star.size + 4) * currentZoom, 0, Math.PI * 2);
                    ctx.stroke();

                    // Brillo extra del halo
                    const haloGrad = ctx.createRadialGradient(x, y, star.size * currentZoom, x, y, (star.size + 8) * currentZoom);
                    haloGrad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
                    haloGrad.addColorStop(1, 'transparent');
                    ctx.fillStyle = haloGrad;
                    ctx.fill();
                }

                // Halo al tocar estrellas
                if (haloRef.current.id === star.id) {
                    ctx.strokeStyle = `rgba(255, 255, 255, ${1 - haloRef.current.radius / 50})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(x, y, haloRef.current.radius * currentZoom, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Core
                // Twinkle de estrellas (Req 1)
                const twinkle = 0.8 + Math.sin(time * 0.003 + star.pulseOffset) * 0.2;
                ctx.globalAlpha = twinkle;
                ctx.fillStyle = '#fff';
                // Eliminamos shadowBlur por ser la causa probable del "pantalla blanca" y mal rendimiento
                ctx.beginPath();
                ctx.arc(x, y, (star.size / 2) * Math.min(1.2, currentZoom), 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;

                // Label (High quality)
                if (currentZoom > 1.2 || (hoveredUser?.id === star.id)) {
                    const opacity = Math.min(1, (currentZoom - 1.2) * 2);
                    ctx.fillStyle = `rgba(255,255,255,${hoveredUser?.id === star.id ? 1 : opacity})`;
                    ctx.font = `900 ${Math.max(10, 12 * currentZoom * 0.6)}px Outfit`;
                    ctx.textAlign = 'center';
                    ctx.fillText(star.username.toUpperCase(), x, y + star.size * 2 + 20);

                    if (hoveredUser?.id === star.id) {
                        ctx.strokeStyle = star.color;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(x, y, glowSize * 0.5, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
            });

            // Update shooting stars in Ref (Performance Fix)
            shootingStarsRef.current = shootingStarsRef.current.map(ss => ({
                ...ss,
                x: ss.x + ss.vx,
                y: ss.y + ss.vy,
                opacity: ss.opacity - 0.02
            })).filter(ss => ss.opacity > 0);

            animationFrame = requestAnimationFrame(animate);
        };

        // Periodically spawn shooting stars (Ref-based)
        const shootingStarInterval = setInterval(() => {
            if (Math.random() > 0.7) {
                shootingStarsRef.current.push({
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight * 0.5,
                    vx: 15 + Math.random() * 10,
                    vy: 5 + Math.random() * 5,
                    opacity: 1
                });
            }
        }, 3000);

        animate(0);
        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrame);
            clearInterval(shootingStarInterval);
        };
    }, [stars, hoveredUser, mapData, nebulas]);

    // Interaction Handlers (Universal)
    const handleStart = (e) => {
        isDragging.current = true;
        const pos = e.touches ? e.touches[0] : e;
        lastPos.current = { x: pos.clientX, y: pos.clientY };
    };

    const handleSelectStar = (star) => {
        setSelectedUser(star);
        // Halo effect animation (Req 4)
        haloRef.current = { id: star.id, radius: 0 };
        animeAnim(haloRef.current, {
            radius: 50 * CONFIG.renderQuality,
            duration: 600,
            easing: 'easeOutQuart',
            complete: () => {
                haloRef.current.id = null;
            }
        });
    };

    const handleMove = (e) => {
        const pos = e.touches ? e.touches[0] : e;

        if (isDragging.current) {
            const dx = (pos.clientX - lastPos.current.x) * CONFIG.touchSensitivity;
            const dy = (pos.clientY - lastPos.current.y) * CONFIG.touchSensitivity;
            cameraRef.current.x += dx;
            cameraRef.current.y += dy;
            cameraRef.current.x *= CONFIG.dragFriction;
            cameraRef.current.y *= CONFIG.dragFriction;
            lastPos.current = { x: pos.clientX, y: pos.clientY };
            forceUpdate({});
        } else {
            // Hover logic
            const rect = canvasRef.current.getBoundingClientRect();
            const mx = pos.clientX - rect.left;
            const my = pos.clientY - rect.top;
            const touchHitArea = e.touches ? 40 : 25; // Bigger hit area for touch
            const found = stars.find(s => {
                const dist = Math.sqrt((mx - s.screenX) ** 2 + (my - s.screenY) ** 2);
                return dist < (touchHitArea * CONFIG.touchSensitivity);
            });
            setHoveredUser(found);
        }
    };

    const handleEnd = () => {
        isDragging.current = false;
    };

    const adjustZoom = (delta) => {
        const newZoom = Math.max(0.3, Math.min(5, cameraRef.current.zoom + (delta * CONFIG.zoomSpeed)));
        cameraRef.current.zoom = newZoom;
        forceUpdate({});
    };

    const handleWormhole = () => {
        if (!stars.length) return;
        const randomStar = stars[Math.floor(Math.random() * stars.length)];
        cameraRef.current.x = -randomStar.baseX * cameraRef.current.zoom;
        cameraRef.current.y = -randomStar.baseY * cameraRef.current.zoom;
        forceUpdate({});
        setSelectedUser(randomStar);
    };

    const isTauri = typeof window !== 'undefined' && (
        window.__TAURI_INTERNALS__ !== undefined ||
        window.__TAURI__ !== undefined ||
        window.location.hostname === 'tauri.localhost' ||
        window.location.protocol === 'tauri:'
    );

    return (
        <div className="fixed inset-0 z-[9999] bg-[#020205] overflow-hidden select-none touch-none"
            style={isTauri ? { top: 36 } : undefined}>
            <canvas
                ref={canvasRef}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
                onClick={() => hoveredUser && handleSelectStar(hoveredUser)}
                className={`w-full h-full ${isMobile ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
                style={{ 
                    touchAction: 'none',
                    imageRendering: isMobile ? 'auto' : 'crisp-edges'
                }}
            />

            {/* Header / Info - Hidden when user selected to save space */}
            <AnimatePresence>
                {!selectedUser && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none"
                    >
                        <div className="glass-panel p-4 sm:p-6 border border-white/10 rounded-3xl pointer-events-auto">
                            <h1 className="text-xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400 uppercase tracking-tighter">MAPA ESTELAR</h1>
                            <div className="hidden sm:block mt-4 space-y-2">
                                <LegendItem color="bg-[#00ffa3]" label="En Línea" />
                                <LegendItem color="bg-cyan-400" label="Explorador" />
                                <LegendItem color="bg-yellow-400" label="Boost Activo" />
                            </div>
                        </div>

                        <div className="flex gap-2 pointer-events-auto">
                            <button onClick={() => onClose ? onClose() : navigate('/posts')} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl text-white/40 hover:text-white transition-all active:scale-90">
                                <X size={20} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Controls Right Bottom */}
            <div className="absolute right-6 bottom-32 sm:bottom-12 flex flex-col gap-3 z-10">
                <button onClick={() => adjustZoom(0.3)} className="w-12 h-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl text-white/60 active:scale-90"><Plus size={20} /></button>
                <button onClick={() => adjustZoom(-0.3)} className="w-12 h-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl text-white/60 active:scale-90"><Minus size={20} /></button>
                <button onClick={handleWormhole} className="w-12 h-12 flex items-center justify-center bg-violet-600/20 border border-violet-500/30 rounded-2xl text-violet-400 active:scale-90"><Orbit size={20} /></button>
            </div>

            {/* Selected User Modal (Mobile Refined) */}
            <AnimatePresence>
                {selectedUser && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="absolute bottom-0 left-0 right-0 sm:bottom-12 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-sm px-0 sm:px-6 z-20"
                    >
                        <div className="glass-panel p-6 border-t sm:border border-cyan-500/30 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden pb-12 sm:pb-6">
                            <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 text-white/20 hover:text-white"><X size={20} /></button>

                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-white/10 bg-black/40 relative shrink-0">
                                    <img src={selectedUser.avatar_url || '/default-avatar.png'} className="w-full h-full object-cover" alt="" />
                                    {selectedUser.xp_boost && <div className="absolute inset-0 border-2 border-yellow-400 rounded-full animate-pulse" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-black text-white truncate">{selectedUser.username}</h2>
                                        {selectedUser.badge_color && (
                                            <Sparkles size={14} style={{ color: selectedUser.badge_color }} className="shrink-0 drop-shadow-[0_0_5px_currentColor]" />
                                        )}
                                        {selectedUser.prestige_level > 0 && <span className="text-yellow-500 font-black text-xs shrink-0">✦{selectedUser.prestige_level}</span>}
                                    </div>
                                    <p className="text-[10px] text-violet-400 font-bold uppercase tracking-widest truncate">{selectedUser.chat_title || 'VIAJERO DEL ESPACIO'}</p>
                                    <div className="flex gap-3 mt-2">
                                        <Stat badge={<Zap size={10} />} value={`Lvl ${selectedUser.level}`} color="text-cyan-400" />
                                        <Stat badge={<Flame size={10} />} value={`Act ${selectedUser.activity_level}`} color="text-violet-400" />
                                    </div>
                                </div>
                                <button onClick={() => navigate(`/@${selectedUser.username}`)} className="w-12 h-12 bg-cyan-500 rounded-2xl flex items-center justify-center text-black hover:scale-110 active:scale-95 transition-all shrink-0"><User size={20} /></button>
                            </div>

                            {/* Music Metadata if playing */}
                            {selectedUser.is_playing && (
                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3">
                                    <div className="px-2 py-1 bg-violet-500/20 rounded text-[9px] font-black text-violet-300 uppercase letter-spacing-widest">Sintonizando</div>
                                    <span className="text-[11px] text-white/40 italic truncate">{selectedUser.music_mood}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#020205]">
                    <div className="w-12 h-12 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}

const LegendItem = ({ color, label }) => (
    <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${color} shadow-[0_0_8px_currentColor]`} />
        <span className="text-[9px] text-white/50 uppercase font-black">{label}</span>
    </div>
);

const Stat = ({ badge, value, color }) => (
    <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${color}`}>
        {badge} {value}
    </div>
);
