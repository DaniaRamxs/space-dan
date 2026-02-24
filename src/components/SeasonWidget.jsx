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
            background: 'linear-gradient(135deg, rgba(10,10,20,0.9) 0%, rgba(30,20,40,0.85) 100%)',
            border: '1px solid rgba(255,110,180,0.4)',
            borderRadius: '16px',
            padding: '20px',
            margin: '0 0 20px 0',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 0 20px rgba(255,110,180,0.1)'
        }}>

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
                <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                    {season.active_boosts?.night && <span style={{ fontSize: '10px', background: '#4a00e0', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>🌙 BOOST NOCTURNO x1.2</span>}
                    {season.active_boosts?.weekend && <span style={{ fontSize: '10px', background: '#ff8c00', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>🎉 FIN DE SEMANA x1.3</span>}
                    {season.is_final_phase && <span style={{ fontSize: '10px', background: '#ff0000', color: '#fff', padding: '2px 6px', borderRadius: '4px', animation: 'blink 1.5s infinite' }}>🔥 FASE FINAL x1.5</span>}
                </div>
            )}

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase' }}>Coins Temp.</span>
                    <span style={{ fontSize: '1.1rem', color: 'var(--cyan)' }}>◈ {season.my_balance.toLocaleString()}</span>
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
