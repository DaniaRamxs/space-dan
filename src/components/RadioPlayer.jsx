import { useEffect, useRef, useState } from 'react';
import { unlockAchievement } from '../hooks/useAchievements';
import { getEquippedItem } from '../hooks/useShopItems';

const BASE_STATIONS = [
  {
    id:      'nightwave',
    name:    'Nightwave Plaza',
    genre:   'Vaporwave · City Pop',
    stream:  'https://radio.plaza.one/mp3',
    icon:    '🌃',
  },
  {
    id:      'lofi',
    name:    'Dan FM — Lofi',
    genre:   'Lofi · Chillhop',
    stream:  'https://streams.ilovemusic.de/iloveradio17.mp3',
    icon:    '☁️',
  },
];

const EXTRA_STATIONS = {
  radio_jcore: {
    id:     'jcore',
    name:   'Listen.moe — Anime',
    genre:  'J-Pop · Anime · K-Pop',
    stream: 'https://listen.moe/stream',
    icon:   '🎌',
  },
  radio_groove: {
    id:     'groove',
    name:   'Groove Salad',
    genre:  'Ambient · Electronica',
    stream: 'https://ice4.somafm.com/groovesalad-128-mp3',
    icon:   '🥗',
  },
};

function getStations() {
  const stations = [...BASE_STATIONS];
  for (const [key, station] of Object.entries(EXTRA_STATIONS)) {
    try {
      const purchased = JSON.parse(localStorage.getItem('space-dan-shop-purchased') || '[]');
      if (purchased.includes(key)) stations.push(station);
    } catch {}
  }
  return stations;
}

export default function RadioPlayer() {
  const audioRef              = useRef(null);
  const [stations, setStations] = useState(getStations);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume]   = useState(0.6);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const hasUnlockedRef        = useRef(false);

  // Refresh stations when shop items change
  useEffect(() => {
    const sync = () => setStations(getStations());
    window.addEventListener('dan:item-purchased', sync);
    return () => window.removeEventListener('dan:item-purchased', sync);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.src    = stations[current]?.stream || '';

    if (playing) {
      setLoading(true);
      audio.play().catch(() => setPlaying(false));
    }
  }, [current, stations]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.src = stations[current].stream;
      setLoading(true);
      try {
        await audio.play();
        setPlaying(true);

        if (!hasUnlockedRef.current) {
          hasUnlockedRef.current = true;
          unlockAchievement('radio_listener');
        }
      } catch {
        setPlaying(false);
        setLoading(false);
      }
    }
  };

  const selectStation = (idx) => {
    if (idx === current) { togglePlay(); return; }
    const audio = audioRef.current;
    if (audio) audio.pause();
    setCurrent(idx);
    setPlaying(true);
    setLoading(true);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.src = stations[idx].stream;
        audioRef.current.play().catch(() => { setPlaying(false); setLoading(false); });
      }
    }, 50);
  };

  const station = stations[current];

  return (
    <>
      {/* Floating toggle button */}
      <button
        className={`radioToggleBtn${playing ? ' active' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Radio en vivo"
        aria-label="Abrir radio"
      >
        📻
        {playing && <span className="radioLiveDot" />}
      </button>

      {/* Player panel */}
      <div className={`radioPanel${open ? ' open' : ''}`}>
        <div className="radioPanelHeader">
          <span className="radioPanelTitle">◈ DAN RADIO</span>
          <button className="radioPanelClose" onClick={() => setOpen(false)}>✕</button>
        </div>

        {/* Now playing */}
        <div className="radioNowPlaying">
          <div className="radioStationIcon">{station?.icon}</div>
          <div className="radioStationInfo">
            <div className="radioStationName">
              {station?.name}
              {loading && playing && <span className="radioLoadingDot">...</span>}
            </div>
            <div className="radioStationGenre">{station?.genre}</div>
          </div>
          <button
            className={`radioPlayBtn${playing ? ' playing' : ''}`}
            onClick={togglePlay}
            aria-label={playing ? 'Pausar' : 'Reproducir'}
          >
            {playing ? '⏸' : '▶'}
          </button>
        </div>

        {/* Volume */}
        <div className="radioVolume">
          <span className="radioVolIcon">🔈</span>
          <input
            type="range" min="0" max="1" step="0.05"
            value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="radioVolSlider"
            aria-label="Volumen"
          />
          <span className="radioVolIcon">🔊</span>
        </div>

        {/* Station list */}
        <div className="radioStationList">
          {stations.map((s, i) => (
            <button
              key={s.id}
              className={`radioStationBtn${i === current ? ' active' : ''}`}
              onClick={() => selectStation(i)}
            >
              <span>{s.icon} {s.name}</span>
              <span className="radioStationGenreSmall">{s.genre}</span>
            </button>
          ))}
          <div className="radioUnlockHint">
            Desbloquea más estaciones en la Tienda ◈
          </div>
        </div>

        <audio ref={audioRef} onPlaying={() => setLoading(false)} onWaiting={() => setLoading(true)} />
      </div>
    </>
  );
}
