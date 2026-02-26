import { useEffect, useRef, useState, useCallback } from 'react';
import { unlockAchievement } from '../hooks/useAchievements';
import { getRadioAudio } from '../utils/radioAudio';
import RadioSvg from './RadioSvg';
import { supabase } from '../supabaseClient';
import { useAuthContext } from '../contexts/AuthContext';

/* ── Estaciones ──────────────────────────────────────────────── */

const BASE_STATIONS = [
  {
    id: 'nightwave',
    name: 'Nightwave Plaza',
    genre: 'Vaporwave · City Pop',
    stream: 'https://radio.plaza.one/mp3',
    icon: <RadioSvg type="nightwave" />,
  },
  {
    id: 'lofi',
    name: 'Dan FM — Lofi',
    genre: 'Lofi · Chillhop',
    stream: 'https://streams.ilovemusic.de/iloveradio17.mp3',
    icon: <RadioSvg type="lofi" />,
  },
];

const EXTRA_STATIONS = {
  radio_jcore: {
    id: 'jcore',
    name: 'Listen.moe — Anime',
    genre: 'J-Pop · Anime · K-Pop',
    stream: 'https://listen.moe/stream',
    icon: <RadioSvg type="jcore" />,
  },
  radio_groove: {
    id: 'groove',
    name: 'Groove Salad',
    genre: 'Ambient · Electronica',
    stream: 'https://ice4.somafm.com/groovesalad-128-mp3',
    icon: <RadioSvg type="groove" />,
  },
  radio_beatblender: {
    id: 'beatblender',
    name: 'Beat Blender',
    genre: 'Deep House · Electro',
    stream: 'https://ice4.somafm.com/beatblender-128-mp3',
    icon: <RadioSvg type="beat" />,
  },
  radio_dronezone: {
    id: 'dronezone',
    name: 'Drone Zone',
    genre: 'Ambient · Space',
    stream: 'https://ice4.somafm.com/dronezone-128-mp3',
    icon: <RadioSvg type="space" />,
  },
  radio_secretagent: {
    id: 'secretagent',
    name: 'Secret Agent',
    genre: 'Spy Jazz · Lounge',
    stream: 'https://ice4.somafm.com/secretagent-128-mp3',
    icon: <RadioSvg type="agent" />,
  },
  radio_kpop: {
    id: 'kpop',
    name: 'K-Pop Universe',
    genre: 'K-Pop · Hallyu Hits',
    stream: 'https://listen.moe/kpop/stream',
    icon: <RadioSvg type="kpop" />,
  },
};

function getStations(dbItems = []) {
  const stations = [...BASE_STATIONS];
  try {
    const localPurchased = JSON.parse(
      localStorage.getItem('space-dan-shop-purchased') || '[]'
    );
    // Combinamos compras locales con compras de la base de datos
    const dbPurchasedIds = dbItems.map(ui => ui.item_id);
    const allPurchased = [...new Set([...localPurchased, ...dbPurchasedIds])];

    for (const [key, station] of Object.entries(EXTRA_STATIONS)) {
      if (allPurchased.includes(key)) stations.push(station);
    }
  } catch { }
  return stations;
}

/* ── Componente ──────────────────────────────────────────────── */

