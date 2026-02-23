import { useState, useEffect, useCallback, useRef } from 'react';
import useHighScore from '../hooks/useHighScore';

const COLORS = [
  { name: 'rojo',     hex: '#e53935' },
  { name: 'azul',     hex: '#1e88e5' },
  { name: 'verde',    hex: '#43a047' },
  { name: 'amarillo', hex: '#fdd835' },
  { name: 'naranja',  hex: '#fb8c00' },
  { name: 'morado',   hex: '#8e24aa' },
  { name: 'rosa',     hex: '#e91e8c' },
  { name: 'celeste',  hex: '#29b6f6' },
  { name: 'blanco',   hex: '#f0f0f0' },
  { name: 'negro',    hex: '#1a1a1a' },
  { name: 'gris',     hex: '#78909c' },
  { name: 'turquesa', hex: '#00bfa5' },
];

const TOTAL_ROUNDS = 10;
const ADVANCE_CORRECT_MS = 600;
const ADVANCE_WRONG_MS = 1000;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRound() {
  const shuffled = shuffle(COLORS);
  const correct = shuffled[0];
  const wrongs = shuffled.slice(1, 4);
  const options = shuffle([correct, ...wrongs]);
  return { correct, options };
}

export default function ColorMatch() {
  const [gameState, setGameState] = useState('idle'); // idle | playing | ended
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [currentRound, setCurrentRound] = useState(null);
  const [feedback, setFeedback] = useState(null); // { chosenIndex, correct: bool }
  const [locked, setLocked] = useState(false);
  const advanceTimerRef = useRef(null);
  const [, reportScore] = useHighScore('color');

  const nextRound = useCallback((roundNumber) => {
    setCurrentRound(buildRound());
    setRound(roundNumber);
    setFeedback(null);
    setLocked(false);
  }, []);

  const startGame = useCallback(() => {
    clearTimeout(advanceTimerRef.current);
    setScore(0);
    setGameState('playing');
    nextRound(1);
  }, [nextRound]);

  const handleChoice = useCallback((option, index) => {
    if (locked || gameState !== 'playing') return;
    setLocked(true);

    const isCorrect = option.name === currentRound.correct.name;
    setFeedback({ chosenIndex: index, correct: isCorrect });

    if (isCorrect) {
      setScore((s) => s + 1);
    }

    const delay = isCorrect ? ADVANCE_CORRECT_MS : ADVANCE_WRONG_MS;
    advanceTimerRef.current = setTimeout(() => {
      const nextRoundNum = round + 1;
      if (nextRoundNum > TOTAL_ROUNDS) {
        setGameState('ended');
      } else {
        nextRound(nextRoundNum);
      }
    }, delay);
  }, [locked, gameState, currentRound, round, nextRound]);

  useEffect(() => {
    return () => clearTimeout(advanceTimerRef.current);
  }, []);

  useEffect(() => {
    if (gameState === 'ended') reportScore(score * 10);
  }, [gameState]);

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    padding: '32px 24px',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    maxWidth: '400px',
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

  const hudStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
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
    fontSize: '1.2rem',
    fontWeight: '700',
  };

  const getOptionStyle = (index) => {
    let borderColor = 'var(--border)';
    let bgColor = 'rgba(0,0,0,0.35)';
    let textColor = 'var(--text-soft)';
    let boxShadow = 'none';

    if (feedback) {
      if (feedback.chosenIndex === index) {
        if (feedback.correct) {
          borderColor = '#00e676';
          bgColor = 'rgba(0, 230, 118, 0.12)';
          textColor = '#00e676';
          boxShadow = '0 0 12px rgba(0, 230, 118, 0.4)';
        } else {
          borderColor = '#ff1744';
          bgColor = 'rgba(255, 23, 68, 0.12)';
          textColor = '#ff1744';
          boxShadow = '0 0 12px rgba(255, 23, 68, 0.4)';
        }
      } else if (
        feedback &&
        !feedback.correct &&
        currentRound &&
        currentRound.options[index].name === currentRound.correct.name
      ) {
        borderColor = '#00e676';
        bgColor = 'rgba(0, 230, 118, 0.07)';
        textColor = '#00e676';
      }
    }

    return {
      flex: '1 1 calc(50% - 6px)',
      padding: '12px 8px',
      background: bgColor,
      border: `2px solid ${borderColor}`,
      borderRadius: '8px',
      color: textColor,
      fontFamily: 'monospace',
      fontSize: '0.9rem',
      fontWeight: '600',
      letterSpacing: '0.05em',
      cursor: locked ? 'default' : 'pointer',
      transition: 'border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease, color 0.15s ease',
      boxShadow,
      textTransform: 'lowercase',
    };
  };

  if (gameState === 'idle') {
    return (
      <div style={containerStyle}>
        <h2 style={titleStyle}>Color Match</h2>
        <p style={{ color: 'var(--text-soft)', fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>
          Identifica el color correcto. 10 rondas, tan rapido como puedas.
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
    const percent = Math.round((score / TOTAL_ROUNDS) * 100);
    return (
      <div style={containerStyle}>
        <h2 style={titleStyle}>Color Match</h2>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Resultado final
          </div>
          <div style={{ color: 'var(--cyan)', fontSize: '3rem', fontWeight: '700', lineHeight: 1 }}>
            {score}/{TOTAL_ROUNDS}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {percent}% de aciertos
          </div>
          <div style={{ color: 'var(--text-soft)', fontSize: '0.8rem', marginTop: '4px' }}>
            {percent === 100 && 'Perfecto! Eres un experto en colores!'}
            {percent >= 70 && percent < 100 && 'Muy bien! Buen ojo para los colores.'}
            {percent >= 40 && percent < 70 && 'Nada mal. Sigue practicando.'}
            {percent < 40 && 'Necesitas entrenar mas tu vision de colores.'}
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

  if (!currentRound) return null;

  const progressPercent = ((round - 1) / TOTAL_ROUNDS) * 100;

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Color Match</h2>

      <div style={hudStyle}>
        <div>
          <div style={statLabelStyle}>Ronda</div>
          <div style={statValueStyle}>{round}/{TOTAL_ROUNDS}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={statLabelStyle}>Puntos</div>
          <div style={statValueStyle}>{score}</div>
        </div>
      </div>

      <div style={{
        width: '100%',
        height: '4px',
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progressPercent}%`,
          background: 'var(--accent)',
          borderRadius: '2px',
          transition: 'width 0.3s ease',
        }} />
      </div>

      <div style={{
        width: '100%',
        aspectRatio: '16/9',
        maxHeight: '140px',
        background: currentRound.correct.hex,
        borderRadius: '10px',
        border: '2px solid rgba(255,255,255,0.1)',
        boxShadow: `0 0 40px ${currentRound.correct.hex}44`,
        transition: 'background 0.2s ease',
      }} />

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        width: '100%',
      }}>
        {currentRound.options.map((option, i) => (
          <button
            key={`${option.name}-${round}`}
            style={getOptionStyle(i)}
            onClick={() => handleChoice(option, i)}
            onMouseEnter={(e) => {
              if (!locked) {
                e.currentTarget.style.borderColor = 'var(--cyan)';
                e.currentTarget.style.color = 'var(--cyan)';
              }
            }}
            onMouseLeave={(e) => {
              if (!locked && !feedback) {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-soft)';
              }
            }}
          >
            {option.name}
          </button>
        ))}
      </div>
    </div>
  );
}
