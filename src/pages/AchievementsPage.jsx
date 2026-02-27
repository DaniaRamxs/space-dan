import { useState, useEffect, useMemo } from 'react';
import useAchievements, { ACHIEVEMENTS, unlockAchievement } from '../hooks/useAchievements';
import { trackPageVisit } from '../hooks/useDancoins';
import { useEconomy } from '../contexts/EconomyContext';

export default function AchievementsPage() {
  const { unlocked } = useAchievements();
  const { balance } = useEconomy();
  const [filter, setFilter] = useState('all'); // all, unlocked, locked

  useEffect(() => {
    trackPageVisit('/logros');
    const h = new Date().getHours();
    if (h >= 0 && h < 5) unlockAchievement('night_owl');
  }, []);

  const totalPossibleCoins = ACHIEVEMENTS.reduce((s, a) => s + (a.coins || 0), 0);
  const totalEarnedCoins = ACHIEVEMENTS
    .filter(a => unlocked.includes(a.id))
    .reduce((s, a) => s + (a.coins || 0), 0);

  const filteredAchievements = useMemo(() => {
    if (filter === 'unlocked') return ACHIEVEMENTS.filter(a => unlocked.includes(a.id));
    if (filter === 'locked') return ACHIEVEMENTS.filter(a => !unlocked.includes(a.id));
    return ACHIEVEMENTS;
  }, [unlocked, filter]);

  const progressPercent = Math.round((unlocked.length / ACHIEVEMENTS.length) * 100);

  return (
    <div className="achPage max-w-6xl mx-auto px-4 pt-8 pb-64 space-y-12 min-h-screen overflow-y-auto">

      {/* Cinematic Header */}
      <div className="relative rounded-[2.5rem] overflow-hidden bg-black border border-white/10 p-8 md:p-12 min-h-[280px] flex flex-col justify-center group/hero">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-pink-900/20 to-indigo-900/30 opacity-70"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid-pattern.png')] opacity-10 pointer-events-none"></div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-pink-500/20 border border-pink-500/30 rounded-full text-[10px] font-black tracking-[0.2em] text-pink-400 uppercase">
              Sistema de Prestigio v3.0
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white leading-none">
            CENTRO DE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400">LOGROS.exe</span>
          </h1>

          <div className="flex flex-wrap items-center gap-6 pt-4">
            <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3">
              <div className="text-3xl font-black text-pink-400 font-mono">{progressPercent}%</div>
              <div className="h-10 w-px bg-white/10"></div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Completado</div>
                <div className="text-xs font-bold text-white/80">{unlocked.length} de {ACHIEVEMENTS.length} descriptores</div>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3">
              <div className="text-xl text-yellow-500">◈</div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Total Obtenido</div>
                <div className="text-xs font-bold text-white/80">{totalEarnedCoins} / {totalPossibleCoins}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Decorative */}
        <div className="absolute right-12 bottom-0 translate-y-1/2 opacity-10 blur-2xl group-hover:opacity-20 transition-opacity duration-1000">
          <div className="w-64 h-64 bg-pink-500 rounded-full"></div>
        </div>
      </div>

      {/* Progress & Filtering */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pt-4">
        <div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
          {['all', 'unlocked', 'locked'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-black shadow-lg scale-105' : 'text-white/40 hover:text-white/60'
                }`}
            >
              {f === 'all' ? 'Ver Todo' : f === 'unlocked' ? 'Obtenidos' : 'Pendientes'}
            </button>
          ))}
        </div>

        <div className="flex-1 max-w-md h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 hidden md:block">
          <div
            className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(236,72,153,0.5)]"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {filteredAchievements.map((ach, idx) => {
          const isUnlocked = unlocked.includes(ach.id);
          return (
            <div
              key={ach.id}
              className={`ach-card-v2 group relative rounded-[2rem] p-6 transition-all duration-500 ${isUnlocked
                ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:-translate-y-2 cursor-pointer'
                : 'bg-black/40 border-white/5 opacity-50'
                }`}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              {/* Card Aura */}
              {isUnlocked && (
                <div className="absolute -inset-px rounded-[2rem] bg-gradient-to-br from-pink-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
              )}

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-4 rounded-2xl bg-black/40 border border-white/5 text-4xl transition-transform duration-500 group-hover:scale-110 ${!isUnlocked && 'grayscale'}`}>
                    {isUnlocked ? ach.icon : '🔒'}
                  </div>
                  {isUnlocked ? (
                    <div className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-[8px] font-black text-green-400 tracking-widest uppercase">
                      Completado
                    </div>
                  ) : (
                    <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[8px] font-black text-white/20 tracking-widest uppercase">
                      Bloqueado
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <h3 className={`text-xl font-black italic tracking-tighter transition-colors ${isUnlocked ? 'text-white' : 'text-white/20'}`}>
                    {isUnlocked ? ach.title : '???'}
                  </h3>
                  <p className="text-xs leading-relaxed text-white/40 mb-6">
                    {isUnlocked ? ach.desc : 'Logro secreto — sigue explorando este universo digital para descubrirlo.'}
                  </p>
                </div>

                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500 font-bold text-sm">◈</span>
                    <span className={`text-xs font-black font-mono ${isUnlocked ? 'text-white/80' : 'text-white/20'}`}>+{ach.coins}</span>
                  </div>
                  {isUnlocked && (
                    <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 text-xs">
                      ✓
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center py-12 border-t border-white/5">
        <p className="text-[10px] uppercase font-bold tracking-[0.4em] text-white/20">
          Total ganado en esta sesión: <span className="text-yellow-500">{totalEarnedCoins} ◈</span>
        </p>
      </div>
    </div>
  );
}
