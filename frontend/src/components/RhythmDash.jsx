import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LANES = 4;
const KEYS = ['d', 'f', 'j', 'k'];
const NOTE_SPEED = 3;
const PERFECT_WINDOW = 50;
const GOOD_WINDOW = 100;
const OK_WINDOW = 150;

const PATTERNS = [
  [0, 1, 2, 3, 0, 2, 1, 3, 0, 1, 3, 2],
  [0, 0, 1, 1, 2, 2, 3, 3, 0, 2, 1, 3],
  [3, 2, 1, 0, 3, 1, 2, 0, 3, 2, 0, 1],
  [0, 1, 0, 2, 1, 3, 2, 0, 3, 1, 2, 3],
];

const DIFFICULTY_PRESETS = {
  easy:   { label: 'FÁCIL',  emoji: '🌟', initialDiff: 0.5, maxDiff: 3, hitMult: 1.5, color: '#00ff88' },
  normal: { label: 'NORMAL', emoji: '⚡', initialDiff: 1,   maxDiff: 5, hitMult: 1,   color: '#00e5ff' },
  hard:   { label: 'DIFÍCIL',emoji: '💀', initialDiff: 2,   maxDiff: 7, hitMult: 0.65,color: '#ff4444' },
};

// ── Audio ────────────────────────────────────────────────────────────────────
let _ctx = null;
const getCtx = () => {
  try {
    if (!_ctx || _ctx.state === 'closed') _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  } catch { return null; }
};

const tone = (freq, dur, type = 'sine', vol = 0.3, freqEnd = null) => {
  const ctx = getCtx(); if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freqEnd ?? freq, ctx.currentTime);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freq, ctx.currentTime + dur * 0.6);
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.start(); osc.stop(ctx.currentTime + dur);
};

const sounds = {
  perfect:   () => { tone(880, 0.12, 'sine', 0.35); setTimeout(() => tone(1320, 0.1, 'sine', 0.2), 55); },
  good:      () => tone(660, 0.1, 'sine', 0.28),
  ok:        () => tone(440, 0.1, 'triangle', 0.22),
  miss:      () => tone(120, 0.18, 'sawtooth', 0.25),
  milestone: (c) => {
    const seq = c >= 25 ? [523, 659, 784, 1047, 1319] : [392, 523, 659, 784];
    seq.forEach((f, i) => setTimeout(() => tone(f, 0.18, 'sine', 0.22), i * 65));
  },
  gameover:  () => [440, 370, 311, 261].forEach((f, i) => setTimeout(() => tone(f, 0.28, 'sine', 0.25), i * 140)),
  start:     () => [261, 329, 392, 523].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'sine', 0.2), i * 60)),
};
// ────────────────────────────────────────────────────────────────────────────

