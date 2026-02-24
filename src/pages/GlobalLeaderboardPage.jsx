import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import * as lb from '../services/leaderboard';
import { motion, AnimatePresence } from 'framer-motion';
import HoloCard from '../components/HoloCard';
import SeasonWidget from '../components/SeasonWidget';

const TABS = [
  { id: 'games', label: '🎮 Juegos', desc: 'Suma de mejores puntajes en todos los juegos' },
  { id: 'wealth', label: '◈ Riqueza', desc: 'Balance actual de Dancoins' },
  { id: 'growth', label: '📈 Crecimiento', desc: 'Mayor crecimiento de Dancoins esta semana' },
  { id: 'generosity', label: '🤝 Generosidad', desc: 'Más coins donados al fondo comunitario' },
  { id: 'achievements', label: '🏆 Logros', desc: 'Logros desbloqueados' },
  { id: 'focus', label: '🧘 Enfoque', desc: 'Más tiempo de concentración en la cabina espacial' },
  { id: 'competitive', label: '🏆 Temporada', desc: 'Clasificación de riqueza en la temporada actual' },
];

const MEDALS = ['🥇', '🥈', '🥉'];

function medal(rank) {
  const n = typeof rank === 'number' ? rank : 999;
  return MEDALS[n - 1] ?? String(n);
}

function Avatar({ url, name }) {
  return url
    ? <img src={url} alt={name} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
    : <span style={{ fontSize: 14 }}>👤</span>;
}

function formatMetric(tab, row) {
  switch (tab) {
    case 'games': return (row.total_score ?? 0).toLocaleString() + ' pts';
    case 'wealth': return '◈ ' + (row.balance ?? 0).toLocaleString();
    case 'growth': {
      const g = row.growth ?? 0;
      const p = row.growth_pct ?? 0;
      return (
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span>{(g >= 0 ? '+' : '') + '◈ ' + g.toLocaleString()}</span>
          <span style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 'normal' }}>
            {p}% esta semana
          </span>
        </span>
      );
    }
    case 'generosity': return '◈ ' + (row.total_donated ?? 0).toLocaleString();
    case 'achievements': return (row.achievement_count ?? 0) + ' logros';
    case 'focus': return Math.round((row.total_minutes ?? 0) / 60) + ' h';
    case 'competitive': return '◈ ' + (row.season_balance ?? row.metric ?? 0).toLocaleString();
    default: return '—';
  }
}

function metricColor(tab, row) {
  if (tab === 'growth') {
    return (row.growth ?? 0) >= 0 ? 'var(--accent)' : '#ff5555';
  }
  return 'var(--accent)';
}

const TIERS = [
  { label: 'BRONCE', min: 0, color: '#cd7f32', icon: '🥉' },
  { label: 'PLATA', min: 500, color: '#c0c0c0', icon: '🥈' },
  { label: 'ORO', min: 2000, color: '#ffd700', icon: '🥇' },
  { label: 'PLATINO', min: 5000, color: '#e5e4e2', icon: '💎' },
  { label: 'DIAMANTE', min: 12000, color: '#00eeee', icon: '💠' },
  { label: 'MAESTRO', min: 25000, color: '#ff00ff', icon: '👑' },
  { label: 'ELITE', min: 50000, color: '#ff3333', icon: '🔥' },
];

