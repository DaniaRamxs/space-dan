import { useState, useEffect, useRef, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';

const MIN_DELAY_MS = 1500;
const MAX_DELAY_MS = 4000;
const MAX_HISTORY = 5;

function randomDelay() {
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
}

export default function ReactionTime() {
  // States: waiting | ready | go | result | toosoon
  const [phase, setPhase] = useState('waiting');
  const [reactionMs, setReactionMs] = useState(null);
  const [history, setHistory] = useState([]);
  const [bestTime, setBestTime] = useState(null);

  const delayTimerRef = useRef(null);
  const startTimeRef = useRef(null);
  const [, reportScore] = useHighScore('reaction');

  const clearDelay = useCallback(() => {
    clearTimeout(delayTimerRef.current);
  }, []);

  const goToReady = useCallback(() => {
    setPhase('ready');
    setReactionMs(null);

    const delay = randomDelay();
    delayTimerRef.current = setTimeout(() => {
      setPhase('go');
      startTimeRef.current = performance.now();
    }, delay);
  }, []);

  const handleClick = useCallback(() => {
    if (phase === 'waiting') {
      goToReady();
      return;
    }

    if (phase === 'ready') {
      clearDelay();
      setPhase('toosoon');
      return;
    }

    if (phase === 'go') {
      const elapsed = Math.round(performance.now() - startTimeRef.current);
      setReactionMs(elapsed);
      setPhase('result');

      setHistory((prev) => {
        const updated = [elapsed, ...prev].slice(0, MAX_HISTORY);
        return updated;
      });

      setBestTime((prev) => {
        if (prev === null || elapsed < prev) return elapsed;
        return prev;
      });
      return;
    }

    if (phase === 'result' || phase === 'toosoon') {
      setPhase('waiting');
      return;
    }
  }, [phase, clearDelay, goToReady]);

  useEffect(() => {
    return () => clearDelay();
  }, [clearDelay]);

  useEffect(() => {
    if (phase === 'result' && reactionMs != null) reportScore(Math.max(0, 1000 - reactionMs));
  }, [phase]);

  const average =
    history.length > 0
      ? Math.round(history.reduce((a, b) => a + b, 0) / history.length)
      : null;

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

  const getButtonStyle = () => {
    let bg = 'rgba(0,0,0,0.4)';
    let border = 'var(--border)';
    let color = 'var(--text-muted)';
    let boxShadow = 'none';
    let cursor = 'pointer';
    let transform = 'scale(1)';

    if (phase === 'waiting') {
      border = 'var(--accent)';
      color = 'var(--accent)';
      bg = 'rgba(255, 0, 255, 0.06)';
    } else if (phase === 'ready') {
      border = 'rgba(255, 170, 0, 0.5)';
      color = '#ffaa00';
      bg = 'rgba(255, 170, 0, 0.06)';
    } else if (phase === 'go') {
      bg = 'rgba(0, 229, 255, 0.15)';
      border = 'var(--cyan)';
      color = 'var(--cyan)';
      boxShadow = '0 0 40px rgba(0, 229, 255, 0.5), 0 0 80px rgba(0, 229, 255, 0.2)';
      transform = 'scale(1.03)';
    } else if (phase === 'toosoon') {
      bg = 'rgba(255, 23, 68, 0.1)';
      border = '#ff1744';
      color = '#ff1744';
      boxShadow = '0 0 20px rgba(255, 23, 68, 0.3)';
    } else if (phase === 'result') {
      bg = 'rgba(0, 230, 118, 0.1)';
      border = '#00e676';
      color = '#00e676';
      boxShadow = '0 0 20px rgba(0, 230, 118, 0.25)';
    }

    return {
      width: '100%',
      padding: '48px 24px',
      background: bg,
      border: `2px solid ${border}`,
      borderRadius: '12px',
      color,
      fontFamily: 'monospace',
      fontSize: '1.1rem',
      fontWeight: '700',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      cursor,
      transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
      boxShadow,
      transform,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    };
  };

  const getButtonContent = () => {
    if (phase === 'waiting') {
      return (
        <>
          <span style={{ fontSize: '2rem' }}>⚡</span>
          <span>click para empezar</span>
        </>
      );
    }
    if (phase === 'ready') {
      return (
        <>
          <span style={{ fontSize: '2rem', animation: 'none' }}>⏳</span>
          <span>espera...</span>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,170,0,0.6)', fontWeight: '400' }}>
            (no hagas click todavia)
          </span>
        </>
      );
    }
    if (phase === 'go') {
      return (
        <>
          <span style={{ fontSize: '2.5rem' }}>🟢</span>
          <span style={{ fontSize: '1.4rem' }}>AHORA!</span>
        </>
      );
    }
    if (phase === 'result') {
      return (
        <>
          <span style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: 'rgba(0, 230, 118, 0.7)' }}>
            tiempo de reaccion
          </span>
          <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>{reactionMs}</span>
          <span style={{ fontSize: '0.8rem', letterSpacing: '0.05em' }}>milisegundos</span>
          <span style={{ fontSize: '0.7rem', color: 'rgba(0, 230, 118, 0.5)', marginTop: '4px', fontWeight: '400', textTransform: 'none' }}>
            click para intentar de nuevo
          </span>
        </>
      );
    }
    if (phase === 'toosoon') {
      return (
        <>
          <span style={{ fontSize: '2rem' }}>-_-</span>
          <span>muy rapido!</span>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255, 23, 68, 0.6)', fontWeight: '400' }}>
            click para reintentar
          </span>
        </>
      );
    }
    return null;
  };

  const statCardStyle = {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '12px 16px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
  };

  const statLabelStyle = {
    color: 'var(--text-muted)',
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  };

  const statValueStyle = {
    color: 'var(--cyan)',
    fontSize: '1.2rem',
    fontWeight: '700',
  };

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Reaction Time</h2>

      <button style={getButtonStyle()} onClick={handleClick}>
        {getButtonContent()}
      </button>

      <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
        <div style={statCardStyle}>
          <div style={statLabelStyle}>Mejor tiempo</div>
          <div style={statValueStyle}>
            {bestTime !== null ? `${bestTime}ms` : '--'}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={statLabelStyle}>Promedio ({history.length}/{MAX_HISTORY})</div>
          <div style={statValueStyle}>
            {average !== null ? `${average}ms` : '--'}
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div style={{ width: '100%' }}>
          <div style={{
            color: 'var(--text-muted)',
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '8px',
          }}>
            Ultimos {history.length} intentos
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '48px' }}>
            {history.map((ms, i) => {
              const maxMs = Math.max(...history);
              const minMs = Math.min(...history);
              const range = maxMs - minMs || 1;
              const heightPct = 30 + ((ms - minMs) / range) * 70;
              const isBest = ms === Math.min(...history);

              return (
                <div
                  key={i}
                  title={`${ms}ms`}
                  style={{
                    flex: 1,
                    height: `${heightPct}%`,
                    background: isBest ? 'var(--cyan)' : 'rgba(255, 0, 255, 0.4)',
                    borderRadius: '3px 3px 0 0',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    transition: 'height 0.3s ease',
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '-18px',
                    fontSize: '0.6rem',
                    color: isBest ? 'var(--cyan)' : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                  }}>
                    {ms}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {history.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0, textAlign: 'center' }}>
          Cuando el boton se ilumine, haz click lo mas rapido que puedas.
        </p>
      )}
    </div>
  );
}
