/**
 * audioFX.js
 * Utilería para aplicar filtros de voz en tiempo real usando Web Audio API.
 * Compatible con procesadores de audio de LiveKit o manipulación directa de MediaStream.
 */

export class VoiceProcessor {
    constructor() {
        this.context = null;
        this.input = null;
        this.output = null;
        this.activeNodes = [];
        this.currentFilter = 'none';
    }

    init(stream) {
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (this.input) this.input.disconnect();

        this.input = this.context.createMediaStreamSource(stream);
        this.output = this.context.createMediaStreamDestination();

        this.setFilter('none');
        return this.output.stream;
    }

    setFilter(type) {
        this.currentFilter = type;
        if (!this.input || !this.output) return;

        // Desconectar todo lo anterior
        this.activeNodes.forEach(node => {
            try { node.stop(); } catch (e) { }
            node.disconnect();
        });
        this.activeNodes = [];
        this.input.disconnect();

        if (type === 'none' || !type) {
            this.input.connect(this.output);
            return;
        }

        const source = this.input;
        const dest = this.output;

        switch (type) {
            case 'robot': {
                // Ring Modulation
                const ring = this.context.createGain();
                const lfo = this.context.createOscillator();
                lfo.type = 'sine';
                lfo.frequency.value = 50;
                lfo.connect(ring.gain);
                lfo.start();

                source.connect(ring);
                ring.connect(dest);
                this.activeNodes = [ring, lfo];
                break;
            }
            case 'radio': {
                // High bandpass for that lo-fi radio feel
                const filter = this.context.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = 1500;
                filter.Q.value = 1.5;

                const dist = this.context.createWaveShaper();
                dist.curve = this.makeDistortionCurve(50);

                source.connect(filter);
                filter.connect(dist);
                dist.connect(dest);
                this.activeNodes = [filter, dist];
                break;
            }
            case 'alien': {
                // Alien: Delay + Feedback + Modulation
                const delay = this.context.createDelay();
                delay.delayTime.value = 0.03;

                const feedback = this.context.createGain();
                feedback.gain.value = 0.4;

                const lfo = this.context.createOscillator();
                lfo.frequency.value = 5;
                const lfoGain = this.context.createGain();
                lfoGain.gain.value = 0.005;

                lfo.connect(lfoGain);
                lfoGain.connect(delay.delayTime);
                lfo.start();

                source.connect(delay);
                delay.connect(feedback);
                feedback.connect(delay);
                delay.connect(dest);

                this.activeNodes = [delay, feedback, lfo, lfoGain];
                break;
            }
            case 'giant': {
                // Deep voice (simulated with low-pass and distortion)
                const lp = this.context.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = 400;

                const dist = this.context.createWaveShaper();
                dist.curve = this.makeDistortionCurve(100);

                source.connect(lp);
                lp.connect(dist);
                dist.connect(dest);
                this.activeNodes = [lp, dist];
                break;
            }
            case 'space': {
                // Reverb/Space: Long delay
                const delay = this.context.createDelay();
                delay.delayTime.value = 0.3;
                const feedback = this.context.createGain();
                feedback.gain.value = 0.3;

                source.connect(dest); // dry
                source.connect(delay); // wet
                delay.connect(feedback);
                feedback.connect(delay);
                delay.connect(dest);

                this.activeNodes = [delay, feedback];
                break;
            }
            default:
                source.connect(dest);
        }
    }

    makeDistortionCurve(amount) {
        const k = typeof amount === 'number' ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    close() {
        if (this.context) {
            this.context.close();
            this.context = null;
        }
    }
}
