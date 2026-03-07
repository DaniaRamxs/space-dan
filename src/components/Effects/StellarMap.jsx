import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { animate, stagger } from 'animejs';
import { useUniverse } from '../../contexts/UniverseContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { X, User, Zap, Globe, Expand, Minimize, Search, Sparkles, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 🌌 StellarMap: Un universo social interactivo para Spacely.
 * Cada usuario es una estrella. Las relaciones son constelaciones.
 * Implementado con Anime.js para una experiencia fluida y orgánica.
 */
// 6. Componente de Estrella Memoizado (Optimización)
const Star = React.memo(({ user, props, isMobile, onFocus }) => {
    return (
        <div
            id={`star-${user.id}`}
            className="star-container absolute group cursor-pointer pointer-events-auto"
            style={{
                left: `${user.x}%`,
                top: `${user.y}%`,
                zIndex: Math.floor(user.z * 10) + 20,
                willChange: 'transform'
            }}
            data-z={user.z}
            onClick={(e) => {
                e.stopPropagation();
                onFocus(user);
            }}
        >
            {/* Nebulosa para Ricos (Req 9) */}
            {props.isRich && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-cyan-500/10 rounded-full blur-2xl animate-pulse pointer-events-none" />
            )}

            {/* Estrella (Req 3: Halo Suave) */}
            <div
                className={`star-core rounded-full transition-all duration-300 group-hover:scale-[1.8] ${props.isRich ? 'star-rich' : ''}`}
                style={{
                    width: isMobile ? `${props.size * 0.7}px` : `${props.size}px`,
                    height: isMobile ? `${props.size * 0.7}px` : `${props.size}px`,
                    backgroundColor: props.color,
                    boxShadow: `0 0 ${props.brightness * 2}px ${props.color}${props.isRich ? `, 0 0 ${props.brightness * 5}px ${props.color}66` : ''}`
                }}
            />

            {/* Tooltip con Nickname (Req 8) */}
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[100]">
                <div className="bg-black/90 backdrop-blur-2xl px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-2 shadow-2xl">
                    <span className="text-[7px] font-black uppercase tracking-widest text-white whitespace-nowrap">
                        {user.username}
                    </span>
                    {user.isOnline && <div className="w-1 h-1 rounded-full bg-[#00ffa3] animate-pulse" />}
                </div>
            </div>
        </div>
    );
});

