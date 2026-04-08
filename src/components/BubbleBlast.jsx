import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#ff6b9d', '#00e5ff', '#ffd700', '#00ff88', '#a78bfa', '#fb923c'];
const GRID_COLS = 8;
const BUBBLE_SIZE = 40;
const MAX_ROWS = 10;
const NEW_ROW_EVERY = 8;
const BOMB_EVERY    = 6;
const CANVAS_W      = 400;
const SHOOTER_X     = 200;
const SHOOTER_Y     = 490;

// ── Audio ─────────────────────────────────────────────────────────────────────
let _ctx = null;
const getCtx = () => {
  try {
    if (!_ctx || _ctx.state === 'closed') _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  } catch { return null; }
};
const tone = (freq, dur, type = 'sine', vol = 0.28, freqEnd = null) => {
  const ctx = getCtx(); if (!ctx) return;
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freqEnd ?? freq, ctx.currentTime);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freq, ctx.currentTime + dur * 0.6);
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.start(); osc.stop(ctx.currentTime + dur);
};
const sounds = {
  shoot:   () => tone(300, 0.07, 'sine', 0.18, 500),
  pop:     (n) => { tone(600 + n * 30, 0.12, 'sine', Math.min(0.4, 0.2 + n * 0.02)); if (n >= 5) setTimeout(() => tone(900, 0.08, 'sine', 0.15), 55); },
  cascade: () => [350, 500, 700, 950].forEach((f, i) => setTimeout(() => tone(f, 0.1, 'sine', 0.18), i * 45)),
  bomb:    () => { tone(150, 0.28, 'sawtooth', 0.35); setTimeout(() => tone(80, 0.22, 'sine', 0.25), 80); },
  newRow:  () => tone(90, 0.4, 'sawtooth', 0.12),
  win:     () => [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'sine', 0.25), i * 75)),
  lose:    () => [440, 370, 311, 261, 220].forEach((f, i) => setTimeout(() => tone(f, 0.28, 'sine', 0.25), i * 120)),
  start:   () => [261, 329, 392].forEach((f, i) => setTimeout(() => tone(f, 0.1, 'sine', 0.2), i * 55)),
};
// ─────────────────────────────────────────────────────────────────────────────

const createInitialGrid = () =>
  Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: GRID_COLS }, (_, col) => {
      if (row % 2 === 1 && col === GRID_COLS - 1) return null;
      return { color: COLORS[Math.floor(Math.random() * COLORS.length)], id: `${row}-${col}-${Date.now()}-${Math.random()}` };
    })
  );

const findFloating = (grid) => {
  const anchored = new Set();
  const queue = [];
  for (let c = 0; c < GRID_COLS; c++) {
    if (grid[0]?.[c]) { anchored.add(`0,${c}`); queue.push([0, c]); }
  }
  while (queue.length) {
    const [r, c] = queue.shift();
    for (const [nr, nc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1],[r-1,c-1],[r-1,c+1],[r+1,c-1],[r+1,c+1]]) {
      const key = `${nr},${nc}`;
      if (!anchored.has(key) && nr >= 0 && nr < grid.length && nc >= 0 && nc < GRID_COLS && grid[nr]?.[nc]) {
        anchored.add(key); queue.push([nr, nc]);
      }
    }
  }
  const floating = [];
  grid.forEach((row, r) => row.forEach((b, c) => { if (b && !anchored.has(`${r},${c}`)) floating.push({ row: r, col: c }); }));
  return floating;
};

