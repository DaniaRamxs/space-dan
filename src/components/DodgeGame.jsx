import { useState, useEffect, useRef, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';

const CANVAS_W   = 320;
const CANVAS_H   = 400;
const PLAYER_SZ  = 20;
const PLAYER_SPD = 3;
const ENEMY_R    = 8;
const MAX_ENEMIES = 15;
const SPAWN_MS   = 2000;

/**
 * @param {number} score — current seconds survived, increases enemy speed
 * @returns {{ x: number, y: number, vx: number, vy: number, id: number }}
 */
let euid = 0;
function spawnEnemy(px, py, score) {
  // Pick a random edge point
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = Math.random() * CANVAS_W; y = -ENEMY_R; }
  else if (edge === 1) { x = CANVAS_W + ENEMY_R; y = Math.random() * CANVAS_H; }
  else if (edge === 2) { x = Math.random() * CANVAS_W; y = CANVAS_H + ENEMY_R; }
  else                 { x = -ENEMY_R;             y = Math.random() * CANVAS_H; }

  const speed = 0.8 + score * 0.06;
  const dx = px - x;
  const dy = py - y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x, y, vx: (dx / dist) * speed, vy: (dy / dist) * speed, id: euid++ };
}

const STYLES = {
  wrapper: {
    maxWidth: '420px',
    margin: '0 auto',
    background: '#111',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 16px',
    fontFamily: 'monospace',
    color: '#00e5ff',
    boxSizing: 'border-box',
  },
  title: {
    fontSize: '13px',
    letterSpacing: '3px',
    color: '#ff6eb4',
    marginBottom: '12px',
  },
  canvas: {
    display: 'block',
    cursor: 'pointer',
    border: '1px solid rgba(255,110,180,0.3)',
  },
  record: {
    marginTop: '10px',
    fontSize: '11px',
    color: 'rgba(255,110,180,0.6)',
    letterSpacing: '1px',
  },
  hint: {
    marginTop: '6px',
    fontSize: '10px',
    color: 'rgba(0,229,255,0.4)',
    letterSpacing: '1px',
  },
};

/**
 * DodgeGame — survive as long as possible dodging cyan enemies.
 * @returns {JSX.Element}
 */
