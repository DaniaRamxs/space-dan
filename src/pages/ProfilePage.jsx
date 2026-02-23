import { useEffect, useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { ACHIEVEMENTS } from '../hooks/useAchievements';
import { getUserGameRanks } from '../services/supabaseScores';

const GAME_NAMES = {
    asteroids: 'Asteroids',
    tetris: 'Tetris',
    snake: 'Snake',
    pong: 'Pong',
    memory: 'Memory',
    ttt: 'Tic Tac Toe',
    whack: 'Whack-a-Mole',
    color: 'Color Match',
    reaction: 'Reaction Time',
    '2048': '2048',
    blackjack: 'Blackjack',
    puzzle: 'Sliding Puzzle',
    invaders: 'Space Invaders',
    breakout: 'Breakout',
    flappy: 'Flappy Bird',
    mines: 'Buscaminas',
    dino: 'Dino Runner',
    connect4: 'Connect Four',
    simon: 'Simon Says',
    cookie: 'Cookie Clicker',
    maze: 'Maze',
    catch: 'Catch Game',
    dodge: 'Dodge Game'
};

export default function ProfilePage() {
    const { user, loginWithGoogle, loginWithDiscord, logout, loading } = useAuthContext();

    const [profile, setProfile] = useState(null);
    const [userAchs, setUserAchs] = useState([]);
    const [gameRanks, setGameRanks] = useState([]);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (!user) return;

        const loadProfileData = async () => {
            setFetching(true);
            console.log("Loading profile data for user:", user.id);

            try {
                // Fetch Profile
                const { data: profData, error: profErr } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();
                if (profErr) console.error("Profile fetch error:", profErr);
                if (profData) setProfile(profData);
                console.log("Profile data loaded:", profData);

                // Fetch Achievements for user
                const { data: achData, error: achErr } = await supabase
                    .from('user_achievements')
                    .select('achievement_id')
                    .eq('user_id', user.id);
                if (achErr) console.error("Achievements fetch error:", achErr);
                if (achData) {
                    setUserAchs(achData.map(a => a.achievement_id));
                    console.log("Achievements loaded:", achData.length);
                }

                // Fetch Game Ranks
                const ranks = await getUserGameRanks(user.id);
                console.log("Game ranks loaded:", ranks);
                setGameRanks(ranks || []);

            } catch (err) {
                console.error("Critical error loading profile:", err);
            } finally {
                setFetching(false);
            }
        };

        loadProfileData();
    }, [user?.id]); // Using user?.id to prevent loop from user object reference changes

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
            <div className="profileHeader" style={{ padding: '30px', display: 'flex', alignItems: 'center', gap: '25px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(255,110,180,0.1) 0%, rgba(0,229,255,0.05) 100%)' }}>
                <div className="avatarFrame" style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--accent)', boxShadow: '0 0 15px var(--accent-glow)' }}>
                    <img
                        src={profile?.avatar_url || "/dan_profile.jpg"}
                        alt="avatar"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                            <h1 style={{ margin: 0, color: 'var(--text)', fontSize: '2rem', textShadow: '0 0 10px var(--glow)' }}>
                                {profile?.username || user?.user_metadata?.full_name || user?.user_metadata?.name || (user?.email || '').split('@')[0] || 'Jugador'}
                            </h1>
                            <p style={{ margin: '5px 0 0 0', color: 'var(--cyan)', fontSize: '0.9rem', fontWeight: 'bold', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                ⭐ Viajero del Dan-Space
                            </p>
                        </div>
                        <button className="winButton" onClick={logout} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Cerrar Sesión</button>
                    </div>
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
                                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {GAME_NAMES[rank.game_id] || rank.game_id}
                                        </h3>
                                        <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--text)' }}>
                                            {(rank.max_score || 0).toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--accent)', marginTop: '8px', fontWeight: 'bold' }}>
                                            Puesto Global: <span style={{ color: 'var(--text)' }}>#{rank.user_position}</span>
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
