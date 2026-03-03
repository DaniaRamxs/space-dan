import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const BUILDINGS = [
  { id: 'cursor', icon: '🤖', name: 'Auto-Drone', desc: 'Recolección básica.', baseCost: 15, baseCps: 1 },
  { id: 'extractor', icon: '💎', name: 'Extractor de Ion', desc: 'Minado de precisión.', baseCost: 100, baseCps: 5 },
  { id: 'silo', icon: '🔋', name: 'Silo de Plasma', desc: 'Almacén energético.', baseCost: 1100, baseCps: 18 },
  { id: 'finca', icon: '🌌', name: 'Granja Nebular', desc: 'Cultivo estelar.', baseCost: 12000, baseCps: 74 },
  { id: 'lab', icon: '🧬', name: 'Lab Sintético', desc: 'Materia oscura pura.', baseCost: 130000, baseCps: 320 },
  { id: 'portal', icon: '🌀', name: 'Portal Dimensional', desc: 'Energía del vacío.', baseCost: 1400000, baseCps: 1600 },
];

const UPGRADES = [
  { id: 'u1', name: 'Núcleo de Tritio', cost: 100, mult: 2, desc: 'Click ×2' },
  { id: 'u2', name: 'Fibra de Carbono', cost: 1000, mult: 5, desc: 'Click ×5' },
  { id: 'u3', name: 'Pulso Cuántico', cost: 10000, mult: 10, desc: 'Click ×10' },
  { id: 'u4', name: 'IA Avanzada', cost: 50000, mult: 25, desc: 'Click ×25' },
];

function fmt(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toLocaleString();
}

