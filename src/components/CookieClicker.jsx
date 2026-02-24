import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useHighScore from '../hooks/useHighScore';

// ── Edificios (producción automática, compras múltiples) ──────────────────
const BUILDINGS = [
  { id: 'cursor', icon: '🖱️', name: 'Auto-Barista', desc: 'Prepara solo.', baseCost: 15, baseCps: 0.1 },
  { id: 'molino', icon: '⚙️', name: 'Molino de Café', desc: 'Muele granos sin parar.', baseCost: 100, baseCps: 0.5 },
  { id: 'cafetera', icon: '☕', name: 'Cafetera Pro', desc: 'Extrae espresso veloz.', baseCost: 500, baseCps: 3 },
  { id: 'finca', icon: '🌿', name: 'Finca Cafetera', desc: 'Cultiva arábica premium.', baseCost: 3000, baseCps: 12 },
  { id: 'lab', icon: '🧪', name: 'Lab de Aroma', desc: 'Ciencia del café perfecto.', baseCost: 10000, baseCps: 50 },
  { id: 'cosmos', icon: '🌌', name: 'Café Cósmico', desc: 'Cafeína del universo.', baseCost: 40000, baseCps: 200 },
];

// ── Mejoras de click (one-shot) ───────────────────────────────────────────
const CLICK_UPGRADES = [
  { id: 'c1', name: 'Dedo Cafeínico', cost: 50, mult: 2, desc: '×2 por click' },
  { id: 'c2', name: 'Taza Doble', cost: 500, mult: 4, desc: '×4 por click' },
  { id: 'c3', name: 'Espresso Turbo', cost: 5000, mult: 8, desc: '×8 por click' },
  { id: 'c4', name: 'Cold Brew Élite', cost: 25000, mult: 16, desc: '×16 por click' },
  { id: 'c5', name: 'Café del Cosmos', cost: 100000, mult: 50, desc: '×50 por click' },
];

const PRESTIGE_THRESHOLD = 1_000_000; // 1M para prestige

function buildingCost(b, owned) {
  return Math.floor(b.baseCost * Math.pow(1.15, owned));
}

