import { useRef, useEffect, useCallback } from 'react';

const W = 400;
const H = 500;
const COLORS = { bg: '#0b0b10', cyan: '#00e5ff', magenta: '#ff00ff', white: '#ffffff', dim: 'rgba(255,255,255,0.15)' };

const ROWS = 4;
const COLS = 8;
const INVADER_W = 36;
const INVADER_H = 30;
const INVADER_PAD_X = 8;
const INVADER_PAD_Y = 10;
const GRID_TOP = 60;
const PLAYER_W = 36;
const PLAYER_H = 24;
const BULLET_W = 3;
const BULLET_H = 12;
const PLAYER_SPEED = 5;
const PLAYER_BULLET_SPEED = 8;
const INVADER_BULLET_SPEED = 3;

function makeInvaders() {
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      grid.push({
        r, c,
        alive: true,
        x: 30 + c * (INVADER_W + INVADER_PAD_X),
        y: GRID_TOP + r * (INVADER_H + INVADER_PAD_Y),
      });
    }
  }
  return grid;
}

function makeShields() {
  const shields = [];
  const positions = [70, 160, 250, 330];
  for (const sx of positions) {
    for (let bx = 0; bx < 4; bx++) {
      for (let by = 0; by < 2; by++) {
        shields.push({ x: sx + bx * 10, y: H - 90 + by * 10, hp: 3 });
      }
    }
  }
  return shields;
}

function makeState() {
  return {
    phase: 'idle',
    playerX: W / 2 - PLAYER_W / 2,
    lives: 3,
    score: 0,
    wave: 1,
    invaders: makeInvaders(),
    invDir: 1,
    invSpeed: 1,
    invTimer: 0,
    invDrop: 0,
    playerBullets: [],
    invBullets: [],
    shields: makeShields(),
    lastShot: 0,
    invFireTimer: 0,
    invFireInterval: 120,
    gameOver: false,
    win: false,
    playerInvincible: 0,
  };
}

