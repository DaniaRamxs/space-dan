import { useState, useEffect, useMemo } from 'react';
import { useSeason } from '../hooks/useSeason';

/**
 * Calculador de cuenta regresiva
 */
function getRemainingTime(endAt) {
    const endTime = new Date(endAt).getTime();
    const now = new Date().getTime();
    const d = endTime - now;

    if (d <= 0) return '0d 00:00:00';
    const days = Math.floor(d / (1000 * 60 * 60 * 24));
    const hrs = Math.floor((d / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((d / 1000 / 60) % 60);
    const secs = Math.floor((d / 1000) % 60);

    return `${days}d ${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const TIERS = [
    { label: 'BRONCE I', min: 0, color: '#cd7f32', icon: '🥉' },
    { label: 'PLATA II', min: 500, color: '#c0c0c0', icon: '🥈' },
    { label: 'ORO III', min: 2000, color: '#ffd700', icon: '🥇' },
    { label: 'PLATINO IV', min: 5000, color: '#e5e4e2', icon: '💎' },
    { label: 'DIAMANTE V', min: 12000, color: '#00eeee', icon: '💠' },
    { label: 'MAESTRO', min: 25000, color: '#ff00ff', icon: '👑' },
    { label: 'ELITE SUPREMA', min: 50000, color: '#ff3333', icon: '🔥' },
];

export default function SeasonWidget() {
    const { season, loading } = useSeason();
    const [timeLeft, setTimeLeft] = useState('...');

    // Memoize particles to prevent re-randomization on every render (causes mobile flicker)
    const particles = useMemo(() => [...Array(6)].map(() => ({
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        duration: 3 + Math.random() * 4,
        delay: Math.random() * 5
    })), []);

    // Actualizador manual de cuenta atrás de UI 
    useEffect(() => {
        if (!season?.end_at) return;
        const interval = setInterval(() => {
            setTimeLeft(getRemainingTime(season.end_at));
        }, 1000);
        return () => clearInterval(interval);
    }, [season?.end_at]);

    if (loading || !season) return null;

    const currentTier = [...TIERS].reverse().find(t => (season?.my_balance || 0) >= t.min) || TIERS[0];
    const nextTier = TIERS[TIERS.indexOf(currentTier) + 1];
    const progress = nextTier
        ? Math.min(100, Math.max(0, ((season.my_balance - currentTier.min) / (nextTier.min - currentTier.min)) * 100))
        : 100;

    return (
        <div className="season-widget" style={{
            background: 'linear-gradient(135deg, rgba(20,10,40,0.95) 0%, rgba(40,20,60,0.9) 50%, rgba(20,10,40,0.95) 100%)',
            backgroundSize: '200% 200%',
            animation: 'gradientMove 6s ease infinite',
            border: '1px solid rgba(255,110,180,0.5)',
            borderRadius: '24px',
            margin: '0 0 24px 0',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0,0,0,0.7), inset 0 0 30px rgba(255,110,180,0.15)',
            color: '#fff'
        }}>
            {/* Glossy Overlay */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
                pointerEvents: 'none',
                zIndex: 2
            }} />

            <style>{`
                @keyframes gradientMove {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes floatParticle {
                    0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
                    50% { transform: translateY(-20px) scale(1.5); opacity: 0.7; }
                }
                @keyframes pulseBadge {
                    0% { transform: scale(1); filter: brightness(1); }
                    50% { transform: scale(1.05); filter: brightness(1.3); }
                    100% { transform: scale(1); filter: brightness(1); }
                }
            `}</style>

            {/* Floating Particles Overlay */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
                {particles.map((p, i) => (
                    <div key={i} style={{
                        position: 'absolute',
                        top: p.top,
                        left: p.left,
                        width: '2px', height: '2px',
                        background: '#fff',
                        borderRadius: '50%',
                        boxShadow: '0 0 10px #fff, 0 0 20px var(--accent)',
                        animation: `floatParticle ${p.duration}s ease-in-out infinite`,
                        animationDelay: `${p.delay}s`,
                        opacity: 0.4
                    }} />
                ))}
            </div>

            {/* Background Rush Indicator */}
            {season.is_final_phase && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#ff0044', boxShadow: '0 0 15px #ff0044', zIndex: 10 }} />
            )}

            {/* Header: Title & Timer */}
            <div className="season-widget-header" style={{ position: 'relative', zIndex: 3, marginBottom: 20 }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: '900' }}>
                        TEMPORADA {season.number}
                    </h3>
                    <div style={{ fontSize: '0.75rem', opacity: 0.6, fontFamily: 'monospace', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#00e5ff' }}>⏱</span> FINALIZA EN: {timeLeft}
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: '900', color: season.in_top_zone ? '#ffd700' : '#fff', textShadow: season.in_top_zone ? '0 0 10px rgba(255,215,0,0.5)' : 'none' }}>
                        #{season.my_position}
                    </div>
                    <div style={{ fontSize: '0.6rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>Global Rank</div>
                </div>
            </div>

            {/* Tier Status Row */}
            <div className="season-tier-row" style={{ position: 'relative', zIndex: 3, background: 'rgba(255,255,255,0.03)', padding: '12px 18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="season-tier-icon" style={{
                    fontSize: '2.2rem', background: 'rgba(0,0,0,0.2)',
                    width: '60px', height: '60px', borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${currentTier.color}`,
                    boxShadow: `inset 0 0 15px ${currentTier.color}33`,
                    flexShrink: 0
                }}>
                    {currentTier.icon}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.6rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>Rango Actual</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '900', color: currentTier.color, textShadow: `0 0 12px ${currentTier.color}55` }}>
                        {currentTier.label}
                    </div>
                </div>
            </div>

            {/* Progress to Next Tier */}
            {nextTier && (
                <div style={{ marginBottom: 20, position: 'relative', zIndex: 3 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: 8, textTransform: 'uppercase', fontWeight: 'bold' }}>
                        <span style={{ opacity: 0.6 }}>Progreso a {nextTier.label}</span>
                        <span style={{ color: currentTier.color }}>{Math.floor(progress)}%</span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden', padding: 1 }}>
                        <div style={{
                            height: '100%', width: `${progress}%`,
                            background: `linear-gradient(90deg, ${currentTier.color}, ${nextTier.color})`,
                            boxShadow: `0 0 15px ${currentTier.color}44`,
                            transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                            borderRadius: 10
                        }} />
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.6rem', marginTop: 6, opacity: 0.4 }}>
                        {season.my_balance.toLocaleString()} / {nextTier.min.toLocaleString()} COINS
                    </div>
                </div>
            )}

            {/* Bottom Stats & Boosts */}
            <div className="season-stats-row" style={{ position: 'relative', zIndex: 3 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.6rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Balance de Temporada</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--cyan)', textShadow: '0 0 15px rgba(0,229,255,0.6)', fontFamily: '"Exo 2", sans-serif' }}>
                            ◈ {season.my_balance.toLocaleString()}
                        </span>
                        {(season.active_boosts?.night || season.active_boosts?.weekend || season.is_final_phase) && (
                            <div style={{ display: 'flex', gap: 4 }}>
                                {season.active_boosts?.night && <span title="Night Boost active" style={{ animation: 'pulseBadge 2s infinite', fontSize: '14px' }}>🌙</span>}
                                {season.active_boosts?.weekend && <span title="Weekend Boost active" style={{ animation: 'pulseBadge 2s infinite', fontSize: '14px' }}>🎉</span>}
                                {season.is_final_phase && <span title="Final Phase boost active" style={{ animation: 'pulseBadge 1s infinite', fontSize: '14px' }}>🔥</span>}
                            </div>
                        )}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: '#ffd700', marginTop: 4, fontWeight: 'bold' }}>
                        🎁 RECOMPENSA ESTIMADA: {Math.floor(season.my_balance * 0.1).toLocaleString()} DANCOINS
                    </div>
                </div>

                {season.gap_to_next > 0 && (
                    <div style={{
                        textAlign: 'right', fontSize: '0.7rem', color: '#ff5555',
                        background: 'rgba(255,85,85,0.1)', padding: '6px 12px', borderRadius: '8px',
                        border: '1px solid rgba(255,85,85,0.2)'
                    }}>
                        A <b>◈ {season.gap_to_next.toLocaleString()}</b> del sgte puesto
                    </div>
                )}
            </div>
        </div>
    );
}