export default function DodgeGame() {
  const [best, saveScore] = useHighScore('dodge');

  const canvasRef = useRef(null);
  const stateRef  = useRef({
    phase:       'idle',  // 'idle' | 'playing' | 'over'
    px:          CANVAS_W / 2 - PLAYER_SZ / 2,
    py:          CANVAS_H / 2 - PLAYER_SZ / 2,
    enemies:     [],
    keys:        {},
    score:       0,       // seconds survived
    lastSpawn:   0,
    lastTick:    0,
    animId:      null,
  });

  // Expose for re-render on game over (record update)
  const [, forceUpdate] = useState(0);

  const draw = useCallback((ctx, s) => {
    ctx.fillStyle = 'rgba(0,0,0,0.92)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (s.phase === 'idle') {
      ctx.fillStyle = '#00e5ff';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('click para empezar', CANVAS_W / 2, CANVAS_H / 2);
      ctx.font = '11px monospace';
      ctx.fillStyle = 'rgba(0,229,255,0.5)';
      ctx.fillText('muevete con wasd o flechas', CANVAS_W / 2, CANVAS_H / 2 + 24);
      return;
    }

    if (s.phase === 'over') {
      ctx.fillStyle = '#ff6eb4';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('game over', CANVAS_W / 2, CANVAS_H / 2 - 20);
      ctx.fillStyle = '#00e5ff';
      ctx.font = '13px monospace';
      ctx.fillText(`${s.score} segundos`, CANVAS_W / 2, CANVAS_H / 2 + 8);
      ctx.fillStyle = 'rgba(255,110,180,0.6)';
      ctx.font = '11px monospace';
      ctx.fillText('click para reiniciar', CANVAS_W / 2, CANVAS_H / 2 + 32);
      return;
    }

    // Player square
    ctx.fillStyle = '#ff6eb4';
    ctx.shadowColor = '#ff6eb4';
    ctx.shadowBlur = 12;
    ctx.fillRect(s.px, s.py, PLAYER_SZ, PLAYER_SZ);
    ctx.shadowBlur = 0;

    // Enemies
    s.enemies.forEach(e => {
      ctx.beginPath();
      ctx.arc(e.x, e.y, ENEMY_R, 0, Math.PI * 2);
      ctx.fillStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Timer top-left
    ctx.fillStyle = '#00e5ff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.shadowBlur = 0;
    ctx.fillText(`${s.score}s`, 10, 20);
  }, []);

  const startGame = useCallback(() => {
    const s = stateRef.current;
    s.phase     = 'playing';
    s.px        = CANVAS_W / 2 - PLAYER_SZ / 2;
    s.py        = CANVAS_H / 2 - PLAYER_SZ / 2;
    s.enemies   = [];
    s.keys      = {};
    s.score     = 0;
    s.lastSpawn = performance.now();
    s.lastTick  = performance.now();
  }, []);

  /**
   * Check circle-vs-rect collision between an enemy and the player.
   * @param {{ x:number, y:number }} e
   * @param {number} px
   * @param {number} py
   */
  const collides = (e, px, py) => {
    const nearX = Math.max(px, Math.min(e.x, px + PLAYER_SZ));
    const nearY = Math.max(py, Math.min(e.y, py + PLAYER_SZ));
    const dx = e.x - nearX;
    const dy = e.y - nearY;
    return dx * dx + dy * dy < ENEMY_R * ENEMY_R;
  };

  // Main loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let running = true;

    const loop = (now) => {
      if (!running) return;
      const s = stateRef.current;

      if (s.phase === 'playing') {
        // Move player
        if (s.keys['ArrowUp']    || s.keys['w'] || s.keys['W']) s.py = Math.max(0, s.py - PLAYER_SPD);
        if (s.keys['ArrowDown']  || s.keys['s'] || s.keys['S']) s.py = Math.min(CANVAS_H - PLAYER_SZ, s.py + PLAYER_SPD);
        if (s.keys['ArrowLeft']  || s.keys['a'] || s.keys['A']) s.px = Math.max(0, s.px - PLAYER_SPD);
        if (s.keys['ArrowRight'] || s.keys['d'] || s.keys['D']) s.px = Math.min(CANVAS_W - PLAYER_SZ, s.px + PLAYER_SPD);

        // Score tick — once per second
        if (now - s.lastTick >= 1000) {
          s.score += 1;
          s.lastTick += 1000;
        }

        // Spawn enemy
        if (now - s.lastSpawn >= SPAWN_MS && s.enemies.length < MAX_ENEMIES) {
          const cx = s.px + PLAYER_SZ / 2;
          const cy = s.py + PLAYER_SZ / 2;
          s.enemies.push(spawnEnemy(cx, cy, s.score));
          s.lastSpawn = now;
        }

        // Move enemies & re-home them toward player
        const cx = s.px + PLAYER_SZ / 2;
        const cy = s.py + PLAYER_SZ / 2;
        s.enemies.forEach(e => {
          const dx = cx - e.x;
          const dy = cy - e.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const speed = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
          e.vx = (dx / dist) * speed;
          e.vy = (dy / dist) * speed;
          e.x += e.vx;
          e.y += e.vy;
        });

        // Collision detection
        const hit = s.enemies.some(e => collides(e, s.px, s.py));
        if (hit) {
          s.phase = 'over';
          saveScore(s.score);
          forceUpdate(n => n + 1);
        }
      }

      draw(ctx, s);
      s.animId = requestAnimationFrame(loop);
    };

    const initialState = stateRef.current;
    initialState.animId = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (stateRef.current.animId) cancelAnimationFrame(stateRef.current.animId);
    };
  }, [draw, saveScore]);

  // Key listeners
  useEffect(() => {
    const MOVE_KEYS = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D']);
    const down = (e) => {
      stateRef.current.keys[e.key] = true;
      if (MOVE_KEYS.has(e.key)) e.preventDefault();
    };
    const up = (e) => { stateRef.current.keys[e.key] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup',   up);
    };
  }, []);

  const handleCanvasClick = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === 'idle' || s.phase === 'over') startGame();
  }, [startGame]);

  // Touch start on canvas → start/restart game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onTouch = (e) => {
      e.preventDefault();
      const s = stateRef.current;
      if (s.phase === 'idle' || s.phase === 'over') startGame();
    };
    canvas.addEventListener('touchstart', onTouch, { passive: false });
    return () => canvas.removeEventListener('touchstart', onTouch);
  }, [startGame]);

  // D-pad button helpers
  const pressKey   = (k) => { stateRef.current.keys[k] = true; };
  const releaseKey = (k) => { stateRef.current.keys[k] = false; };

  const dpadBtn = {
    width: 44, height: 44,
    border: '1px solid rgba(255,110,180,0.5)',
    background: 'rgba(255,110,180,0.12)',
    color: '#ff6eb4',
    borderRadius: 8,
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    userSelect: 'none',
    touchAction: 'none',
    WebkitUserSelect: 'none',
  };

  return (
    <div style={STYLES.wrapper}>
      <p style={STYLES.title}>esquiva</p>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={STYLES.canvas}
        onClick={handleCanvasClick}
        aria-label="juego de esquivar — haz click para empezar, usa wasd o flechas para moverte"
      />
      {best > 0 && (
        <p style={STYLES.record}>record: {best} seg</p>
      )}

      {/* D-pad virtual para móvil */}
      <div style={{ display: 'grid', gridTemplateColumns: '44px 44px 44px', gap: 6, marginTop: 14 }}>
        <div />
        <button style={dpadBtn}
          onPointerDown={() => pressKey('ArrowUp')}   onPointerUp={() => releaseKey('ArrowUp')}
          onPointerLeave={() => releaseKey('ArrowUp')} onContextMenu={(e) => e.preventDefault()}
        >▲</button>
        <div />
        <button style={dpadBtn}
          onPointerDown={() => pressKey('ArrowLeft')}  onPointerUp={() => releaseKey('ArrowLeft')}
          onPointerLeave={() => releaseKey('ArrowLeft')} onContextMenu={(e) => e.preventDefault()}
        >◀</button>
        <button style={dpadBtn}
          onPointerDown={() => pressKey('ArrowDown')}  onPointerUp={() => releaseKey('ArrowDown')}
          onPointerLeave={() => releaseKey('ArrowDown')} onContextMenu={(e) => e.preventDefault()}
        >▼</button>
        <button style={dpadBtn}
          onPointerDown={() => pressKey('ArrowRight')} onPointerUp={() => releaseKey('ArrowRight')}
          onPointerLeave={() => releaseKey('ArrowRight')} onContextMenu={(e) => e.preventDefault()}
        >▶</button>
      </div>
    </div>
  );
}