export default function SpaceInvaders() {
  const canvasRef = useRef(null);
  const stateRef = useRef(makeState());
  const rafRef = useRef(null);
  const keysRef = useRef({});
  const frameRef = useRef(0);

  const drawShip = useCallback((ctx, x, y, color) => {
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(x + PLAYER_W / 2, y);
    ctx.lineTo(x + PLAYER_W, y + PLAYER_H);
    ctx.lineTo(x + PLAYER_W * 0.7, y + PLAYER_H - 6);
    ctx.lineTo(x + PLAYER_W / 2, y + PLAYER_H);
    ctx.lineTo(x + PLAYER_W * 0.3, y + PLAYER_H - 6);
    ctx.lineTo(x, y + PLAYER_H);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    // HUD
    ctx.fillStyle = COLORS.cyan;
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${s.score}`, 10, 22);
    ctx.textAlign = 'right';
    ctx.fillText(`WAVE: ${s.wave}`, W - 10, 22);
    ctx.textAlign = 'center';
    // Lives as small ships
    for (let i = 0; i < s.lives; i++) {
      drawShip(ctx, W / 2 - 30 + i * 26, 6, COLORS.cyan);
    }

    // Shields
    for (const sh of s.shields) {
      if (sh.hp <= 0) continue;
      const alpha = sh.hp / 3;
      ctx.fillStyle = `rgba(0,229,255,${alpha * 0.8})`;
      ctx.fillRect(sh.x, sh.y, 9, 9);
    }

    // Invaders
    ctx.font = `${INVADER_W - 4}px serif`;
    ctx.textAlign = 'center';
    for (const inv of s.invaders) {
      if (!inv.alive) continue;
      ctx.globalAlpha = 1;
      ctx.fillStyle = COLORS.magenta;
      ctx.shadowColor = COLORS.magenta;
      ctx.shadowBlur = 6;
      ctx.fillText('👾', inv.x + INVADER_W / 2, inv.y + INVADER_H - 2);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Player bullets
    ctx.fillStyle = COLORS.cyan;
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 8;
    for (const b of s.playerBullets) {
      ctx.fillRect(b.x - BULLET_W / 2, b.y, BULLET_W, BULLET_H);
    }

    // Invader bullets
    ctx.fillStyle = COLORS.magenta;
    ctx.shadowColor = COLORS.magenta;
    for (const b of s.invBullets) {
      ctx.fillRect(b.x - BULLET_W / 2, b.y, BULLET_W, BULLET_H);
    }
    ctx.shadowBlur = 0;

    // Player
    if (s.playerInvincible <= 0 || frameRef.current % 6 < 3) {
      drawShip(ctx, s.playerX, H - PLAYER_H - 18, COLORS.cyan);
    }

    // Bottom line
    ctx.strokeStyle = COLORS.dim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H - 18);
    ctx.lineTo(W, H - 18);
    ctx.stroke();

    // Overlays
    if (s.phase === 'idle') {
      ctx.fillStyle = 'rgba(11,11,16,0.8)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = COLORS.magenta;
      ctx.shadowColor = COLORS.magenta;
      ctx.shadowBlur = 16;
      ctx.font = 'bold 26px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SPACE INVADERS', W / 2, H / 2 - 40);
      ctx.shadowBlur = 0;
      ctx.fillStyle = COLORS.white;
      ctx.font = '14px monospace';
      ctx.fillText('Click para jugar', W / 2, H / 2);
      ctx.fillStyle = COLORS.dim;
      ctx.font = '11px monospace';
      ctx.fillText('A/D o Flechas &larr;&rarr; | Espacio o Click para disparar', W / 2, H / 2 + 24);
    }

    if (s.phase === 'over') {
      ctx.fillStyle = 'rgba(11,11,16,0.85)';
      ctx.fillRect(0, 0, W, H);
      const color = s.win ? COLORS.cyan : COLORS.magenta;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(s.win ? '¡VICTORIA!' : 'GAME OVER', W / 2, H / 2 - 30);
      ctx.shadowBlur = 0;
      ctx.fillStyle = COLORS.white;
      ctx.font = '16px monospace';
      ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 + 4);
      ctx.font = '13px monospace';
      ctx.fillText('Click para reiniciar', W / 2, H / 2 + 30);
    }
  }, [drawShip]);

  const tick = useCallback(() => {
    const s = stateRef.current;
    frameRef.current++;
    if (s.phase !== 'playing') { draw(); rafRef.current = requestAnimationFrame(tick); return; }

    // Player move
    if (keysRef.current['ArrowLeft'] || keysRef.current['a'] || keysRef.current['A']) {
      s.playerX = Math.max(0, s.playerX - PLAYER_SPEED);
    }
    if (keysRef.current['ArrowRight'] || keysRef.current['d'] || keysRef.current['D']) {
      s.playerX = Math.min(W - PLAYER_W, s.playerX + PLAYER_SPEED);
    }

    // Player shoot
    if ((keysRef.current[' '] || keysRef.current['shoot']) && frameRef.current - s.lastShot > 20) {
      s.playerBullets.push({ x: s.playerX + PLAYER_W / 2, y: H - PLAYER_H - 20 });
      s.lastShot = frameRef.current;
      keysRef.current['shoot'] = false;
    }

    // Player bullets
    s.playerBullets = s.playerBullets.filter(b => {
      b.y -= PLAYER_BULLET_SPEED;
      if (b.y < 0) return false;
      // Hit shields
      for (const sh of s.shields) {
        if (sh.hp > 0 && b.x >= sh.x && b.x <= sh.x + 9 && b.y >= sh.y && b.y <= sh.y + 9) {
          sh.hp--;
          return false;
        }
      }
      // Hit invaders
      for (const inv of s.invaders) {
        if (!inv.alive) continue;
        if (b.x >= inv.x && b.x <= inv.x + INVADER_W && b.y >= inv.y && b.y <= inv.y + INVADER_H) {
          inv.alive = false;
          s.score += (ROWS - inv.r) * 10;
          return false;
        }
      }
      return true;
    });

    // Invader movement
    s.invTimer++;
    const aliveInvaders = s.invaders.filter(i => i.alive);
    const moveInterval = Math.max(8, 50 - aliveInvaders.length * 2 - (s.wave - 1) * 5);
    if (s.invTimer >= moveInterval) {
      s.invTimer = 0;
      let needDrop = false;
      for (const inv of aliveInvaders) {
        inv.x += s.invDir * (4 + s.wave * 0.5);
      }
      const leftmost = Math.min(...aliveInvaders.map(i => i.x));
      const rightmost = Math.max(...aliveInvaders.map(i => i.x + INVADER_W));
      if (rightmost >= W - 10 || leftmost <= 10) {
        needDrop = true;
        s.invDir *= -1;
      }
      if (needDrop) {
        for (const inv of aliveInvaders) inv.y += 16;
      }
    }

    // Check invader reaching bottom
    for (const inv of aliveInvaders) {
      if (inv.y + INVADER_H >= H - 18) {
        s.phase = 'over';
        s.win = false;
        draw();
        return;
      }
    }

    // Invaders cleared
    if (aliveInvaders.length === 0) {
      s.wave++;
      s.invaders = makeInvaders().map(inv => {
        inv.y += 10;
        return inv;
      });
      s.invSpeed = Math.min(s.invSpeed + 0.5, 4);
      s.invFireInterval = Math.max(40, s.invFireInterval - 15);
      s.playerBullets = [];
      s.invBullets = [];
    }

    // Invader fire
    s.invFireTimer++;
    if (s.invFireTimer >= s.invFireInterval && aliveInvaders.length > 0) {
      s.invFireTimer = 0;
      const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
      s.invBullets.push({ x: shooter.x + INVADER_W / 2, y: shooter.y + INVADER_H });
    }

    // Invader bullets
    s.invBullets = s.invBullets.filter(b => {
      b.y += INVADER_BULLET_SPEED;
      if (b.y > H) return false;
      // Hit shields
      for (const sh of s.shields) {
        if (sh.hp > 0 && b.x >= sh.x && b.x <= sh.x + 9 && b.y >= sh.y && b.y <= sh.y + 9) {
          sh.hp--;
          return false;
        }
      }
      // Hit player
      if (
        s.playerInvincible <= 0 &&
        b.x >= s.playerX && b.x <= s.playerX + PLAYER_W &&
        b.y >= H - PLAYER_H - 18 && b.y <= H - 18
      ) {
        s.lives--;
        s.playerInvincible = 120;
        if (s.lives <= 0) {
          s.phase = 'over';
          s.win = false;
        }
        return false;
      }
      return true;
    });

    if (s.playerInvincible > 0) s.playerInvincible--;

    draw();
    rafRef.current = requestAnimationFrame(tick);
  }, [draw]);

  const startGame = useCallback(() => {
    const fresh = makeState();
    fresh.phase = 'playing';
    stateRef.current = fresh;
    frameRef.current = 0;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    draw();
    rafRef.current = requestAnimationFrame(tick);

    const onKey = (e) => {
      keysRef.current[e.key] = e.type === 'keydown';
      if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
    };
    const onClick = (e) => {
      const s = stateRef.current;
      if (s.phase === 'idle' || s.phase === 'over') { startGame(); return; }
      if (s.phase === 'playing') {
        keysRef.current['shoot'] = true;
      }
    };

    const canvas = canvasRef.current;
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    canvas.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      canvas.removeEventListener('click', onClick);
    };
  }, [draw, tick, startGame]);

  // Mobile touch controls
  const handleTouchMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const t = e.touches[0];
    if (t) {
      const tx = (t.clientX - rect.left) * scaleX;
      stateRef.current.playerX = Math.max(0, Math.min(W - PLAYER_W, tx - PLAYER_W / 2));
    }
  }, []);

  const handleTouchStart = useCallback((e) => {
    const s = stateRef.current;
    if (s.phase === 'idle' || s.phase === 'over') { startGame(); return; }
    keysRef.current['shoot'] = true;
    handleTouchMove(e);
  }, [startGame, handleTouchMove]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: COLORS.bg, padding: '12px' }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        style={{
          display: 'block',
          maxWidth: '100%',
          border: `1px solid ${COLORS.magenta}`,
          boxShadow: `0 0 18px ${COLORS.magenta}44`,
          cursor: 'crosshair',
          touchAction: 'none',
        }}
      />
      <div style={{ marginTop: 8, color: COLORS.dim, fontFamily: 'monospace', fontSize: 11 }}>
        A/D o &larr;&rarr; para mover &nbsp;|&nbsp; Espacio o Click para disparar
      </div>
    </div>
  );
}
