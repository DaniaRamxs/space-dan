/**
 * radioAudio.js — Singleton global de audio para la Radio.
 * El Audio vive fuera de React para que NUNCA se destruya
 * al navegar entre rutas o re-renderizar componentes.
 */

let _audio = null;

export function getRadioAudio() {
    if (!_audio) {
        _audio = new Audio();
        _audio.preload = 'none';
        _audio.volume = 0.6;
    }
    return _audio;
}
