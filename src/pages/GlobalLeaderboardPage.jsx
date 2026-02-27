import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import * as lb from '../services/leaderboard';
import { motion, AnimatePresence } from 'framer-motion';
import HoloCard from '../components/HoloCard';
import SeasonWidget from '../components/SeasonWidget';
import { getUserDisplayName, getNicknameClass } from '../utils/user';
import StreakLeaderboard from '../components/Social/StreakLeaderboard';
import { Trophy, Coins, Target, Award, Users, BarChart3, Heart, Zap, Infinity as InfinityIcon } from 'lucide-react';
import '../styles/NicknameStyles.css';

const TABS = [
  { id: 'competitive', label: 'Temporada', icon: <Trophy size={14} />, desc: 'Clasificación de riqueza en la temporada actual' },
  { id: 'wealth', label: 'Riqueza', icon: <Coins size={14} />, desc: 'Balance actual de Dancoins en circulación' },
  { id: 'games', label: 'Juegos', icon: <Zap size={14} />, desc: 'Suma de mejores puntajes en todos los sectores' },
  { id: 'streaks', label: 'Racha', icon: <BarChart3 size={14} />, desc: 'Días consecutivos de actividad sincronizada' },
  { id: 'focus', label: 'Enfoque', icon: <Target size={14} />, desc: 'Tiempo de concentración en la cabina espacial' },
  { id: 'growth', label: 'Crecimiento', icon: <Target size={14} />, desc: 'Mayor incremento de capital esta semana' },
  { id: 'generosity', label: 'Generosidad', icon: <Heart size={14} />, desc: 'Aportaciones al fondo comunitario' },
  { id: 'achievements', label: 'Logros', icon: <Award size={14} />, desc: 'Hitos desbloqueados en el multiverso' },
  { id: 'members', label: 'Miembros', icon: <Users size={14} />, desc: 'Exploradores que se han unido a la tripulación' },
];

function formatMetric(tab, row) {
  switch (tab) {
    case 'games': return (row.total_score ?? 0).toLocaleString() + ' pts';
    case 'wealth': return '◈ ' + (row.balance ?? 0).toLocaleString();
    case 'growth': {
      const g = row.growth ?? 0;
      const p = row.growth_pct ?? 0;
      return (
        <div className="flex flex-col items-end">
          <span className="font-mono">{(g >= 0 ? '+' : '') + '◈ ' + g.toLocaleString()}</span>
          <span className="text-[8px] opacity-40 uppercase tracking-tighter">
            {p}% semana
          </span>
        </div>
      );
    }
    case 'generosity': return '◈ ' + (row.total_donated ?? 0).toLocaleString();
    case 'achievements': return (row.achievement_count ?? 0) + ' / ' + (row.total_possible ?? '∞');
    case 'focus': return Math.round((row.total_minutes ?? 0) / 60) + 'h';
    case 'competitive': return '◈ ' + (row.season_balance ?? row.metric ?? 0).toLocaleString();
    default: return '—';
  }
}

const TIERS = [
  { label: 'Bronce', min: 0, color: 'text-orange-500/60', icon: '🥉' },
  { label: 'Plata', min: 500, color: 'text-slate-400', icon: '🥈' },
  { label: 'Oro', min: 2000, color: 'text-yellow-500/80', icon: '🥇' },
  { label: 'Platino', min: 5000, color: 'text-cyan-400/80', icon: '💎' },
  { label: 'Diamante', min: 12000, color: 'text-purple-400/80', icon: '💠' },
  { label: 'Maestro', min: 25000, color: 'text-rose-400/80', icon: '👑' },
  { label: 'Élite', min: 50000, color: 'text-white', icon: '🔥' },
];

