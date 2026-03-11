// src/pages/MusicPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music } from 'lucide-react';
import { MUSIC_PLAYLIST as PLAYLIST } from '../data/musicPlaylist';

const formatTime = (s) => {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

export default function MusicPage() {
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const track = PLAYLIST[currentTrack];

  // ─── Web Audio API init (on first user interaction) ───────────
  const initAudioCtx = useCallback(() => {
    if (audioCtxRef.current) {
      audioCtxRef.current.resume();
      return;
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    const source = ctx.createMediaElementSource(audioRef.current);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    setAudioReady(true);
  }, []);

  // ─── Canvas visualizer loop ────────────────────────────────────
  useEffect(() => {
    if (!audioReady) return;
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const ctx2d = canvas.getContext('2d');

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      analyser.getByteFrequencyData(dataArray);

      // Fade trail
      ctx2d.fillStyle = 'rgba(5, 5, 16, 0.25)';
      ctx2d.fillRect(0, 0, W, H);

      const barW = W / bufferLength;
      for (let i = 0; i < bufferLength; i++) {
        const barH = (dataArray[i] / 255) * H * 0.9;
        const ratio = i / bufferLength;
        // pink → cyan gradient
        const r = Math.round(255 * (1 - ratio));
        const g = Math.round(110 * (1 - ratio) + 229 * ratio);
        const b = Math.round(180 * (1 - ratio) + 255 * ratio);
        const alpha = 0.75 + (dataArray[i] / 255) * 0.25;
        ctx2d.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx2d.fillRect(i * barW, H - barH, barW - 1, barH);

        // Glow cap
        if (barH > 4) {
          ctx2d.fillStyle = `rgba(${r},${g},${b},0.95)`;
          ctx2d.fillRect(i * barW, H - barH - 2, barW - 1, 3);
        }
      }
    };
    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [audioReady]);

  // ─── Track change ──────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    audio.currentTime = 0;
    setCurrentTime(0);
    setAudioDuration(0);
  }, [currentTrack]);

  // ─── Play / Pause ──────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // ─── Volume ───────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // ─── Audio events ─────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setAudioDuration(audio.duration);
    const onEnd = () => {
      setCurrentTrack(p => (p + 1) % PLAYLIST.length);
      setIsPlaying(true);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
    };
  }, [currentTrack]);

  // ─── Cleanup ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      audioCtxRef.current?.close();
    };
  }, []);

  const handlePlayPause = () => {
    initAudioCtx();
    setIsPlaying(p => !p);
  };

  const handleNext = () => {
    setCurrentTrack(p => (p + 1) % PLAYLIST.length);
    setIsPlaying(true);
    initAudioCtx();
  };

  const handlePrev = () => {
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    } else {
      setCurrentTrack(p => (p - 1 + PLAYLIST.length) % PLAYLIST.length);
      setIsPlaying(true);
    }
    initAudioCtx();
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const t = pct * (audioDuration || track.duration);
    if (audioRef.current) audioRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const handleTrackSelect = (idx) => {
    setCurrentTrack(idx);
    setIsPlaying(true);
    initAudioCtx();
  };

  const effective = audioDuration || track.duration;
  const progress = effective > 0 ? (currentTime / effective) * 100 : 0;

  return (
    <main className="card">
      <audio ref={audioRef} preload="metadata">
        <source src={track.src} type="audio/mpeg" />
      </audio>

      <div className="pageHeader">
        <h1 style={{ margin: 0 }}>🎧 Música</h1>
        <p className="tinyText">lo que suena mientras codifico</p>
      </div>

      {/* ─── Visualizer canvas ──────────────────────────────── */}
      <div className="musicVizWrapper">
        <canvas ref={canvasRef} className="musicVisualizer" />
        {!audioReady && (
          <div className="musicVizOverlay">
            <Music size={28} style={{ color: 'var(--accent)', opacity: 0.5 }} />
            <span className="musicVizHint">presiona play para activar el visualizador</span>
          </div>
        )}
      </div>

      {/* ─── Player card ────────────────────────────────────── */}
      <div className="musicPlayerCard" style={{ '--track-color': track.accentColor }}>
        {/* Cover */}
        <div className="musicCoverWrapper">
          <img
            src={track.cover}
            alt={track.title}
            className={`musicCover${isPlaying ? ' spinning' : ''}`}
          />
          <div className="musicCoverGlow" />
        </div>

        {/* Info */}
        <div className="musicInfo">
          <div className="musicTitle">{track.title}</div>
          <div className="musicArtist">{track.artist}</div>

          {/* Progress */}
          <div className="musicProgressBar" onClick={handleSeek} role="slider" aria-label="Progreso">
            <div className="musicProgressFill" style={{ width: `${progress}%` }} />
          </div>
          <div className="musicTimes">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(effective)}</span>
          </div>

          {/* Controls */}
          <div className="musicControls">
            <button className="musicBtn" onClick={handlePrev} aria-label="Anterior">
              <SkipBack size={18} fill="currentColor" />
            </button>
            <button className="musicBtnMain" onClick={handlePlayPause} aria-label={isPlaying ? 'Pausar' : 'Reproducir'}>
              {isPlaying
                ? <Pause size={22} fill="currentColor" />
                : <Play size={22} fill="currentColor" style={{ marginLeft: 2 }} />
              }
            </button>
            <button className="musicBtn" onClick={handleNext} aria-label="Siguiente">
              <SkipForward size={18} fill="currentColor" />
            </button>
          </div>

          {/* Volume */}
          <div className="musicVolume">
            <button className="musicVolBtn" onClick={() => setIsMuted(m => !m)} aria-label="Silenciar">
              {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <input
              type="range"
              className="musicVolSlider"
              min="0" max="1" step="0.01"
              value={isMuted ? 0 : volume}
              onChange={e => { setVolume(+e.target.value); if (+e.target.value > 0) setIsMuted(false); }}
              aria-label="Volumen"
            />
            <span className="musicVolPct">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
          </div>
        </div>
      </div>

      {/* ─── Playlist ───────────────────────────────────────── */}
      <div className="musicPlaylist">
        <div className="musicPlaylistTitle">📼 Playlist</div>
        {PLAYLIST.map((item, idx) => (
          <button
            key={item.id}
            className={`musicTrackRow${currentTrack === idx ? ' active' : ''}`}
            onClick={() => handleTrackSelect(idx)}
          >
            <img src={item.cover} alt={item.title} className="musicTrackCover" />
            <div className="musicTrackInfo">
              <span className="musicTrackName">{item.title}</span>
              <span className="musicTrackArtist">{item.artist}</span>
            </div>
            {currentTrack === idx && isPlaying && (
              <span className="musicTrackPlaying">▶</span>
            )}
            <span className="musicTrackDur">{formatTime(item.duration)}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
