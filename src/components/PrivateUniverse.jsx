import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { universeService } from '../services/universe';
import { useAuthContext } from '../contexts/AuthContext';

// --- Utils ---
const cyrb128 = (str) => {
    let h1 = 1779033703, h2 = 3144134277,
        h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    h1 ^= (h2 ^ h3 ^ h4), h2 ^= h1, h3 ^= h1, h4 ^= h1;
    return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
};

const sfc32 = (a, b, c, d) => {
    return function () {
        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
        var t = (a + b | 0) + d | 0;
        d = d + 1 | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
};

const LinkIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
    </svg>
);

const CloseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

// --- Canvas Background Layer ---
const PrivateUniverseCanvas = ({ partnership, bothOnline }) => {
    const canvasRef = useRef(null);
    const isEclipse = partnership.status === 'eclipse';
    const evolutionLevel = partnership.evolution_level || 1;
    const visitCount = partnership.visit_count || 0;

    const { particles, constellationBase } = useMemo(() => {
        // Deterministic generation based on partnership ID
        const seed = cyrb128(partnership.id || "default");
        const rand = sfc32(seed[0], seed[1], seed[2], seed[3]);

        const particleCount = 80 + (visitCount * 0.5) + (evolutionLevel * 20);
        let generatedParticles = [];
        for (let i = 0; i < Math.min(particleCount, 400); i++) {
            generatedParticles.push({
                x: rand(),
                y: rand(),
                size: rand() * 1.5 + 0.2,
                vx: (rand() - 0.5) * 0.0001,
                vy: (rand() - 0.5) * 0.0001,
                alpha: rand() * 0.5 + 0.1,
                twinkleSpeed: rand() * 0.01 + 0.005
            });
        }

        const constelNodesCount = 6 + Math.floor(rand() * 4);
        let constelNodes = [];
        for (let i = 0; i < constelNodesCount; i++) {
            constelNodes.push({
                x: 0.2 + rand() * 0.6,
                y: 0.2 + rand() * 0.6,
                size: rand() * 2 + 1,
                connections: []
            });
        }
        for (let i = 0; i < constelNodes.length; i++) {
            for (let j = i + 1; j < constelNodes.length; j++) {
                if (rand() > 0.6) constelNodes[i].connections.push(j);
            }
        }

        return { particles: generatedParticles, constellationBase: constelNodes };
    }, [partnership.id, evolutionLevel, visitCount]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let frameId;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        let t = 0;
        const render = () => {
            t += 0.01;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const globalBrightness = (bothOnline && !isEclipse) ? 1.5 : 1.0;
            const driftMultiplier = (bothOnline && !isEclipse) ? 2.5 : 1.0;

            if (isEclipse) {
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Draw Nebula (progresivo)
            if (evolutionLevel >= 3 && !isEclipse) {
                const grad = ctx.createRadialGradient(
                    canvas.width / 2, canvas.height / 2, 0,
                    canvas.width / 2, canvas.height / 2, canvas.width / 1.5
                );
                grad.addColorStop(0, 'rgba(50, 20, 100, 0.1)');
                grad.addColorStop(0.5, 'rgba(30, 10, 80, 0.05)');
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Draw Particles
            particles.forEach(p => {
                p.x += p.vx * driftMultiplier;
                p.y += p.vy * driftMultiplier;
                if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
                if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;

                const twinkle = Math.sin(t * p.twinkleSpeed * 100) * 0.2 + 0.8;
                const brightness = p.alpha * twinkle * globalBrightness;

                ctx.beginPath();
                ctx.arc(p.x * canvas.width, p.y * canvas.height, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${brightness.toFixed(2)})`;
                ctx.fill();
            });

            // Draw Constellation
            ctx.lineWidth = 0.5;
            const pulse = (bothOnline && !isEclipse) ? Math.sin(t * 3) * 0.3 + 1.2 : 1;

            constellationBase.forEach((node, i) => {
                const x = node.x * canvas.width;
                const y = node.y * canvas.height;

                ctx.beginPath();
                ctx.arc(x, y, node.size * pulse, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${(0.8 * globalBrightness).toFixed(2)})`;
                ctx.shadowBlur = bothOnline ? 15 : 5;
                ctx.shadowColor = 'white';
                ctx.fill();
                ctx.shadowBlur = 0;

                if (!isEclipse) {
                    node.connections.forEach(targetIdx => {
                        const target = constellationBase[targetIdx];
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.lineTo(target.x * canvas.width, target.y * canvas.height);
                        ctx.strokeStyle = `rgba(255,255,255,${(0.15 * globalBrightness).toFixed(2)})`;
                        ctx.stroke();
                    });
                }
            });

            // Planet (Evolution 5)
            if (evolutionLevel >= 5 && !isEclipse) {
                const px = canvas.width * 0.75;
                const py = canvas.height * 0.25;
                const pr = 40;
                const grad = ctx.createRadialGradient(px - 10, py - 10, 5, px, py, pr);
                grad.addColorStop(0, 'rgba(255,255,255,0.1)');
                grad.addColorStop(1, 'rgba(0,0,0,0.5)');

                ctx.beginPath();
                ctx.arc(px, py, pr, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(20,20,30,0.6)';
                ctx.fill();
                ctx.fillStyle = grad;
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                ctx.stroke();
            }

            frameId = requestAnimationFrame(render);
        };

        render();
        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(frameId);
        };
    }, [particles, constellationBase, bothOnline, isEclipse, evolutionLevel]);

    return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

// --- Main Component ---
export const PrivateUniverse = ({ partnership: initialPartnership, onUpdate }) => {
    const { user, profile: myProfile } = useAuthContext();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [partnership, setPartnership] = useState(initialPartnership);
    const [otherOnline, setOtherOnline] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setPartnership(initialPartnership);
    }, [initialPartnership]);

    // Handle Synchrony (Realtime Presence)
    useEffect(() => {
        if (!isOpen || !partnership || !user) return;

        const channel = supabase.channel(`universe:${partnership.id}`, {
            config: { presence: { key: user.id } }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const otherParticipantId = partnership.partner_id;
                setOtherOnline(!!state[otherParticipantId]);
            })
            .on('presence', { event: 'join' }, ({ key }) => {
                if (key === partnership.partner_id) setOtherOnline(true);
            })
            .on('presence', { event: 'leave' }, ({ key }) => {
                if (key === partnership.partner_id) setOtherOnline(false);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ online: true, joined_at: new Date().toISOString() });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isOpen, partnership, user]);

    const handleOpen = async () => {
        setIsOpen(true);
        if (partnership && user?.id) {
            // Register a visit only if the user is a participant
            try {
                await universeService.registerVisit(partnership.id);
            } catch (err) {
                console.error("Visit registration failed", err);
            }
        }
    };

    const handleAction = async (action) => {
        setLoading(true);
        try {
            if (action === 'archive') {
                await universeService.updateStatus(partnership.id, 'active');
            } else if (action === 'eclipse') {
                await universeService.updateStatus(partnership.id, 'eclipse');
            } else if (action === 'break') {
                if (confirm('¿Confirmas fragmentar esta constelación permanentemente?')) {
                    await universeService.breakPartnership(partnership.id);
                    setIsOpen(false);
                    if (onUpdate) onUpdate();
                }
            }
        } catch (err) {
            alert("Error al procesar acción");
        } finally {
            setLoading(false);
        }
    };

    if (!partnership) return null;

    const formattedDate = new Date(partnership.linked_at).toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });

    return (
        <>
            <motion.div
                className="mt-3 flex items-center w-max cursor-pointer text-sm font-light text-neutral-400 hover:text-neutral-200 transition-colors duration-200 ease-out p-1 py-0.5 rounded-sm select-none"
                onClick={handleOpen}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
            >
                <LinkIcon />
                <div className="flex flex-col">
                    <span>
                        {partnership.status === 'eclipse' ? (
                            <span className="text-neutral-500 italic">Vínculo en eclipse con </span>
                        ) : (
                            <span>Vinculado con </span>
                        )}
                        <span className="font-normal hover:underline" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${partnership.partner_id}`); }}>@{partnership.partner_username}</span>
                    </span>
                    <span className="text-[10px] opacity-60">Desde {formattedDate}</span>
                </div>
            </motion.div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden"
                    >
                        <PrivateUniverseCanvas partnership={partnership} bothOnline={otherOnline} />

                        <button onClick={() => setIsOpen(false)} className="absolute top-8 right-8 z-50 text-neutral-500 hover:text-white transition-colors">
                            <CloseIcon />
                        </button>

                        <div className="relative z-10 flex flex-col items-center select-none text-center">
                            {partnership.status === 'eclipse' ? (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-8">
                                    <h2 className="text-neutral-500 tracking-[0.4em] text-xs uppercase">Eclipse de la Constelación</h2>
                                    <div className="flex gap-4">
                                        <button disabled={loading} onClick={() => handleAction('archive')} className="px-6 py-2 rounded-full border border-neutral-800 text-neutral-400 hover:text-white transition-all text-[10px] tracking-widest uppercase">Archivar</button>
                                        <button disabled={loading} onClick={() => handleAction('break')} className="px-6 py-2 rounded-full border border-red-900/30 text-red-500/60 hover:text-red-400 transition-all text-[10px] tracking-widest uppercase">Fragmentar</button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2 }} className="flex flex-col items-center">
                                    <div className="w-1 h-1 bg-white rounded-full opacity-20 mb-6 animate-pulse" />
                                    <p className="text-neutral-200 text-base tracking-[0.3em] font-extralight uppercase">Nuestro Universo</p>

                                    {/* Match Avatars */}
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ duration: 1.5, delay: 0.5 }}
                                        className="flex items-center gap-0 mt-8 relative"
                                    >
                                        {/* My Avatar */}
                                        <div className="relative z-10" style={{
                                            width: 72, height: 72, borderRadius: '50%',
                                            border: '2px solid rgba(6,182,212,0.5)',
                                            boxShadow: '0 0 20px rgba(6,182,212,0.3)',
                                            overflow: 'hidden', background: '#0a0a0f',
                                        }}>
                                            <img
                                                src={myProfile?.avatar_url || '/default_user_blank.png'}
                                                alt="Tú" className="w-full h-full object-cover"
                                            />
                                        </div>

                                        {/* Heart */}
                                        <motion.div
                                            animate={{
                                                scale: [1, 1.2, 1],
                                                filter: [
                                                    'drop-shadow(0 0 8px rgba(255,110,180,0.4))',
                                                    'drop-shadow(0 0 20px rgba(255,110,180,0.8))',
                                                    'drop-shadow(0 0 8px rgba(255,110,180,0.4))',
                                                ]
                                            }}
                                            transition={{
                                                duration: otherOnline ? 1 : 2.5,
                                                repeat: Infinity,
                                                ease: 'easeInOut'
                                            }}
                                            className="relative z-20"
                                            style={{
                                                width: 36, height: 36,
                                                margin: '0 -10px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: 'radial-gradient(circle, rgba(255,110,180,0.15) 0%, transparent 70%)',
                                                borderRadius: '50%',
                                            }}
                                        >
                                            <span style={{ fontSize: '1.4rem' }}>💖</span>
                                        </motion.div>

                                        {/* Partner Avatar */}
                                        <div className="relative z-10" style={{
                                            width: 72, height: 72, borderRadius: '50%',
                                            border: '2px solid rgba(139,92,246,0.5)',
                                            boxShadow: '0 0 20px rgba(139,92,246,0.3)',
                                            overflow: 'hidden', background: '#0a0a0f',
                                        }}>
                                            <img
                                                src={partnership.partner_avatar || '/default_user_blank.png'}
                                                alt={partnership.partner_username}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </motion.div>

                                    {/* Names */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 1.2, duration: 1 }}
                                        className="flex items-center gap-4 mt-5"
                                    >
                                        <span className="text-cyan-500/60 text-[10px] tracking-[0.2em] uppercase font-medium">
                                            {myProfile?.username || 'Tú'}
                                        </span>
                                        <span className="text-white/15 text-[8px]">✦</span>
                                        <span className="text-purple-400/60 text-[10px] tracking-[0.2em] uppercase font-medium">
                                            {partnership.partner_username}
                                        </span>
                                    </motion.div>

                                    {/* Days counter */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 1.8, duration: 1 }}
                                        className="mt-6 text-center"
                                    >
                                        <span className="text-[9px] text-white/20 tracking-[0.3em] uppercase">
                                            {Math.max(0, Math.floor((Date.now() - new Date(partnership.linked_at).getTime()) / 86400000))} días juntos
                                        </span>
                                    </motion.div>

                                    {otherOnline && (
                                        <motion.div
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            className="mt-8 bg-white/5 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10"
                                        >
                                            <span className="text-[9px] text-white/50 tracking-[0.2em] uppercase font-bold">Sincronía activa</span>
                                        </motion.div>
                                    )}

                                </motion.div>
                            )}
                        </div>

                        {/* Huellas invisibles (Floating subtle indicator) */}
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-10 flex items-center gap-1">
                            <span className="text-[8px] text-white tracking-[0.4em] uppercase">Vínculo Nivel {partnership.evolution_level}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default PrivateUniverse;
