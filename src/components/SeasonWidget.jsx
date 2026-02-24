import { useState, useEffect } from 'react';
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

export default function SeasonWidget() {
    const { season, loading } = useSeason();
    const [timeLeft, setTimeLeft] = useState('...');

    // Actualizador manual de cuenta atrás de UI 
    useEffect(() => {
        if (!season?.end_at) return;
        const interval = setInterval(() => {
            setTimeLeft(getRemainingTime(season.end_at));
        }, 1000);
        return () => clearInterval(interval);
    }, [season?.end_at]);

    if (loading) return null;
    if (!season) return null; // Off-season

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(20,10,40,0.95) 0%, rgba(40,20,60,0.9) 50%, rgba(20,10,40,0.95) 100%)',
            backgroundSize: '200% 200%',
            animation: 'gradientMove 6s ease infinite',
            border: '1px solid rgba(255,110,180,0.5)',
            borderRadius: '20px',
            padding: '24px',
            margin: '0 0 20px 0',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0,0,0,0.7), inset 0 0 30px rgba(255,110,180,0.15)',
            color: '#fff'
        }}>
            {/* Glossy Overlay */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
                pointerEvents: 'none'
            }} />

            <style>{`
                @keyframes gradientMove {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes shine {
                    from { left: -100%; }
                    to { left: 100%; }
                }
            `}</style>

            {/* Background Rush Indicator */}
            {season.is_final_phase && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'red', boxShadow: '0 0 10px red', animation: 'pulse 1s infinite' }} />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1 }}>
                        TEMPORADA {season.number}
                    </h3>
                    <span style={{ fontSize: '0.75rem', opacity: 0.7, fontFamily: 'monospace' }}>
                        Termina en: {timeLeft}
                    </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: season.in_top_zone ? 'gold' : '#fff' }}>
                        #{season.my_position}
                    </div>
                    {season.in_top_zone && <span style={{ fontSize: '0.65rem', color: 'gold' }}>ZONA TOP 3</span>}
                </div>
            </div>

            {/* Boost Banners */}
            {(season.active_boosts?.night || season.active_boosts?.weekend || season.is_final_phase) && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    {season.active_boosts?.night && (
                        <div style={{ fontSize: '10px', background: 'rgba(74, 0, 224, 0.4)', border: '1px solid #4a00e0', color: '#fff', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: 4, backdropFilter: 'blur(4px)' }}>
                            <span style={{ fontSize: '12px' }}>🌙</span> NIGHT BOOST x1.2
                        </div>
                    )}
                    {season.active_boosts?.weekend && (
                        <div style={{ fontSize: '10px', background: 'rgba(255, 140, 0, 0.4)', border: '1px solid #ff8c00', color: '#fff', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: 4, backdropFilter: 'blur(4px)' }}>
                            <span style={{ fontSize: '12px' }}>🎉</span> WEEKEND x1.3
                        </div>
                    )}
                    {season.is_final_phase && (
                        <div style={{ fontSize: '10px', background: 'rgba(255, 0, 0, 0.4)', border: '1px solid #ff0000', color: '#fff', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: 4, backdropFilter: 'blur(4px)', animation: 'pulse 1s infinite' }}>
                            <span style={{ fontSize: '12px' }}>🔥</span> FINAL PHASE x1.5
                        </div>
                    )}
                </div>
            )}

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '16px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>My Seasonal Balance</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--cyan)', textShadow: '0 0 10px rgba(0,229,255,0.4)', fontFamily: '"Exo 2", sans-serif' }}>◈ {season.my_balance.toLocaleString()}</span>
                </div>

                {season.gap_to_next > 0 && (
                    <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#ff5555' }}>
                        A <b>◈ {season.gap_to_next.toLocaleString()}</b> pts<br /> del sgte puesto
                    </div>
                )}
            </div>

        </div>
    );
}
