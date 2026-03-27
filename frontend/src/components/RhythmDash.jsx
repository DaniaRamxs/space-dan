import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LANES = 4;
const KEYS  = ['d', 'f', 'j', 'k'];
const LANE_COLORS = ['#ec4899', '#a78bfa', '#00e5ff', '#00ff88'];
const NOTE_SPEED     = 3;
const PERFECT_WINDOW = 60;
const GOOD_WINDOW    = 130;
const OK_WINDOW      = 200;

// Hit zone is at 77% of container height (center)
const HIT_FRAC = 0.77;
// Buttons occupy the bottom 22% of the container
const BTN_FRAC = 0.22;

const PATTERNS = [
  [0,1,2,3,0,2,1,3,0,1,3,2],
  [0,0,1,1,2,2,3,3,0,2,1,3],
  [3,2,1,0,3,1,2,0,3,2,0,1],
  [0,1,0,2,1,3,2,0,3,1,2,3],
];

const DIFFICULTY_PRESETS = {
  easy:   { label:'FÁCIL',   emoji:'🌟', initialDiff:0.5, maxDiff:3, hitMult:1.5,  color:'#00ff88' },
  normal: { label:'NORMAL',  emoji:'⚡', initialDiff:1,   maxDiff:5, hitMult:1,    color:'#00e5ff' },
  hard:   { label:'DIFÍCIL', emoji:'💀', initialDiff:2,   maxDiff:7, hitMult:0.65, color:'#ff4444' },
};

// ── Audio ─────────────────────────────────────────────────────────────────────
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
  perfect:   () => { tone(880, 0.12, 'sine', 0.35); setTimeout(() => tone(1320, 0.1, 'sine', 0.2), 55); },
  good:      () => tone(660, 0.1, 'sine', 0.28),
  ok:        () => tone(440, 0.1, 'triangle', 0.22),
  miss:      () => tone(120, 0.18, 'sawtooth', 0.25),
  milestone: (c) => {
    const seq = c >= 25 ? [523,659,784,1047,1319] : [392,523,659,784];
    seq.forEach((f,i) => setTimeout(() => tone(f, 0.18, 'sine', 0.22), i * 65));
  },
  gameover:  () => [440,370,311,261].forEach((f,i) => setTimeout(() => tone(f, 0.28, 'sine', 0.25), i * 140)),
  start:     () => [261,329,392,523].forEach((f,i) => setTimeout(() => tone(f, 0.12, 'sine', 0.2), i * 60)),
};
// ─────────────────────────────────────────────────────────────────────────────

