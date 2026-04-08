/**
 * useGameAudio
 * Hook reutilizable para efectos de sonido y música de fondo en juegos.
 * Usa la Web Audio API para generar todo por síntesis — sin archivos externos.
 *
 * Uso:
 *   const audio = useGameAudio('tetris');
 *   audio.playBgm();   // inicia música de fondo en loop
 *   audio.stopBgm();   // detiene música
 *   audio.sfx.drop();  // efecto de pieza colocada
 *   audio.sfx.clear(); // efecto de línea borrada
 *   audio.sfx.move();  // efecto de movimiento
 *   audio.sfx.rotate();
 *   audio.sfx.win();
 *   audio.sfx.lose();
 *   audio.sfx.place(); // ficha colocada (Connect4 / genérico)
 *   audio.sfx.eat();   // comer (Snake)
 *   audio.sfx.die();   // muerte
 *   audio.volume       // getter 0–1
 *   audio.setVolume(v) // setter
 *   audio.muted        // getter bool
 *   audio.toggleMute()
 */

import { useRef, useCallback, useState, useEffect } from 'react';

// ─── Melodía Korobeiniki (Tetris Theme A) — notas en Hz ──────────────────────
// Basado en la versión GameBoy clásica (nota, duración_en_sixteenths)
const TETRIS_MELODY = [
  // Frase A
  [659.26, 4], [493.88, 2], [523.25, 2], [587.33, 4], [523.25, 2], [493.88, 2],
  [440.00, 4], [440.00, 2], [523.25, 2], [659.26, 4], [587.33, 2], [523.25, 2],
  [493.88, 6], [523.25, 2], [659.26, 4], [587.33, 2], [523.25, 2],
  [440.00, 4], [440.00, 2], [440.00, 2], [523.25, 2], [587.33, 2],
  // Frase B
  [587.33, 4], [698.46, 2], [880.00, 4], [783.99, 2], [698.46, 2],
  [659.26, 6], [523.25, 2], [659.26, 4], [587.33, 2], [523.25, 2],
  [493.88, 4], [493.88, 2], [523.25, 2], [587.33, 4], [659.26, 4],
  [523.25, 4], [440.00, 4], [440.00, 4], [0, 4],
  // Frase A (repeat)
  [587.33, 2], [698.46, 2], [880.00, 4], [783.99, 2], [698.46, 2],
  [659.26, 6], [523.25, 2], [659.26, 4], [587.33, 2], [523.25, 2],
  [440.00, 4], [440.00, 2], [523.25, 2], [587.33, 4], [659.26, 4],
  [523.25, 4], [440.00, 4],
];

// ─── Melodía Snake (chiptune simple basada en "Snake" arcade) ─────────────────
const SNAKE_MELODY = [
  [330, 2],[392, 2],[494, 4],[440, 2],[392, 2],[330, 4],
  [294, 2],[330, 2],[392, 2],[440, 4],[494, 2],[440, 2],
  [392, 4],[330, 2],[294, 4],[0, 2],
  [294, 2],[330, 2],[392, 2],[440, 4],[494, 2],[523, 4],
  [494, 2],[440, 2],[392, 4],[330, 4],[294, 4],[0, 4],
];

// ─── Melodía Connect4 (jingle arcade festivo) ────────────────────────────────
const CONNECT4_MELODY = [
  [523, 2],[587, 2],[659, 2],[698, 2],[784, 4],[698, 2],[659, 4],
  [587, 2],[523, 2],[494, 2],[440, 4],[523, 4],[587, 4],[0, 4],
  [440, 2],[494, 2],[523, 2],[587, 4],[659, 2],[698, 4],
  [784, 2],[698, 2],[659, 4],[587, 4],[523, 4],[0, 4],
];

// ─── Melodía Asteroids (electrónica espacial) ─────────────────────────────────
const ASTEROID_MELODY = [
  [110, 2],[138, 2],[165, 2],[0, 2],[110, 2],[0, 2],[165, 4],[0, 2],
  [138, 2],[0, 2],[184, 2],[0, 2],[138, 2],[0, 2],[220, 4],[0, 2],
  [165, 2],[0, 2],[196, 2],[0, 2],[220, 4],[0, 2],[196, 2],[165, 4],
  [0, 4],[110, 2],[138, 4],[110, 2],[0, 4],
];