export default function BubbleBlast() {
  const [gameState, setGameState]         = useState('menu');
  const [grid, setGrid]                   = useState([]);
  const [currentBubble, setCurrentBubble] = useState(null);
  const [nextBubble, setNextBubble]       = useState(null);
  const [isBomb, setIsBomb]               = useState(false);
  const [score, setScore]                 = useState(0);
  const [combo, setCombo]                 = useState(0);
  const [maxCombo, setMaxCombo]           = useState(0);
  const [shootAngle, setShootAngle]       = useState(-Math.PI / 2);
  const [isAnimating, setIsAnimating]     = useState(false);
  const [bubblesPopped, setBubblesPopped] = useState(0);
  const [message, setMessage]             = useState(null);

  // Refs — always current, safe to read inside callbacks with [] deps
  const canvasRef        = useRef(null);
  const gameContainerRef = useRef(null);
  const gridRef          = useRef([]);
  const comboRef         = useRef(0);
  const scoreRef         = useRef(0);
  const shotsRef         = useRef(0);
  const shootAngleRef    = useRef(-Math.PI / 2);
  const currentBubbleRef = useRef(null);
  const nextBubbleRef    = useRef(null);
  const isBombRef        = useRef(false);
  const gameStateRef     = useRef('menu');
  const isAnimatingRef   = useRef(false);

  // Keep refs in sync
  useEffect(() => { gameStateRef.current = gameState; },         [gameState]);
  useEffect(() => { isAnimatingRef.current = isAnimating; },     [isAnimating]);
  useEffect(() => { currentBubbleRef.current = currentBubble; }, [currentBubble]);
  useEffect(() => { nextBubbleRef.current = nextBubble; },       [nextBubble]);
  useEffect(() => { isBombRef.current = isBomb; },               [isBomb]);
  useEffect(() => { shootAngleRef.current = shootAngle; },       [shootAngle]);
  useEffect(() => { gridRef.current = grid; },                   [grid]);
  useEffect(() => { comboRef.current = combo; },                 [combo]);
  useEffect(() => { scoreRef.current = score; },                 [score]);

  const showMessage = useCallback((text, color = '#ffd700') => {
    setMessage({ text, color });
    setTimeout(() => setMessage(null), 1200);
  }, []);

  const getColorFromGrid = useCallback((g) => {
    const colors = g.flat().filter(Boolean).map(b => b.color);
    const unique = [...new Set(colors)];
    return unique.length > 0 ? unique[Math.floor(Math.random() * unique.length)] : COLORS[Math.floor(Math.random() * COLORS.length)];
  }, []);

  const initGame = useCallback(() => {
    const g = createInitialGrid();
    gridRef.current = g;
    setGrid(g);
    const c1 = getColorFromGrid(g), c2 = getColorFromGrid(g);
    currentBubbleRef.current = { color: c1 };
    nextBubbleRef.current    = { color: c2 };
    isBombRef.current        = false;
    setCurrentBubble({ color: c1 });
    setNextBubble({ color: c2 });
    setIsBomb(false);
    setScore(0); setCombo(0); setMaxCombo(0); setBubblesPopped(0);
    comboRef.current = 0; scoreRef.current = 0; shotsRef.current = 0;
    sounds.start();
  }, [getColorFromGrid]);

  useEffect(() => { if (gameState === 'playing') initGame(); }, [gameState, initGame]);

  // BFS-based connected search (iterative, no recursion overflow risk)
  const findConnected = useCallback((grid, row, col, color) => {
    const visited = new Set(), result = [];
    const queue = [[row, col]];
    visited.add(`${row},${col}`);
    while (queue.length) {
      const [r, c] = queue.shift();
      const b = grid[r]?.[c];
      if (!b || b.color !== color) continue;
      result.push({ row: r, col: c });
      for (const [nr, nc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1],[r-1,c-1],[r-1,c+1],[r+1,c-1],[r+1,c+1]]) {
        const key = `${nr},${nc}`;
        if (!visited.has(key) && nr >= 0 && nr < grid.length && nc >= 0 && nc < GRID_COLS) {
          visited.add(key); queue.push([nr, nc]);
        }
      }
    }
    return result;
  }, []);

  // shootBubble reads only from refs → stable (no reactive deps → never re-registers listeners)
  const shootBubble = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    if (isAnimatingRef.current) return;
    const current = currentBubbleRef.current;
    if (!current) return;

    const angle = shootAngleRef.current;
    if (Math.sin(angle) >= 0) return; // only shoot upward

    isAnimatingRef.current = true;
    setIsAnimating(true);
    sounds.shoot();

    // Raycast to top of grid
    const t = -SHOOTER_Y / Math.sin(angle);
    let lx = SHOOTER_X + Math.cos(angle) * t;
    if (lx < 0) lx = -lx;
    if (lx > CANVAS_W) lx = 2 * CANVAS_W - lx;
    lx = Math.max(0, Math.min(CANVAS_W - 1, lx));
    const targetCol = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(lx / (CANVAS_W / GRID_COLS))));

    const currentGrid = gridRef.current;
    let targetRow = 0;
    for (let r = currentGrid.length - 1; r >= 0; r--) {
      if (currentGrid[r]?.[targetCol]) { targetRow = r + 1; break; }
    }

    const newGrid = currentGrid.map(r => [...r]);
    while (newGrid.length <= targetRow) newGrid.push(Array(GRID_COLS).fill(null));

    if (targetRow >= MAX_ROWS) {
      sounds.lose();
      setGameState('gameover');
      window.dispatchEvent(new CustomEvent('dan:game-score', { detail: { score: scoreRef.current, gameId: 'bubble-blast', isHighScore: true } }));
      isAnimatingRef.current = false;
      setIsAnimating(false);
      return;
    }

    shotsRef.current++;
    let totalPopped = 0;
    const bomb = isBombRef.current;

    if (bomb) {
      sounds.bomb();
      showMessage('💥 ¡BOMBA!', '#fb923c');
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = targetRow + dr, c = targetCol + dc;
          if (r >= 0 && r < newGrid.length && c >= 0 && c < GRID_COLS && newGrid[r][c]) {
            newGrid[r][c] = null; totalPopped++;
          }
        }
      }
    } else {
      newGrid[targetRow][targetCol] = { color: current.color, id: `${targetRow}-${targetCol}-${Date.now()}` };
      const connected = findConnected(newGrid, targetRow, targetCol, current.color);
      if (connected.length >= 3) {
        connected.forEach(({ row: r, col: c }) => { newGrid[r][c] = null; });
        totalPopped += connected.length;
        sounds.pop(connected.length);
      } else {
        comboRef.current = 0;
        setCombo(0);
      }
    }

    const floating = findFloating(newGrid);
    if (floating.length > 0) {
      floating.forEach(({ row: r, col: c }) => { newGrid[r][c] = null; });
      totalPopped += floating.length;
      sounds.cascade();
      if (floating.length >= 3) showMessage(`🌊 ¡CASCADA! +${floating.length}`, '#00e5ff');
    }

    if (totalPopped > 0) {
      const nc = comboRef.current + 1;
      comboRef.current = nc;
      const pts = totalPopped * 10 * nc;
      scoreRef.current += pts;
      setScore(scoreRef.current);
      setCombo(nc);
      setMaxCombo(m => Math.max(m, nc));
      setBubblesPopped(b => b + totalPopped);
    }

    if (shotsRef.current % NEW_ROW_EVERY === 0) {
      const newRow = Array.from({ length: GRID_COLS }, (_, i) =>
        (Math.random() < 0.8) ? { color: COLORS[Math.floor(Math.random() * COLORS.length)], id: `nr-${i}-${Date.now()}` } : null
      );
      newGrid.unshift(newRow);
      sounds.newRow();
      showMessage('⬇ Nueva fila', '#ff4444');
      if (newGrid.length >= MAX_ROWS) {
        sounds.lose();
        gridRef.current = newGrid;
        setGrid(newGrid);
        setGameState('gameover');
        window.dispatchEvent(new CustomEvent('dan:game-score', { detail: { score: scoreRef.current, gameId: 'bubble-blast', isHighScore: true } }));
        isAnimatingRef.current = false;
        setIsAnimating(false);
        return;
      }
    }

    while (newGrid.length > 0 && newGrid[newGrid.length - 1].every(b => !b)) newGrid.pop();

    gridRef.current = newGrid;
    setGrid(newGrid);

    const next = nextBubbleRef.current;
    const nextColor = getColorFromGrid(newGrid);
    const nextShot = shotsRef.current + 1;
    const nextIsBomb = nextShot % BOMB_EVERY === 0;

    currentBubbleRef.current = next;
    nextBubbleRef.current    = { color: nextColor };
    isBombRef.current        = nextIsBomb;
    setCurrentBubble(next);
    setNextBubble({ color: nextColor });
    setIsBomb(nextIsBomb);

    isAnimatingRef.current = false;
    setIsAnimating(false);

    if (!newGrid.some(row => row.some(Boolean))) {
      sounds.win();
      setTimeout(() => {
        setGameState('gameover');
        window.dispatchEvent(new CustomEvent('dan:game-score', { detail: { score: scoreRef.current, gameId: 'bubble-blast', isHighScore: true } }));
      }, 600);
    }
  }, [findConnected, getColorFromGrid, showMessage]); // stable — no state deps

  // Event listeners attached to game container (not window) — registered once
  useEffect(() => {
    const getAngle = (clientX, clientY) => {
      const canvas = canvasRef.current; if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return Math.atan2(clientY - rect.top - SHOOTER_Y, clientX - rect.left - SHOOTER_X);
    };

    const onMouseMove = (e) => {
      if (gameStateRef.current !== 'playing') return;
      const a = getAngle(e.clientX, e.clientY); if (a === null) return;
      shootAngleRef.current = a;
      setShootAngle(a);
    };

    const onTouchMove = (e) => {
      if (gameStateRef.current !== 'playing') return;
      e.preventDefault(); // prevent scroll only when in-game
      const t = e.touches[0];
      const a = getAngle(t.clientX, t.clientY); if (a === null) return;
      shootAngleRef.current = a;
      setShootAngle(a);
    };

    const onClick = (e) => {
      if (gameStateRef.current !== 'playing') return;
      e.stopPropagation();
      shootBubble();
    };

    const onTouchEnd = (e) => {
      if (gameStateRef.current !== 'playing') return;
      e.preventDefault();
      shootBubble();
    };

    const container = gameContainerRef.current;
    if (!container) return;

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('click', onClick);
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('click', onClick);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [shootBubble]); // shootBubble is stable → runs once

  if (gameState === 'menu') {
    return (
      <div style={{ width: '100%', maxWidth: 600, margin: '0 auto', padding: 20, textAlign: 'center', color: '#fff' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ background: 'linear-gradient(135deg,rgba(0,229,255,.1),rgba(255,107,157,.1))', borderRadius: 24, padding: 40, border: '1px solid rgba(0,229,255,.2)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🫧</div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, background: 'linear-gradient(135deg,#00e5ff,#ff6b9d)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 10 }}>
            BUBBLE BLAST
          </h1>
          <p style={{ opacity: 0.65, marginBottom: 6, fontSize: '0.88rem' }}>Conecta 3+ burbujas del mismo color para explotarlas</p>
          <p style={{ opacity: 0.45, marginBottom: 8, fontSize: '0.78rem' }}>Cada {NEW_ROW_EVERY} disparos baja una nueva fila</p>
          <p style={{ opacity: 0.45, marginBottom: 24, fontSize: '0.78rem' }}>💥 Cada {BOMB_EVERY}° disparo es una BOMBA</p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
            {COLORS.map((c, i) => (
              <div key={i} style={{ width: 38, height: 38, borderRadius: '50%', background: c, boxShadow: `0 4px 14px ${c}55`, border: '2px solid rgba(255,255,255,.18)' }} />
            ))}
          </div>

          <button onClick={() => setGameState('playing')}
            style={{ background: 'linear-gradient(135deg,#00e5ff,#ff6b9d)', border: 'none', padding: '16px 48px', borderRadius: 16, fontSize: '1.2rem', fontWeight: 900, color: '#fff', cursor: 'pointer', textTransform: 'uppercase', boxShadow: '0 10px 30px rgba(0,229,255,.3)' }}>
            JUGAR
          </button>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'gameover') {
    const won = !grid.some(row => row.some(Boolean));
    return (
      <div style={{ width: '100%', maxWidth: 600, margin: '0 auto', padding: 20, textAlign: 'center', color: '#fff' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ background: 'linear-gradient(135deg,rgba(0,229,255,.1),rgba(255,107,157,.1))', borderRadius: 24, padding: 40, border: '1px solid rgba(0,229,255,.2)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>{won ? '🎉' : '💥'}</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 24 }}>{won ? '¡VICTORIA!' : 'GAME OVER'}</h2>

          <div style={{ fontSize: '0.75rem', opacity: 0.5, marginBottom: 6 }}>SCORE FINAL</div>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: '#00e5ff', marginBottom: 24 }}>{score.toLocaleString()}</div>

          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>BURBUJAS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff6b9d' }}>{bubblesPopped}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>MAX COMBO</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffd700' }}>{maxCombo}x</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>DISPAROS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#a78bfa' }}>{shotsRef.current}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => setGameState('playing')}
              style={{ background: 'linear-gradient(135deg,#00e5ff,#ff6b9d)', border: 'none', padding: '14px 40px', borderRadius: 14, fontSize: '1.1rem', fontWeight: 900, color: '#fff', cursor: 'pointer' }}>REPETIR</button>
            <button onClick={() => setGameState('menu')}
              style={{ background: 'rgba(255,255,255,.08)', border: '2px solid rgba(255,255,255,.18)', padding: '14px 24px', borderRadius: 14, fontSize: '1rem', fontWeight: 700, color: '#fff', cursor: 'pointer' }}>MENÚ</button>
          </div>
        </motion.div>
      </div>
    );
  }

  const aimRotate = shootAngle + Math.PI / 2;

  return (
    <div ref={gameContainerRef}
      style={{ width: '100%', maxWidth: 500, margin: '0 auto', position: 'relative', touchAction: 'none', userSelect: 'none' }}>

      {/* HUD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, padding: '0 16px', color: '#fff' }}>
        <div>
          <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>SCORE</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#00e5ff' }}>{score.toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>COMBO</div>
          <motion.div key={combo} animate={combo > 0 ? { scale: [1.3, 1] } : {}} transition={{ duration: 0.15 }}
            style={{ fontSize: '1.4rem', fontWeight: 'bold', color: combo > 5 ? '#ffd700' : '#ff6b9d' }}>{combo}x</motion.div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>NEXT</div>
          {nextBubble && (
            <div style={{ position: 'relative', width: 30, height: 30, marginTop: 4, marginLeft: 'auto' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: nextBubble.color, boxShadow: `0 4px 12px ${nextBubble.color}55`, border: '2px solid rgba(255,255,255,.2)' }} />
              {(shotsRef.current + 1) % BOMB_EVERY === 0 && (
                <div style={{ position: 'absolute', top: -4, right: -4, fontSize: '0.7rem' }}>💥</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Canvas background */}
      <canvas ref={canvasRef} width={CANVAS_W} height={600}
        style={{ background: 'linear-gradient(180deg,rgba(0,0,0,.8),rgba(20,0,40,.9))', borderRadius: 24, border: '2px solid rgba(0,229,255,.3)', display: 'block', margin: '0 auto', cursor: 'crosshair', width: '100%', height: 'auto' }} />

      {/* Grid overlay */}
      <div style={{ position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)', width: CANVAS_W, pointerEvents: 'none' }}>
        <AnimatePresence>
          {grid.map((row, ri) => (
            <div key={ri} style={{ display: 'flex', justifyContent: 'center' }}>
              {row.map((bubble, ci) => bubble && (
                <motion.div key={bubble.id} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0, opacity: 0 }}
                  style={{ width: BUBBLE_SIZE, height: BUBBLE_SIZE, borderRadius: '50%', background: bubble.color, boxShadow: `0 4px 14px ${bubble.color}55`, border: '2px solid rgba(255,255,255,.18)', margin: 2 }} />
              ))}
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Floating message */}
      <AnimatePresence>
        {message && (
          <motion.div key={message.text} initial={{ opacity: 1, y: 0, scale: 1 }} animate={{ opacity: 0, y: -40, scale: 1.15 }} exit={{ opacity: 0 }} transition={{ duration: 1.1 }}
            style={{ position: 'absolute', top: '35%', left: '50%', transform: 'translateX(-50%)', fontSize: '1.3rem', fontWeight: 900, color: message.color, textShadow: `0 0 16px ${message.color}`, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 20 }}>
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shooter + aim line */}
      {currentBubble && (
        <>
          {Math.sin(shootAngle) < 0 && (
            <div style={{
              position: 'absolute',
              bottom: 75,
              left: '50%',
              width: 2,
              height: 150,
              transformOrigin: 'bottom center',
              transform: `translateX(-50%) rotate(${aimRotate}rad)`,
              pointerEvents: 'none',
              background: 'repeating-linear-gradient(to top, rgba(255,255,255,0.45) 0px, rgba(255,255,255,0.45) 7px, transparent 7px, transparent 14px)',
              borderRadius: 2,
            }} />
          )}
          <div style={{
            position: 'absolute', bottom: 50, left: '50%',
            transform: 'translateX(-50%)',
            width: 50, height: 50, borderRadius: '50%',
            background: isBomb ? 'radial-gradient(circle,#ff6666,#cc0000)' : currentBubble.color,
            boxShadow: isBomb ? '0 0 20px rgba(255,0,0,0.7)' : `0 4px 20px ${currentBubble.color}80`,
            border: isBomb ? '3px solid #ffaa00' : '3px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: isBomb ? '1.4rem' : '0',
            pointerEvents: 'none',
          }}>
            {isBomb && '💥'}
          </div>
        </>
      )}
    </div>
  );
}
