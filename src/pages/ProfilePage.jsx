import { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';
import { supabase } from '../supabaseClient';
import { ACHIEVEMENTS } from '../hooks/useAchievements';
import { getUserGameRanks } from '../services/supabaseScores';

const GAME_NAMES = {
    asteroids: 'Asteroids',
    tetris: 'Tetris',
    snake: 'Snake',
    pong: 'Pong',
    pacman: 'Pac-Man'
};

export default function ProfilePage() {
    const { user, loginWithGoogle, loginWithDiscord, logout, loading } = useAuth();

    const [profile, setProfile] = useState(null);
    const [userAchs, setUserAchs] = useState([]);
    const [gameRanks, setGameRanks] = useState([]);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (!user) return;

        const loadProfileData = async () => {
            setFetching(true);

            // Fetch Profile
            const { data: profData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();
            if (profData) setProfile(profData);

            // Fetch Achievements for user
            const { data: achData } = await supabase
                .from('user_achievements')
                .select('achievement_id')
                .eq('user_id', user.id);

            if (achData) {
                setUserAchs(achData.map(a => a.achievement_id));
            }

            // Fetch Game Ranks
            const ranks = await getUserGameRanks(user.id);
            setGameRanks(ranks);

            setFetching(false);
        };

        loadProfileData();
    }, [user]);

    if (loading) {
        return <div className="card"><h2 className="cardTitle">Cargando perfil...</h2></div>;
    }

    if (!user) {
        return (
            <main className="card">
                <h1 className="cardTitle">MI PERFIL</h1>
                <p>Inicia sesión para ver tu perfil, tus logros y récords en los juegos.</p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
                    <button className="winButton" onClick={loginWithGoogle}>Entrar con Google</button>
                    <button className="winButton" onClick={loginWithDiscord}>Entrar con Discord</button>
                </div>
            </main>
        );
    }

    const unlockedAchData = ACHIEVEMENTS.filter(a => userAchs.includes(a.id));

    return (
        <main className="card profileCard">
            <div className="profileHeader" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '1px solid var(--border)' }}>
                <div className="avatarFrame" style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--accent)' }}>
                    <img
                        src={profile?.avatar_url || "/dan_profile.jpg"}
                        alt="avatar"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>
                <div>
                    <h1 style={{ margin: 0, color: 'var(--accent)' }}>{profile?.username || user.email.split('@')[0]}</h1>
                    <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>Jugador Registrado</p>
                    <button className="winButton" onClick={logout} style={{ marginTop: '10px', fontSize: '0.8rem', padding: '4px 8px' }}>Cerrar Sesión</button>
                </div>
            </div>

            {fetching ? (
                <div style={{ padding: '20px' }}>Cargando datos...</div>
            ) : (
                <div style={{ padding: '20px' }}>

                    <section style={{ marginBottom: '30px' }}>
                        <h2 className="cardTitle" style={{ fontSize: '1.2rem', marginBottom: '15px' }}>🎮 Récords Personales</h2>
                        {gameRanks.length === 0 ? (
                            <p style={{ opacity: 0.7 }}>Aún no has jugado ningún juego o no tienes un récord registrado.</p>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                                {gameRanks.map(rank => (
                                    <div key={rank.game_id} style={{
                                        padding: '15px',
                                        border: '1px solid var(--border)',
                                        background: 'rgba(255,255,255,0.02)',
                                        borderRadius: '8px'
                                    }}>
                                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: 'var(--accent)' }}>
                                            {GAME_NAMES[rank.game_id] || rank.game_id}
                                        </h3>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{rank.max_score}</div>
                                        <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '5px' }}>
                                            Puesto Global: <strong>#{rank.position}</strong>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className="cardTitle" style={{ fontSize: '1.2rem', marginBottom: '15px' }}>🏆 Logros Desbloqueados ({unlockedAchData.length}/{ACHIEVEMENTS.length})</h2>
                        {unlockedAchData.length === 0 ? (
                            <p style={{ opacity: 0.7 }}>Aún no has desbloqueado logros. ¡Sigue explorando!</p>
                        ) : (
                            <div className="achGrid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
                                {unlockedAchData.map(ach => (
                                    <div key={ach.id} className="achCard unlocked">
                                        <div className="achCardIcon">{ach.icon}</div>
                                        <div className="achCardBody">
                                            <div className="achCardTitle">{ach.title}</div>
                                            <div className="achCardDesc">{ach.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                </div>
            )}
        </main>
    );
}
