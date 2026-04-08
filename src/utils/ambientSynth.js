/**
 * Ambient Sound Synthesizer using Web Audio API
 * Generates looping ambient sounds without external files.
 * Based on the same approach as arcadeAudio.js.
 */

class AmbientSynth {
    constructor() {
        this.ctx = null;
        this.nodes = [];
        this.playing = false;
        this.currentSoundId = null;
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    /** Stop all active sounds */
    stop() {
        this.nodes.forEach(n => {
            try { n.stop?.(); } catch { }
            try { n.disconnect(); } catch { }
        });
        this.nodes = [];
        this.playing = false;
        this.currentSoundId = null;
    }

    /**
     * Play an ambient sound by its store item ID.
     * Must be called from a user gesture (click).
     */
    play(soundId) {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        // If already playing this sound, do nothing
        if (this.playing && this.currentSoundId === soundId) return;

        // Stop any existing
        this.stop();

        if (soundId === 'sound_rain') {
            this._playRain();
        } else if (soundId === 'sound_void') {
            this._playVoid();
        } else {
            // Fallback: a generic deep ambient hum
            this._playGenericAmbient();
        }

        this.playing = true;
        this.currentSoundId = soundId;
    }

    /** Rain on a dome — filtered noise + occasional drip tones */
    _playRain() {
        const ctx = this.ctx;
        const masterGain = ctx.createGain();
        masterGain.gain.value = 0.12;
        masterGain.connect(ctx.destination);

        // Brown noise for rain base
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const data = buffer.getChannelData(ch);
            let lastOut = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                data[i] = (lastOut + 0.02 * white) / 1.02;
                lastOut = data[i];
                data[i] *= 3.5; // amplify
            }
        }
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;

        // Bandpass filter to shape rain
        const bpf = ctx.createBiquadFilter();
        bpf.type = 'bandpass';
        bpf.frequency.value = 800;
        bpf.Q.value = 0.5;

        // High shelf to add gentle shimmer
        const hsh = ctx.createBiquadFilter();
        hsh.type = 'highshelf';
        hsh.frequency.value = 3000;
        hsh.gain.value = -6;

        src.connect(bpf);
        bpf.connect(hsh);
        hsh.connect(masterGain);
        src.start();

        this.nodes.push(src, bpf, hsh, masterGain);

        // Drip layer: subtle random high-pitched pings
        this._startDrips(masterGain);
    }

    _startDrips(destination) {
        const ctx = this.ctx;
        const dripInterval = setInterval(() => {
            if (!this.playing) { clearInterval(dripInterval); return; }
            if (Math.random() > 0.3) return; // only sometimes

            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 2000 + Math.random() * 3000;
            g.gain.setValueAtTime(0.01, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc.connect(g);
            g.connect(destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        }, 200);

        // Store interval ID for cleanup
        this._dripInterval = dripInterval;
    }

    /** Space station hum — deep oscillators with subtle modulation */
    _playVoid() {
        const ctx = this.ctx;
        const masterGain = ctx.createGain();
        masterGain.gain.value = 0.08;
        masterGain.connect(ctx.destination);

        // Layer 1: deep drone
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = 55;
        const g1 = ctx.createGain();
        g1.gain.value = 0.5;
        osc1.connect(g1);
        g1.connect(masterGain);
        osc1.start();

        // Layer 2: slightly detuned for beating
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 55.5;
        const g2 = ctx.createGain();
        g2.gain.value = 0.4;
        osc2.connect(g2);
        g2.connect(masterGain);
        osc2.start();

        // Layer 3: higher harmonic
        const osc3 = ctx.createOscillator();
        osc3.type = 'triangle';
        osc3.frequency.value = 110;
        const g3 = ctx.createGain();
        g3.gain.value = 0.15;
        osc3.connect(g3);
        g3.connect(masterGain);
        osc3.start();

        // Layer 4: filtered noise for air conditioning hiss
        const bufferSize = ctx.sampleRate * 2;
        const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = buf;
        noiseSrc.loop = true;

        const lpf = ctx.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.value = 400;
        lpf.Q.value = 1;

        const noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.15;

        noiseSrc.connect(lpf);
        lpf.connect(noiseGain);
        noiseGain.connect(masterGain);
        noiseSrc.start();

        // Subtle LFO on master volume for breathing effect
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.05; // Very slow
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.02;
        lfo.connect(lfoGain);
        lfoGain.connect(masterGain.gain);
        lfo.start();

        this.nodes.push(osc1, osc2, osc3, noiseSrc, lfo, g1, g2, g3, noiseGain, lpf, lfoGain, masterGain);
    }

    /** Generic ambient pad */
    _playGenericAmbient() {
        this._playVoid(); // Fallback to void drone
    }

    destroy() {
        this.stop();
        if (this._dripInterval) clearInterval(this._dripInterval);
        if (this.ctx) {
            this.ctx.close().catch(() => { });
            this.ctx = null;
        }
    }
}

export const ambientSynth = new AmbientSynth();