function fmt(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

// Click pop animations
let popId = 0;

export default function CookieClicker() {
  const [best, saveScore] = useHighScore('cookie');
  const [total, setTotal] = useState(0);     // acumulado histórico
  const [coins, setCoins] = useState(0);     // moneda actual
  const [owned, setOwned] = useState({});    // { buildingId: count }
  const [cUpgs, setCUpgs] = useState(new Set()); // click upgrade ids compradas
  const [prestige, setPrestige] = useState(0); // número de prestiges
  const [pops, setPops] = useState([]);    // floating +N
  const [clickMult, setClickMult] = useState(1);
  const [tab, setTab] = useState('build'); // 'build' | 'upgrades'
  const [milestone, setMilestone] = useState(null); // mensaje flotante

  const coinsRef = useRef(0);
  const totalRef = useRef(0);
  const tickRef = useRef(null);

  // CPS total
  const cps = BUILDINGS.reduce((sum, b) => {
    const cnt = owned[b.id] || 0;
    return sum + b.baseCps * cnt * (1 + prestige * 0.1);
  }, 0);

  // Click power
  const clickPow = Math.max(1, Math.floor(cps * 0.01 + 1)) * clickMult * (1 + prestige * 0.1);

  // Sync ref
  useEffect(() => { coinsRef.current = coins; }, [coins]);
  useEffect(() => { totalRef.current = total; }, [total]);

  // Auto-save score (throttled)
  useEffect(() => {
    if (total > 0 && total > (best || 0)) saveScore(Math.floor(total));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  // Tick CPS
  useEffect(() => {
    if (cps === 0) return;
    tickRef.current = setInterval(() => {
      setCoins(c => c + cps / 20);
      setTotal(t => t + cps / 20);
    }, 50);
    return () => clearInterval(tickRef.current);
  }, [cps]);

  // Milestone toast
  const MILESTONES = [100, 1000, 10000, 100000, 1000000];
  useEffect(() => {
    const m = MILESTONES.find(v => total >= v && total - cps / 20 < v);
    if (m) {
      setMilestone(`¡${fmt(m)} monedas! 🎉`);
      setTimeout(() => setMilestone(null), 2500);
    }
  }, [total]);

  // Click handler con pop animation
  const handleClick = useCallback((e) => {
    const earned = Math.ceil(clickPow);
    setCoins(c => c + earned);
    setTotal(t => t + earned);

    // Floating pop
    const id = ++popId;
    const rect = e.currentTarget.getBoundingClientRect();
    const ox = e.clientX - rect.left - rect.width / 2;
    const oy = e.clientY - rect.top - rect.height / 2;
    setPops(p => [...p, { id, x: ox, y: oy, val: earned }]);
    setTimeout(() => setPops(p => p.filter(x => x.id !== id)), 700);
  }, [clickPow]);

  const buyBuilding = (b) => {
    const cnt = owned[b.id] || 0;
    const cost = buildingCost(b, cnt);
    if (coinsRef.current < cost) return;
    setCoins(c => c - cost);
    setOwned(o => ({ ...o, [b.id]: (o[b.id] || 0) + 1 }));
  };

  const buyClickUpgrade = (u) => {
    if (coins < u.cost || cUpgs.has(u.id)) return;
    setCoins(c => c - u.cost);
    setClickMult(m => m * u.mult);
    setCUpgs(s => new Set([...s, u.id]));
  };

  const doPrestige = () => {
    if (total < PRESTIGE_THRESHOLD) return;
    setPrestige(p => p + 1);
    setCoins(0); setTotal(0);
    setOwned({}); setCUpgs(new Set()); setClickMult(1);
    setMilestone(`✨ PRESTIGE ${prestige + 1}! +${(prestige + 1) * 10}% bonus permanente`);
    setTimeout(() => setMilestone(null), 3500);
  };

  const C_COIN = '#00e5ff', C_ACC = '#ff6eb4', C_DIM = 'rgba(255,255,255,0.25)';

  return (
    <div style={{
      width: '100%', maxWidth: 440, margin: '0 auto',
      fontFamily: 'monospace', color: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 0, padding: '8px 0',
    }}>

      {/* HUD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: 8, padding: '0 4px' }}>
        <div>
          <div style={{ fontSize: 9, opacity: 0.3, textTransform: 'uppercase', letterSpacing: 2 }}>Total</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: C_COIN }}>{fmt(total)}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          {prestige > 0 && (
            <div style={{ fontSize: 9, color: '#ffea00', fontWeight: 900 }}>✨ PRESTIGE {prestige}</div>
          )}
          <div style={{ fontSize: 9, opacity: 0.3, textTransform: 'uppercase', letterSpacing: 2 }}>por seg</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: cps > 0 ? '#22c55e' : 'rgba(255,255,255,0.2)' }}>{fmt(cps)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, opacity: 0.3, textTransform: 'uppercase', letterSpacing: 2 }}>récord</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: C_ACC }}>{fmt(best)}</div>
        </div>
      </div>

      {/* Cookie / objeto clicable */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
        <motion.div
          whileTap={{ scale: 0.87 }}
          onClick={handleClick}
          style={{
            fontSize: 'clamp(72px, 22vw, 90px)',
            cursor: 'pointer', userSelect: 'none',
            filter: 'drop-shadow(0 0 20px rgba(150,100,50,0.6))',
            lineHeight: 1,
          }}
        >
          ☕
        </motion.div>
        <AnimatePresence>
          {pops.map(p => (
            <motion.div key={p.id}
              initial={{ opacity: 1, y: 0, x: p.x, scale: 1 }}
              animate={{ opacity: 0, y: -55, scale: 1.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: `translate(-50%,-50%)`,
                fontSize: 13, fontWeight: 900, color: C_COIN,
                pointerEvents: 'none', whiteSpace: 'nowrap',
                textShadow: `0 0 8px ${C_COIN}`,
              }}
            >+{fmt(p.val)}</motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Stats mini */}
      <div style={{ fontSize: 11, color: C_DIM, marginBottom: 6, textAlign: 'center' }}>
        <span style={{ color: C_COIN, fontWeight: 900 }}>{fmt(coins)}</span> monedas
        &nbsp;·&nbsp; click: <span style={{ color: C_ACC }}>{fmt(clickPow)}</span> ☕
      </div>

      {/* Prestige button */}
      {total >= PRESTIGE_THRESHOLD && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          onClick={doPrestige}
          style={{
            marginBottom: 8, padding: '6px 20px', borderRadius: 999,
            background: 'rgba(255,234,0,0.12)', border: '1px solid rgba(255,234,0,0.4)',
            color: '#ffea00', cursor: 'pointer', fontFamily: 'monospace',
            fontWeight: 900, fontSize: 10, textTransform: 'uppercase', letterSpacing: 2,
          }}
        >✨ Prestige — +10% permanente</motion.button>
      )}

      {/* Milestone toast */}
      <AnimatePresence>
        {milestone && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.3)',
              borderRadius: 12, padding: '6px 16px', fontSize: 11, marginBottom: 8,
              color: C_COIN, fontWeight: 900, textAlign: 'center',
            }}
          >{milestone}</motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, width: '100%' }}>
        {[['build', '🏗️ Edificios'], ['upgrades', '⚡ Mejoras']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '7px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: tab === t ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.04)',
            color: tab === t ? C_COIN : 'rgba(255,255,255,0.3)',
            fontFamily: 'monospace', fontWeight: 900, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1,
            boxShadow: tab === t ? '0 0 10px rgba(0,229,255,0.15)' : 'none',
            transition: 'all 0.2s',
          }}>{label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 5 }}>

        {/* Edificios */}
        {tab === 'build' && BUILDINGS.map(b => {
          const cnt = owned[b.id] || 0;
          const cost = buildingCost(b, cnt);
          const can = coins >= cost;
          const prod = b.baseCps * cnt * (1 + prestige * 0.1);
          return (
            <motion.button
              key={b.id}
              whileHover={{ scale: can ? 1.01 : 1 }}
              whileTap={{ scale: can ? 0.97 : 1 }}
              onClick={() => buyBuilding(b)}
              disabled={!can}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '8px 12px', borderRadius: 14,
                background: can ? 'rgba(0,229,255,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${can ? 'rgba(0,229,255,0.25)' : 'rgba(255,255,255,0.06)'}`,
                cursor: can ? 'pointer' : 'not-allowed',
                textAlign: 'left', fontFamily: 'monospace', color: '#fff',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>{b.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: can ? C_COIN : 'rgba(255,255,255,0.3)' }}>
                    {b.name}
                  </span>
                  <span style={{ fontSize: 10, color: can ? C_COIN : 'rgba(255,255,255,0.2)', fontWeight: 900 }}>
                    {fmt(cost)} 🍪
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{b.desc}</span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
                    {cnt > 0 ? `×${cnt} · ${fmt(prod)}/s` : '—'}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}

        {/* Mejoras de click */}
        {tab === 'upgrades' && CLICK_UPGRADES.map(u => {
          const bought = cUpgs.has(u.id);
          const can = !bought && coins >= u.cost;
          return (
            <motion.button
              key={u.id}
              whileHover={{ scale: can ? 1.01 : 1 }}
              whileTap={{ scale: can ? 0.97 : 1 }}
              onClick={() => buyClickUpgrade(u)}
              disabled={bought || !can}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '8px 12px', borderRadius: 14,
                background: bought ? 'rgba(0,229,255,0.04)' : can ? 'rgba(255,110,180,0.07)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${bought ? 'rgba(0,229,255,0.15)' : can ? 'rgba(255,110,180,0.3)' : 'rgba(255,255,255,0.06)'}`,
                cursor: bought || !can ? 'not-allowed' : 'pointer',
                textAlign: 'left', fontFamily: 'monospace', color: '#fff',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 20 }}>{bought ? '✅' : '⚡'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: bought ? 'rgba(0,229,255,0.5)' : can ? C_ACC : 'rgba(255,255,255,0.25)' }}>
                    {u.name}
                  </span>
                  {!bought && (
                    <span style={{ fontSize: 10, fontWeight: 900, color: can ? C_COIN : 'rgba(255,255,255,0.2)' }}>
                      {fmt(u.cost)} ☕
                    </span>
                  )}
                  {bought && <span style={{ fontSize: 9, color: 'rgba(0,229,255,0.5)' }}>activo</span>}
                </div>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{u.desc}</span>
              </div>
            </motion.button>
          );
        })}
      </div>

      <p style={{ marginTop: 10, fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 2, textTransform: 'uppercase' }}>
        COFFEE CLICKER · prestige at 1M · click = 1% CPS + mult
      </p>
    </div>
  );
}