export default function RhythmDash() {
  const [gameState, setGameState]           = useState('menu');
  const [selectedPreset, setSelectedPreset] = useState('normal');
  const [score, setScore]                   = useState(0);
  const [combo, setCombo]                   = useState(0);
  const [maxCombo, setMaxCombo]             = useState(0);
  const [notes, setNotes]                   = useState([]);
  const [pressedKeys, setPressedKeys]       = useState({});
  const [feedback, setFeedback]             = useState([]);
  const [health, setHealth]                 = useState(100);
  const [difficulty, setDifficulty]         = useState(1);
  const [flashColor, setFlashColor]         = useState(null);
  const [stats, setStats]                   = useState({ perfect:0, good:0, ok:0, miss:0 });
  // Container dimensions — updated by ResizeObserver
  const [containerSize, setContainerSize]   = useState({ w: 360, h: 600 });

  const containerRef       = useRef(null);
  const containerSizeRef   = useRef({ w: 360, h: 600 });
  const gameLoopRef        = useRef(null);
  const noteIdRef          = useRef(0);
  const lastSpawnRef       = useRef(0);
  const startTimeRef       = useRef(0);
  const patternIndexRef    = useRef(0);
  const noteInPatternRef   = useRef(0);
  const difficultyRef      = useRef(1);
  const comboRef           = useRef(0);
  const gameStateRef       = useRef('menu');
  const presetRef          = useRef(DIFFICULTY_PRESETS.normal);
  const milestoneRef       = useRef(0);
  const statsRef           = useRef({ perfect:0, good:0, ok:0, miss:0 });
  const notesRef           = useRef([]);

  // Track container size responsively
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.offsetWidth  || 360;
      const h = el.offsetHeight || 600;
      containerSizeRef.current = { w, h };
      setContainerSize({ w, h });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
    const note = { id: noteIdRef.current++, lane, y: -50, hit: false };
    notesRef.current = [...notesRef.current, note];
    setNotes(notesRef.current);
  }, []);

  // checkHit reads containerSizeRef for dynamic TARGET_Y
  const checkHit = useCallback((lane) => {
    const preset   = presetRef.current;
    const ch       = containerSizeRef.current.h;
    const targetY  = ch * HIT_FRAC;
    const pw = PERFECT_WINDOW * preset.hitMult;
    const gw = GOOD_WINDOW   * preset.hitMult;
    const ow = OK_WINDOW     * preset.hitMult;

    const inLane = notesRef.current.filter(n => n.lane === lane && !n.hit);

    if (inLane.length === 0) {
      comboRef.current = 0; setCombo(0);
      setHealth(h => Math.max(0, h - 5));
      addFeedback('MISS', lane); sounds.miss();
      statsRef.current.miss++;
      setStats({ ...statsRef.current });
      return;
    }

    const closest = inLane.reduce((a, b) =>
      Math.abs(b.y - targetY) < Math.abs(a.y - targetY) ? b : a
    );
    const dist = Math.abs(closest.y - targetY);

    if (dist >= ow) {
      comboRef.current = 0; setCombo(0);
      setHealth(h => Math.max(0, h - 5));
      addFeedback('MISS', lane); sounds.miss();
      statsRef.current.miss++;
      setStats({ ...statsRef.current });
      return;
    }

    notesRef.current = notesRef.current.map(n => n.id === closest.id ? { ...n, hit: true } : n);
    setNotes([...notesRef.current]);

    if (dist < pw) {
      const nc = comboRef.current + 1;
      comboRef.current = nc;
      setCombo(nc); setMaxCombo(m => Math.max(m, nc));
      setScore(s => s + 100 * nc);
      addFeedback('PERFECT!', lane); sounds.perfect();
      triggerFlash('rgba(0,255,136,0.12)');
      statsRef.current.perfect++;
    } else if (dist < gw) {
      const nc = comboRef.current + 1;
      comboRef.current = nc;
      setCombo(nc); setMaxCombo(m => Math.max(m, nc));
      setScore(s => s + 50 * nc);
      addFeedback('GOOD', lane); sounds.good();
      statsRef.current.good++;
    } else {
      comboRef.current = 0; setCombo(0);
      setScore(s => s + 25);
      addFeedback('OK', lane); sounds.ok();
      statsRef.current.ok++;
    }
    setStats({ ...statsRef.current });

    const nc = comboRef.current;
    if (nc > 0 && nc % 10 === 0 && nc > milestoneRef.current) {
      milestoneRef.current = nc;
      sounds.milestone(nc);
      triggerFlash('rgba(255,215,0,0.18)', 500);
    }
  }, [addFeedback, triggerFlash]);

  const gameLoop = useCallback(() => {
    const now     = Date.now();
    const elapsed = now - startTimeRef.current;
    const diff    = difficultyRef.current;
    const ch      = containerSizeRef.current.h;
    // Scale speed to container height so timing feels consistent across screen sizes
    const speed   = NOTE_SPEED * (ch / 600) * (1 + diff * 0.1);

    const spawnInterval = Math.max(350, 800 - diff * 50);
    if (now - lastSpawnRef.current > spawnInterval) {
      spawnNote();
      lastSpawnRef.current = now;
    }

    let missed = 0;
    const moved    = notesRef.current.map(n => ({ ...n, y: n.y + speed }));
    const filtered = moved.filter(note => {
      if (note.y > ch + 50 && !note.hit) { missed++; return false; }
      return note.y < ch + 100;
    });
    notesRef.current = filtered;
    setNotes([...filtered]);

    if (missed > 0) {
      comboRef.current = 0;
      setCombo(0);
      setHealth(h => Math.max(0, h - 10 * missed));
    }

    if (elapsed > 15000) {
      const preset = presetRef.current;
      const newDiff = Math.min(preset.maxDiff, preset.initialDiff + ((elapsed - 15000) / 30000) * (preset.maxDiff - preset.initialDiff));
      if (Math.abs(newDiff - difficultyRef.current) > 0.05) {
        difficultyRef.current = newDiff;
        setDifficulty(newDiff);
      }
    }
  }, [spawnNote]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    startTimeRef.current  = Date.now();
    lastSpawnRef.current  = Date.now();

    let running = true;
    const loop = () => {
      if (!running) return;
      gameLoop();
      gameLoopRef.current = requestAnimationFrame(loop);
    };
    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, gameLoop]);

  useEffect(() => {
    if (health <= 0 && gameState === 'playing') {
      gameStateRef.current = 'gameover';
      setGameState('gameover');
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      sounds.gameover();
      window.dispatchEvent(new CustomEvent('dan:game-score', {
        detail: { score, gameId: 'rhythm-dash', isHighScore: true }
      }));
    }
  }, [health, gameState, score]);

  const handleLanePress = useCallback((i) => {
    if (gameStateRef.current !== 'playing') return;
    const key = KEYS[i];
    setPressedKeys(prev => ({ ...prev, [key]: true }));
    checkHit(i);
    setTimeout(() => setPressedKeys(prev => ({ ...prev, [key]: false })), 100);
  }, [checkHit]);

  useEffect(() => {
    const held = {};
    const onDown = (e) => {
      if (gameStateRef.current !== 'playing') return;
      const key = e.key.toLowerCase();
      const li  = KEYS.indexOf(key);
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
    window.addEventListener('keyup',   onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [checkHit]);

  const startGame = () => {
    const preset = DIFFICULTY_PRESETS[selectedPreset];
    presetRef.current        = preset;
    difficultyRef.current    = preset.initialDiff;
    comboRef.current         = 0;
    milestoneRef.current     = 0;
    noteIdRef.current        = 0;
    patternIndexRef.current  = 0;
    noteInPatternRef.current = 0;
    statsRef.current         = { perfect:0, good:0, ok:0, miss:0 };
    notesRef.current         = [];
    gameStateRef.current     = 'playing';
    setGameState('playing');
    setScore(0); setCombo(0); setMaxCombo(0); setNotes([]);
    setHealth(100); setDifficulty(preset.initialDiff);
    setStats({ perfect:0, good:0, ok:0, miss:0 });
    sounds.start();
  };

  const resetGame = () => {
    gameStateRef.current = 'menu';
    setGameState('menu');
    setScore(0); setCombo(0); setMaxCombo(0); setNotes([]);
    setHealth(100); setDifficulty(1); notesRef.current = [];
  };

  // ── Computed layout (always needed so containerSize is always tracked) ──────
  const { w: CW, h: CH } = containerSize;
  const hitZoneH   = Math.max(60, CH * 0.10);
  const hitZoneTop = CH * HIT_FRAC - hitZoneH / 2;
  const btnH       = Math.max(70, CH * BTN_FRAC);
  const laneW      = CW / LANES;

  // Gameover stats (computed here so we don't repeat in JSX)
  const s          = statsRef.current;
  const total      = s.perfect + s.good + s.ok + s.miss;
  const accuracy   = total > 0 ? Math.round(((s.perfect + s.good) / total) * 100) : 0;

  return (
    <div ref={containerRef}
      style={{ width:'100%', height:'100%', position:'relative', overflow:'hidden',
        background:'linear-gradient(180deg,rgba(0,0,0,.9),rgba(20,0,40,.98))',
        borderRadius:16, border:'2px solid rgba(236,72,153,.3)',
        minHeight:400, userSelect:'none' }}>

      {/* ── MENU ────────────────────────────────────────────────────────────── */}
      {gameState === 'menu' && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', padding:20, color:'#fff' }}>
          <div style={{ width:'100%', maxWidth:500, textAlign:'center' }}>
            <motion.div initial={{ scale:0.8, opacity:0 }} animate={{ scale:1, opacity:1 }}
              style={{ background:'linear-gradient(135deg,rgba(236,72,153,.1),rgba(0,229,255,.1))', borderRadius:24, padding:'32px 24px', border:'1px solid rgba(236,72,153,.2)' }}>
              <div style={{ fontSize:'3rem', marginBottom:12 }}>🎵</div>
              <h1 style={{ fontSize:'clamp(1.8rem,6vw,2.5rem)', fontWeight:900, background:'linear-gradient(135deg,#ec4899,#00e5ff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:8 }}>
                RHYTHM DASH
              </h1>
              <p style={{ opacity:0.6, marginBottom:24, fontSize:'0.85rem' }}>
                Toca cada carril al ritmo de las notas
              </p>
              <div style={{ marginBottom:28 }}>
                <div style={{ fontSize:'0.7rem', opacity:0.5, marginBottom:10, textTransform:'uppercase', letterSpacing:2 }}>Dificultad</div>
                <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                  {Object.entries(DIFFICULTY_PRESETS).map(([key, p]) => (
                    <button key={key} onClick={() => setSelectedPreset(key)}
                      style={{ padding:'12px 18px', borderRadius:12, border:`2px solid ${selectedPreset === key ? p.color : 'rgba(255,255,255,0.15)'}`, background:selectedPreset === key ? `${p.color}22` : 'transparent', color:selectedPreset === key ? p.color : 'rgba(255,255,255,0.5)', cursor:'pointer', fontWeight:700, fontSize:'0.9rem', transition:'all 0.15s', touchAction:'manipulation' }}>
                      {p.emoji} {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom:28, display:'flex', justifyContent:'center', gap:8 }}>
                {LANE_COLORS.map((c, i) => (
                  <div key={i} style={{ width:60, height:60, background:`${c}22`, border:`2px solid ${c}66`, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:2 }}>
                    <div style={{ width:20, height:20, borderRadius:'50%', background:c, opacity:0.85 }} />
                    <span style={{ fontSize:'0.65rem', color:c, fontWeight:700, opacity:0.7 }}>{KEYS[i].toUpperCase()}</span>
                  </div>
                ))}
              </div>
              <button onClick={startGame}
                style={{ background:'linear-gradient(135deg,#ec4899,#00e5ff)', border:'none', padding:'18px 52px', borderRadius:16, fontSize:'1.2rem', fontWeight:900, color:'#fff', cursor:'pointer', textTransform:'uppercase', boxShadow:'0 10px 30px rgba(236,72,153,.3)', touchAction:'manipulation' }}>
                JUGAR
              </button>
            </motion.div>
          </div>
        </div>
      )}

      {/* ── GAMEOVER ────────────────────────────────────────────────────────── */}
      {gameState === 'gameover' && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', padding:20, color:'#fff' }}>
          <div style={{ width:'100%', maxWidth:500, textAlign:'center' }}>
            <motion.div initial={{ scale:0.8, opacity:0 }} animate={{ scale:1, opacity:1 }}
              style={{ background:'linear-gradient(135deg,rgba(236,72,153,.1),rgba(0,229,255,.1))', borderRadius:24, padding:'32px 20px', border:'1px solid rgba(236,72,153,.2)' }}>
              <div style={{ fontSize:'3rem', marginBottom:12 }}>🎮</div>
              <h2 style={{ fontSize:'2rem', fontWeight:900, marginBottom:16 }}>GAME OVER</h2>
              <div style={{ fontSize:'0.7rem', opacity:0.5, marginBottom:4 }}>SCORE FINAL</div>
              <div style={{ fontSize:'3rem', fontWeight:900, color:'#00e5ff', marginBottom:20 }}>{score.toLocaleString()}</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:20 }}>
                {[
                  { label:'PERFECT', val:s.perfect, color:'#00ff88' },
                  { label:'GOOD',    val:s.good,    color:'#00e5ff' },
                  { label:'OK',      val:s.ok,      color:'#ffd700' },
                  { label:'MISS',    val:s.miss,    color:'#ff4444' },
                ].map(x => (
                  <div key={x.label} style={{ background:'rgba(255,255,255,0.05)', borderRadius:10, padding:'10px 4px' }}>
                    <div style={{ fontSize:'0.5rem', opacity:0.5, marginBottom:4 }}>{x.label}</div>
                    <div style={{ fontSize:'1.3rem', fontWeight:'bold', color:x.color }}>{x.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap', marginBottom:24 }}>
                <div>
                  <div style={{ fontSize:'0.65rem', opacity:0.5 }}>PRECISIÓN</div>
                  <div style={{ fontSize:'1.4rem', fontWeight:'bold', color:accuracy >= 80 ? '#00ff88' : accuracy >= 50 ? '#ffd700' : '#ff4444' }}>{accuracy}%</div>
                </div>
                <div>
                  <div style={{ fontSize:'0.65rem', opacity:0.5 }}>MAX COMBO</div>
                  <div style={{ fontSize:'1.4rem', fontWeight:'bold', color:'#ec4899' }}>{maxCombo}x</div>
                </div>
                <div>
                  <div style={{ fontSize:'0.65rem', opacity:0.5 }}>DIFICULTAD</div>
                  <div style={{ fontSize:'1.4rem', fontWeight:'bold', color:presetRef.current.color }}>{presetRef.current.label}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
                <button onClick={startGame}
                  style={{ background:'linear-gradient(135deg,#ec4899,#00e5ff)', border:'none', padding:'14px 40px', borderRadius:14, fontSize:'1.1rem', fontWeight:900, color:'#fff', cursor:'pointer', touchAction:'manipulation' }}>REPETIR</button>
                <button onClick={resetGame}
                  style={{ background:'rgba(255,255,255,.08)', border:'2px solid rgba(255,255,255,.18)', padding:'14px 24px', borderRadius:14, fontSize:'1rem', fontWeight:700, color:'#fff', cursor:'pointer', touchAction:'manipulation' }}>MENÚ</button>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* ── PLAYING ─────────────────────────────────────────────────────────── */}
      {gameState === 'playing' && (<>

      {/* Milestone flash */}
      <AnimatePresence>
        {flashColor && (
          <motion.div key="flash" initial={{ opacity:1 }} animate={{ opacity:0 }} transition={{ duration:0.5 }}
            style={{ position:'absolute', inset:0, background:flashColor, zIndex:20, pointerEvents:'none' }} />
        )}
      </AnimatePresence>

      {/* HUD */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, zIndex:10, color:'#fff',
        padding:'10px 16px 14px',
        background:'linear-gradient(180deg,rgba(0,0,0,.85) 0%,rgba(0,0,0,.4) 70%,transparent 100%)',
        display:'flex', flexDirection:'column', gap:8,
      }}>
        {/* Top row: score | combo | difficulty */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          {/* Score */}
          <div style={{ display:'flex', flexDirection:'column' }}>
            <span style={{ fontSize:'0.55rem', fontWeight:700, letterSpacing:'0.15em', opacity:0.45, textTransform:'uppercase' }}>Score</span>
            <span style={{ fontSize:'clamp(1.1rem,3vw,1.5rem)', fontWeight:900, color:'#00e5ff', lineHeight:1, textShadow:'0 0 16px #00e5ff88' }}>
              {score.toLocaleString()}
            </span>
          </div>

          {/* Combo — center, bigger */}
          <div style={{ textAlign:'center' }}>
            <span style={{ fontSize:'0.55rem', fontWeight:700, letterSpacing:'0.15em', opacity:0.45, textTransform:'uppercase', display:'block' }}>Combo</span>
            <motion.span key={combo}
              animate={combo > 0 ? { scale:[1.4,1] } : {}}
              transition={{ duration:0.18 }}
              style={{
                display:'block',
                fontSize:'clamp(1.3rem,4vw,2rem)', fontWeight:900, lineHeight:1,
                color: combo >= 25 ? '#ffd700' : combo >= 10 ? '#ec4899' : '#fff',
                textShadow: combo >= 10 ? `0 0 20px ${combo >= 25 ? '#ffd700' : '#ec4899'}` : 'none',
              }}>
              {combo > 0 ? `${combo}×` : '—'}
            </motion.span>
          </div>

          {/* Difficulty badge */}
          <div style={{ textAlign:'right' }}>
            <span style={{ fontSize:'0.55rem', fontWeight:700, letterSpacing:'0.15em', opacity:0.45, textTransform:'uppercase', display:'block' }}>Nivel</span>
            <span style={{ fontSize:'0.8rem', fontWeight:900, color: presetRef.current.color, textShadow:`0 0 10px ${presetRef.current.color}88` }}>
              {presetRef.current.emoji} {presetRef.current.label}
            </span>
          </div>
        </div>

        {/* HP bar — full width */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:'0.5rem', fontWeight:700, letterSpacing:'0.12em', opacity:0.5, textTransform:'uppercase', whiteSpace:'nowrap' }}>HP</span>
          <div style={{ flex:1, height:6, background:'rgba(255,255,255,.1)', borderRadius:99, overflow:'hidden', boxShadow:'inset 0 1px 3px rgba(0,0,0,.4)' }}>
            <motion.div
              animate={{ width:`${health}%` }}
              transition={{ duration:0.3 }}
              style={{
                height:'100%', borderRadius:99,
                background: health > 60
                  ? 'linear-gradient(90deg,#00c97a,#00ff88)'
                  : health > 30
                  ? 'linear-gradient(90deg,#e6a800,#ffd700)'
                  : 'linear-gradient(90deg,#cc2200,#ff4444)',
                boxShadow: health > 60 ? '0 0 8px #00ff8877' : health > 30 ? '0 0 8px #ffd70077' : '0 0 8px #ff444477',
              }} />
          </div>
          <span style={{ fontSize:'0.65rem', fontWeight:700, color: health > 60 ? '#00ff88' : health > 30 ? '#ffd700' : '#ff4444', minWidth:26, textAlign:'right' }}>
            {health}
          </span>
        </div>
      </div>

      {/* Lane dividers */}
      {[1,2,3].map(i => (
        <div key={i} style={{ position:'absolute', top:0, bottom:0, left:`${(i / LANES) * 100}%`, width:1, background:'rgba(255,255,255,.07)', zIndex:1 }} />
      ))}

      {/* Hit zone */}
      <div style={{ position:'absolute', top:hitZoneTop, left:4, right:4, height:hitZoneH, background:'rgba(0,229,255,.06)', border:'1px solid rgba(0,229,255,.2)', borderRadius:8, zIndex:2, pointerEvents:'none' }} />

      {/* Notes */}
      <AnimatePresence>
        {notes.map(note => {
          const color = LANE_COLORS[note.lane];
          return (
            <motion.div key={note.id} initial={{ opacity:1 }} exit={{ opacity:0, scale:0 }}
              style={{
                position:'absolute',
                left: note.lane * laneW + laneW * 0.08,
                top:  note.y,
                width: laneW * 0.84,
                height: Math.max(28, CH * 0.055),
                background: note.hit
                  ? 'rgba(0,255,136,.8)'
                  : `linear-gradient(135deg, ${color}, ${color}aa)`,
                borderRadius: 8,
                boxShadow: note.hit
                  ? '0 0 12px rgba(0,255,136,.6)'
                  : `0 4px 14px ${color}55`,
                zIndex: 5,
                transition:'background 0.06s',
              }} />
          );
        })}
      </AnimatePresence>

      {/* Feedback text */}
      <AnimatePresence>
        {feedback.map(f => (
          <motion.div key={f.id}
            initial={{ opacity:1, y:0, scale:1 }}
            animate={{ opacity:0, y:-50, scale:1.2 }}
            transition={{ duration:0.85 }}
            style={{
              position:'absolute',
              left: f.lane * laneW + laneW * 0.05,
              top: hitZoneTop - 30,
              width: laneW * 0.9,
              textAlign:'center',
              fontSize:'clamp(0.75rem,3vw,1rem)',
              fontWeight:900,
              pointerEvents:'none',
              zIndex:15,
              color: f.text === 'PERFECT!' ? '#00ff88' : f.text === 'GOOD' ? '#00e5ff' : f.text === 'OK' ? '#ffd700' : '#ff4444',
              textShadow:`0 0 10px currentColor`,
            }}>
            {f.text}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Tap buttons — bottom BTN_FRAC of container */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0, height:btnH,
        display:'flex', zIndex:10, gap:4, padding:'4px 4px 8px',
        background:'linear-gradient(0deg,rgba(0,0,0,.7) 0%,transparent 100%)',
      }}>
        {LANE_COLORS.map((color, i) => {
          const pressed = pressedKeys[KEYS[i]];
          return (
            <button key={i}
              onPointerDown={e => { e.preventDefault(); handleLanePress(i); }}
              style={{
                flex:1, height:'100%',
                background: pressed ? `${color}33` : `${color}0d`,
                border: `1.5px solid ${pressed ? color : `${color}33`}`,
                borderRadius:14,
                cursor:'pointer', touchAction:'manipulation',
                WebkitTapHighlightColor:'transparent',
                transition:'background 0.08s, border-color 0.08s, box-shadow 0.08s',
                boxShadow: pressed ? `0 0 18px ${color}66, inset 0 0 12px ${color}22` : 'none',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6,
              }}>
              <div style={{
                width: Math.max(14, btnH * 0.22), height: Math.max(14, btnH * 0.22),
                borderRadius:'50%',
                background: pressed ? color : `${color}55`,
                boxShadow: pressed ? `0 0 14px ${color}, 0 0 28px ${color}66` : `0 0 6px ${color}44`,
                transition:'all 0.08s',
              }} />
              <span style={{
                fontSize:'clamp(0.6rem,2vw,0.8rem)', fontWeight:900,
                letterSpacing:'0.08em', textTransform:'uppercase',
                color: pressed ? color : `${color}66`,
                textShadow: pressed ? `0 0 8px ${color}` : 'none',
                transition:'color 0.08s',
              }}>
                {KEYS[i]}
              </span>
            </button>
          );
        })}
      </div>
      </>)}
    </div>
  );
}
