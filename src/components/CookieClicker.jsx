import { useState, useEffect, useRef, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';

/** @typedef {{ id: number, label: string, desc: string, cost: number, type: 'click'|'auto', value: number }} Upgrade */

const UPGRADES = [
  { id: 1, label: 'doble click', desc: '+1/click', cost: 50,  type: 'click', value: 1 },
  { id: 2, label: 'auto-click',  desc: '+1/seg',   cost: 200, type: 'auto',  value: 1 },
  { id: 3, label: 'mega click',  desc: '+5/click', cost: 500, type: 'click', value: 5 },
];

const styles = {
  wrapper: {
    maxWidth: '420px',
    margin: '0 auto',
    background: '#111',
    minHeight: '520px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 16px',
    fontFamily: 'monospace',
    color: '#00e5ff',
    boxSizing: 'border-box',
  },
  title: {
    fontSize: '13px',
    letterSpacing: '3px',
    color: '#ff6eb4',
    marginBottom: '20px',
    textTransform: 'lowercase',
  },
  cookie: {
    fontSize: '80px',
    cursor: 'pointer',
    userSelect: 'none',
    lineHeight: 1,
    transition: 'transform 0.08s',
    display: 'inline-block',
  },
  stats: {
    marginTop: '18px',
    textAlign: 'center',
    fontSize: '13px',
    lineHeight: '1.8',
    color: '#00e5ff',
  },
  highlight: {
    color: '#ff6eb4',
    fontWeight: 'bold',
  },
  divider: {
    width: '100%',
    height: '1px',
    background: 'rgba(255,110,180,0.2)',
    margin: '20px 0',
  },
  upgradesTitle: {
    fontSize: '11px',
    letterSpacing: '2px',
    color: '#ff6eb4',
    marginBottom: '12px',
    alignSelf: 'flex-start',
  },
  upgradeList: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  upgradeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    border: '1px solid rgba(255,110,180,0.25)',
    borderRadius: '8px',
    fontSize: '12px',
  },
  upgradeBtn: {
    border: '1px solid #ff6eb4',
    background: 'transparent',
    color: '#ff6eb4',
    padding: '6px 16px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '11px',
    fontFamily: 'monospace',
  },
  upgradeBtnDisabled: {
    border: '1px solid rgba(255,110,180,0.3)',
    background: 'transparent',
    color: 'rgba(255,110,180,0.3)',
    padding: '6px 16px',
    borderRadius: '20px',
    cursor: 'not-allowed',
    fontSize: '11px',
    fontFamily: 'monospace',
  },
  upgradeBought: {
    border: '1px solid rgba(0,229,255,0.3)',
    background: 'rgba(0,229,255,0.05)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    color: 'rgba(0,229,255,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  record: {
    marginTop: '16px',
    fontSize: '11px',
    color: 'rgba(255,110,180,0.6)',
    letterSpacing: '1px',
  },
};

/**
 * CookieClicker — a coffee-themed idle clicker game.
 * @returns {JSX.Element}
 */
export default function CookieClicker() {
  const [best, saveScore] = useHighScore('cookie');

  const [cookies, setCookies]     = useState(0);
  const [clickPow, setClickPow]   = useState(1);
  const [autoPow, setAutoPow]     = useState(0);
  const [bought, setBought]       = useState(/** @type {Set<number>} */ (new Set()));
  const [bounce, setBounce]       = useState(false);

  const cookiesRef = useRef(0);

  // Keep ref in sync for use inside interval
  useEffect(() => {
    cookiesRef.current = cookies;
  }, [cookies]);

  // Save score whenever cookies increase
  useEffect(() => {
    if (cookies > 0) saveScore(cookies);
  }, [cookies, saveScore]);

  // Auto-clicker interval
  useEffect(() => {
    if (autoPow === 0) return;
    const id = setInterval(() => {
      setCookies(c => c + autoPow);
    }, 1000);
    return () => clearInterval(id);
  }, [autoPow]);

  const handleClick = useCallback(() => {
    setCookies(c => c + clickPow);
    setBounce(true);
    setTimeout(() => setBounce(false), 80);
  }, [clickPow]);

  const buyUpgrade = useCallback((upgrade) => {
    setCookies(c => {
      if (c < upgrade.cost) return c;
      if (upgrade.type === 'click') setClickPow(p => p + upgrade.value);
      if (upgrade.type === 'auto')  setAutoPow(p => p + upgrade.value);
      setBought(prev => new Set([...prev, upgrade.id]));
      return c - upgrade.cost;
    });
  }, []);

  const cps = autoPow;

  return (
    <div style={styles.wrapper}>
      <p style={styles.title}>coffee clicker</p>

      <span
        role="button"
        aria-label="haz click para ganar cookies"
        style={{
          ...styles.cookie,
          transform: bounce ? 'scale(0.88)' : 'scale(1)',
        }}
        onClick={handleClick}
      >
        ☕
      </span>

      <div style={styles.stats}>
        <div>
          cafes: <span style={styles.highlight}>{cookies}</span>
        </div>
        <div>
          poder de click: <span style={styles.highlight}>{clickPow}</span>
        </div>
        {cps > 0 && (
          <div>
            por segundo: <span style={styles.highlight}>{cps}</span>
          </div>
        )}
      </div>

      <div style={styles.divider} />

      <p style={styles.upgradesTitle}>mejoras</p>

      <div style={styles.upgradeList}>
        {UPGRADES.map(upg => {
          const isBought = bought.has(upg.id);
          if (isBought) {
            return (
              <div key={upg.id} style={styles.upgradeBought}>
                <span>{upg.label} — {upg.desc}</span>
                <span style={{ fontSize: '10px', letterSpacing: '1px' }}>activo</span>
              </div>
            );
          }
          const canAfford = cookies >= upg.cost;
          return (
            <div key={upg.id} style={styles.upgradeRow}>
              <span>
                {upg.label} <span style={{ color: 'rgba(0,229,255,0.6)' }}>({upg.desc})</span>
              </span>
              <button
                style={canAfford ? styles.upgradeBtn : styles.upgradeBtnDisabled}
                onClick={() => buyUpgrade(upg)}
                disabled={!canAfford}
                aria-label={`comprar ${upg.label} por ${upg.cost} cafes`}
              >
                {upg.cost} ☕
              </button>
            </div>
          );
        })}
      </div>

      {best > 0 && (
        <p style={styles.record}>record: {best} cafes</p>
      )}
    </div>
  );
}
