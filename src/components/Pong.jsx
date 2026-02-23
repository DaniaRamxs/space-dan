import { useRef, useEffect, useCallback } from 'react';

const W = 400;
const H = 300;
const PADDLE_W = 10;
const PADDLE_H = 60;
const BALL_R = 6;
const WIN_SCORE = 7;
const COLORS = { bg: '#0b0b10', cyan: '#00e5ff', magenta: '#ff00ff', white: '#ffffff', dim: 'rgba(255,255,255,0.15)' };

function makeState() {
  return {
    phase: 'idle', // idle | playing | over
    playerY: H / 2 - PADDLE_H / 2,
    aiY: H / 2 - PADDLE_H / 2,
    ball: { x: W / 2, y: H / 2, vx: 0, vy: 0 },
    pScore: 0,
    aScore: 0,
    winner: null,
    speed: 4,
  };
}

function launchBall(state) {
  const angle = (Math.random() * Math.PI) / 4 - Math.PI / 8;
  const dir = Math.random() < 0.5 ? 1 : -1;
  state.ball.x = W / 2;
  state.ball.y = H / 2;
  state.ball.vx = dir * state.speed * Math.cos(angle);
  state.ball.vy = state.speed * Math.sin(angle);
}

export default function Pong() {
  const canvasRef = useRef(null);
  const stateRef = useRef(makeState());
  const rafRef = useRef(null);
  const mouseYRef = useRef(H / 2);
  const keysRef = useRef({});
  const touchRef = useRef(null);
  const firedRef = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    // Net
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = COLORS.dim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Player paddle
    ctx.fillStyle = COLORS.cyan;
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 10;
    ctx.fillRect(10, s.playerY, PADDLE_W, PADDLE_H);

    // AI paddle
    ctx.fillStyle = COLORS.magenta;
    ctx.shadowColor = COLORS.magenta;
    ctx.shadowBlur = 10;
    ctx.fillRect(W - 10 - PADDLE_W, s.aiY, PADDLE_W, PADDLE_H);

    // Ball
    ctx.fillStyle = COLORS.white;
    ctx.shadowColor = COLORS.white;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Score
    ctx.fillStyle = COLORS.white;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(s.pScore, W / 2 - 50, 36);
    ctx.fillText(s.aScore, W / 2 + 50, 36);

    // Overlays
    if (s.phase === 'idle') {
      ctx.fillStyle = 'rgba(11,11,16,0.75)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = COLORS.cyan;
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PONG', W / 2, H / 2 - 30);
      ctx.fillStyle = COLORS.white;
      ctx.font = '14px monospace';
      ctx.fillText('Click para jugar', W / 2, H / 2 + 4);
      ctx.fillStyle = COLORS.dim;
      ctx.font = '11px monospace';
      ctx.fillText('Mouse / Flechas Arriba-Abajo', W / 2, H / 2 + 26);
    }

    if (s.phase === 'over') {
      ctx.fillStyle = 'rgba(11,11,16,0.82)';
      ctx.fillRect(0, 0, W, H);
      const color = s.winner === 'player' ? COLORS.cyan : COLORS.magenta;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(s.winner === 'player' ? '¡GANASTE!' : 'PERDISTE', W / 2, H / 2 - 20);
      ctx.shadowBlur = 0;
      ctx.fillStyle = COLORS.white;
      ctx.font = '13px monospace';
      ctx.fillText('Click para reiniciar', W / 2, H / 2 + 16);
    }
  }, []);

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'playing') { draw(); return; }

    // Player paddle movement
    const keys = keysRef.current;
    if (keys['ArrowUp']) s.playerY = Math.max(0, s.playerY - 6);
    if (keys['ArrowDown']) s.playerY = Math.min(H - PADDLE_H, s.playerY + 6);

    // If using mouse
    const targetFromMouse = mouseYRef.current - PADDLE_H / 2;
    const diff = targetFromMouse - s.playerY;
    if (!keys['ArrowUp'] && !keys['ArrowDown']) {
      s.playerY += Math.sign(diff) * Math.min(Math.abs(diff), 7);
      s.playerY = Math.max(0, Math.min(H - PADDLE_H, s.playerY));
    }

    // AI paddle
    const ballMidY = s.ball.y - PADDLE_H / 2;
    const aiDiff = ballMidY - s.aiY;
    s.aiY += Math.sign(aiDiff) * Math.min(Math.abs(aiDiff), 3.5);
    s.aiY = Math.max(0, Math.min(H - PADDLE_H, s.aiY));

    // Ball movement
    s.ball.x += s.ball.vx;
    s.ball.y += s.ball.vy;

    // Top/bottom bounce
    if (s.ball.y - BALL_R <= 0) { s.ball.y = BALL_R; s.ball.vy = Math.abs(s.ball.vy); }
    if (s.ball.y + BALL_R >= H) { s.ball.y = H - BALL_R; s.ball.vy = -Math.abs(s.ball.vy); }

    // Player paddle collision
    if (
      s.ball.vx < 0 &&
      s.ball.x - BALL_R <= 10 + PADDLE_W &&
      s.ball.x - BALL_R >= 10 &&
      s.ball.y >= s.playerY &&
      s.ball.y <= s.playerY + PADDLE_H
    ) {
      const rel = (s.ball.y - (s.playerY + PADDLE_H / 2)) / (PADDLE_H / 2);
      const angle = rel * (Math.PI / 4);
      s.speed = Math.min(s.speed + 0.3, 14);
      s.ball.vx = s.speed * Math.cos(angle);
      s.ball.vy = s.speed * Math.sin(angle);
      s.ball.x = 10 + PADDLE_W + BALL_R + 1;
    }

    // AI paddle collision
    const aiX = W - 10 - PADDLE_W;
    if (
      s.ball.vx > 0 &&
      s.ball.x + BALL_R >= aiX &&
      s.ball.x + BALL_R <= aiX + PADDLE_W + 2 &&
      s.ball.y >= s.aiY &&
      s.ball.y <= s.aiY + PADDLE_H
    ) {
      const rel = (s.ball.y - (s.aiY + PADDLE_H / 2)) / (PADDLE_H / 2);
      const angle = rel * (Math.PI / 4);
      s.speed = Math.min(s.speed + 0.3, 14);
      s.ball.vx = -s.speed * Math.cos(angle);
      s.ball.vy = s.speed * Math.sin(angle);
      s.ball.x = aiX - BALL_R - 1;
    }

    // Score
    if (s.ball.x < 0) {
      s.aScore++;
      if (s.aScore >= WIN_SCORE) {
        s.phase = 'over'; s.winner = 'ai';
        if (!firedRef.current) { firedRef.current = true; window.dispatchEvent(new CustomEvent('dan:game-score', { detail: { gameId: 'pong', score: s.pScore, isHighScore: false } })); }
      } else { s.speed = 4; launchBall(s); }
    }
    if (s.ball.x > W) {
      s.pScore++;
      if (s.pScore >= WIN_SCORE) {
        s.phase = 'over'; s.winner = 'player';
        if (!firedRef.current) { firedRef.current = true; window.dispatchEvent(new CustomEvent('dan:game-score', { detail: { gameId: 'pong', score: s.pScore, isHighScore: false } })); }
      } else { s.speed = 4; launchBall(s); }
    }

    draw();
    rafRef.current = requestAnimationFrame(tick);
  }, [draw]);

  const startGame = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === 'over' || s.phase === 'idle') {
      const fresh = makeState();
      fresh.phase = 'playing';
      stateRef.current = fresh;
      firedRef.current = false;
      launchBall(stateRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  useEffect(() => {
    draw();
    rafRef.current = requestAnimationFrame(tick);

    const onKey = (e) => {
      keysRef.current[e.key] = e.type === 'keydown';
      if (['ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
    };
    const onMouse = (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleY = H / rect.height;
      mouseYRef.current = (e.clientY - rect.top) * scaleY;
    };
    const onTouch = (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleY = H / rect.height;
      const t = e.touches[0];
      if (t) mouseYRef.current = (t.clientY - rect.top) * scaleY;
    };
    const onClick = () => {
      const s = stateRef.current;
      if (s.phase === 'idle' || s.phase === 'over') startGame();
    };

    const canvas = canvasRef.current;
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    canvas.addEventListener('mousemove', onMouse);
    canvas.addEventListener('touchmove', onTouch, { passive: true });
    canvas.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      canvas.removeEventListener('mousemove', onMouse);
      canvas.removeEventListener('touchmove', onTouch);
      canvas.removeEventListener('click', onClick);
    };
  }, [draw, tick, startGame]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: COLORS.bg, padding: '12px' }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          display: 'block',
          maxWidth: '100%',
          border: `1px solid ${COLORS.cyan}`,
          boxShadow: `0 0 18px ${COLORS.cyan}44`,
          cursor: 'crosshair',
        }}
      />
      <div style={{ marginTop: 8, color: COLORS.dim, fontFamily: 'monospace', fontSize: 11 }}>
        Mouse / Flechas &uarr;&darr; &nbsp;|&nbsp; Primero en 7 gana
      </div>
    </div>
  );
}