const StellarMap = () => {
    const { onlineUsers } = useUniverse();
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const [allUsers, setAllUsers] = useState([]);
    const [connections, setConnections] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isMobile] = useState(window.innerWidth < 768);
    const [zoom, setZoom] = useState(1);

    // 1. Cargar la Galaxia Completa (Orden Cronológico - Req 1)
    useEffect(() => {
        const fetchGalaxy = async () => {
            setLoading(true);
            try {
                // Traemos los usuarios por fecha de registro (Req 1)
                const { data: profiles, error } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url, balance, level, created_at, last_seen_at')
                    .order('created_at', { ascending: true }) // Primeros usuarios primero
                    .limit(isMobile ? 150 : 400);

                if (error) throw error;

                // 3. Distribución en Galaxia Espiral (Req 3)
                const arms = 3;
                // Usamos un espacio virtual de 0 a 100% para compatibilidad con el resto del mapa,
                // pero lo pensamos como una espiral desde el centro (50, 50)
                const galaxyUsers = (profiles || []).map((user, i) => {
                    const arm = i % arms;
                    // Fórmula de Espiral (Req 3)
                    const angle = (i * 0.15) + (arm * (Math.PI * 2 / arms));

                    // Radio basado en orden de registro: pioneros cerca del núcleo (Req 1)
                    // Normalizado para que quepa en el espacio del mapa
                    const baseRadius = 8 + (i * (40 / (profiles?.length || 1)));
                    const randomVariation = (Math.random() - 0.5) * 4;
                    const radius = baseRadius + randomVariation;

                    const x = 50 + Math.cos(angle) * radius;
                    const y = 50 + Math.sin(angle) * radius;
                    const z = Math.random() * 3;

                    return { ...user, x, y, z };
                });

                // Obtener conexiones para las constelaciones
                const userIds = galaxyUsers.map(u => u.id);
                const { data: follows } = await supabase
                    .from('follows')
                    .select('follower_id, following_id')
                    .in('follower_id', userIds)
                    .in('following_id', userIds);

                setAllUsers(galaxyUsers);
                setConnections(follows || []);
            } catch (err) {
                console.error('[StellarMap] Error sync galaxia:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchGalaxy();
    }, [isMobile]); // Solo recargar si cambia el dispositivo, para mantener estabilidad

    // Sincronizar estado ONLINE sin mover las estrellas
    const galaxyWithStatus = useMemo(() => {
        return allUsers.map(u => ({
            ...u,
            isOnline: !!onlineUsers[u.id]
        }));
    }, [allUsers, onlineUsers]);

    // 2. Escala Logarítmica para Brillo y Tamaño (Req 2)
    const getStarProps = useCallback((user) => {
        const bal = user.balance || 0;
        const level = user.level || 1;

        // Logarithmic Brightness (Req 2)
        const logBrightness = Math.max(1.5, Math.min(Math.log10(bal + 1) * 2, 7));

        // Size based on level (Req 1)
        const size = Math.max(3, Math.min(level * 0.9, 14));

        // Activity Color
        let color = '#fff';
        if (user.isOnline) color = '#00ffa3';
        else {
            const lastActive = new Date(user.last_seen_at);
            const diffHours = (new Date() - lastActive) / (1000 * 60 * 60);
            if (diffHours < 24) color = '#00fbff';
            else if (diffHours < 168) color = '#7e57c2';
            else color = '#454555';
        }

        return { size, brightness: logBrightness, color, isRich: bal > 10000 };
    }, []);

    // 3. Animaciones con Anime.js (Parallax & Depth - Req 4)
    useEffect(() => {
        if (allUsers.length === 0) return;

        // Background Nebula Pulse
        animate('.nebula-bg', {
            opacity: [0.1, 0.3],
            scale: [1, 1.2],
            duration: 10000,
            direction: 'alternate',
            loop: true,
            easing: 'easeInOutQuad'
        });

        // Parallax Layers (Req 4)
        const parallaxConfig = [
            { target: '.star-layer-back', duration: 120000, dist: 30 },
            { target: '.star-layer-mid', duration: 80000, dist: 60 },
            { target: '.star-layer-front', duration: 40000, dist: 120 }
        ];

        parallaxConfig.forEach(cfg => {
            // Eliminamos el loop automático que causaba el movimiento "solo" (Req Fix)
            // Solo dejamos la preparación de la capa si fuera necesario, 
            // pero las animaciones de loop se quitan para dar calma al mapa.
        });

        // Espiral Cronológica (Ruta de Crecimiento)
        animate('.spiral-path-line', {
            strokeDashoffset: [1000, 0],
            opacity: [0, 0.2],
            duration: 4000,
            delay: stagger(15), // Efecto de formación progresiva
            easing: 'easeInOutSine'
        });
    }, [allUsers]);

    // 4. Interacción con Cursor Optimizada (Req 5)
    const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
    const requestRef = useRef();

    const animateGalaxy = useCallback(() => {
        const { x, y, targetX, targetY } = mouseRef.current;

        // Suavizado (Lerp)
        mouseRef.current.x += (targetX - x) * 0.05;
        mouseRef.current.y += (targetY - y) * 0.05;

        const container = document.querySelector('.galaxy-master-container');
        if (container) {
            container.style.transform = `scale(${zoom}) translate(${mouseRef.current.x}px, ${mouseRef.current.y}px)`;
        }

        requestRef.current = requestAnimationFrame(animateGalaxy);
    }, [zoom]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animateGalaxy);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animateGalaxy]);

    const handleMouseMove = (e) => {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        mouseRef.current.targetX = (e.clientX - centerX) * 0.02;
        mouseRef.current.targetY = (e.clientY - centerY) * 0.02;
    };

    // 4. Centrado y Zoom para Descubrimiento (Req 10)
    const focusStar = useCallback((user) => {
        if (!containerRef.current) return;

        setSelectedUser(user);

        const rect = containerRef.current.getBoundingClientRect();
        const targetX = (user.x / 100) * containerRef.current.scrollWidth - rect.width / 2;
        const targetY = (user.y / 100) * containerRef.current.scrollHeight - rect.height / 2;

        animate(containerRef.current, {
            scrollLeft: targetX,
            scrollTop: targetY,
            duration: 1500, // Changed from 1200 to 1500
            easing: 'easeInOutQuint'
        });

        // Efecto de Pulsación en el Usuario Encontrado
        animate(`#star-${user.id}`, {
            scale: [1, 2.5, 1.5], // Changed from [1, 2, 1.5] to [1, 2.5, 1.5]
            rotate: '1turn',
            duration: 1200, // Changed from 1000 to 1200
            easing: 'easeOutElastic(1, .5)'
        });
    }, []);

    const discoverRandomUser = () => {
        if (galaxyWithStatus.length === 0) return;
        const randomUser = galaxyWithStatus[Math.floor(Math.random() * galaxyWithStatus.length)];
        focusStar(randomUser);
    };

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

    if (loading) return (
        <div className="w-full h-full flex items-center justify-center bg-[#030308]">
            <div className="flex flex-col items-center gap-6">
                <div className="w-20 h-20 border-t-2 border-cyan-500 rounded-full animate-spin shadow-[0_0_30px_rgba(6,182,212,0.2)]" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[1em] animate-pulse">Sincronizando Galaxia</span>
            </div>
        </div>
    );

    return (
        <div
            ref={containerRef}
            className="stellar-galaxy transition-all duration-700 ease-in-out relative bg-[#030308] overflow-hidden select-none outline-none min-h-screen"
            onMouseMove={handleMouseMove}
            style={{ contain: 'layout paint' }}
        >
            {/* 1. Fondo de Nebulosas (Optimizado con Gradientes) */}
            <div
                className="nebula-bg absolute inset-0 pointer-events-none opacity-20"
                style={{
                    background: `
                        radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.15) 0%, transparent 50%),
                        radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)
                    `,
                    contain: 'strict'
                }}
            />

            {/* 2. Núcleo de Spacely (Req 2) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 pointer-events-none z-10 transition-transform duration-500 ease-out"
                style={{ transform: `translate(-50%, -50%) scale(${zoom})` }}>
                <div className="absolute inset-0 bg-cyan-500/10 blur-[100px] animate-pulse" />
                <div className="absolute inset-1/4 bg-white/5 blur-[40px] rounded-full animate-spin-slow" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_40px_rgba(255,255,255,0.8),0_0_80px_rgba(0,255,255,0.4)]" />
            </div>

            {/* Controles de Vista (Acercar, Alejar, Cerrar) */}
            <div className="absolute top-8 right-8 flex items-center gap-3 z-50">
                <button
                    onClick={handleZoomIn}
                    className="w-10 h-10 flex items-center justify-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-white/40 hover:text-white transition-all active:scale-90"
                    title="Acercar"
                >
                    <Plus size={18} />
                </button>
                <button
                    onClick={handleZoomOut}
                    className="w-10 h-10 flex items-center justify-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-white/40 hover:text-white transition-all active:scale-90"
                    title="Alejar"
                >
                    <Minus size={18} />
                </button>
                <button
                    onClick={() => navigate('/posts')}
                    className="w-10 h-10 flex items-center justify-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-white/40 hover:text-white transition-all active:scale-90"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Galaxia de Usuarios */}
            <div
                className="galaxy-master-container absolute inset-0 transition-transform duration-500 ease-out"
                style={{ transformOrigin: 'center center', willChange: 'transform' }}
            >
                {/* Capas de Estrellas y Líneas Sincronizadas */}
                <div className="absolute inset-0">
                    {/* 1. Líneas de Conexión (Primero para que queden debajo de las estrellas) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                        {galaxyWithStatus.map((user, i) => {
                            if (i === 0) return null;
                            const prev = galaxyWithStatus[i - 1];
                            return (
                                <line
                                    key={`path-${user.id}`}
                                    x1={`${prev.x}%`}
                                    y1={`${prev.y}%`}
                                    x2={`${user.x}%`}
                                    y2={`${user.y}%`}
                                    stroke="rgba(255,255,255,0.4)"
                                    strokeWidth="0.5"
                                    className="spiral-path-line"
                                    style={{ strokeDasharray: 1000, strokeDashoffset: 1000 }}
                                />
                            );
                        })}
                    </svg>

                    {/* 2. Estrellas */}
                    <div className="stars-container absolute inset-0">
                        {galaxyWithStatus.map(u => (
                            <Star
                                key={u.id}
                                user={u}
                                props={getStarProps(u)}
                                isMobile={isMobile}
                                onFocus={focusStar}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* UI Flotante Centralizada (Solo Explorar) */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50">
                <button
                    onClick={discoverRandomUser}
                    className="flex items-center gap-3 px-8 py-4 bg-cyan-500 text-black rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(6,182,212,0.5)]"
                >
                    <Sparkles size={18} />
                    Explorar Usuarios
                </button>
            </div>

            {/* Panel de Usuario Seleccionado (Req 6) */}
            <AnimatePresence>
                {selectedUser && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center p-4 z-[200] pointer-events-none"
                    >
                        <div className="w-full max-w-sm bg-[#0a0a14]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative pointer-events-auto overflow-hidden group">
                            {/* Fondo Decorativo */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[60px] rounded-full" />

                            <button
                                onClick={() => setSelectedUser(null)}
                                className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex flex-col items-center gap-6">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-[2rem] overflow-hidden border-2 border-cyan-500/30">
                                        <img
                                            src={selectedUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.username}`}
                                            alt={selectedUser.username}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-cyan-500 flex items-center justify-center text-black border-4 border-[#0a0a14]">
                                        <Zap size={14} fill="currentColor" />
                                    </div>
                                </div>

                                <div className="text-center">
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-1 mt-2">
                                        {selectedUser.username}
                                    </h2>
                                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">Nivel {selectedUser.level || 1} · Rango Estelar</p>
                                </div>

                                <div className="w-full grid grid-cols-2 gap-3">
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Starlys</p>
                                        <p className="text-sm font-black text-cyan-400">{(selectedUser.balance || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Impacto</p>
                                        <p className="text-sm font-black text-purple-400">{(selectedUser.level || 1) * 120}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate(`/@${selectedUser.username}`)}
                                    className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-cyan-400 transition-colors flex items-center justify-center gap-3"
                                >
                                    <Globe size={16} />
                                    Explorar Universo
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{
                __html: `
                .star-rich {
                    animation: rich-glow 3s ease-in-out infinite alternate;
                }
                @keyframes rich-glow {
                    0% { filter: brightness(1) blur(0px); box-shadow: 0 0 6px #fff, 0 0 20px rgba(255,255,255,0.4); }
                    100% { filter: brightness(1.6) blur(1px); box-shadow: 0 0 12px #fff, 0 0 35px rgba(255,255,255,0.6); }
                }
                .spiral-path-line {
                    stroke-dasharray: 1000;
                    stroke-dashoffset: 1000;
                    transition: stroke-width 0.3s ease;
                }
                .spiral-path-line:hover {
                    stroke-width: 1.5;
                    stroke: rgba(255,255,255,0.4);
                }
                .animate-spin-slow {
                    animation: spin 20s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}} />
        </div>
    );
};

export default StellarMap;
