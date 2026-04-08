// WebAudioAmbience.js — native Web Audio API ambient sound generators
// No external dependencies. Works fully offline.
//
// Each factory function accepts an AudioContext and volume (0–1),
// wires up the nodes, and returns:
//   { stop(), setVolume(v) }
//
// Generators:
//   createRainAmbience    — white noise → lowpass/highpass (rain sound)
//   createForestAmbience  — wind (bandpass noise) + cricket LFO
//   createCityAmbience    — low sub-rumble noise (traffic/crowd feel)

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Creates a looping white-noise BufferSource. */
function makeNoise(ctx, durationSec = 3) {
  const size   = Math.ceil(ctx.sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data   = buffer.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop   = true;
  return src;
}

/** Soft gain ramp-in to avoid clicks on start. */
function rampIn(gainNode, targetValue, ctx) {
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(targetValue, ctx.currentTime + 0.8);
}

/** Smooth volume change. */
function smoothSet(gainNode, value, ctx) {
  gainNode.gain.setTargetAtTime(value, ctx.currentTime, 0.15);
}

// ── Rain ──────────────────────────────────────────────────────────────────────
// White noise → lowpass (soft) → highpass (cut rumble) → gain

export function createRainAmbience(ctx, volume = 0.3) {
  const noise  = makeNoise(ctx, 4);

  const lp = ctx.createBiquadFilter();
  lp.type            = 'lowpass';
  lp.frequency.value = 1400;
  lp.Q.value         = 0.25;

  const hp = ctx.createBiquadFilter();
  hp.type            = 'highpass';
  hp.frequency.value = 280;

  const gain = ctx.createGain();
  rampIn(gain, volume * 0.75, ctx);

  noise.connect(lp);
  lp.connect(hp);
  hp.connect(gain);
  gain.connect(ctx.destination);
  noise.start();

  return {
    stop()         { try { noise.stop(); } catch {} },
    setVolume(v)   { smoothSet(gain, v * 0.75, ctx); },
  };
}

// ── Forest ────────────────────────────────────────────────────────────────────
// Layer 1: bandpass noise (wind/leaves)
// Layer 2: high-freq oscillator gated by square LFO (crickets)

export function createForestAmbience(ctx, volume = 0.3) {
  // Wind layer
  const windNoise  = makeNoise(ctx, 5);
  const windFilter = ctx.createBiquadFilter();
  windFilter.type            = 'bandpass';
  windFilter.frequency.value = 600;
  windFilter.Q.value         = 0.6;

  const windGain = ctx.createGain();
  rampIn(windGain, volume * 0.35, ctx);

  windNoise.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(ctx.destination);
  windNoise.start();

  // Cricket layer — high sine gated by square LFO
  const cricketOsc = ctx.createOscillator();
  cricketOsc.type            = 'sine';
  cricketOsc.frequency.value = 3600;

  const lfo     = ctx.createOscillator();
  lfo.type      = 'square';
  lfo.frequency.value = 6; // 6 chirps/sec

  const lfoGain = ctx.createGain();
  lfoGain.gain.value = volume * 0.04;

  const cricketGain = ctx.createGain();
  cricketGain.gain.value = 0; // LFO drives this

  lfo.connect(lfoGain);
  lfoGain.connect(cricketGain.gain);
  cricketOsc.connect(cricketGain);
  cricketGain.connect(ctx.destination);

  cricketOsc.start();
  lfo.start();

  return {
    stop() {
      try { windNoise.stop(); cricketOsc.stop(); lfo.stop(); } catch {}
    },
    setVolume(v) {
      smoothSet(windGain, v * 0.35, ctx);
      smoothSet(lfoGain, v * 0.04, ctx);
    },
  };
}

// ── City ──────────────────────────────────────────────────────────────────────
// Sub-bass rumble (lowpass noise) + mid city hum

export function createCityAmbience(ctx, volume = 0.3) {
  // Sub rumble
  const rumble = makeNoise(ctx, 3);
  const lp = ctx.createBiquadFilter();
  lp.type            = 'lowpass';
  lp.frequency.value = 220;

  const rumbleGain = ctx.createGain();
  rampIn(rumbleGain, volume * 0.5, ctx);

  rumble.connect(lp);
  lp.connect(rumbleGain);
  rumbleGain.connect(ctx.destination);
  rumble.start();

  // Mid hum
  const humOsc = ctx.createOscillator();
  humOsc.type            = 'sawtooth';
  humOsc.frequency.value = 60;

  const humFilter = ctx.createBiquadFilter();
  humFilter.type            = 'lowpass';
  humFilter.frequency.value = 180;

  const humGain = ctx.createGain();
  rampIn(humGain, volume * 0.06, ctx);

  humOsc.connect(humFilter);
  humFilter.connect(humGain);
  humGain.connect(ctx.destination);
  humOsc.start();

  return {
    stop() {
      try { rumble.stop(); humOsc.stop(); } catch {}
    },
    setVolume(v) {
      smoothSet(rumbleGain, v * 0.5, ctx);
      smoothSet(humGain,    v * 0.06, ctx);
    },
  };
}

// ── Registry ──────────────────────────────────────────────────────────────────
// Maps category string → generator factory.

export const AMBIENT_GENERATORS = {
  rain:   createRainAmbience,
  forest: createForestAmbience,
  city:   createCityAmbience,
};
