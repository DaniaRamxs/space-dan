/**
 * audioFX.js
 * Motor de efectos de voz en tiempo real usando Web Audio API.
 *
 * Uso:
 *   const processor = new VoiceProcessor();
 *   const processedStream = processor.init(micStream);
 *   processor.setFilter('robot');
 *   processor.close(); // Siempre llamar al desmontar
 *
 * Notas de rendimiento:
 *   - La curva de distorsión se calcula una sola vez y se reutiliza (cacheada).
 *   - n_samples reducido a 4096 — suficiente resolución para distorsión de audio.
 *   - Los osciladores se detienen explícitamente antes de desconectar para evitar leaks.
 */

// ─── Caché de curvas de distorsión ──────────────────────────────────────────
// Se genera una sola vez por `amount` y se reutiliza entre filtros para evitar
// la costosa generación de Float32Array en cada cambio de filtro.
const _distortionCache = new Map();

/**
 * Genera (o recupera del caché) una curva de distorsión sigmoidal.
 * @param {number} amount  Intensidad de la distorsión (0–400)
 * @returns {Float32Array}
 */
function makeDistortionCurve(amount) {
    const k = typeof amount === 'number' ? amount : 50;
    if (_distortionCache.has(k)) return _distortionCache.get(k);

    // 4096 samples: resolución suficiente, ~10× más rápido que 44100
    const n = 4096;
    const curve = new Float32Array(n);
    const deg = Math.PI / 180;
    for (let i = 0; i < n; i++) {
        const x = (i * 2) / n - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    _distortionCache.set(k, curve);
    return curve;
}

// ─── VoiceProcessor ─────────────────────────────────────────────────────────

export class VoiceProcessor {
    constructor() {
        /** @type {AudioContext|null} */
        this.context = null;

        /** @type {MediaStreamAudioSourceNode|null} Fuente de audio del micrófono */
        this.input = null;

        /** @type {MediaStreamAudioDestinationNode|null} Destino procesado */
        this.output = null;

        /**
         * Nodos activos del grafo de audio actual.
         * Se limpian completos al cambiar de filtro.
         * @type {AudioNode[]}
         */
        this._activeNodes = [];

        /**
         * Osciladores activos separados — necesitan .stop() antes de .disconnect().
         * @type {OscillatorNode[]}
         */
        this._activeOscillators = [];

        /** Filtro actualmente aplicado */
        this.currentFilter = 'none';
    }

    /**
     * Inicializa el procesador con un MediaStream de micrófono.
     * Debe llamarse una vez antes de setFilter().
     * @param {MediaStream} stream  Stream de audio del micrófono
     * @returns {MediaStream}       Stream procesado listo para publicar
     */
    init(stream) {
        // Reusar AudioContext si ya existe para evitar crear contextos huérfanos
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Desconectar fuente anterior si la hay
        if (this.input) {
            try { this.input.disconnect(); } catch (_) { }
        }

        this.input = this.context.createMediaStreamSource(stream);
        this.output = this.context.createMediaStreamDestination();

        // Aplicar filtro por defecto (pass-through limpio)
        this.setFilter('none');
        return this.output.stream;
    }

    /**
     * Cambia el filtro de voz activo.
     * Limpia completamente el grafo anterior antes de construir el nuevo.
     * @param {'none'|'robot'|'radio'|'alien'|'giant'|'space'} type
     */
    setFilter(type) {
        this.currentFilter = type;
        if (!this.input || !this.output) return;

        // ── Limpieza del grafo anterior ──────────────────────────────────────
        // 1. Detener osciladores (deben parar antes de desconectar)
        for (const osc of this._activeOscillators) {
            try { osc.stop(); } catch (_) { }
            try { osc.disconnect(); } catch (_) { }
        }
        this._activeOscillators = [];

        // 2. Desconectar todos los nodos de procesamiento
        for (const node of this._activeNodes) {
            try { node.disconnect(); } catch (_) { }
        }
        this._activeNodes = [];

        // 3. Desconectar la fuente para reconectar desde cero
        try { this.input.disconnect(); } catch (_) { }

        // ── Construir el nuevo grafo de audio ────────────────────────────────
        if (!type || type === 'none') {
            // Pass-through: micro directo al destino sin procesamiento
            this.input.connect(this.output);
            return;
        }

        const src = this.input;
        const dst = this.output;
        const ctx = this.context;

        switch (type) {

            case 'robot': {
                // Ring Modulation — da un timbre metálico/androide
                // El LFO modula la ganancia para crear el efecto de portadora
                const ringGain = ctx.createGain();
                ringGain.gain.value = 1;

                const lfo = ctx.createOscillator();
                lfo.type = 'sine';
                lfo.frequency.value = 50; // Frecuencia de modulación (Hz)
                lfo.connect(ringGain.gain); // El LFO controla la ganancia
                lfo.start();

                src.connect(ringGain);
                ringGain.connect(dst);

                this._activeOscillators = [lfo];
                this._activeNodes = [ringGain];
                break;
            }

            case 'radio': {
                // Radio lo-fi: bandpass estrecho + distorsión suave
                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = 1500; // Rango de voz de radio AM
                filter.Q.value = 1.5;          // Ancho de banda moderado

                const dist = ctx.createWaveShaper();
                dist.curve = makeDistortionCurve(50); // Distorsión leve
                dist.oversample = '2x';

                src.connect(filter);
                filter.connect(dist);
                dist.connect(dst);

                this._activeNodes = [filter, dist];
                break;
            }

            case 'alien': {
                // Alienígena: delay modulado con retroalimentación y vibrato
                const delay = ctx.createDelay(0.1); // Max 100ms de delay
                delay.delayTime.value = 0.03;        // 30ms de delay base

                const feedback = ctx.createGain();
                feedback.gain.value = 0.4; // 40% de retroalimentación (sin overflow)

                // LFO que modula el tiempo de delay (crea efecto de vibrato/chorus)
                const lfo = ctx.createOscillator();
                lfo.frequency.value = 5; // Velocidad de modulación
                const lfoGain = ctx.createGain();
                lfoGain.gain.value = 0.005; // Profundidad de modulación (suave)

                lfo.connect(lfoGain);
                lfoGain.connect(delay.delayTime);
                lfo.start();

                // Cadena de audio: src → delay → feedback loop → dst
                src.connect(delay);
                delay.connect(feedback);
                feedback.connect(delay); // Loop de retroalimentación
                delay.connect(dst);

                this._activeOscillators = [lfo];
                this._activeNodes = [delay, feedback, lfoGain];
                break;
            }

            case 'giant': {
                // Voz grave/gigante: lowpass agresivo + distorsión fuerte
                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = 400; // Cortar todo por encima de 400Hz

                const dist = ctx.createWaveShaper();
                dist.curve = makeDistortionCurve(100); // Distorsión más intensa
                dist.oversample = '4x';

                src.connect(lp);
                lp.connect(dist);
                dist.connect(dst);

                this._activeNodes = [lp, dist];
                break;
            }

            case 'space': {
                // Espacio/Vortex: reverb simulado con delay largo y retroalimentación
                // Señal "dry" (original) + señal "wet" (con eco)
                const delay = ctx.createDelay(1.0); // Max 1s
                delay.delayTime.value = 0.3;         // 300ms de reverb

                const feedback = ctx.createGain();
                feedback.gain.value = 0.3; // 30% de retroalimentación

                // Ganancia para mezclar señal wet (evitar clipping)
                const wetGain = ctx.createGain();
                wetGain.gain.value = 0.6;

                src.connect(dst);           // Señal dry (directa)
                src.connect(delay);         // Señal wet (reverb)
                delay.connect(feedback);
                feedback.connect(delay);    // Loop de reverb
                delay.connect(wetGain);
                wetGain.connect(dst);

                this._activeNodes = [delay, feedback, wetGain];
                break;
            }

            default:
                // Fallback seguro: pass-through
                src.connect(dst);
        }
    }

    /**
     * Devuelve true si el procesador está inicializado y listo.
     * @returns {boolean}
     */
    get isInitialized() {
        return this.context !== null && this.input !== null;
    }

    /**
     * Libera todos los recursos de audio.
     * SIEMPRE llamar al desmontar el componente que use VoiceProcessor.
     */
    close() {
        // Detener osciladores
        for (const osc of this._activeOscillators) {
            try { osc.stop(); } catch (_) { }
            try { osc.disconnect(); } catch (_) { }
        }
        this._activeOscillators = [];

        // Desconectar nodos
        for (const node of this._activeNodes) {
            try { node.disconnect(); } catch (_) { }
        }
        this._activeNodes = [];

        // Desconectar fuente
        if (this.input) {
            try { this.input.disconnect(); } catch (_) { }
            this.input = null;
        }

        // Cerrar contexto de audio (libera recursos del sistema)
        if (this.context && this.context.state !== 'closed') {
            this.context.close().catch(() => { });
            this.context = null;
        }

        this.output = null;
        this.currentFilter = 'none';
    }
}
