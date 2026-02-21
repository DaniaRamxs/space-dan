import { useState, useEffect, useRef, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The four button ids in fixed order. */
const BUTTONS = [0, 1, 2, 3];

const COLORS = {
  0: { base: '#c0527e', bright: '#ff6eb4', label: 'rosa' },     // magenta
  1: { base: '#00a3b8', bright: '#00e5ff', label: 'cian' },      // cyan
  2: { base: '#22991a', bright: '#39ff14', label: 'verde' },     // green
  3: { base: '#b87030', bright: '#f4a261', label: 'naranja' },   // orange
};

const FLASH_ON_MS = 400;   // how long a button lights up
const FLASH_OFF_MS = 100;  // dark gap between flashes
const BETWEEN_ROUND_MS = 600; // pause before showing next sequence

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a random button id 0-3.
 * @returns {number}
 */
function randomBtn() {
  return Math.floor(Math.random() * 4);
}

/**
 * Plays a short oscillator beep for the given button id.
 * Frequencies chosen so each button has a distinct tone.
 * @param {number} btnId
 * @param {AudioContext} audioCtx
 */
function playTone(btnId, audioCtx) {
  if (!audioCtx) return;
  const freqs = [330, 440, 550, 660];
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.value = freqs[btnId];
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.35);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SimonSays — memory pattern game with 4 coloured buttons.
 * No canvas — pure CSS and React state.
 */
export default function SimonSays() {
  // game phase: 'idle' | 'showing' | 'input' | 'dead'
  const [phase, setPhase] = useState('idle');
  const [sequence, setSequence] = useState([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  // which button is currently lit (null = none)
  const [litBtn, setLitBtn] = useState(null);
  // current round number (1-indexed; equals sequence.length)
  const [level, setLevel] = useState(0);

  const [best, saveScore] = useHighScore('simon');
  const [displayBest, setDisplayBest] = useState(best);

  // AudioContext created lazily on first user interaction
  const audioRef = useRef(null);

  /** Gets or creates the AudioContext. */
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      try {
        audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        // Audio not available
      }
    }
    return audioRef.current;
  }, []);

  // -------------------------------------------------------------------------
  // Sequence playback
  // -------------------------------------------------------------------------

  /**
   * Plays back the given sequence visually (and audibly), then switches to
   * 'input' phase once all flashes are done.
   * @param {number[]} seq
   */
  const playSequence = useCallback(
    (seq) => {
      setPhase('showing');
      setLitBtn(null);

      let t = 0;
      const timers = [];

      seq.forEach((btnId, i) => {
        // light on
        const onTimer = setTimeout(() => {
          setLitBtn(btnId);
          playTone(btnId, getAudio());
        }, t);
        timers.push(onTimer);
        t += FLASH_ON_MS;

        // light off
        const offTimer = setTimeout(() => {
          setLitBtn(null);
        }, t);
        timers.push(offTimer);
        t += FLASH_OFF_MS;
      });

      // Enable player input after all flashes
      const doneTimer = setTimeout(() => {
        setPhase('input');
        setPlayerIndex(0);
      }, t);
      timers.push(doneTimer);

      // Return cleanup so callers can cancel on unmount (not strictly needed
      // here but good practice).
      return () => timers.forEach(clearTimeout);
    },
    [getAudio]
  );

  // -------------------------------------------------------------------------
  // Start game
  // -------------------------------------------------------------------------
  const startGame = useCallback(() => {
    getAudio(); // init audio context on user gesture
    const firstSeq = [randomBtn()];
    setSequence(firstSeq);
    setLevel(1);
    setPlayerIndex(0);
    playSequence(firstSeq);
  }, [getAudio, playSequence]);

  // -------------------------------------------------------------------------
  // Player presses a button
  // -------------------------------------------------------------------------
  const handleButtonPress = useCallback(
    (btnId) => {
      if (phase !== 'input') return;

      // Flash the pressed button briefly
      setLitBtn(btnId);
      playTone(btnId, getAudio());
      setTimeout(() => setLitBtn(null), FLASH_ON_MS);

      const expected = sequence[playerIndex];

      if (btnId !== expected) {
        // Wrong — game over
        setPhase('dead');
        const reachedLevel = sequence.length; // levels completed before this one
        const isNew = saveScore(reachedLevel);
        if (isNew) setDisplayBest(reachedLevel);
        return;
      }

      const nextIndex = playerIndex + 1;

      if (nextIndex === sequence.length) {
        // Completed the round — advance to next
        setPhase('showing'); // lock input while transitioning
        const nextSeq = [...sequence, randomBtn()];
        setSequence(nextSeq);
        setLevel(nextSeq.length);
        setTimeout(() => {
          playSequence(nextSeq);
        }, BETWEEN_ROUND_MS);
      } else {
        setPlayerIndex(nextIndex);
      }
    },
    [phase, sequence, playerIndex, getAudio, saveScore, playSequence]
  );

  // Keep displayBest in sync
  useEffect(() => {
    setDisplayBest(best);
  }, [best]);

  // -------------------------------------------------------------------------
  // Derived UI state
  // -------------------------------------------------------------------------
  const inputDisabled = phase !== 'input';

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: 420,
        margin: '0 auto',
        fontFamily: 'monospace',
        color: '#ffffff',
        gap: 16,
      }}
    >
      {/* Status row */}
      <div
        style={{
          display: 'flex',
          gap: 24,
          fontSize: 13,
          color: '#cccccc',
          letterSpacing: '0.05em',
        }}
      >
        <span>nivel: {level}</span>
        <span style={{ color: '#ff6eb4' }}>récord: {displayBest}</span>
      </div>

      {/* 2×2 button grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}
      >
        {BUTTONS.map((id) => {
          const isLit = litBtn === id;
          const col = COLORS[id];
          return (
            <button
              key={id}
              aria-label={col.label}
              disabled={inputDisabled}
              onClick={() => handleButtonPress(id)}
              style={{
                width: 100,
                height: 100,
                borderRadius: 12,
                border: `2px solid ${col.bright}`,
                background: isLit ? col.bright : col.base,
                cursor: inputDisabled ? 'default' : 'pointer',
                boxShadow: isLit
                  ? `0 0 24px 6px ${col.bright}`
                  : '0 0 6px 1px rgba(0,0,0,0.6)',
                transition: 'background 0.05s, box-shadow 0.05s',
                outline: 'none',
              }}
            />
          );
        })}
      </div>

      {/* Message area */}
      <div
        style={{
          minHeight: 22,
          fontSize: 13,
          color: '#aaaaaa',
          letterSpacing: '0.04em',
          textAlign: 'center',
        }}
      >
        {phase === 'idle' && 'pulsa iniciar para empezar'}
        {phase === 'showing' && 'observa la secuencia...'}
        {phase === 'input' && 'tu turno'}
        {phase === 'dead' && `¡error! llegaste al nivel ${sequence.length}`}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12 }}>
        {(phase === 'idle' || phase === 'dead') && (
          <button
            onClick={startGame}
            style={{
              border: '1px solid #ff6eb4',
              background: 'transparent',
              color: '#ff6eb4',
              padding: '6px 16px',
              borderRadius: 20,
              fontFamily: 'monospace',
              fontSize: 13,
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            {phase === 'dead' ? 'reiniciar' : 'iniciar'}
          </button>
        )}
      </div>
    </div>
  );
}