function CompetitiveRow({ row, i, isMe, onClick }) {
  const rank = row.rank ?? (i + 1);
  const isTop3 = rank <= 3;
  const userTier = [...TIERS].reverse().find(t => (row.season_balance || 0) >= t.min) || TIERS[0];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.03 }}
      onClick={onClick}
      className={`group relative flex items-center p-4 rounded-[24px] border transition-all cursor-pointer overflow-hidden ${isMe ? 'bg-white/[0.05] border-white/20 ring-1 ring-white/10' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
        }`}
    >
      {/* Subtle rank indicator */}
      <div className="w-12 md:w-16 flex-shrink-0 flex items-center justify-center relative">
        <span className={`text-xl md:text-2xl font-black italic tracking-tighter tabular-nums ${isTop3 ? 'text-white' : 'opacity-10'}`}>
          {rank.toString().padStart(2, '0')}
        </span>
        {isTop3 && (
          <div className="absolute inset-0 flex items-center justify-center opacity-10 blur-xl scale-150 rotate-12 bg-white rounded-full" />
        )}
      </div>

      {/* Identity Card */}
      <div className="flex items-center flex-1 gap-4 min-w-0">
        <div className="relative">
          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border border-white/10 p-[2px]`}>
            <img src={row.avatar_url || '/default_user_blank.png'} alt="" className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-500" />
          </div>
          {isTop3 && (
            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] bg-white text-black font-black shadow-xl ring-2 ring-black`}>
              {rank === 1 ? '❶' : rank === 2 ? '❷' : '❸'}
            </div>
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className={`font-bold text-sm md:text-base truncate transition-colors ${getNicknameClass(row) || (isMe ? 'text-white' : 'text-white/80 group-hover:text-white')}`}>
              {getUserDisplayName(row)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/5 flex items-center gap-1.5 ${userTier.color}`}>
              <span className="scale-75 opacity-60">{userTier.icon}</span> {userTier.label}
            </span>
            <span className="text-[8px] font-mono text-white/20 uppercase">LVL {row.user_level || 1}</span>
          </div>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="text-right flex flex-col items-end gap-0.5">
        <span className="font-black text-sm md:text-xl font-mono tracking-tighter text-white tabular-nums">
          {formatMetric('competitive', row)}
        </span>
        <span className="text-[8px] font-black text-white/10 uppercase tracking-[0.3em]">
          Sector_Wealth
        </span>
      </div>
    </motion.div>
  );
}

export default function GlobalLeaderboardPage() {
  const { user } = useAuthContext();
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
      setError('Sincronización fallida. Sector inaccesible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTab(activeTab); }, [activeTab, fetchTab]);

  const rows = data[activeTab] ?? [];
  const activeTabDetails = TABS.find(t => t.id === activeTab);

  return (
    <main className="w-full max-w-5xl mx-auto px-6 py-12 text-white font-sans flex flex-col gap-12 pb-32">

      {/* Elegant Header */}
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-white/[0.04] px-3 py-1 rounded-full border border-white/5 gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-[9px] font-black tracking-[0.4em] text-white/40 uppercase">Multiverse Registry</span>
              </div>
            </div>
            <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.8] mix-blend-difference">
              REGISTRO <br />
              <span className="opacity-40">GLOBAL</span>
            </h1>
            <p className="text-[10px] md:text-xs font-medium text-white/30 uppercase tracking-[0.4em] max-w-md">
              {activeTabDetails?.desc}
            </p>
          </div>

          <div className="hidden md:flex flex-col items-end gap-1 opacity-20">
            <span className="text-[9px] font-black uppercase tracking-widest">Sector_Active</span>
            <span className="text-2xl font-black italic tracking-tighter uppercase">{activeTabDetails?.label}</span>
          </div>
        </div>

        {activeTab === 'competitive' && <SeasonWidget />}
      </div>

      {/* Tabs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

        {/* Sidebar Nav */}
        <aside className="lg:col-span-3 lg:sticky lg:top-12 space-y-4">
          <div className="p-1 rounded-[28px] bg-white/[0.02] border border-white/5 backdrop-blur-xl">
            <div className="flex lg:flex-col overflow-x-auto no-scrollbar gap-1 p-1">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t.id
                    ? 'bg-white text-black shadow-xl scale-[1.02]'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                    }`}
                >
                  <span className={activeTab === t.id ? 'opacity-100' : 'opacity-40'}>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-[28px] border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent space-y-4 hidden lg:block">
            <div className="flex items-center gap-2 text-[9px] font-black text-white/20 uppercase tracking-widest">
              <Zap size={10} className="text-purple-400" />
              <span>Tip del Protocolo</span>
            </div>
            <p className="text-[10px] text-white/40 leading-relaxed italic">
              La clasificación se actualiza cada 5 minutos. Los logros especiales otorgan un boost de XP permanente.
            </p>
          </div>
        </aside>

        {/* Content Section */}
        <section className="lg:col-span-9 space-y-4 min-h-[600px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
                <div className="absolute inset-0 border-4 border-purple-500 rounded-full border-t-transparent animate-spin" />
              </div>
              <span className="text-white/20 font-black tracking-[0.4em] uppercase text-[10px] animate-pulse">Sincronizando_Memoria</span>
            </div>
          ) : error ? (
            <div className="p-12 text-center rounded-[32px] bg-rose-500/5 border border-rose-500/10">
              <p className="text-rose-500 text-xs font-black uppercase tracking-widest">{error}</p>
              <button onClick={() => fetchTab(activeTab)} className="mt-4 text-[10px] font-bold underline opacity-40 hover:opacity-100 uppercase tracking-widest transition-opacity">Reintentar Protocolo</button>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-20 text-center rounded-[32px] bg-white/[0.02] border border-white/5 italic text-white/20 text-sm uppercase tracking-widest">
              Sector vacío. Sin actividad detectada.
            </div>
          ) : activeTab === 'streaks' ? (
            <StreakLeaderboard users={rows} onProfileClick={setSelectedProfile} isMeId={user?.id} />
          ) : activeTab === 'competitive' ? (
            <div className="space-y-3">
              {rows.map((row, i) => (
                <CompetitiveRow
                  key={row.user_id || row.id || i}
                  row={row} i={i}
                  isMe={user && (row.user_id || row.id) === user.id}
                  onClick={() => setSelectedProfile(row)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row, i) => {
                const rank = row.rank ?? (i + 1);
                const isMe = user && (row.user_id || row.id) === user.id;

                return (
                  <motion.div
                    key={row.user_id || row.id || i}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => setSelectedProfile(row)}
                    className={`flex items-center p-4 rounded-[24px] border transition-all cursor-pointer group ${isMe ? 'bg-white/[0.05] border-white/20' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                      }`}
                  >
                    <div className="w-12 text-center text-xs font-black text-white/10 group-hover:text-white/20 transition-colors">
                      {rank.toString().padStart(2, '0')}
                    </div>

                    <div className="flex items-center flex-1 gap-4 overflow-hidden">
                      <img src={row.avatar_url || '/default_user_blank.png'} className="w-10 h-10 rounded-full object-cover border border-white/5" alt="" />
                      <div className="flex flex-col min-w-0">
                        <span className={`font-bold text-sm md:text-base truncate ${getNicknameClass(row) || (isMe ? 'text-white' : 'text-white/60 group-hover:text-white')}`}>
                          {getUserDisplayName(row)}
                        </span>
                        {row.user_level && (
                          <span className="text-[8px] font-black text-white/10 uppercase tracking-widest">LVL {row.user_level}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <span className="font-bold text-sm md:text-lg tabular-nums text-white/90">
                        {activeTab === 'members' ? (
                          <span className="text-[9px] opacity-40 font-mono">
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
        </section>
      </div>

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