export default function RadioPlayer() {
  const { user } = useAuthContext();
  const audio = useRef(getRadioAudio()).current;
  const [stations, setStations] = useState(() => getStations([]));
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(() => !audio.paused && !!audio.src);
  const [volume, setVolume] = useState(() => audio.volume);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const hasUnlockedRef = useRef(false);

  // Sincronizar con DB si el usuario está logueado
  useEffect(() => {
    if (!user) {
      setStations(getStations([]));
      return;
    }

    const loadDbStations = async () => {
      try {
        const { data } = await supabase
          .from('user_items')
          .select('item_id')
          .eq('user_id', user.id);

        if (data) setStations(getStations(data));
      } catch (err) {
        console.warn('[RadioPlayer] Error loading DB stations:', err);
      }
    };

    loadDbStations();
  }, [user]);

  useEffect(() => {
    if (!audio.paused && audio.src) {
      setPlaying(true);
      const idx = stations.findIndex(s =>
        audio.src.includes(s.stream)
      );
      if (idx !== -1) setCurrent(idx);
    }

    const onPlay = () => {
      setPlaying(true);
      setLoading(false);
    };
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    const onError = () => {
      setPlaying(false);
      setLoading(false);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('error', onError);
    };
  }, [audio, stations]);

  useEffect(() => {
    const sync = async () => {
      if (user) {
        const { data } = await supabase
          .from('user_items')
          .select('item_id')
          .eq('user_id', user.id);
        setStations(getStations(data || []));
      } else {
        setStations(getStations([]));
      }
    };
    window.addEventListener('dan:item-purchased', sync);
    return () =>
      window.removeEventListener('dan:item-purchased', sync);
  }, [user]);

  useEffect(() => {
    audio.volume = volume;
  }, [volume, audio]);

  const togglePlay = useCallback(async () => {
    if (playing) {
      audio.pause();
    } else {
      if (
        !audio.src ||
        !audio.src.includes(stations[current].stream)
      ) {
        audio.src = stations[current].stream;
      }
      setLoading(true);
      try {
        await audio.play();
        if (!hasUnlockedRef.current) {
          hasUnlockedRef.current = true;
          unlockAchievement('radio_listener');
        }
      } catch {
        setPlaying(false);
        setLoading(false);
      }
    }
  }, [playing, audio, stations, current]);

  const selectStation = useCallback(
    (idx) => {
      if (idx === current && playing) {
        audio.pause();
        return;
      }
      setCurrent(idx);
      audio.src = stations[idx].stream;
      setLoading(true);
      audio.play().catch(() => {
        setPlaying(false);
        setLoading(false);
      });
    },
    [current, playing, audio, stations]
  );

  const station = stations[current];

  return (
    <>
      {/* ── Botón flotante + mini-player ── */}
      <div className="radioFloatingArea">
        {playing && !open && (
          <button
            className="radioMiniPlayer"
            onClick={() => setOpen(true)}
          >
            <span className="radioMiniIcon">
              {station?.icon}
            </span>
            <span className="radioMiniName">
              {station?.name}
            </span>
            <span className="radioMiniEq">
              <span />
              <span />
              <span />
            </span>
          </button>
        )}

        <button
          className={`radioToggleBtn${playing ? ' active' : ''
            }`}
          onClick={() => setOpen(o => !o)}
          title="Radio en vivo"
          aria-label="Abrir radio"
        >
          📻
          {playing && <span className="radioLiveDot" />}
        </button>
      </div>

      {/* ── Panel ── */}
      <div
        className={`radioPanel${open ? ' open' : ''}`}
      >
        <div className="radioPanelHeader">
          <span className="radioPanelTitle">
            ◈ DAN RADIO
          </span>
          <button
            className="radioPanelClose"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* Now Playing */}
        <div className="radioNowPlaying">
          <div className="radioStationIcon">
            {station?.icon}
          </div>

          <div className="radioStationInfo">
            <div className="radioStationName">
              {station?.name}
              {loading && playing && (
                <span className="radioLoadingDot">
                  ...
                </span>
              )}
            </div>
            <div className="radioStationGenre">
              {station?.genre}
            </div>
          </div>

          <button
            className={`radioPlayBtn${playing ? ' playing' : ''
              }`}
            onClick={togglePlay}
            aria-label={
              playing ? 'Pausar' : 'Reproducir'
            }
          >
            {playing ? '⏸' : '▶'}
          </button>
        </div>

        {/* Volume */}
        <div className="radioVolume">
          <span className="radioVolIcon">🔈</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) =>
              setVolume(parseFloat(e.target.value))
            }
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
              className={`radioStationBtn${i === current ? ' active' : ''
                }`}
              onClick={() => selectStation(i)}
            >
              <span>
                {s.icon} {s.name}
              </span>
              <span className="radioStationGenreSmall">
                {s.genre}
              </span>
            </button>
          ))}

          <div className="radioUnlockHint">
            Desbloquea más estaciones en la Tienda ◈
          </div>
        </div>
      </div>
    </>
  );
}