/**
 * Spacely Music Engine - Basado en HTMLAudioElement
 * Más confiable que Web Audio API en WebViews (Tauri/Electron)
 */

class SpacelyMusicEngine {
  constructor() {
    this.audio = null;
    this.currentTrack = null;
    this.isPlaying = false;
    this.volume = 0.8;

    this.tracks = {
      'snake-loop': {
        path: '/spacely-music/arcade/snake-loop.wav',
        loop: true,
        volume: 0.8,
      },
    };
  }

  _getOrCreateAudio() {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.volume = this.volume;
      this.audio.addEventListener('error', (e) => {
        console.error('[Music] Audio error event:', e, this.audio.error);
      });
      this.audio.addEventListener('canplay', () => {
        console.log('[Music] canplay event — archivo listo');
      });
    }
    return this.audio;
  }

  async playTrack(trackName, options = {}) {
    const track = this.tracks[trackName];
    if (!track) {
      console.error(`[Music] Track "${trackName}" no encontrado`);
      return false;
    }

    const audio = this._getOrCreateAudio();

    // Cambiar src solo si es un track distinto
    if (audio.src !== track.path && !audio.src.endsWith(track.path)) {
      audio.pause();
      audio.src = track.path;
      audio.load();
    }

    audio.loop = options.loop !== false ? track.loop : false;
    audio.volume = Math.min(1, options.volume ?? track.volume);
    audio.currentTime = 0;

    console.log(`[Music] src=${audio.src} readyState=${audio.readyState} paused=${audio.paused}`);
    try {
      await audio.play();
      this.currentTrack = trackName;
      this.isPlaying = true;
      console.log(`[Music] ▶ ${trackName} OK`);
      return true;
    } catch (err) {
      console.error(`[Music] FALLO play()`, err.name, err.message);
      console.error(`[Music] audio.error=`, audio.error);
      return false;
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.isPlaying = false;
    this.currentTrack = null;
  }

  pause() {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
      this.isPlaying = false;
    }
  }

  resume() {
    if (this.audio && this.audio.paused && this.currentTrack) {
      this.audio.play().then(() => {
        this.isPlaying = true;
      }).catch(() => {});
    }
  }

  setVolume(level) {
    this.volume = Math.max(0, Math.min(1, level));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  setTempo(multiplier) {
    if (this.audio) {
      this.audio.playbackRate = Math.max(0.5, Math.min(2.0, multiplier));
    }
  }

  async fadeVolume(targetLevel, duration = 1000) {
    const steps = 20;
    const start = this.volume;
    const diff = targetLevel - start;
    const delay = duration / steps;
    for (let i = 1; i <= steps; i++) {
      await new Promise(r => setTimeout(r, delay));
      this.setVolume(start + (diff * i) / steps);
    }
  }

  getStatus() {
    return {
      isPlaying: this.isPlaying,
      currentTrack: this.currentTrack,
      volume: this.volume,
      audioContextState: 'html-audio',
      cachedTracks: this.currentTrack ? [this.currentTrack] : [],
    };
  }

  dispose() {
    this.stop();
    if (this.audio) {
      this.audio.src = '';
      this.audio = null;
    }
  }
}

// Singleton global
export const spacelyMusic = new SpacelyMusicEngine();

// Hook de React
export const useSpacelyMusic = () => ({
  playTrack:   spacelyMusic.playTrack.bind(spacelyMusic),
  stop:        spacelyMusic.stop.bind(spacelyMusic),
  pause:       spacelyMusic.pause.bind(spacelyMusic),
  resume:      spacelyMusic.resume.bind(spacelyMusic),
  setVolume:   spacelyMusic.setVolume.bind(spacelyMusic),
  fadeVolume:  spacelyMusic.fadeVolume.bind(spacelyMusic),
  setTempo:    spacelyMusic.setTempo.bind(spacelyMusic),
  getStatus:   spacelyMusic.getStatus.bind(spacelyMusic),
  get isPlaying() { return spacelyMusic.isPlaying; },
});

export default SpacelyMusicEngine;