export default function RhythmDash() {
  const [gameState, setGameState]       = useState('menu');
  const [selectedPreset, setSelectedPreset] = useState('normal');
  const [score, setScore]               = useState(0);
  const [combo, setCombo]               = useState(0);
  const [maxCombo, setMaxCombo]         = useState(0);
  const [notes, setNotes]               = useState([]);
  const [pressedKeys, setPressedKeys]   = useState({});
  const [feedback, setFeedback]         = useState([]);
  const [health, setHealth]             = useState(100);
  const [difficulty, setDifficulty]     = useState(1);
  const [flashColor, setFlashColor]     = useState(null);
  const [stats, setStats]               = useState({ perfect: 0, good: 0, ok: 0, miss: 0 });

  const gameLoopRef       = useRef(null);
  const noteIdRef         = useRef(0);
  const lastSpawnRef      = useRef(0);
  const startTimeRef      = useRef(0);
  const patternIndexRef   = useRef(0);
  const noteInPatternRef  = useRef(0);
  const difficultyRef     = useRef(1);
  const comboRef          = useRef(0);
  const gameStateRef      = useRef('menu');
  const presetRef         = useRef(DIFFICULTY_PRESETS.normal);
  const milestoneRef      = useRef(0);
  const statsRef          = useRef({ perfect: 0, good: 0, ok: 0, miss: 0 });

  const triggerFlash = useCallback((color, dur = 300) => {
    setFlashColor(color);
    setTimeout(() => setFlashColor(null), dur);
  }, []);

  const addFeedback = useCallback((text, lane) => {
    const id = Date.now() + Math.random();
    setFeedback(prev => [...prev, { id, text, lane }]);
    setTimeout(() => setFeedback(prev => prev.filter(f => f.id !== id)), 1000);
  }, []);

  const spawnNote = useCallback(() => {
    const pattern = PATTERNS[patternIndexRef.current % PATTERNS.length];
    const lane = pattern[noteInPatternRef.current % pattern.length];
    noteInPatternRef.current++;
    if (noteInPatternRef.current >= pattern.length) {
      noteInPatternRef.current = 0;
      patternIndexRef.current++;
    }
    setNotes(prev => [...prev, { id: noteIdRef.current++, lane, y: -50, hit: false }]);
  }, []);

  const checkHit = useCallback((lane) => {
    const targetY = 500;
    const preset = presetRef.current;
    const pw = PERFECT_WINDOW * preset.hitMult;
    const gw = GOOD_WINDOW   * preset.hitMult;
    const ow = OK_WINDOW     * preset.hitMult;

    setNotes(prev => {
      const inLane = prev.filter(n => n.lane === lane && !n.hit);
      if (inLane.length === 0) {
        comboRef.current = 0;
        setCombo(0);
        setHealth(h => Math.max(0, h - 5));
        addFeedback('MISS', lane);
        sounds.miss();
        statsRef.current.miss++;
        setStats({ ...statsRef.current });
        return prev;
      }

      const closest = inLane.reduce((a, b) =>
        Math.abs(b.y - targetY) < Math.abs(a.y - targetY) ? b : a
      );
      const dist = Math.abs(closest.y - targetY);

      if (dist < pw) {
        const nc = comboRef.current + 1;
        comboRef.current = nc;
        setCombo(nc); setMaxCombo(m => Math.max(m, nc));
        setScore(s => s + 100 * nc);
        addFeedback('PERFECT!', lane);
        sounds.perfect();
        triggerFlash('rgba(0,255,136,0.12)');
        statsRef.current.perfect++;
      } else if (dist < gw) {
        const nc = comboRef.current + 1;
        comboRef.current = nc;
        setCombo(nc); setMaxCombo(m => Math.max(m, nc));
        setScore(s => s + 50 * nc);
        addFeedback('GOOD', lane);
        sounds.good();
        statsRef.current.good++;
      } else if (dist < ow) {
        comboRef.current = 0; setCombo(0);
        setScore(s => s + 25);
        addFeedback('OK', lane);
        sounds.ok();
        statsRef.current.ok++;
      } else {
        comboRef.current = 0; setCombo(0);
        setHealth(h => Math.max(0, h - 5));
        addFeedback('MISS', lane);
        sounds.miss();
        statsRef.current.miss++;
      }
      setStats({ ...statsRef.current });

      // Combo milestones: 10x, 25x, 50x
      const nc = comboRef.current;
      if (nc > 0 && nc % 10 === 0 && nc > milestoneRef.current) {
        milestoneRef.current = nc;
        sounds.milestone(nc);
        triggerFlash('rgba(255,215,0,0.18)', 500);
      }

      return prev.map(n => n.id === closest.id ? { ...n, hit: true } : n);
    });
  }, [addFeedback, triggerFlash]);

  const gameLoop = useCallback(() => {
    const now = Date.now();
    const elapsed = now - startTimeRef.current;
    const diff = difficultyRef.current;

    const spawnInterval = Math.max(350, 800 - diff * 50);
    if (now - lastSpawnRef.current > spawnInterval) {
      spawnNote();
      lastSpawnRef.current = now;
    }

    setNotes(prev => {
      const updated = prev.map(n => ({ ...n, y: n.y + NOTE_SPEED * (1 + diff * 0.1) }));
      return updated.filter(note => {
        if (note.y > 600 && !note.hit) {
          comboRef.current = 0;
          setCombo(0);
          setHealth(h => Math.max(0, h - 10));
          return false;
        }
        return note.y < 650;
      });
    });

    if (elapsed > 15000) {
      const preset = presetRef.current;
      const newDiff = Math.min(preset.maxDiff, preset.initialDiff + ((elapsed - 15000) / 30000) * (preset.maxDiff - preset.initialDiff));
      if (Math.abs(newDiff - difficultyRef.current) > 0.05) {
        difficultyRef.current = newDiff;
        setDifficulty(newDiff);
      }
    }
  }, [spawnNote]);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    startTimeRef.current = Date.now();
    lastSpawnRef.current = Date.now();

    const loop = () => {
      if (gameStateRef.current !== 'playing') return;
      gameLoop();
      gameLoopRef.current = requestAnimationFrame(loop);
    };
    gameLoopRef.current = requestAnimationFrame(loop);

    return () => { if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current); };
  }, [gameState, gameLoop]);

  useEffect(() => {
    if (health <= 0 && gameState === 'playing') {
      setGameState('gameover');
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      sounds.gameover();
      window.dispatchEvent(new CustomEvent('dan:game-score', {
        detail: { score, gameId: 'rhythm-dash', isHighScore: true }
      }));
    }
  }, [health, gameState, score]);

  const handleLanePress = useCallback((i) => {
    if (gameState !== 'playing') return;
    const key = KEYS[i];
    setPressedKeys(prev => ({ ...prev, [key]: true }));
    checkHit(i);
    setTimeout(() => setPressedKeys(prev => ({ ...prev, [key]: false })), 100);
  }, [gameState, checkHit]);

  useEffect(() => {
    const held = {};
    const onDown = (e) => {
      if (gameStateRef.current !== 'playing') return;
      const key = e.key.toLowerCase();
      const li = KEYS.indexOf(key);
      if (li !== -1 && !held[key]) {
        held[key] = true;
        setPressedKeys(prev => ({ ...prev, [key]: true }));
        checkHit(li);
      }
    };
    const onUp = (e) => {
      const key = e.key.toLowerCase();
      if (KEYS.includes(key)) { held[key] = false; setPressedKeys(prev => ({ ...prev, [key]: false })); }
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [checkHit]);

  const startGame = () => {
    const preset = DIFFICULTY_PRESETS[selectedPreset];
    presetRef.current = preset;
    difficultyRef.current = preset.initialDiff;
    comboRef.current = 0;
    milestoneRef.current = 0;
    noteIdRef.current = 0;
    patternIndexRef.current = 0;
    noteInPatternRef.current = 0;
    statsRef.current = { perfect: 0, good: 0, ok: 0, miss: 0 };
    setGameState('playing');
    setScore(0); setCombo(0); setMaxCombo(0); setNotes([]);
    setHealth(100); setDifficulty(preset.initialDiff);
    setStats({ perfect: 0, good: 0, ok: 0, miss: 0 });
    sounds.start();
  };

  const resetGame = () => {
    setGameState('menu');
    setScore(0); setCombo(0); setMaxCombo(0); setNotes([]);
    setHealth(100); setDifficulty(1);
  };

  // ── MENU ──────────────────────────────────────────────────────────────────
  if (gameState === 'menu') {
    return (
      <div style={{ width: '100%', maxWidth: 600, margin: '0 auto', padding: 20, textAlign: 'center', color: '#fff' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ background: 'linear-gradient(135deg,rgba(236,72,153,.1),rgba(0,229,255,.1))', borderRadius: 24, padding: 40, border: '1px solid rgba(236,72,153,.2)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎵</div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, background: 'linear-gradient(135deg,#ec4899,#00e5ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>
            RHYTHM DASH
          </h1>
          <p style={{ opacity: 0.6, marginBottom: 28, fontSize: '0.85rem' }}>
            Presiona <span style={{ color: '#ec4899', fontWeight: 'bold' }}>D F J K</span> al ritmo de las notas
          </p>

          {/* Difficulty selector */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 2 }}>Dificultad</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {Object.entries(DIFFICULTY_PRESETS).map(([key, p]) => (
                <button key={key} onClick={() => setSelectedPreset(key)}
                  style={{
                    padding: '10px 16px', borderRadius: 12, border: `2px solid ${selectedPreset === key ? p.color : 'rgba(255,255,255,0.15)'}`,
                    background: selectedPreset === key ? `${p.color}22` : 'transparent',
                    color: selectedPreset === key ? p.color : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.15s'
                  }}>
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'center', gap: 10 }}>
            {KEYS.map((k, i) => (
              <div key={i} style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.18)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 'bold', textTransform: 'uppercase' }}>{k}</div>
            ))}
          </div>

          <button onClick={startGame} style={{ background: 'linear-gradient(135deg,#ec4899,#00e5ff)', border: 'none', padding: '16px 48px', borderRadius: 16, fontSize: '1.2rem', fontWeight: 900, color: '#fff', cursor: 'pointer', textTransform: 'uppercase', boxShadow: '0 10px 30px rgba(236,72,153,.3)' }}>
            JUGAR
          </button>
        </motion.div>
      </div>
    );
  }

  // ── GAMEOVER ───────────────────────────────────────────────────────────────
  if (gameState === 'gameover') {
    const total = statsRef.current.perfect + statsRef.current.good + statsRef.current.ok + statsRef.current.miss;
    const accuracy = total > 0 ? Math.round(((statsRef.current.perfect + statsRef.current.good) / total) * 100) : 0;
    const preset = presetRef.current;

    return (
      <div style={{ width: '100%', maxWidth: 600, margin: '0 auto', padding: 20, textAlign: 'center', color: '#fff' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ background: 'linear-gradient(135deg,rgba(236,72,153,.1),rgba(0,229,255,.1))', borderRadius: 24, padding: 40, border: '1px solid rgba(236,72,153,.2)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎮</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 24 }}>GAME OVER</h2>

          <div style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: 6 }}>SCORE FINAL</div>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: '#00e5ff', marginBottom: 24 }}>{score.toLocaleString()}</div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 20 }}>
            {[
              { label: 'PERFECT', val: statsRef.current.perfect, color: '#00ff88' },
              { label: 'GOOD',    val: statsRef.current.good,    color: '#00e5ff' },
              { label: 'OK',      val: statsRef.current.ok,      color: '#ffd700' },
              { label: 'MISS',    val: statsRef.current.miss,    color: '#ff4444' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 6px' }}>
                <div style={{ fontSize: '0.6rem', opacity: 0.5, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>PRECISIÓN</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: accuracy >= 80 ? '#00ff88' : accuracy >= 50 ? '#ffd700' : '#ff4444' }}>{accuracy}%</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>MAX COMBO</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ec4899' }}>{maxCombo}x</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>DIFICULTAD</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: preset.color }}>{preset.label}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={startGame} style={{ background: 'linear-gradient(135deg,#ec4899,#00e5ff)', border: 'none', padding: '14px 40px', borderRadius: 14, fontSize: '1.1rem', fontWeight: 900, color: '#fff', cursor: 'pointer' }}>REPETIR</button>
            <button onClick={resetGame} style={{ background: 'rgba(255,255,255,.08)', border: '2px solid rgba(255,255,255,.18)', padding: '14px 24px', borderRadius: 14, fontSize: '1rem', fontWeight: 700, color: '#fff', cursor: 'pointer' }}>MENÚ</button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── PLAYING ────────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%', maxWidth: 600, height: 600, margin: '0 auto', position: 'relative', background: 'linear-gradient(180deg,rgba(0,0,0,.8),rgba(20,0,40,.9))', borderRadius: 24, overflow: 'hidden', border: '2px solid rgba(236,72,153,.3)' }}>

      {/* Combo milestone flash */}
      <AnimatePresence>
        {flashColor && (
          <motion.div key="flash" initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
            style={{ position: 'absolute', inset: 0, background: flashColor, zIndex: 20, pointerEvents: 'none', borderRadius: 24 }} />
        )}
      </AnimatePresence>

      {/* HUD */}
      <div style={{ position: 'absolute', top: 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', zIndex: 10, color: '#fff' }}>
        <div>
          <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>SCORE</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#00e5ff' }}>{score.toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>COMBO</div>
          <motion.div key={combo} animate={combo > 0 ? { scale: [1.3, 1] } : {}} transition={{ duration: 0.15 }}
            style={{ fontSize: '1.4rem', fontWeight: 'bold', color: combo >= 25 ? '#ffd700' : combo >= 10 ? '#ec4899' : '#fff' }}>
            {combo}x
          </motion.div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>HEALTH</div>
          <div style={{ width: 90, height: 8, background: 'rgba(255,255,255,.1)', borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
            <motion.div animate={{ width: `${health}%` }} transition={{ duration: 0.3 }}
              style={{ height: '100%', background: health > 50 ? '#00ff88' : health > 25 ? '#ffd700' : '#ff4444', borderRadius: 4 }} />
          </div>
        </div>
      </div>

      {/* Lanes */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
        {KEYS.map((key, i) => (
          <div key={i} style={{ flex: 1, borderRight: i < LANES - 1 ? '1px solid rgba(255,255,255,.08)' : 'none', position: 'relative', background: pressedKeys[key] ? 'rgba(236,72,153,.18)' : 'transparent', transition: 'background 0.08s' }}>
            {/* Hit zone */}
            <div style={{ position: 'absolute', bottom: 100, left: 2, right: 2, height: 80, background: 'rgba(0,229,255,.08)', border: '1px solid rgba(0,229,255,.25)', borderRadius: 8 }} />
            {/* Key button */}
            <button onClick={() => handleLanePress(i)}
              onTouchStart={(e) => { e.preventDefault(); handleLanePress(i); }}
              style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', fontSize: '1.3rem', fontWeight: 'bold', color: pressedKeys[key] ? '#ec4899' : 'rgba(255,255,255,.25)', textTransform: 'uppercase', background: pressedKeys[key] ? 'rgba(236,72,153,.25)' : 'rgba(255,255,255,.07)', border: '2px solid rgba(255,255,255,.15)', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', transition: 'all 0.08s' }}>
              {key}
            </button>
          </div>
        ))}
      </div>

      {/* Notes */}
      <AnimatePresence>
        {notes.map(note => (
          <motion.div key={note.id} initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 0 }}
            style={{ position: 'absolute', left: `${(note.lane / LANES) * 100 + 5}%`, top: note.y, width: `${(1 / LANES) * 100 - 10}%`, height: 38, background: note.hit ? 'rgba(0,255,136,.75)' : 'linear-gradient(135deg,#ec4899,#00e5ff)', borderRadius: 8, boxShadow: note.hit ? '0 0 12px rgba(0,255,136,.5)' : '0 4px 14px rgba(236,72,153,.45)', transition: 'background 0.08s' }} />
        ))}
      </AnimatePresence>

      {/* Feedback */}
      <AnimatePresence>
        {feedback.map(f => (
          <motion.div key={f.id} initial={{ opacity: 1, y: 0, scale: 1 }} animate={{ opacity: 0, y: -60, scale: 1.2 }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }}
            style={{ position: 'absolute', left: `${(f.lane / LANES) * 100 + 10}%`, top: 400, fontSize: '1.1rem', fontWeight: 900, pointerEvents: 'none', textShadow: '0 0 12px currentColor',
              color: f.text === 'PERFECT!' ? '#00ff88' : f.text === 'GOOD' ? '#00e5ff' : f.text === 'OK' ? '#ffd700' : '#ff4444' }}>
            {f.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