const MELODIES = {
  tetris:   TETRIS_MELODY,
  snake:    SNAKE_MELODY,
  connect4: CONNECT4_MELODY,
  asteroids: ASTEROID_MELODY,
};

const TEMPO_BPM = {
  tetris:    160,
  snake:     140,
  connect4:  150,
  asteroids: 120,
};

// ─── Helpers de síntesis ─────────────────────────────────────────────────────
function createOscillator(ctx, freq, type, startTime, duration, gainVal = 0.15, detune = 0) {
  if (!ctx || freq === 0) return null;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type    = type;
  osc.frequency.setValueAtTime(freq, startTime);
  osc.detune.setValueAtTime(detune, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration - 0.01);
  osc.start(startTime);
  osc.stop(startTime + duration);
  return osc;
}

function playSfxBurst(ctx, masterGain, notes, type = 'square') {
  if (!ctx) return;
  let t = ctx.currentTime + 0.01;
  notes.forEach(([freq, dur]) => {
    createOscillator(ctx, freq, type, t, dur, 0.12 * masterGain.gain.value);
    t += dur;
  });
}

// ─── Hook principal ───────────────────────────────────────────────────────────
export function useGameAudio(game = 'tetris') {
  const ctxRef        = useRef(null);
  const masterRef     = useRef(null);
  const bgmTimeoutRef = useRef(null);
  const noteIndexRef  = useRef(0);
  const playingRef    = useRef(false);

  const [muted, setMuted]   = useState(false);
  const [volume, setVolVol] = useState(0.4);

  // Crear AudioContext la primera vez que el usuario interactúa
  const ensureCtx = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    const ctx    = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.setValueAtTime(volume, ctx.currentTime);
    master.connect(ctx.destination);
    ctxRef.current  = ctx;
    masterRef.current = master;
    return ctx;
  }, []);

  // Reanudar contexto si fue suspendido por política del navegador
  const resumeCtx = useCallback(async () => {
    const ctx = ensureCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    return ctx;
  }, [ensureCtx]);

  // ── BGM scheduler ────────────────────────────────────────────────────────
  const scheduleBgmNote = useCallback(() => {
    if (!playingRef.current) return;
    const ctx    = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;

    const melody  = MELODIES[game] || TETRIS_MELODY;
    const bpm     = TEMPO_BPM[game] || 160;
    const secPer16 = 60 / bpm / 4; // duración de una semicorchea

    const [freq, dur16] = melody[noteIndexRef.current];
    const duration = dur16 * secPer16;

    if (freq > 0) {
      // Voz principal — square (chiptune)
      createOscillator(ctx, freq, 'square', ctx.currentTime, duration * 0.9,
        0.10 * master.gain.value);
      // Armónico superior (octava) más suave
      createOscillator(ctx, freq * 2, 'triangle', ctx.currentTime, duration * 0.9,
        0.04 * master.gain.value);
    }

    noteIndexRef.current = (noteIndexRef.current + 1) % melody.length;
    bgmTimeoutRef.current = setTimeout(scheduleBgmNote, duration * 1000);
  }, [game]);

  const playBgm = useCallback(async () => {
    await resumeCtx();
    if (playingRef.current) return;
    playingRef.current    = true;
    noteIndexRef.current  = 0;
    scheduleBgmNote();
  }, [resumeCtx, scheduleBgmNote]);

  const stopBgm = useCallback(() => {
    playingRef.current = false;
    clearTimeout(bgmTimeoutRef.current);
  }, []);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      stopBgm();
      ctxRef.current?.close();
    };
  }, [stopBgm]);

  // ── Volume / Mute ─────────────────────────────────────────────────────────
  const setVolume = useCallback((v) => {
    const clamp = Math.max(0, Math.min(1, v));
    setVolVol(clamp);
    if (masterRef.current && ctxRef.current) {
      masterRef.current.gain.setValueAtTime(clamp, ctxRef.current.currentTime);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted(m => {
      const next = !m;
      if (masterRef.current && ctxRef.current) {
        masterRef.current.gain.setValueAtTime(
          next ? 0 : volume,
          ctxRef.current.currentTime
        );
      }
      return next;
    });
  }, [volume]);

  // ── SFX ───────────────────────────────────────────────────────────────────
  const sfx = {
    // Pieza de Tetris colocada
    drop: useCallback(async () => {
      const ctx = await resumeCtx();
      const g   = masterRef.current?.gain.value ?? 1;
      playSfxBurst(ctx, masterRef.current, [[120, 0.03], [80, 0.05]], 'square');
    }, [resumeCtx]),

    // Línea borrada en Tetris
    clear: useCallback(async () => {
      const ctx = await resumeCtx();
      playSfxBurst(ctx, masterRef.current,
        [[523, 0.06], [659, 0.06], [784, 0.06], [1047, 0.12]], 'square');
    }, [resumeCtx]),

    // Mover pieza
    move: useCallback(async () => {
      const ctx = await resumeCtx();
      const t   = ctx.currentTime + 0.01;
      createOscillator(ctx, 220, 'square', t, 0.04, 0.06 * (masterRef.current?.gain.value ?? 1));
    }, [resumeCtx]),

    // Rotar pieza
    rotate: useCallback(async () => {
      const ctx = await resumeCtx();
      const t   = ctx.currentTime + 0.01;
      createOscillator(ctx, 440, 'square', t, 0.04, 0.07 * (masterRef.current?.gain.value ?? 1));
    }, [resumeCtx]),

    // Colocar ficha genérica (Connect4, etc.)
    place: useCallback(async () => {
      const ctx = await resumeCtx();
      const t   = ctx.currentTime + 0.01;
      createOscillator(ctx, 350, 'triangle', t, 0.08, 0.12 * (masterRef.current?.gain.value ?? 1));
    }, [resumeCtx]),

    // Comer (Snake)
    eat: useCallback(async () => {
      const ctx = await resumeCtx();
      playSfxBurst(ctx, masterRef.current,
        [[600, 0.03], [800, 0.05]], 'square');
    }, [resumeCtx]),

    // Muerte / Game Over intermedio
    die: useCallback(async () => {
      const ctx = await resumeCtx();
      playSfxBurst(ctx, masterRef.current,
        [[330, 0.08], [262, 0.08], [220, 0.08], [165, 0.2]], 'sawtooth');
    }, [resumeCtx]),

    // Disparar (Asteroids)
    shoot: useCallback(async () => {
      const ctx = await resumeCtx();
      const t   = ctx.currentTime + 0.01;
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.08);
      g.gain.setValueAtTime(0.08 * (masterRef.current?.gain.value ?? 1), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      osc.start(t); osc.stop(t + 0.12);
    }, [resumeCtx]),

    // Explosión (Asteroids)
    explode: useCallback(async () => {
      const ctx = await resumeCtx();
      const t   = ctx.currentTime + 0.01;
      // Ruido blanco aproximado con múltiples osciladores
      [80, 95, 107, 130, 160].forEach(f => {
        createOscillator(ctx, f, 'sawtooth', t, 0.15,
          0.05 * (masterRef.current?.gain.value ?? 1), (Math.random() - 0.5) * 50);
      });
    }, [resumeCtx]),

    // Victoria
    win: useCallback(async () => {
      const ctx = await resumeCtx();
      playSfxBurst(ctx, masterRef.current,
        [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.1], [1319, 0.3]], 'square');
    }, [resumeCtx]),

    // Derrota
    lose: useCallback(async () => {
      const ctx = await resumeCtx();
      playSfxBurst(ctx, masterRef.current,
        [[440, 0.12], [392, 0.12], [349, 0.12], [294, 0.25]], 'sawtooth');
    }, [resumeCtx]),
  };

  return { playBgm, stopBgm, sfx, volume, setVolume, muted, toggleMute };
}
