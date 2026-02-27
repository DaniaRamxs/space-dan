import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import * as lb from '../services/leaderboard';
import { motion, AnimatePresence } from 'framer-motion';
import HoloCard from '../components/HoloCard';
import SeasonWidget from '../components/SeasonWidget';
import { getUserDisplayName, getNicknameClass } from '../utils/user';
import StreakLeaderboard from '../components/Social/StreakLeaderboard';
import '../styles/NicknameStyles.css';

const TABS = [
  { id: 'competitive', label: '🏆 Temporada', desc: 'Clasificación de riqueza en la temporada actual' },
  { id: 'wealth', label: '◈ Riqueza', desc: 'Balance actual de Dancoins' },
  { id: 'games', label: '🎮 Juegos', desc: 'Suma de mejores puntajes en todos los juegos' },
  { id: 'streaks', label: '🔥 Racha', desc: 'Días consecutivos con actividad real en Dan-Space' },
  { id: 'focus', label: '🧘 Enfoque', desc: 'Más tiempo de concentración en la cabina espacial' },
  { id: 'growth', label: '📈 Crecimiento', desc: 'Mayor crecimiento de Dancoins esta semana' },
  { id: 'generosity', label: '🤝 Generosidad', desc: 'Más coins donados al fondo comunitario' },
  { id: 'achievements', label: '🏆 Logros', desc: 'Logros desbloqueados' },
  { id: 'members', label: '👥 Miembros', desc: 'Exploradores que se han unido a la tripulación' },
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

  const userTier = [...TIERS].reverse().find(t => (row.season_balance || 0) >= t.min) || TIERS[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ delay: i * 0.05 }}
      onClick={onClick}
      className={`relative group cursor-pointer mb-3 rounded-2xl overflow-hidden border ${isMe ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-white/10 bg-white/5'} backdrop-blur-md`}
    >
      {rank === 1 && (
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent animate-pulse" />
      )}

      <div className="flex items-center p-3 md:p-4 gap-4">
        {/* Rank Section */}
        <div className="flex flex-col items-center justify-center min-w-[40px] md:min-w-[60px]">
          <span className={`text-xl md:text-3xl font-black ${rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-amber-600' : 'text-white/20'}`}>
            {isTop3 ? medal(rank) : rank}
          </span>
          {isTop3 && <span className="text-[8px] font-black tracking-widest text-white/40 uppercase mt-[-4px]">TOP</span>}
        </div>

        {/* User Info */}
        <div className="flex items-center flex-1 gap-3 md:gap-4 overflow-hidden">
          <div className="relative flex-shrink-0">
            <div className={`rounded-full p-[2px] ${rank === 1 ? 'bg-gradient-to-tr from-yellow-400 to-yellow-600' : 'bg-white/10'}`}>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-black/40">
                <img src={row.avatar_url || '/default-avatar.png'} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
            {isTop3 && (
              <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-lg ${rank === 1 ? 'bg-yellow-500' : rank === 2 ? 'bg-gray-400' : 'bg-amber-700'}`}>
                👑
              </div>
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className={`font-black text-sm md:text-lg ${getNicknameClass(row) || (isMe ? 'text-cyan-400' : 'text-white')}`}>
                {getUserDisplayName(row)}
              </span>
              <span className="text-sm scale-110 flex-shrink-0" title={userTier.label}>{userTier.icon}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded bg-black/40 border border-white/10 text-cyan-400 uppercase tracking-tighter">
                LVL {row.user_level || 1}
              </span>
              <span className="text-[8px] md:text-[9px] font-black text-white/40 uppercase tracking-widest truncate">
                {userTier.label}
              </span>
            </div>
          </div>
        </div>

        {/* Score Section */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-lg md:text-2xl font-black text-cyan-400 font-mono tracking-tighter drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
            {formatMetric('competitive', row)}
          </span>
          <span className="text-[8px] md:text-[10px] font-bold text-white/20 uppercase tracking-widest">
            Seasonal_Wealth
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function GlobalLeaderboardPage() {

  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('competitive');
  const [data, setData] = useState({});
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
        case 'streaks': rows = await lb.getStreakLeaderboard(50); break;
        case 'members': rows = await lb.getMembers(100); break;
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
  }, []);

  useEffect(() => { fetchTab(activeTab); }, [activeTab, fetchTab]);

  const rows = data[activeTab] ?? [];
  const activeTab_ = TABS.find(t => t.id === activeTab);

  const handleRow = (row) => {
    if (row.user_id || row.id) setSelectedProfile(row);
  };

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-12 bg-transparent text-white font-sans flex flex-col gap-6 md:gap-10 pb-32">

      {/* Dynamic Header with Season Focus */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="text-[10px] md:text-xs font-black tracking-[0.3em] text-cyan-400 uppercase">Multi-Verse Rankings</span>
            </div>
            <h1 className="text-4xl md:text-7xl font-black italic tracking-tighter uppercase leading-[0.9]">
              GLOBAL <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/20">LEADERBOARD</span>
            </h1>
            <p className="text-[11px] md:text-sm font-bold text-white/40 uppercase tracking-widest pt-2">
              {activeTab_?.desc}
            </p>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Active_Tab</span>
              <span className="text-lg md:text-2xl font-black italic text-cyan-400 uppercase">{activeTab_?.label?.split(' ')[1]}</span>
            </div>
          </div>
        </div>

        {activeTab === 'competitive' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <SeasonWidget />
          </motion.div>
        )}
      </div>

      {/* Tabs Menu - Scrollable on mobile */}
      <div className="relative sticky top-0 z-[100] -mx-4 px-4 bg-[#050510]/80 backdrop-blur-xl border-y border-white/5 py-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-shrink-0 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id
                ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-105'
                : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-cyan-500/60 uppercase tracking-widest">Sincronizando Ranking...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl text-center">
            <p className="text-red-400 font-bold">{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white/5 border border-white/10 p-12 rounded-3xl text-center text-white/20 italic font-medium">
            Aún no hay datos en este sector del multiverso.
          </div>
        ) : activeTab === 'streaks' ? (
          <StreakLeaderboard
            users={rows}
            onProfileClick={handleRow}
            isMeId={user?.id}
          />
        ) : activeTab === 'competitive' ? (
          <div className="space-y-1">
            {rows.map((row, i) => (
              <CompetitiveRow
                key={row.user_id || row.id || i}
                row={row}
                i={i}
                isMe={user && (row.user_id || row.id) === user.id}
                formatMetric={formatMetric}
                onClick={() => handleRow(row)}
              />
            ))}
          </div>
        ) : (
          /* Standard Row List for non-competitive tabs */
          <div className="space-y-2">
            {rows.map((row, i) => {
              const rank = row.rank ?? (i + 1);
              const isMe = user && (row.user_id || row.id) === user.id;

              return (
                <motion.div
                  key={row.user_id || row.id || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => handleRow(row)}
                  className={`flex items-center p-3 rounded-2xl border transition-all cursor-pointer ${isMe ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                    }`}
                >
                  <div className="w-10 md:w-14 text-center font-black text-sm md:text-xl text-white/20">
                    {rank <= 3 ? medal(rank) : rank}
                  </div>

                  <div className="flex items-center flex-1 gap-3 md:gap-4 overflow-hidden">
                    <Avatar url={row.avatar_url} name={row.username} />
                    <div className="flex flex-col min-w-0 overflow-hidden">
                      <span className={`font-bold text-sm md:text-md ${getNicknameClass(row) || (isMe ? 'text-cyan-400' : 'text-white')}`}>
                        {getUserDisplayName(row)}
                      </span>
                      {row.user_level && (
                        <span className="text-[9px] font-black text-cyan-400/60 uppercase">LVL {row.user_level}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span className="font-black text-sm md:text-xl text-white/90">
                      {activeTab === 'members' ? (
                        <span className="text-[10px] opacity-40 font-mono">
                          {new Date(row.created_at).toLocaleDateString()}
                        </span>
                      ) : formatMetric(activeTab, row)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {activeTab === 'members' && rows.length >= 10 && (
          <div className="flex justify-center mt-8">
            <button className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white/40 hover:bg-white/10 hover:text-white transition-all">
              Cargar más tripulantes ↓
            </button>
          </div>
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

