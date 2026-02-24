import { useSeason } from '../hooks/useSeason';

export default function SeasonMiniBadge() {
    const { season, loading } = useSeason();

    if (loading || !season) return null;

    const hasBoost = season.active_boosts?.night || season.active_boosts?.weekend || season.is_final_phase;
    if (!hasBoost) return null;

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 110, 180, 0.1)',
            border: '1px solid rgba(255, 110, 180, 0.3)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 'bold',
            color: 'var(--accent)',
            boxShadow: '0 0 15px rgba(255, 110, 180, 0.1)',
            backdropFilter: 'blur(4px)',
            animation: 'pulse 2s infinite'
        }}>
            <span style={{ display: 'flex', gap: 4 }}>
                {season.active_boosts?.night && '🌙'}
                {season.active_boosts?.weekend && '🎉'}
                {season.is_final_phase && '🔥'}
            </span>
            <span>SEASON BOOST ACTIVE!</span>
        </div>
    );
}
