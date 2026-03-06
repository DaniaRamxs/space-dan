import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Capacitor, registerPlugin } from '@capacitor/core';

const RadioServicePlugin = registerPlugin('RadioService');

import { unlockAchievement } from '../hooks/useAchievements';
import { getRadioAudio } from '../utils/radioAudio';
import RadioSvg from './RadioSvg';
import { supabase } from '../supabaseClient';
import { useAuthContext } from '../contexts/AuthContext';
import { useUniverse } from '../contexts/UniverseContext';

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
  radio_lofi: {
    id: 'radio_lofi',
    name: 'Beats de Vacío',
    genre: 'Lofi · Chillhop · Study',
    stream: 'https://streams.ilovemusic.de/iloveradio17.mp3',
    icon: <RadioSvg type="lofi" />,
  },
  radio_retro: {
    id: 'radio_retro',
    name: 'Frecuencia FM',
    genre: 'Secret Agent · 60s Jazz',
    stream: 'https://ice4.somafm.com/secretagent-128-mp3',
    icon: <RadioSvg type="lofi" />,
  },
  radio_synthwave: {
    id: 'radio_synthwave',
    name: 'Synth 80s',
    genre: 'Synthwave · Retro Future',
    stream: 'https://radio.plaza.one/mp3', // Map to plaza for synth feel
    icon: <RadioSvg type="nightwave" />,
  },
  radio_cyberpunk: {
    id: 'radio_cyberpunk',
    name: 'Nivel Crítico',
    genre: 'Cyberpunk · EBS · Industrial',
    stream: 'https://ice4.somafm.com/beatblender-128-mp3',
    icon: <RadioSvg type="space" />,
  },
  radio_dark: {
    id: 'radio_dark',
    name: 'Frecuencias Oscuras',
    genre: 'Dark Ambient · Drone',
    stream: 'https://ice4.somafm.com/dronezone-128-mp3',
    icon: <RadioSvg type="space" />,
  },
  radio_urbano: {
    id: 'radio_urbano',
    name: 'Nexo Urbano',
    genre: 'Urban · Reggaeton · Latino',
    stream: 'https://streams.ilovemusic.de/iloveradio2.mp3', // I Love 2 (Urban/HipHop)
    icon: <RadioSvg type="lofi" />,
  },
  radio_yeye: {
    id: 'radio_yeye',
    name: 'Radio Yeye',
    genre: 'Pop Hits · Top 40 · Modern Rock',
    stream: 'https://streams.ilovemusic.de/iloveradio1.mp3', // I Love Radio (Main Hit Station)
    icon: <RadioSvg type="nightwave" />,
  },
};

function getStations(equippedId = null) {
  const stations = [...BASE_STATIONS];

  if (!Array.isArray(equippedId)) {
    equippedId = equippedId ? [equippedId] : [];
  }

  // Añadir las estaciones que están EQUIPADAS
  equippedId.forEach(id => {
    if (EXTRA_STATIONS[id]) {
      stations.push(EXTRA_STATIONS[id]);
    }
  });

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
  const { setActiveStation } = useUniverse();

  // Sincronizar con DB si el usuario está logueado
  useEffect(() => {
    if (!user) {
      setStations(getStations([]));
      return;
    }

    const loadDbStations = async () => {
      try {
        const { data: items } = await supabase
          .from('user_items')
          .select('item_id')
          .eq('user_id', user.id)
          .eq('is_equipped', true);

        const equippedIds = items ? items.map(ui => ui.item_id) : [];
        const newStations = getStations(equippedIds);
        setStations(newStations);

        if (equippedIds.length > 0 && current === 0) {
          const idx = newStations.findIndex(s => s.id === equippedIds[equippedIds.length - 1]);
          if (idx !== -1) setCurrent(idx);
        }
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
    if (playing && stations[current]) {
      setActiveStation(stations[current].name);
    } else {
      setActiveStation(null);
    }
  }, [playing, current, stations, setActiveStation]);

  useEffect(() => {
    const sync = async (e) => {
      let equippedIds = [];

      if (user) {
        const { data: items } = await supabase.from('user_items').select('item_id').eq('user_id', user.id).eq('is_equipped', true);
        equippedIds = items ? items.map(ui => ui.item_id) : [];
      } else {
        const localEquipped = JSON.parse(localStorage.getItem('spacely_equipped_items') || '{}');
        const localRadio = localEquipped.radio || [];
        equippedIds = Array.isArray(localRadio) ? localRadio : [localRadio].filter(Boolean);
      }

      // Si el evento fue de equipar y es una radio, agregarlo a la lista de equipados si no estaba
      if (e?.type === 'dan:item-equipped' && e.detail.category === 'radio') {
        if (!equippedIds.includes(e.detail.id)) equippedIds.push(e.detail.id);
      } else if (e?.type === 'dan:item-unequipped' && e.detail.category === 'radio') {
        equippedIds = equippedIds.filter(id => id !== e.detail.id);
      }

      const newStations = getStations(equippedIds);
      setStations(newStations);

      if (e?.type === 'dan:item-equipped' && e.detail.category === 'radio') {
        const targetId = e.detail.id;
        const idx = newStations.findIndex(s => s.id === targetId);
        if (idx !== -1) {
          setCurrent(idx);
          // Auto-reproducir la radio recién equipada
          audio.src = newStations[idx].stream;
          audio.play().catch(() => { });
        }
      }
    };
    window.addEventListener('dan:item-purchased', sync);
    window.addEventListener('dan:item-equipped', sync);
    window.addEventListener('dan:item-unequipped', sync); // Add listener for unequip
    return () => {
      window.removeEventListener('dan:item-purchased', sync);
      window.removeEventListener('dan:item-equipped', sync);
      window.removeEventListener('dan:item-unequipped', sync);
    };
  }, [user]);

  useEffect(() => {
    audio.volume = volume;
  }, [volume, audio]);

  // Servicio foreground en Android para reproducción en segundo plano
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (playing && stations[current]) {
      RadioServicePlugin.start({
        name: stations[current].name,
        genre: stations[current].genre,
      }).catch(() => { });
    } else {
      RadioServicePlugin.stop().catch(() => { });
    }
  }, [playing, current, stations]);

  // Pausar la radio al conectarse a una sala de voz; reanudar al salir
  useEffect(() => {
    const wasPlayingRef = { current: false };

    const onVoiceConnect = () => {
      if (!audio.paused) {
        wasPlayingRef.current = true;
        audio.pause();
      }
    };

    const onVoiceDisconnect = () => {
      if (wasPlayingRef.current) {
        wasPlayingRef.current = false;
        audio.play().catch(() => { });
      }
    };

    window.addEventListener('voice:connect', onVoiceConnect);
    window.addEventListener('voice:disconnect', onVoiceDisconnect);
    return () => {
      window.removeEventListener('voice:connect', onVoiceConnect);
      window.removeEventListener('voice:disconnect', onVoiceDisconnect);
    };
  }, [audio]);

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
      <motion.div
        className="radioFloatingArea"
        drag
        dragMomentum={false}
        dragConstraints={{
          left: -window.innerWidth + 100,
          right: 0,
          top: -window.innerHeight + 100,
          bottom: 0
        }}
        whileTap={{ cursor: 'grabbing' }}
      >
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
      </motion.div>


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