function CookieClickerInner() {
  const [best, saveScore] = useHighScore('stellar_harvest');
  const [coins, setCoins] = useState(0);
  const [total, setTotal] = useState(0);
  const [owned, setOwned] = useState({});
  const [cUpgs, setCUpgs] = useState(new Set());
  const [tab, setTab] = useState('shop');

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  const cps = useMemo(() => {
    return BUILDINGS.reduce((sum, b) => sum + (owned[b.id] || 0) * b.baseCps, 0);
  }, [owned]);

  const clickMult = useMemo(() => {
    return UPGRADES.reduce((m, u) => cUpgs.has(u.id) ? m * u.mult : m, 1);
  }, [cUpgs]);

  const clickPow = Math.max(1, Math.floor(cps * 0.05 + 1)) * clickMult;

  // CPS Loop
  useEffect(() => {
    if (cps === 0) return;
    const itv = setInterval(() => {
      setCoins(c => c + cps / 10);
      setTotal(t => t + cps / 10);
    }, 100);
    return () => clearInterval(itv);
  }, [cps]);

  // Score Tracking
  useEffect(() => {
    if (total > best) saveScore(Math.floor(total));
  }, [total, best, saveScore]);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCoins(c => c + clickPow);
    setTotal(t => t + clickPow);

    triggerHaptic('light');
    animateScore();
    spawnParticles(x / rect.width * 100 + '%', y / rect.height * 100 + '%', '#00e5ff', 8);
    triggerFloatingText(`+${fmt(clickPow)}`, e.clientX, e.clientY, '#00e5ff');
  };

  const buy = (b) => {
    const count = owned[b.id] || 0;
    const cost = Math.floor(b.baseCost * Math.pow(1.15, count));
    if (coins >= cost) {
      setCoins(c => c - cost);
      setOwned(o => ({ ...o, [b.id]: count + 1 }));
      triggerHaptic('medium');
      triggerFloatingText(`${b.name} ACTIVO`, '50%', '30%', '#00e5ff');
    }
  };

  const buyUpg = (u) => {
    if (coins >= u.cost && !cUpgs.has(u.id)) {
      setCoins(c => c - u.cost);
      setCUpgs(s => new Set([...s, u.id]));
      triggerHaptic('heavy');
      triggerFloatingText('¡EVOLUCIÓN!', '50%', '30%', '#ff00ff');
    }
  };

  return (
    <ArcadeShell
      title="Stellar Harvest"
      score={coins}
      bestScore={best}
      status="PLAYING"
      onRetry={() => { setCoins(0); setTotal(0); setOwned({}); setCUpgs(new Set()); }}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle={`Generando ${fmt(cps)}/s · Click: ${fmt(clickPow)}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center', width: '100%', maxWidth: 400 }}>

        {/* Main Clickable Object: Star Seed */}
        <div style={{ position: 'relative', width: 180, height: 180 }}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClick}
            style={{
              width: '100%', height: '100%',
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, rgba(0,229,255,0.1) 100%)',
              borderRadius: '50%',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 0 50px rgba(0,229,255,0.2), inset 0 0 30px rgba(255,255,255,0.1)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden'
            }}
          >
            {/* Inner light pulse */}
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute', width: '60%', height: '60%',
                background: '#00e5ff', filter: 'blur(40px)', borderRadius: '50%'
              }}
            />
            <span style={{ fontSize: '4rem', zIndex: 2, filter: 'drop-shadow(0 0 10px rgba(0,229,255,0.5))' }}>✨</span>
          </motion.div>
        </div>

        {/* Shop Navigation */}
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <NavBtn active={tab === 'shop'} label="FÁBRICA" onClick={() => setTab('shop')} />
          <NavBtn active={tab === 'upgs'} label="MEJORAS" onClick={() => setTab('upgs')} />
        </div>

        {/* Shop List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
          {tab === 'shop' ? BUILDINGS.map(b => (
            <ShopCard
              key={b.id}
              item={b}
              count={owned[b.id] || 0}
              coins={coins}
              onBuy={() => buy(b)}
            />
          )) : UPGRADES.map(u => (
            <UpgradeCard
              key={u.id}
              item={u}
              bought={cUpgs.has(u.id)}
              coins={coins}
              onBuy={() => buyUpg(u)}
            />
          ))}
        </div>
      </div>
    </ArcadeShell>
  );
}

function NavBtn({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '10px 0', borderRadius: 12, border: 'none',
        background: active ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.03)',
        color: active ? '#00e5ff' : 'rgba(255,255,255,0.3)',
        fontSize: '0.65rem', fontWeight: 900, letterSpacing: 1.5,
        cursor: 'pointer', transition: 'all 0.2s',
        border: active ? '1px solid rgba(0,229,255,0.3)' : '1px solid transparent'
      }}
    >
      {label}
    </button>
  );
}

function ShopCard({ item, count, coins, onBuy }) {
  const cost = Math.floor(item.baseCost * Math.pow(1.15, count));
  const canAfford = coins >= cost;

  return (
    <motion.div
      whileTap={canAfford ? { scale: 0.98 } : {}}
      onClick={canAfford ? onBuy : null}
      style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: 12,
        background: 'rgba(255,255,255,0.03)', border: `1px solid ${canAfford ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
        borderRadius: 16, cursor: canAfford ? 'pointer' : 'default',
        opacity: canAfford ? 1 : 0.6, transition: 'all 0.2s'
      }}
    >
      <div style={{ fontSize: '1.5rem', width: 40, height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {item.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 900, color: canAfford ? '#fff' : 'rgba(255,255,255,0.5)' }}>{item.name}</div>
        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>{item.desc}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#00e5ff' }}>{fmt(cost)}</div>
        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>Posees: {count}</div>
      </div>
    </motion.div>
  );
}

function UpgradeCard({ item, bought, coins, onBuy }) {
  const canAfford = coins >= item.cost && !bought;

  return (
    <motion.div
      whileTap={canAfford ? { scale: 0.98 } : {}}
      onClick={canAfford ? onBuy : null}
      style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: 12,
        background: bought ? 'rgba(0,229,255,0.05)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${bought ? '#00e5ff44' : canAfford ? 'rgba(255,0,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
        borderRadius: 16, cursor: canAfford ? 'pointer' : 'default',
        opacity: canAfford || bought ? 1 : 0.6, transition: 'all 0.2s'
      }}
    >
      <div style={{ fontSize: '1.5rem', width: 40, height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {bought ? '✅' : '⚡'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 900, color: bought ? '#00e5ff' : '#fff' }}>{item.name}</div>
        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>{item.desc}</div>
      </div>
      {!bought && (
        <div style={{ textAlign: 'right', fontSize: '0.8rem', fontWeight: 900, color: '#ff00ff' }}>
          {fmt(item.cost)}
        </div>
      )}
    </motion.div>
  );
}

export default function CookieClicker() {
  return (
    <GameImmersiveLayout>
      <CookieClickerInner />
    </GameImmersiveLayout>
  );
}