function CompetitiveRow({ row, i, isMe, formatMetric, onClick }) {
  const rank = row.rank ?? (i + 1);
  const isTop3 = rank <= 3;
  const borderGlow = rank === 1 ? 'rgba(255,215,0,0.4)' :
    rank === 2 ? 'rgba(229,229,229,0.3)' :
      rank === 3 ? 'rgba(205,127,50,0.3)' : 'rgba(255,255,255,0.05)';

  const bgGradient = rank === 1 ? 'linear-gradient(90deg, rgba(255,215,0,0.1) 0%, transparent 100%)' :
    isMe ? 'rgba(255,110,180,0.1)' : 'transparent';

  const userTier = [...TIERS].reverse().find(t => (row.season_balance || 0) >= t.min) || TIERS[0];

  return (
    <motion.tr
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.01, filter: 'brightness(1.2)' }}
      transition={{ delay: i * 0.05, duration: 0.4 }}
      onClick={onClick}
      className={`competitive-row rank-${rank}`}
      style={{
        cursor: 'pointer',
        background: bgGradient,
        height: isTop3 ? '85px' : '65px',
        borderBottom: `1px solid ${borderGlow}`,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <td style={{ width: 80, textAlign: 'center', position: 'relative' }}>
        {/* Shine effect for Top Rank - Moved inside TD but covers TR via absolute positioning */}
        {rank === 1 && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '1000%', // Spans across the table row
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)',
            animation: 'shine 3s infinite',
            pointerEvents: 'none',
            zIndex: 0
          }} />
        )}
        <div style={{
          position: 'relative',
          zIndex: 1,
          fontSize: isTop3 ? '2rem' : '1.2rem',
          fontWeight: '900',
          fontFamily: 'monospace',
          color: rank === 1 ? '#ffd700' : rank === 2 ? '#e5e5e5' : rank === 3 ? '#cd7f32' : 'rgba(255,255,255,0.5)',
          textShadow: isTop3 ? `0 0 15px ${borderGlow}` : 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {isTop3 ? medal(rank) : rank}
          {isTop3 && <span style={{ fontSize: '0.6rem', letterSpacing: 1, marginTop: -5 }}>RANK</span>}
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              borderRadius: '50%', padding: '3px',
              background: rank === 1 ? 'linear-gradient(45deg, #ffd700, #fff, #ffd700)' :
                userTier.min >= 5000 ? `linear-gradient(45deg, ${userTier.color}, #fff, ${userTier.color})` : 'transparent'
            }}>
              <Avatar url={row.avatar_url} name={row.username} />
            </div>
            {isTop3 && (
              <div style={{
                position: 'absolute', top: -4, left: -4, right: -4, bottom: -4,
                border: `2px solid ${borderGlow}`, borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }} />
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{
              fontWeight: '900',
              fontSize: isTop3 ? '1.2rem' : '1rem',
              color: isMe ? 'var(--accent)' : '#fff',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              {row.username || 'Anónimo'}
              <span style={{ fontSize: '1rem' }} title={userTier.label}>{userTier.icon}</span>
              {isMe && <span style={{ marginLeft: 6, fontSize: '0.6rem', background: 'var(--accent)', color: '#fff', padding: '1px 6px', borderRadius: '4px' }}>TÚ</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {row.user_level && (
                <span style={{ fontSize: '0.7rem', color: 'var(--cyan)', fontWeight: 'bold', background: 'rgba(0,229,255,0.1)', padding: '1px 8px', borderRadius: '4px' }}>
                  LEVEL {row.user_level}
                </span>
              )}
              <span style={{ fontSize: '0.6rem', color: userTier.color, fontWeight: '900', letterSpacing: 1 }}>
                {userTier.label}
              </span>
            </div>
          </div>
        </div>
      </td>
      <td style={{ textAlign: 'right', paddingRight: 30 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{
            fontSize: isTop3 ? '1.6rem' : '1.3rem',
            fontWeight: '900',
            color: 'var(--cyan)',
            fontFamily: '"Exo 2", monospace',
            textShadow: '0 0 10px rgba(0,255,255,0.4)',
            letterSpacing: '0.05em'
          }}>
            {formatMetric('competitive', row)}
          </span>
          {isTop3 && <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ fontSize: '0.65rem', color: '#fff', opacity: 0.7, textTransform: 'uppercase', fontWeight: 'bold' }}
          >
            Elite Seasonal
          </motion.span>}
        </div>
      </td>
    </motion.tr>

  );
}

export default function GlobalLeaderboardPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('competitive');
  const [data, setData] = useState({});   // { tabId: rows[] }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);

  const fetchTab = useCallback(async (tabId) => {
    setLoading(true);
    setError(null);
    try {
      let rows;
      switch (tabId) {
        case 'games': rows = await lb.getGlobalGameLeaderboard(50); break;
        case 'wealth': rows = await lb.getWealthLeaderboard(50); break;
        case 'growth': rows = await lb.getWeeklyGrowthLeaderboard(50); break;
        case 'generosity': rows = await lb.getGenerosityLeaderboard(50); break;
        case 'achievements': rows = await lb.getAchievementLeaderboard(50); break;
        case 'focus': rows = await lb.getFocusLeaderboard(50); break;
        case 'competitive': rows = await lb.getCompetitiveLeaderboard(50); break;
        default: rows = [];
      }
      setData(prev => ({ ...prev, [tabId]: rows ?? [] }));
    } catch (err) {
      console.error('[Leaderboard]', tabId, err);
      setError('No se pudo cargar el ranking. Inténtalo de nuevo.');
      setData(prev => ({ ...prev, [tabId]: [] }));
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => { fetchTab(activeTab); }, [activeTab]);

  const rows = data[activeTab] ?? [];
  const activeTab_ = TABS.find(t => t.id === activeTab);

  const handleRow = (row) => {
    if (row.user_id) setSelectedProfile(row);
  };

  return (
    <main className="card">
      {activeTab === 'competitive' && (
        <div className="season-widget-sticky-container" style={{ position: 'sticky', zIndex: 1000, background: 'var(--bg)' }}>
          <SeasonWidget />
        </div>
      )}

      <div className="pageHeader">
        <h1>🌎 leaderboard global</h1>
        <p className="tinyText">{activeTab_?.desc}</p>
      </div>


      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '18px 0 0 0', borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === t.id ? '#fff' : 'rgba(255,255,255,0.4)',
              fontWeight: activeTab === t.id ? '900' : '400',
              padding: '10px 14px',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: 1
            }}
          >
            {t.label}
          </button>
        ))}
      </div>



      {/* Table */}
      <div className="lbContainer" style={{ marginTop: 18, overflowX: 'auto' }}>
        {loading ? (
          <p className="tinyText" style={{ textAlign: 'center', padding: 30 }}>Cargando ranking...</p>
        ) : error ? (
          <p style={{ textAlign: 'center', color: '#ff5555', padding: 30 }}>{error}</p>
        ) : rows.length === 0 ? (
          <p className="tinyText" style={{ textAlign: 'center', padding: 30 }}>Aún no hay datos en este ranking.</p>
        ) : (
          <table className="lbTable" style={{ width: '100%', borderCollapse: 'collapse', minWidth: activeTab === 'competitive' ? '380px' : 'auto' }}>
            <thead>
              <tr>
                <th style={{ width: 44 }}>#</th>
                <th style={{ textAlign: 'left' }}>Jugador</th>
                <th style={{ textAlign: 'right' }}>
                  {activeTab === 'games' ? 'Puntaje' :
                    activeTab === 'wealth' ? 'Balance' :
                      activeTab === 'growth' ? 'Crecimiento' :
                        activeTab === 'generosity' ? 'Donado' :
                          activeTab === 'achievements' ? 'Logros' :
                            activeTab === 'competitive' ? 'Balance Temp.' : 'Enfoque'}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const rank = row.rank ?? (i + 1);
                const isMe = user && row.user_id === user.id;

                if (activeTab === 'competitive') {
                  return (
                    <CompetitiveRow
                      key={row.user_id ?? i}
                      row={row}
                      i={i}
                      isMe={isMe}
                      medal={medal}
                      formatMetric={formatMetric}
                      onClick={() => handleRow(row)}
                    />
                  );
                }

                return (
                  <motion.tr
                    key={row.user_id ?? i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                    onClick={() => handleRow(row)}
                    title="Ver perfil"
                    className="group"
                    style={{
                      cursor: row.user_id ? 'pointer' : 'default',
                      background: isMe ? 'rgba(255,110,180,0.08)' : undefined,
                    }}
                  >
                    <td className="lbRank" style={{ fontWeight: 'bold' }}>
                      {rank <= 3 ? medal(rank) : rank}
                    </td>
                    <td className="lbUser" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar url={row.avatar_url} name={row.username} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: isMe ? 'var(--accent)' : 'var(--text)', fontWeight: 500 }}>
                          {row.username || 'Anónimo'}
                        </span>
                        {row.user_level && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--cyan)', opacity: 0.8, fontWeight: 'bold' }}>
                            LVL {row.user_level}
                          </span>
                        )}
                      </div>
                      {isMe && <span style={{ fontSize: '0.7rem', color: 'var(--accent)', opacity: 0.8 }}>tú</span>}
                    </td>

                    <td className="lbScore" style={{ textAlign: 'right', fontWeight: 'bold', color: metricColor(activeTab, row) }}>
                      {formatMetric(activeTab, row)}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {/* Holo Profile Modal */}
      <AnimatePresence>
        {selectedProfile && (
          <HoloCard
            profile={selectedProfile}
            onClose={() => setSelectedProfile(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
