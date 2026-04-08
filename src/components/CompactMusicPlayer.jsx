import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';

// Playlist fuera del componente - datos estaticos, sin re-creacion en cada render
const PLAYLIST = [
  {
    id: 1,
    title: "lemon boy",
    artist: "cavetown",
    duration: 272,
    cover: "https://i.pinimg.com/originals/61/1e/0a/611e0aad733633587aa5f97a332a0c35.jpg",
    src: "/music/lemonboy.mp3"
  },
  {
    id: 2,
    title: "mardy bum",
    artist: "arctic monkeys",
    duration: 175,
    cover: "https://images.genius.com/779b9b4221140a2ffc0b7bc68bb291fd.600x600x1.jpg",
    src: "/music/mardybum.mp3"
  },
  {
    id: 3,
    title: "creep",
    artist: "radiohead",
    duration: 238,
    cover: "https://www.shutterstock.com/image-vector/tasty-crepe-strawberry-chocolate-vector-600nw-2589740351.jpg",
    src: "/music/creep.mp3"
  },
  {
    id: 4,
    title: "arms tonite",
    artist: "mother mother",
    duration: 216,
    cover: "https://i.scdn.co/image/ab67616d0000b273cf2a0403141b1f4b8488fc3f",
    src: "/music/armstonite.mp3"
  },
];

const CompactMusicPlayer = () => {
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef(null);
  const track = PLAYLIST[currentTrack];

  // Effect 1: Cambio de cancion - solo carga el nuevo src
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    audio.currentTime = 0;
    setCurrentTime(0);
    setAudioDuration(0);
  }, [currentTrack]);

  // Effect 2: Play/Pause - separado y limpio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Effect 3: Volumen - independiente
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Effect 4: Eventos del audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);

    const handleEnded = () => {
      setCurrentTrack((prev) => (prev + 1) % PLAYLIST.length);
      setIsPlaying(true);
    };

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [currentTrack]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => setIsPlaying((prev) => !prev);

  const handleNext = () => {
    setCurrentTrack((prev) => (prev + 1) % PLAYLIST.length);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (currentTime > 3) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
    } else {
      setCurrentTrack((prev) => (prev - 1 + PLAYLIST.length) % PLAYLIST.length);
      setIsPlaying(true);
    }
  };

  // Duracion real del audio, con fallback al valor del objeto
  const effectiveDuration = audioDuration || track.duration;

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * effectiveDuration;
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  const progress = effectiveDuration > 0
    ? (currentTime / effectiveDuration) * 100
    : 0;

  return (
    <div className="w-full max-w-md mx-auto">
      <audio ref={audioRef} preload="metadata">
        <source src={track.src} type="audio/mpeg" />
      </audio>

      {/* Cassette Body */}
      <div className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-lg p-6 shadow-2xl border-4 border-gray-700">

        {/* Top screws */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-gray-600 shadow-inner"></div>
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gray-600 shadow-inner"></div>

        {/* Label area */}
        <div className="bg-gradient-to-br from-blue-100 to-cyan-50 rounded p-4 mb-4 border border-gray-400 shadow-inner">
          <div className="text-center mb-2">
            <div className="text-xs font-mono text-gray-800 mb-1">SIDE A</div>
            <div className="text-sm font-bold text-gray-900 truncate">{track.title}</div>
            <div className="text-xs text-gray-600 truncate">{track.artist}</div>
          </div>

          <div className="flex justify-between text-xs font-mono text-gray-700 border-t border-gray-300 pt-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(effectiveDuration)}</span>
          </div>
        </div>

        {/* Tape reels */}
        <div className="flex justify-between items-center mb-4 px-4">
          {/* Left reel */}
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gray-900 border-4 border-gray-700 shadow-lg flex items-center justify-center">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-600 flex items-center justify-center ${isPlaying ? 'animate-spin' : ''}`} style={{animationDuration: '3s'}}>
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                  <div className="w-1 h-6 bg-gray-500"></div>
                  <div className="w-6 h-1 bg-gray-500 absolute"></div>
                </div>
              </div>
            </div>
            <div className="absolute top-1/2 -right-2 w-4 h-0.5 bg-gradient-to-r from-amber-900/80 to-transparent"></div>
          </div>

          {/* Tape window / progress */}
          <div
            onClick={handleProgressClick}
            className="flex-1 mx-2 h-12 bg-black/40 rounded border border-gray-600 relative overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-1 bg-gradient-to-r from-transparent via-amber-900/60 to-transparent transition-all duration-300" style={{width: `${progress}%`}}></div>
            </div>
            <div className="absolute inset-y-0 left-0 right-0 flex items-center">
              <div className="w-full h-px bg-amber-900/30"></div>
            </div>
          </div>

          {/* Right reel */}
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gray-900 border-4 border-gray-700 shadow-lg flex items-center justify-center">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-600 flex items-center justify-center ${isPlaying ? 'animate-spin' : ''}`} style={{animationDuration: '3s'}}>
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                  <div className="w-1 h-6 bg-gray-500"></div>
                  <div className="w-6 h-1 bg-gray-500 absolute"></div>
                </div>
              </div>
            </div>
            <div className="absolute top-1/2 -left-2 w-4 h-0.5 bg-gradient-to-l from-amber-900/80 to-transparent"></div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            onClick={handlePrev}
            className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-all shadow-md active:shadow-inner"
            aria-label="Cancion anterior"
          >
            <SkipBack size={16} fill="currentColor" />
          </button>

          <button
            onClick={handlePlayPause}
            className="p-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all hover:scale-105 active:scale-95"
            aria-label={isPlaying ? "Pausar" : "Reproducir"}
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
          </button>

          <button
            onClick={handleNext}
            className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-all shadow-md active:shadow-inner"
            aria-label="Siguiente cancion"
          >
            <SkipForward size={16} fill="currentColor" />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 px-4 mb-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label={isMuted ? "Activar sonido" : "Silenciar"}
          >
            {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setVolume(val);
              if (val > 0) setIsMuted(false);
            }}
            aria-label="Volumen"
            className="flex-1 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <span className="text-xs text-gray-500 w-7 text-right">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
        </div>

        {/* Bottom screws */}
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-gray-600 shadow-inner"></div>
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-gray-600 shadow-inner"></div>
      </div>

      {/* Playlist */}
      <div className="mt-4 bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-3">
        <div className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2">
          <span>📼 Playlist</span>
          <span className="text-gray-600">({PLAYLIST.length})</span>
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800/50">
          {PLAYLIST.map((item, index) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentTrack(index);
                setIsPlaying(true);
              }}
              className={`w-full px-2 py-1.5 rounded text-left text-xs transition-all flex items-center gap-2 ${
                currentTrack === index
                  ? 'bg-gradient-to-r from-blue-600/30 to-cyan-600/30 border border-blue-500/50 text-white'
                  : 'text-gray-400 hover:bg-gray-700/30 border border-transparent'
              }`}
            >
              <img
                src={item.cover}
                alt={item.title}
                width={24}
                height={24}
                loading="lazy"
                className="w-6 h-6 rounded object-cover flex-shrink-0"
              />
              <div className="truncate flex-1 min-w-0">
                <div className="font-medium truncate">{item.title}</div>
                <div className="text-xs opacity-75 truncate">{item.artist}</div>
              </div>
              <span className="ml-1 text-xs opacity-60">{formatTime(item.duration)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CompactMusicPlayer;
