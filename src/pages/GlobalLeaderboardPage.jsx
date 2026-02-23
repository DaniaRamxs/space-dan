import { useEffect, useState } from 'react';
import { getGlobalLeaderboard } from '../services/supabaseScores';

export default function GlobalLeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            const data = await getGlobalLeaderboard(50); // Get top 50 users globally
            setLeaderboard(data);
            setLoading(false);
        };

        fetchLeaderboard();
    }, []);

    return (
        <main className="card">
            <div className="pageHeader">
                <h1>🌎 leaderboard global</h1>
                <p className="tinyText">Top jugadores suma de todos sus mejores puntajes</p>
            </div>

            <div className="lbContainer" style={{ marginTop: '20px' }}>
                {loading ? (
                    <p className="tinyText" style={{ textAlign: 'center' }}>Cargando ranking global...</p>
                ) : leaderboard.length === 0 ? (
                    <p className="tinyText" style={{ textAlign: 'center' }}>Aún no hay puntuaciones registradas.</p>
                ) : (
                    <table className="lbTable">
                        <thead>
                            <tr>
                                <th style={{ width: 40 }}>#</th>
                                <th style={{ textAlign: 'left' }}>Jugador</th>
                                <th style={{ textAlign: 'right' }}>Puntaje Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboard.map((row, i) => (
                                <tr key={row.user_id}>
                                    <td className="lbRank">{i + 1}</td>
                                    <td className="lbUser" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {row.avatar_url ? (
                                            <img src={row.avatar_url} alt="avatar" style={{ width: 20, height: 20, borderRadius: '50%' }} />
                                        ) : (
                                            <span style={{ fontSize: '14px' }}>👤</span>
                                        )}
                                        {row.username || 'Anónimo'}
                                    </td>
                                    <td className="lbScore" style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--accent)' }}>
                                        {row.total_score}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </main>
    );
}
