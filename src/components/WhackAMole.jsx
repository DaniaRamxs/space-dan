import { useState, useEffect, useRef, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';

const TOTAL_HOLES = 9;
const GAME_DURATION = 30;
const MOLE_VISIBLE_MS = 600;
const MOLE_INTERVAL_MS = 800;

export default function WhackAMole() {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [activeMole, setActiveMole] = useState(null);
  const [gameState, setGameState] = useState('idle'); // idle | playing | ended
  const [whackedHole, setWhackedHole] = useState(null);
  const [missedHole, setMissedHole] = useState(null);

  const moleTimerRef = useRef(null);
  const moleHideRef = useRef(null);
  const countdownRef = useRef(null);
  const scoreRef = useRef(0);
  const [, reportScore] = useHighScore('whack');

  const clearAllTimers = useCallback(() => {
    clearInterval(moleTimerRef.current);
    clearTimeout(moleHideRef.current);
    clearInterval(countdownRef.current);
  }, []);

  const spawnMole = useCallback(() => {
    const nextHole = Math.floor(Math.random() * TOTAL_HOLES);
    setActiveMole(nextHole);

    clearTimeout(moleHideRef.current);
    moleHideRef.current = setTimeout(() => {
      setMissedHole(nextHole);
      setActiveMole(null);
      setTimeout(() => setMissedHole(null), 300);
    }, MOLE_VISIBLE_MS);
  }, []);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setActiveMole(null);
    setGameState('playing');

    countdownRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearAllTimers();
          setActiveMole(null);
          setGameState('ended');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    moleTimerRef.current = setInterval(() => {
      spawnMole();
    }, MOLE_INTERVAL_MS);
  }, [clearAllTimers, spawnMole]);

  const handleWhack = useCallback((holeIndex) => {
    if (gameState !== 'playing') return;
    if (activeMole !== holeIndex) return;

    clearTimeout(moleHideRef.current);
    scoreRef.current += 1;
    setScore(scoreRef.current);
    setWhackedHole(holeIndex);
    setActiveMole(null);

    setTimeout(() => setWhackedHole(null), 300);
  }, [gameState, activeMole]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  useEffect(() => {
    if (gameState === 'ended') reportScore(scoreRef.current);
  }, [gameState]);

  const timerPercent = (timeLeft / GAME_DURATION) * 100;

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    padding: '32px 24px',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    maxWidth: '420px',
    margin: '0 auto',
    fontFamily: 'monospace',
  };

  const titleStyle = {
    color: 'var(--accent)',
    fontSize: '1.5rem',
    fontWeight: '700',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    margin: 0,
  };

  const hudStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    fontSize: '0.9rem',
  };

  const statLabelStyle = {
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontSize: '0.7rem',
    marginBottom: '2px',
  };

  const statValueStyle = {
    color: 'var(--cyan)',
    fontSize: '1.4rem',
    fontWeight: '700',
  };

  const timerBarContainerStyle = {
    width: '100%',
    height: '6px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '3px',
    overflow: 'hidden',
  };

  const timerBarFillStyle = {
    height: '100%',
    width: `${timerPercent}%`,
    background: timerPercent > 40
      ? 'var(--cyan)'
      : timerPercent > 20
        ? '#ffaa00'
        : '#ff3333',
    borderRadius: '3px',
    transition: 'width 0.9s linear, background 0.5s ease',
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    width: '100%',
  };

  const getHoleStyle = (index) => {
    const isActive = activeMole === index;
    const wasWhacked = whackedHole === index;
    const wasMissed = missedHole === index;

    return {
      position: 'relative',
      width: '100%',
      aspectRatio: '1',
      background: wasWhacked
        ? 'rgba(0, 229, 255, 0.15)'
        : wasMissed
          ? 'rgba(255, 0, 255, 0.08)'
          : 'rgba(0,0,0,0.4)',
      border: wasWhacked
        ? '2px solid var(--cyan)'
        : wasMissed
          ? '2px solid rgba(255,0,255,0.4)'
          : '2px solid var(--border)',
      borderRadius: '12px',
      cursor: isActive ? 'pointer' : 'default',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      overflow: 'hidden',
      transition: 'border-color 0.15s ease, background 0.15s ease',
      userSelect: 'none',
    };
  };

  const getMoleStyle = (index) => {
    const isVisible = activeMole === index;
    return {
      fontSize: '2rem',
      lineHeight: 1,
      paddingBottom: '8px',
      transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.3) translateY(60%)',
      opacity: isVisible ? 1 : 0,
      transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.1s ease',
      pointerEvents: 'none',
    };
  };

  const buttonStyle = {
    padding: '12px 28px',
    background: 'transparent',
    border: '2px solid var(--accent)',
    borderRadius: '8px',
    color: 'var(--accent)',
    fontSize: '0.95rem',
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'background 0.2s ease, color 0.2s ease',
  };

  const endScreenStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 0',
  };

  const finalScoreStyle = {
    color: 'var(--cyan)',
    fontSize: '3rem',
    fontWeight: '700',
    lineHeight: 1,
  };

  const finalLabelStyle = {
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  };

  if (gameState === 'idle') {
    return (
      <div style={containerStyle}>
        <h2 style={titleStyle}>Whack-a-Mole</h2>
        <p style={{ color: 'var(--text-soft)', fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>
          Golpea los topos antes de que desaparezcan. Tienes 30 segundos.
        </p>
        <button
          style={buttonStyle}
          onClick={startGame}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.color = '#000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--accent)';
          }}
        >
          Jugar
        </button>
      </div>
    );
  }

  if (gameState === 'ended') {
    return (
      <div style={containerStyle}>
        <h2 style={titleStyle}>Whack-a-Mole</h2>
        <div style={endScreenStyle}>
          <div style={finalLabelStyle}>Puntuacion final</div>
          <div style={finalScoreStyle}>{score}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {score === 0 && 'Necesitas practicar...'}
            {score >= 1 && score < 5 && 'Buen intento!'}
            {score >= 5 && score < 10 && 'Nada mal!'}
            {score >= 10 && score < 15 && 'Excelente!'}
            {score >= 15 && 'Eres un maestro del mole!!'}
          </div>
        </div>
        <button
          style={buttonStyle}
          onClick={startGame}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.color = '#000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--accent)';
          }}
        >
          Reiniciar
        </button>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Whack-a-Mole</h2>

      <div style={hudStyle}>
        <div>
          <div style={statLabelStyle}>Puntos</div>
          <div style={statValueStyle}>{score}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={statLabelStyle}>Tiempo</div>
          <div style={{ ...statValueStyle, color: timeLeft <= 10 ? '#ff3333' : 'var(--cyan)' }}>
            {timeLeft}s
          </div>
        </div>
      </div>

      <div style={timerBarContainerStyle}>
        <div style={timerBarFillStyle} />
      </div>

      <div style={gridStyle}>
        {Array.from({ length: TOTAL_HOLES }, (_, i) => (
          <div
            key={i}
            style={getHoleStyle(i)}
            onClick={() => handleWhack(i)}
          >
            <span style={getMoleStyle(i)}>
              {whackedHole === i ? '💥' : '🐭'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
