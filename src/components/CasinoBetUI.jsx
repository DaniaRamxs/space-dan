/**
 * CasinoBetUI.jsx — Componentes UI reutilizables para Casino.
 * BettingScreen | ResultScreen | CasinoHUD
 */
import { motion, AnimatePresence } from 'framer-motion';

const PRESETS_NORMAL = [5, 10, 25, 50, 100];
const PRESETS_VIP    = [50, 100, 250, 500, 1000];

const gold   = '#f5c518';
const green  = '#00e676';
const red    = '#ff1744';
const purple = '#b66cff';
const border = 'rgba(245,197,24,0.25)';

// ── BettingScreen ─────────────────────────────────────────────

export function BettingScreen({ bet, setBet, balance, onPlay, isLoading, title, icon, description, isVIP = false, jackpot = null }) {
  const canBet = bet > 0 && bet <= balance && !isLoading;
  const presets = isVIP ? PRESETS_VIP : PRESETS_NORMAL;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '24px 20px', width: '100%', maxWidth: 420 }}
    >
      {/* VIP badge */}
      {isVIP && (
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          style={{
            background: `linear-gradient(135deg, ${purple}, #7c3aed)`,
            padding: '4px 14px', borderRadius: 20, fontSize: '0.72rem',
            fontWeight: 900, letterSpacing: 2, color: '#fff',
          }}
        >💎 VIP CASINO</motion.div>
      )}

      {/* Jackpot badge (solo OrbitalSlots) */}
      {jackpot !== null && (
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{
            background: 'rgba(245,197,24,0.12)', border: `1px solid ${gold}`,
            borderRadius: 12, padding: '8px 20px', textAlign: 'center',
          }}
        >
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', letterSpacing: 2 }}>🌌 JACKPOT PROGRESIVO</div>
          <div style={{ color: gold, fontSize: '1.6rem', fontWeight: 900 }}>◈ {jackpot.toLocaleString()}</div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem' }}>🌌🌌🌌 para ganarlo</div>
        </motion.div>
      )}

      {/* Título */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 52 }}>{icon}</div>
        <h2 style={{ color: gold, fontSize: '1.6rem', fontWeight: 900, margin: '8px 0 4px', letterSpacing: 1 }}>{title}</h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', margin: 0 }}>{description}</p>
      </div>

      {/* Balance */}
      <div style={{ background: 'rgba(245,197,24,0.08)', border: `1px solid ${border}`, borderRadius: 12, padding: '10px 24px', textAlign: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', letterSpacing: 2 }}>BALANCE</div>
        <div style={{ color: gold, fontSize: '1.8rem', fontWeight: 900 }}>◈ {balance.toLocaleString()}</div>
      </div>

      {/* Apuesta */}
      <div style={{ width: '100%' }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', letterSpacing: 2, marginBottom: 8, textAlign: 'center' }}>APUESTA</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => setBet(b => Math.max(1, b - 1))} style={btnStyle('#333')}>−</button>
          <input
            type="number" value={bet} min={1} max={balance}
            onChange={e => setBet(Math.max(1, Math.min(balance, Number(e.target.value) || 1)))}
            style={{
              width: 100, textAlign: 'center', background: 'rgba(255,255,255,0.07)',
              border: `2px solid ${bet > balance ? red : isVIP ? purple : border}`,
              borderRadius: 10, color: '#fff', fontSize: '1.4rem', fontWeight: 900,
              padding: '8px 0', outline: 'none',
            }}
          />
          <button onClick={() => setBet(b => Math.min(balance, b + 1))} style={btnStyle('#333')}>+</button>
        </div>

        {/* Presets */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          {presets.map(p => (
            <button key={p} onClick={() => setBet(Math.min(balance, p))} disabled={p > balance}
              style={{
                ...btnStyle(bet === p ? (isVIP ? purple : gold) : 'rgba(255,255,255,0.1)'),
                color: bet === p ? '#fff' : 'rgba(255,255,255,0.7)',
                fontSize: '0.8rem', padding: '6px 12px', borderRadius: 8,
                opacity: p > balance ? 0.35 : 1,
              }}>{p}</button>
          ))}
          <button onClick={() => setBet(balance)}
            style={{ ...btnStyle('rgba(255,100,0,0.3)'), fontSize: '0.8rem', padding: '6px 12px', borderRadius: 8, color: '#ff8c00' }}>MAX</button>
        </div>
      </div>

      {/* Play */}
      <motion.button whileTap={{ scale: 0.96 }} onClick={onPlay} disabled={!canBet}
        style={{
          width: '100%', padding: '16px', borderRadius: 14, border: 'none',
          background: canBet
            ? isVIP ? `linear-gradient(135deg,${purple},#7c3aed)` : `linear-gradient(135deg,${gold},#e6a800)`
            : 'rgba(255,255,255,0.1)',
          color: canBet ? '#fff' : 'rgba(255,255,255,0.3)',
          fontSize: '1.1rem', fontWeight: 900, letterSpacing: 1,
          cursor: canBet ? 'pointer' : 'not-allowed',
          boxShadow: canBet ? `0 0 30px ${isVIP ? 'rgba(182,108,255,0.4)' : 'rgba(245,197,24,0.35)'}` : 'none',
          transition: 'all 0.2s',
        }}
      >{isLoading ? '...' : `${isVIP ? '💎 ' : ''}APOSTAR ◈ ${bet}`}</motion.button>

      {bet > balance && <p style={{ color: red, fontSize: '0.8rem', margin: 0 }}>Balance insuficiente</p>}
    </motion.div>
  );
}

// ── ResultScreen ──────────────────────────────────────────────

export function ResultScreen({ result, bet, onPlayAgain, onClose }) {
  const { won, net, winAmount, message, streakBonusAwarded, currentStreak } = result;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '32px 24px', width: '100%', maxWidth: 380, textAlign: 'center' }}
    >
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }} style={{ fontSize: 72 }}>
        {won ? (winAmount > bet * 10 ? '🌌' : '🏆') : '💀'}
      </motion.div>

      <div>
        <h2 style={{ color: won ? green : red, fontSize: '2rem', fontWeight: 900, margin: '0 0 6px' }}>
          {won ? '¡GANASTE!' : 'PERDISTE'}
        </h2>
        {message && <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.9rem' }}>{message}</p>}
      </div>

      {/* Resultado principal */}
      <div style={{
        background: won ? 'rgba(0,230,118,0.08)' : 'rgba(255,23,68,0.08)',
        border: `1px solid ${won ? 'rgba(0,230,118,0.3)' : 'rgba(255,23,68,0.3)'}`,
        borderRadius: 16, padding: '16px 32px',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', letterSpacing: 2 }}>{won ? 'GANANCIA' : 'PÉRDIDA'}</div>
        <div style={{ color: won ? green : red, fontSize: '2.4rem', fontWeight: 900 }}>
          {won ? `+◈ ${net}` : `-◈ ${bet}`}
        </div>
        {won && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Total recibido: ◈ {winAmount}</div>}
      </div>

      {/* Bonus racha */}
      <AnimatePresence>
        {streakBonusAwarded && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              background: 'rgba(255,140,0,0.15)', border: '1px solid rgba(255,140,0,0.4)',
              borderRadius: 12, padding: '10px 20px', color: '#ff8c00', fontWeight: 700, fontSize: '0.9rem',
            }}
          >🔥 ¡Racha de 3 victorias! +◈ 10 bonus</motion.div>
        )}
      </AnimatePresence>

      {/* Racha actual */}
      {won && currentStreak > 0 && !streakBonusAwarded && (
        <div style={{ color: 'rgba(255,140,0,0.7)', fontSize: '0.8rem' }}>
          🔥 Racha: {currentStreak}/3
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, width: '100%' }}>
        <button onClick={onClose}
          style={{ ...btnStyle('rgba(255,255,255,0.08)'), flex: 1, padding: '12px', borderRadius: 12, color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
          Salir
        </button>
        <motion.button whileTap={{ scale: 0.96 }} onClick={onPlayAgain}
          style={{ ...btnStyle(`linear-gradient(135deg,${gold},#e6a800)`), flex: 2, padding: '12px', borderRadius: 12, color: '#000', fontSize: '1rem', fontWeight: 900 }}>
          Jugar de nuevo
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── CasinoHUD ─────────────────────────────────────────────────

export function CasinoHUD({ balance, bet, label = 'APUESTA', extra = null }) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 16px', zIndex: 10,
      background: 'linear-gradient(180deg, rgba(5,5,15,0.9) 0%, transparent 100%)',
    }}>
      <div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', letterSpacing: 2 }}>BALANCE</div>
        <div style={{ color: gold, fontWeight: 900, fontSize: '1.1rem' }}>◈ {balance.toLocaleString()}</div>
      </div>
      {extra && <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>{extra}</div>}
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', letterSpacing: 2 }}>{label}</div>
        <div style={{ color: '#fff', fontWeight: 900, fontSize: '1.1rem' }}>◈ {bet}</div>
      </div>
    </div>
  );
}

function btnStyle(bg) {
  return { background: bg, border: 'none', cursor: 'pointer', borderRadius: 8, padding: '8px 14px', color: '#fff', fontSize: '1rem', fontWeight: 700, transition: 'opacity 0.15s' };
}
