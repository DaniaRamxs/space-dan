/**
 * CasinoLeaderboard.jsx — Tabla Galáctica de Starlys
 * Tabs: Actividad en Vivo | Top Ganadores | Top Perdedores
 * Actualización Supabase Realtime en casino_results.
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { getTopWinners, getTopLosers, getRecentActivity } from '../services/casino';

const gold   = '#f5c518';
const green  = '#00e676';
const red    = '#ff1744';
const purple = '#b66cff';

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 5)  return 'ahora';
  if (s < 60) return `hace ${s}s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)}m`;
  return `hace ${Math.floor(s / 3600)}h`;
}

function getBadge(profit, wins) {
  if (profit >= 1000) return { icon: '💎', label: 'Ballena Galáctica' };
  if (profit >= 500)  return { icon: '☄️', label: 'Cometa' };
  if (wins >= 5)      return { icon: '🔥', label: 'Racha Estelar' };
  return null;
}

function getLossBadge(loss) {
  if (loss <= -500) return { icon: '🕳️', label: 'Agujero Negro' };
  return null;
}

// ── Tab: Actividad en Vivo ────────────────────────────────────

function LiveFeed({ items }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <AnimatePresence initial={false}>
        {items.slice(0, 15).map((item, i) => {
          const won = item.profit > 0;
          return (
            <motion.div
              key={item.id || i}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 10,
                background: won ? 'rgba(0,230,118,0.06)' : 'rgba(255,23,68,0.06)',
                border: `1px solid ${won ? 'rgba(0,230,118,0.15)' : 'rgba(255,23,68,0.12)'}`,
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{won ? '🔥' : '💀'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>{item.username}</span>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}> · {item.game}</span>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: won ? green : red, fontWeight: 900, fontSize: '0.9rem' }}>
                  {won ? `+◈${item.profit}` : `-◈${Math.abs(item.profit)}`}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>{timeAgo(item.created_at)}</div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
          🛸 Sin actividad reciente
        </div>
      )}
    </div>
  );
}

// ── Tab: Ranking ──────────────────────────────────────────────

function RankingTable({ items, type }) {
  const isWin = type === 'winners';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, i) => {
        const badge = isWin ? getBadge(item.total, item.wins) : getLossBadge(item.total);
        return (
          <motion.div
            key={item.username}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10,
              background: i === 0
                ? (isWin ? 'rgba(0,230,118,0.1)' : 'rgba(255,23,68,0.1)')
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${i === 0
                ? (isWin ? 'rgba(0,230,118,0.25)' : 'rgba(255,23,68,0.25)')
                : 'rgba(255,255,255,0.07)'}`,
            }}
          >
            {/* Posición */}
            <div style={{
              width: 26, textAlign: 'center', fontWeight: 900,
              color: i === 0 ? gold : i === 1 ? '#aaa' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.3)',
              fontSize: i < 3 ? '1rem' : '0.8rem',
            }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.username}
                </span>
                {badge && (
                  <span title={badge.label} style={{ fontSize: '0.8rem' }}>{badge.icon}</span>
                )}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                {isWin ? `${item.wins} victoria${item.wins !== 1 ? 's' : ''}` : `${item.losses} derrota${item.losses !== 1 ? 's' : ''}`}
              </div>
            </div>

            {/* Total */}
            <div style={{ color: isWin ? green : red, fontWeight: 900, fontSize: '1rem', flexShrink: 0 }}>
              {isWin ? `+◈${item.total}` : `-◈${Math.abs(item.total)}`}
            </div>
          </motion.div>
        );
      })}
      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
          {isWin ? '🚀 Sin ganadores hoy' : '🌌 Sin pérdidas hoy'}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

const TABS = [
  { id: 'live',    label: '⚡ En Vivo' },
  { id: 'winners', label: '🏆 Ganadores' },
  { id: 'losers',  label: '💀 Pérdidas' },
];

export default function CasinoLeaderboard() {
  const [tab, setTab] = useState('live');
  const [live, setLive] = useState([]);
  const [winners, setWinners] = useState([]);
  const [losers, setLosers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [l, w, lo] = await Promise.all([
      getRecentActivity(20),
      getTopWinners(10),
      getTopLosers(10),
    ]);
    setLive(l);
    setWinners(w);
    setLosers(lo);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    // Supabase Realtime
    const channel = supabase
      .channel('casino_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'casino_results' }, (payload) => {
        const row = payload.new;
        setLive(prev => [row, ...prev].slice(0, 20));
        // Re-fetch rankings cada vez que llega dato nuevo
        getTopWinners(10).then(setWinners).catch(() => {});
        getTopLosers(10).then(setLosers).catch(() => {});
      })
      .subscribe();

    // Refresh cada 30s como backup
    const iv = setInterval(loadData, 30000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(iv);
    };
  }, [loadData]);

  return (
    <div style={{
      margin: '24px 0 8px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(182,108,255,0.2)',
      borderRadius: 20, padding: '20px 16px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow de fondo */}
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 200, height: 200,
        background: 'radial-gradient(circle, rgba(182,108,255,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: purple, fontSize: '0.65rem', letterSpacing: 3, fontWeight: 700 }}>CASINO · SPACELY</div>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 900, margin: '2px 0 0', letterSpacing: 0.5 }}>
            Tabla Galáctica de Starlys
          </h3>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: green, boxShadow: `0 0 6px ${green}` }} />
          <span style={{ color: green, fontSize: '0.7rem', fontWeight: 700 }}>VIVO</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: tab === t.id ? `linear-gradient(135deg,${purple},#7c3aed)` : 'rgba(255,255,255,0.07)',
              color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.5)',
              fontSize: '0.78rem', fontWeight: 700, transition: 'all 0.2s',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.3)' }}>Cargando...</div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {tab === 'live'    && <LiveFeed items={live} />}
            {tab === 'winners' && <RankingTable items={winners} type="winners" />}
            {tab === 'losers'  && <RankingTable items={losers} type="losers" />}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Badges legend */}
      <div style={{ marginTop: 14, display: 'flex', gap: 12, flexWrap: 'wrap', opacity: 0.45, fontSize: '0.68rem', color: '#fff' }}>
        <span>💎 Ballena Galáctica +1000</span>
        <span>🔥 Racha Estelar 5+ victorias</span>
        <span>☄️ Cometa +500</span>
        <span>🕳️ Agujero Negro -500</span>
      </div>
    </div>
  );
}
