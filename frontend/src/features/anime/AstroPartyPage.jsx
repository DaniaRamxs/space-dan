import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Users, MessageSquare, Copy, ExternalLink,
  Rocket, Play, Pause, X, Check, Send, Crown, Share2, ChevronLeft,
  Clock, Bell, ChevronRight, Film, Tv, Youtube, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';
import AnimePlayer from './AnimePlayer';

// ─── Constants ────────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || '';
const TMDB_KEY = import.meta.env.VITE_TMDB_KEY;
const TMDB_IMG = 'https://image.tmdb.org/t/p/w342';

const SOURCES = [
  { id: 'anime',       label: 'Anime',       color: '#7c3aed', type: 'internal',  icon: 'tv'         },
  { id: 'youtube',     label: 'YouTube',      color: '#FF0000', type: 'youtube',   icon: 'youtube'    },
  { id: 'netflix',     label: 'Netflix',      color: '#E50914', type: 'external',  icon: 'netflix'    },
  { id: 'crunchyroll', label: 'Crunchyroll',  color: '#F47521', type: 'external',  icon: 'crunchyroll'},
  { id: 'disney',      label: 'Disney+',      color: '#113CCF', type: 'external',  icon: 'disney'     },
  { id: 'prime',       label: 'Prime Video',  color: '#00A8E0', type: 'external',  icon: 'prime'      },
];

const PLATFORM_LINKS = {
  netflix:     (t) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}`,
  crunchyroll: (t) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(t)}`,
  disney:      (t) => `https://www.disneyplus.com/search/${encodeURIComponent(t)}`,
  prime:       (t) => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(t)}`,
};

// SVG source logos (small)
const SOURCE_LOGOS = {
  anime: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
      <path d="M10 8.5l6 3.5-6 3.5V8.5z"/>
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  netflix: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M5.398 0v.006c3.028 8.556 5.37 15.175 8.348 23.596 2.344.058 4.85.398 4.854.398-2.8-7.924-5.923-16.747-8.487-24zm8.489 0v9.63L18.6 24c-.01 0 2.317.038 4.402.059V0zm-8.489 14.364-4.536 9.594c2.228.04 4.485.106 6.731.176z"/>
    </svg>
  ),
  crunchyroll: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15zm0 2a5.5 5.5 0 1 0 0 11A5.5 5.5 0 0 0 12 6.5zm0 2a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z"/>
    </svg>
  ),
  disney: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 14.5v-9l7 4.5-7 4.5z"/>
    </svg>
  ),
  prime: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
    </svg>
  ),
};

// Large logos for source cards
const SOURCE_LOGOS_LG = {
  anime: (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
      <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
      <path d="M10 8.5l6 3.5-6 3.5V8.5z"/>
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  netflix: (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
      <path d="M5.398 0v.006c3.028 8.556 5.37 15.175 8.348 23.596 2.344.058 4.85.398 4.854.398-2.8-7.924-5.923-16.747-8.487-24zm8.489 0v9.63L18.6 24c-.01 0 2.317.038 4.402.059V0zm-8.489 14.364-4.536 9.594c2.228.04 4.485.106 6.731.176z"/>
    </svg>
  ),
  crunchyroll: (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15zm0 2a5.5 5.5 0 1 0 0 11A5.5 5.5 0 0 0 12 6.5zm0 2a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z"/>
    </svg>
  ),
  disney: (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 14.5v-9l7 4.5-7 4.5z"/>
    </svg>
  ),
  prime: (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
    </svg>
  ),
};

const REACTIONS = ['😂', '🔥', '😱', '❤️', '👏', '🎉'];
const AVATAR_COLORS = ['#7c3aed', '#22d3ee', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getYear  = (item) => (item.first_air_date || item.release_date || '').slice(0, 4);
const getTitle = (item) => item.title || item.name || 'Untitled';

const gradientForTitle = (title) => {
  const gradients = [
    'from-violet-900 to-indigo-900',
    'from-cyan-900 to-blue-900',
    'from-rose-900 to-pink-900',
    'from-emerald-900 to-teal-900',
    'from-amber-900 to-orange-900',
  ];
  return gradients[(title?.charCodeAt(0) || 0) % gradients.length];
};

const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const STATUS_RING  = { ready: 'ring-green-400', watching: 'ring-yellow-400', idle: 'ring-gray-600' };
const STATUS_LABEL = { ready: 'Listo', watching: 'Viendo', idle: 'Inactivo' };

const extractYoutubeId = (url) =>
  url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1] || null;

// ─── Sub-components ───────────────────────────────────────────────────────────

const PosterCard = memo(({ item, selected, onSelect }) => {
  const title = getTitle(item);
  const year  = getYear(item);
  const isTV  = item.media_type === 'tv';
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(item)}
      className={`relative rounded-2xl overflow-hidden text-left transition-all duration-200 focus:outline-none
        ${selected
          ? 'ring-2 ring-violet-500 shadow-[0_0_20px_rgba(124,58,237,0.5)]'
          : 'ring-1 ring-white/10 hover:ring-violet-500/40'}`}
    >
      {item.poster_path ? (
        <img src={`${TMDB_IMG}${item.poster_path}`} alt={title} className="w-full aspect-[2/3] object-cover" loading="lazy" />
      ) : (
        <div className={`w-full aspect-[2/3] bg-gradient-to-br ${gradientForTitle(title)} flex items-center justify-center`}>
          <span className="text-5xl font-black text-white/30 select-none">{title.charAt(0).toUpperCase()}</span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-8 pb-3 px-3">
        <p className="text-white text-xs font-bold leading-tight line-clamp-2">{title}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-white/50 text-[10px]">{year}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isTV ? 'bg-violet-500/30 text-violet-300' : 'bg-cyan-500/30 text-cyan-300'}`}>
            {isTV ? 'Serie' : 'Película'}
          </span>
        </div>
      </div>
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center shadow-lg"
          >
            <Check size={12} className="text-white" strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
});

const FloatingEmoji = memo(({ emoji, id, x }) => (
  <motion.div
    key={id}
    initial={{ opacity: 1, y: 0, x: 0, scale: 1 }}
    animate={{ opacity: 0, y: -160, scale: 1.4 }}
    transition={{ duration: 2.2, ease: 'easeOut' }}
    className="absolute bottom-16 pointer-events-none text-3xl select-none z-50"
    style={{ left: `${x}%` }}
  >
    {emoji}
  </motion.div>
));

const Avatar = memo(({ name, size = 10, status }) => (
  <div className="relative flex-shrink-0">
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold text-sm
        ${status ? `ring-2 ${STATUS_RING[status] || STATUS_RING.idle}` : ''}`}
      style={{ backgroundColor: avatarColor(name) }}
    >
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  </div>
));

const AnimatedDots = () => (
  <span className="inline-flex gap-0.5 ml-1">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        className="inline-block w-1.5 h-1.5 rounded-full bg-current"
      />
    ))}
  </span>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const AstroPartyPage = ({ onClose, roomName }) => {
  const { profile } = useAuthContext();

  // View
  const [view, setView] = useState('search');

  // Room step state
  const [roomStep, setRoomStep]   = useState('source'); // 'source'|'title'|'episode'|'ready'|'watching'
  const [roomSource, setRoomSource] = useState(null);   // one of SOURCES entries
  const [roomContent, setRoomContent] = useState(null); // { id, title, type, poster_path, year, provider?, animeId? }
  const [roomTitle, setRoomTitle] = useState('');
  const [titleQuery, setTitleQuery] = useState('');
  const [titleResults, setTitleResults] = useState([]);
  const [manualType, setManualType] = useState('movie');
  const [selectedEpisode, setSelectedEpisode] = useState({ season: 1, episode: 1 });

  // Anime internal
  const [animeSearchResults, setAnimeSearchResults] = useState([]);
  const [animeSearchLoading, setAnimeSearchLoading] = useState(false);
  const [episodesList, setEpisodesList] = useState([]);
  const [selectedAnimeEpisode, setSelectedAnimeEpisode] = useState(null);

  // Stream
  const [streamSources, setStreamSources] = useState([]);
  const [activeSourceIdx, setActiveSourceIdx] = useState(0);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [streamSubtitles, setStreamSubtitles] = useState([]);

  // YouTube
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Video sync (for guests)
  const [externalPlayerState, setExternalPlayerState] = useState({});

  // Room
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isHost, setIsHost]     = useState(false);

  // Sync state machine (for external / honor system)
  const [syncState, setSyncState]           = useState('idle');
  const [countdown, setCountdown]           = useState(null);
  const [syncBanner, setSyncBanner]         = useState(null);
  const [currentTimestamp, setCurrentTimestamp] = useState('');
  const [myStatus, setMyStatus]             = useState('idle');

  // Social
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages]         = useState([]);
  const [chatInput, setChatInput]       = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState([]);

  // Mobile
  const [activeTab, setActiveTab] = useState('content');

  // Rating
  const [showRating, setShowRating] = useState(false);
  const [myRating, setMyRating]     = useState(0);

  // Refs
  const chatEndRef     = useRef(null);
  const channelRef     = useRef(null);
  const titleTimeout   = useRef(null);
  const animeTimeout   = useRef(null);
  const countdownTimer = useRef(null);
  const isHostRef      = useRef(isHost);
  const prevHostRef    = useRef(true);

  const myUsername = profile?.username || profile?.email?.split('@')[0] || 'Tú';

  useEffect(() => { isHostRef.current = isHost; }, [isHost]);

  // Auto-join from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) setJoinCode(roomParam.toUpperCase());
  }, []);

  // ── TMDB Search ──────────────────────────────────────────────────────────────

  const searchTMDB = useCallback(async (q) => {
    if (!q.trim() || !TMDB_KEY) { setTitleResults([]); return; }
    try {
      const res  = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=es-ES&include_adult=false`);
      const data = await res.json();
      setTitleResults((data.results || []).filter((x) => x.media_type === 'tv' || x.media_type === 'movie').slice(0, 12));
    } catch { setTitleResults([]); }
  }, []);

  useEffect(() => {
    clearTimeout(titleTimeout.current);
    if (!titleQuery.trim()) { setTitleResults([]); return; }
    titleTimeout.current = setTimeout(() => searchTMDB(titleQuery), 400);
    return () => clearTimeout(titleTimeout.current);
  }, [titleQuery, searchTMDB]);

  // ── Anime search ─────────────────────────────────────────────────────────────

  const searchAnime = useCallback(async (q) => {
    if (!q.trim()) { setAnimeSearchResults([]); return; }
    setAnimeSearchLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/anime-multi/search/${encodeURIComponent(q)}`);
      const data = await res.json();
      setAnimeSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setAnimeSearchResults([]);
    } finally {
      setAnimeSearchLoading(false);
    }
  }, []);

  const fetchAnimeInfo = useCallback(async (id, provider) => {
    try {
      const res  = await fetch(`${API_URL}/api/anime-multi/info/${id}/${provider}`);
      const data = await res.json();
      return data;
    } catch { return null; }
  }, []);

  const fetchStreamSources = useCallback(async (episodeId, provider) => {
    setStreamLoading(true);
    setStreamError(null);
    try {
      const res  = await fetch(`${API_URL}/api/anime-multi/episodes/${episodeId}/${provider}`);
      const data = await res.json();
      if (data.success && data.data?.sources?.length) {
        setStreamSources(data.data.sources);
        setStreamSubtitles(data.data.subtitles || []);
        setActiveSourceIdx(0);
        return data.data.sources;
      } else {
        setStreamError('No se encontraron fuentes de video.');
        return null;
      }
    } catch {
      setStreamError('Error al cargar el video. Intenta de nuevo.');
      return null;
    } finally {
      setStreamLoading(false);
    }
  }, []);

  // ── Supabase broadcast ───────────────────────────────────────────────────────

  const broadcastSync = useCallback((payload) => {
    channelRef.current?.send({ type: 'broadcast', event: 'astro_sync', payload });
  }, []);

  const broadcastChat = useCallback((text) => {
    channelRef.current?.send({ type: 'broadcast', event: 'astro_chat', payload: { username: myUsername, text, time: Date.now() } });
  }, [myUsername]);

  // ── Track host presence ──────────────────────────────────────────────────────

  const trackHostPresence = useCallback((overrides = {}) => {
    if (!channelRef.current || !isHostRef.current) return;
    channelRef.current.track({
      username: myUsername,
      isHost: true,
      status: myStatus,
      step: roomStep,
      source: roomSource,
      content: roomContent,
      episode: selectedEpisode,
      animeEpisode: selectedAnimeEpisode,
      ...overrides,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUsername, myStatus, roomStep, roomSource, roomContent, selectedEpisode, selectedAnimeEpisode]);

  // ── Room setup ───────────────────────────────────────────────────────────────

  const setupChannel = useCallback((code, asHost) => {
    const channel = supabase.channel(`astro-${code}`, {
      config: { presence: { key: myUsername } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const parts = Object.values(state).flat().map((p) => ({
          username: p.username || p.presence_ref || 'Anónimo',
          status: p.status || 'idle',
          isHost: p.isHost || false,
        }));
        setParticipants(parts.length ? parts : [{ username: myUsername, status: 'idle', isHost: asHost }]);

        const hostPresence = Object.values(state).flat().find((p) => p.isHost);
        if (hostPresence && !isHostRef.current) {
          if (hostPresence.step)         setRoomStep(hostPresence.step);
          if (hostPresence.source)       setRoomSource(hostPresence.source);
          if (hostPresence.content)      setRoomContent(hostPresence.content);
          if (hostPresence.episode)      setSelectedEpisode(hostPresence.episode);
          if (hostPresence.animeEpisode) setSelectedAnimeEpisode(hostPresence.animeEpisode);
        }

        const hostPresent = Object.values(state).flat().some((p) => p.isHost);
        if (prevHostRef.current && !hostPresent && !isHostRef.current) {
          setSyncBanner({ text: 'El host abandonó la sala', type: 'pause' });
          setTimeout(() => setSyncBanner(null), 8000);
        }
        prevHostRef.current = hostPresent;
      })
      .on('broadcast', { event: 'astro_sync' }, ({ payload }) => {
        if (!payload) return;

        if (payload.type === 'countdown_start') {
          setSyncState('counting');
          setSyncBanner(null);
        }
        if (payload.type === 'sync_go') {
          setSyncState('synced');
          setCountdown(null);
          setMyStatus('watching');
          if (!asHost) {
            setSyncBanner({ text: 'Dale PLAY ahora!', type: 'go' });
            setTimeout(() => setSyncBanner(null), 4000);
          }
        }
        if (payload.type === 'pause') {
          setSyncState('paused');
          setMyStatus('idle');
          const label = payload.timestamp ? ` en ${payload.timestamp}` : '';
          setSyncBanner({ text: `Host pausó${label} — detente`, type: 'pause' });
          setTimeout(() => setSyncBanner(null), 6000);
        }
        if (payload.type === 'resume') {
          setSyncState('synced');
          setMyStatus('watching');
          const label = payload.timestamp ? ` desde ${payload.timestamp}` : '';
          setSyncBanner({ text: `Host reanudó${label} — dale play`, type: 'resume' });
          setTimeout(() => setSyncBanner(null), 5000);
        }
        if (payload.type === 'time_check') {
          setSyncBanner({ text: `Estamos en el minuto ${payload.timestamp}`, type: 'time' });
          setTimeout(() => setSyncBanner(null), 6000);
        }
        if (payload.type === 'episode_change') {
          setSelectedEpisode(payload.episode);
        }

        // Internal player sync events
        if (payload.type === 'play') {
          setExternalPlayerState({ playing: true, currentTime: payload.time });
          if (!asHost) setSyncBanner({ text: 'El host dio play', type: 'go' });
          setTimeout(() => setSyncBanner(null), 2000);
        }
        if (payload.type === 'pause_player') {
          setExternalPlayerState({ playing: false, currentTime: payload.time });
          if (!asHost) setSyncBanner({ text: 'El host pausó', type: 'pause' });
          setTimeout(() => setSyncBanner(null), 3000);
        }
        if (payload.type === 'seek') {
          setExternalPlayerState((prev) => ({ ...prev, currentTime: payload.time }));
        }
        if (payload.type === 'start_watch') {
          if (!isHostRef.current) {
            setRoomStep('watching');
            if (payload.sourceUrl) {
              setStreamSources([{ url: payload.sourceUrl, format: payload.format || 'hls' }]);
            }
            if (payload.youtubeId) {
              setRoomContent((prev) => (prev ? { ...prev, youtubeId: payload.youtubeId } : { title: 'YouTube', type: 'movie', youtubeId: payload.youtubeId }));
            }
          }
        }

        if (payload.type === 'session_end') {
          setSyncBanner({ text: 'El host terminó la sesión', type: 'pause' });
          setTimeout(() => {
            setSyncBanner(null);
            setView('search');
            setRoomStep('source');
            setRoomContent(null);
            setRoomSource(null);
            setSyncState('idle');
            setStreamSources([]);
          }, 3000);
        }
      })
      .on('broadcast', { event: 'astro_chat' }, ({ payload }) => {
        if (!payload) return;
        setMessages((prev) => [...prev, payload]);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            username: myUsername,
            status: 'idle',
            isHost: asHost,
            step: asHost ? 'source' : undefined,
            source: null,
            content: null,
            episode: { season: 1, episode: 1 },
          });
        }
      });

    channelRef.current = channel;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUsername]);

  const createRoom = useCallback(async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
    setIsHost(true);
    isHostRef.current = true;
    setSyncState('idle');
    setMyStatus('idle');
    setMessages([]);
    setRoomStep('source');
    setRoomSource(null);
    setRoomContent(null);
    setSelectedEpisode({ season: 1, episode: 1 });
    setStreamSources([]);
    setStreamError(null);
    setupChannel(code, true);
    setView('room');
    window.history.pushState({}, '', `?room=${code}`);
  }, [setupChannel]);

  const joinRoom = useCallback(async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) { toast.error('Ingresa un código válido'); return; }
    setRoomCode(code);
    setIsHost(false);
    isHostRef.current = false;
    setSyncState('idle');
    setMyStatus('idle');
    setMessages([]);
    setupChannel(code, false);
    setView('room');
  }, [joinCode, setupChannel]);

  // Auto-join
  const hasAutoJoinedRef = useRef(false);
  useEffect(() => {
    if (joinCode && !hasAutoJoinedRef.current && view === 'search') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room')) {
        hasAutoJoinedRef.current = true;
        setTimeout(() => joinRoom(), 50);
      }
    }
  }, [joinCode, view, joinRoom]);

  // ── Host step helpers ────────────────────────────────────────────────────────

  const hostChooseSource = useCallback((source) => {
    setRoomSource(source);
    setRoomStep('title');
    setTitleQuery('');
    setTitleResults([]);
    setRoomTitle('');
    setAnimeSearchResults([]);
    setYoutubeUrl('');
    channelRef.current?.track({
      username: myUsername, isHost: true, status: myStatus,
      step: 'title', source, content: null, episode: selectedEpisode,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUsername, myStatus, selectedEpisode]);

  const hostChooseContent = useCallback((content) => {
    setRoomContent(content);
    if (content.type === 'series') {
      setRoomStep('episode');
      setSelectedEpisode({ season: 1, episode: 1 });
      channelRef.current?.track({
        username: myUsername, isHost: true, status: myStatus,
        step: 'episode', source: roomSource, content, episode: { season: 1, episode: 1 },
      });
    } else {
      setRoomStep('ready');
      setSyncState('idle');
      channelRef.current?.track({
        username: myUsername, isHost: true, status: myStatus,
        step: 'ready', source: roomSource, content, episode: selectedEpisode,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUsername, myStatus, roomSource, selectedEpisode]);

  const hostConfirmEpisode = useCallback(() => {
    setRoomStep('ready');
    setSyncState('idle');
    channelRef.current?.track({
      username: myUsername, isHost: true, status: myStatus,
      step: 'ready', source: roomSource, content: roomContent, episode: selectedEpisode,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUsername, myStatus, roomSource, roomContent, selectedEpisode]);

  // ── Sync countdown (honor system) ───────────────────────────────────────────

  const startSync = useCallback(() => {
    if (syncState !== 'idle' && syncState !== 'paused') return;
    setSyncState('counting');
    let count = 5;
    setCountdown(count);
    broadcastSync({ type: 'countdown_start' });
    clearInterval(countdownTimer.current);
    countdownTimer.current = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownTimer.current);
        setSyncState('synced');
        setMyStatus('watching');
        setCountdown(null);
        broadcastSync({ type: 'sync_go' });
      }
    }, 1000);
  }, [syncState, broadcastSync]);

  const pauseSync = useCallback(() => {
    setSyncState('paused');
    setMyStatus('idle');
    broadcastSync({ type: 'pause', timestamp: currentTimestamp || null });
    setSyncBanner({ text: `Pausaste${currentTimestamp ? ` en ${currentTimestamp}` : ''} — avisando...`, type: 'pause' });
    setTimeout(() => setSyncBanner(null), 3000);
  }, [broadcastSync, currentTimestamp]);

  const resumeSync = useCallback(() => {
    setSyncState('synced');
    setMyStatus('watching');
    broadcastSync({ type: 'resume', timestamp: currentTimestamp || null });
  }, [broadcastSync, currentTimestamp]);

  const markReady = useCallback(async () => {
    const newStatus = myStatus === 'ready' ? 'idle' : 'ready';
    setMyStatus(newStatus);
    await channelRef.current?.track({ username: myUsername, status: newStatus, isHost });
  }, [myStatus, myUsername, isHost]);

  const sendTimeCheck = useCallback(() => {
    if (!currentTimestamp.trim()) { toast.error('Ingresa el minuto actual (ej: 14:32)'); return; }
    broadcastSync({ type: 'time_check', timestamp: currentTimestamp });
    toast.success(`Enviaste el minuto ${currentTimestamp} a la sala`);
  }, [currentTimestamp, broadcastSync]);

  // ── Chat ─────────────────────────────────────────────────────────────────────

  const sendMessage = useCallback(() => {
    const text = chatInput.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { username: myUsername, text, time: Date.now(), own: true }]);
    broadcastChat(text);
    setChatInput('');
  }, [chatInput, myUsername, broadcastChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Reactions ────────────────────────────────────────────────────────────────

  const sendReaction = useCallback((emoji) => {
    const id = Date.now() + Math.random();
    const x  = 10 + Math.random() * 80;
    setFloatingEmojis((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => setFloatingEmojis((prev) => prev.filter((e) => e.id !== id)), 2500);
  }, []);

  const copyRoomCode = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast.success('URL copiada al portapapeles');
    });
  }, []);

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearInterval(countdownTimer.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: SEARCH VIEW (lobby)
  // ─────────────────────────────────────────────────────────────────────────────

  if (view === 'search') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: '#07070f' }}>
        {onClose && (
          <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
            <X size={16} />
          </button>
        )}
        <div className="flex flex-col items-center gap-10 px-6 w-full max-w-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-violet-600 flex items-center justify-center shadow-[0_0_32px_rgba(124,58,237,0.7)]">
              <Rocket size={30} className="text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-white font-black text-3xl tracking-tight leading-none">AstroParty</h1>
              <p className="text-white/30 text-xs tracking-widest uppercase mt-1">Watch Together</p>
            </div>
          </div>
          <div className="flex flex-col gap-4 w-full">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={createRoom}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-base bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_28px_rgba(124,58,237,0.5)] hover:shadow-[0_0_40px_rgba(124,58,237,0.7)] transition-all"
            >
              <Rocket size={20} />
              Crear sala
            </motion.button>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-violet-500/50 transition-colors">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 8))}
                onKeyDown={(e) => e.key === 'Enter' && joinCode.length >= 4 && joinRoom()}
                placeholder="Código de sala"
                className="flex-1 bg-transparent text-white placeholder-white/25 text-sm font-mono tracking-widest focus:outline-none"
              />
              <button
                onClick={joinRoom}
                disabled={joinCode.length < 4}
                className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${joinCode.length >= 4 ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'text-white/20 cursor-not-allowed'}`}
              >
                Unirse
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ROOM VIEW helpers
  // ─────────────────────────────────────────────────────────────────────────────

  const contentTitle   = roomContent?.title || roomTitle || 'Sin contenido';
  const readyCount     = participants.filter((p) => p.status === 'ready').length;
  const totalCount     = participants.length;

  // ─── SyncButton (honor system only) ─────────────────────────────────────────

  const SyncButton = () => {
    if (!isHost) {
      return (
        <div className="flex flex-col items-center gap-3 w-full">
          {syncState === 'counting' && (
            <AnimatePresence mode="wait">
              <motion.div
                key={countdown}
                initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="text-7xl font-black text-white"
                style={{ textShadow: '0 0 40px rgba(124,58,237,0.8)' }}
              >
                {countdown === 0 ? '🚀' : countdown}
              </motion.div>
            </AnimatePresence>
          )}
          {syncState === 'synced' && roomSource && roomSource.type === 'external' && (
            <a
              href={PLATFORM_LINKS[roomSource.id]?.(contentTitle) || '#'}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm transition-all hover:brightness-110"
              style={{ backgroundColor: roomSource.color, boxShadow: `0 0 20px ${roomSource.color}66` }}
            >
              Abrir en {roomSource.label} <ExternalLink size={14} />
            </a>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={markReady}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${myStatus === 'ready' ? 'bg-green-500/20 border border-green-500/40 text-green-400' : 'bg-white/5 border border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'}`}
          >
            <Check size={15} strokeWidth={2.5} />
            {myStatus === 'ready' ? '¡Listo!' : 'Marcarme listo'}
          </motion.button>
          {syncState === 'idle' && (
            <p className="text-white/25 text-xs text-center">Esperando que el host inicie</p>
          )}
        </div>
      );
    }

    if (syncState === 'idle' || syncState === 'paused') {
      return (
        <div className="flex flex-col items-center gap-3 w-full">
          {syncState === 'idle' && totalCount > 1 && (
            <div className="flex items-center gap-2 mb-1">
              <div className="flex -space-x-1">
                {participants.filter((p) => p.status === 'ready').slice(0, 4).map((p, i) => (
                  <div key={i} className="w-6 h-6 rounded-full ring-2 ring-[#07070f] flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: avatarColor(p.username) }}>
                    {p.username.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
              <span className={`text-xs font-bold ${readyCount === totalCount ? 'text-green-400' : 'text-white/40'}`}>{readyCount}/{totalCount} listos</span>
            </div>
          )}
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={syncState === 'paused' ? resumeSync : startSync}
            animate={{ boxShadow: ['0 0 20px rgba(124,58,237,0.4)', '0 0 40px rgba(124,58,237,0.7)', '0 0 20px rgba(124,58,237,0.4)'] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-violet-600 to-violet-500 rounded-2xl font-black text-white text-base"
          >
            <Rocket size={20} />
            {syncState === 'paused' ? 'Reanudar AstroSync' : 'Iniciar AstroSync'}
          </motion.button>
        </div>
      );
    }

    if (syncState === 'counting') {
      return (
        <div className="flex flex-col items-center gap-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={countdown}
              initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="text-7xl font-black text-white"
              style={{ textShadow: '0 0 40px rgba(124,58,237,0.8)' }}
            >
              {countdown === 0 ? '🚀' : countdown}
            </motion.div>
          </AnimatePresence>
          <p className="text-white/40 text-sm font-semibold tracking-widest uppercase">Sincronizando...</p>
        </div>
      );
    }

    if (syncState === 'synced') {
      return (
        <div className="flex flex-col items-center gap-3 w-full">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2 text-green-400 font-black text-lg">
            <Check size={22} strokeWidth={3} /> ¡A ver!
          </motion.div>
          {roomSource && roomSource.type === 'external' && (
            <a
              href={PLATFORM_LINKS[roomSource.id]?.(contentTitle) || '#'}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm hover:brightness-110 active:scale-95 transition-all"
              style={{ backgroundColor: roomSource.color, boxShadow: `0 0 20px ${roomSource.color}66` }}
            >
              Abrir en {roomSource.label} <ExternalLink size={14} />
            </a>
          )}
          <div className="flex items-center gap-2 w-full">
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex-1">
              <Clock size={12} className="text-white/30 flex-shrink-0" />
              <input type="text" value={currentTimestamp} onChange={(e) => setCurrentTimestamp(e.target.value)} placeholder="14:32" className="bg-transparent text-white/70 text-xs w-full focus:outline-none placeholder-white/20" />
            </div>
            <button onClick={sendTimeCheck} className="px-3 py-2 bg-cyan-600/20 border border-cyan-500/30 rounded-xl text-cyan-400 text-xs font-bold hover:bg-cyan-600/30 transition-all whitespace-nowrap">
              <Bell size={12} className="inline mr-1" />Avisar
            </button>
          </div>
          <button onClick={pauseSync} className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs transition-colors">
            <Pause size={12} /> Pausar para todos
          </button>
          <button onClick={() => setShowRating(true)} className="text-white/20 hover:text-white/40 text-[10px] mt-1 transition-colors">
            Terminar sesión
          </button>
        </div>
      );
    }

    return null;
  };

  // ─── Step: Source picker ─────────────────────────────────────────────────────

  const StepSource = () => (
    <motion.div
      key="step-source"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
      className="flex flex-col items-center gap-6 w-full max-w-sm"
    >
      <div className="text-center">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Paso 1</p>
        <h2 className="text-white font-black text-xl">Elegir fuente</h2>
        <p className="text-white/30 text-xs mt-1">¿Dónde van a ver juntos?</p>
      </div>
      <div className="grid grid-cols-2 gap-3 w-full sm:grid-cols-3">
        {SOURCES.map((s) => (
          <motion.button
            key={s.id}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => hostChooseSource(s)}
            className="relative flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-white/5 border border-white/10 transition-all duration-200 hover:border-white/30 focus:outline-none"
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = `0 0 24px ${s.color}55`;
              e.currentTarget.style.borderColor = `${s.color}88`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '';
              e.currentTarget.style.borderColor = '';
            }}
          >
            <span style={{ color: s.color }}>{SOURCE_LOGOS_LG[s.id]}</span>
            <span className="text-white font-bold text-sm">{s.label}</span>
            {s.type === 'internal' && (
              <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/30 text-violet-300">Integrado</span>
            )}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );

  // ─── Step: Title search ──────────────────────────────────────────────────────

  const StepTitle = () => {
    const isInternal = roomSource?.type === 'internal';
    const isYoutube  = roomSource?.type === 'youtube';
    const isExternal = roomSource?.type === 'external';

    const handleAnimeInput = (q) => {
      setTitleQuery(q);
      clearTimeout(animeTimeout.current);
      if (!q.trim()) { setAnimeSearchResults([]); return; }
      animeTimeout.current = setTimeout(() => searchAnime(q), 400);
    };

    const handleAnimeSelect = async (result) => {
      const info = await fetchAnimeInfo(result.id, result.provider);
      if (info && info.episodes?.length) {
        setEpisodesList(info.episodes);
      }
      const content = {
        id: result.id,
        title: result.title,
        type: 'series',
        poster_path: null,
        animeImage: result.image,
        year: '',
        provider: result.provider,
        animeId: result.id,
      };
      setRoomContent(content);
      setRoomStep('episode');
      channelRef.current?.track({
        username: myUsername, isHost: true, status: myStatus,
        step: 'episode', source: roomSource, content, episode: { season: 1, episode: 1 },
      });
    };

    const handleYoutubeContinue = () => {
      const videoId = extractYoutubeId(youtubeUrl);
      if (!videoId) { toast.error('URL de YouTube no válida'); return; }
      const content = { title: 'YouTube', type: 'movie', youtubeId: videoId };
      setRoomContent(content);
      setRoomStep('ready');
      setSyncState('idle');
      channelRef.current?.track({
        username: myUsername, isHost: true, status: myStatus,
        step: 'ready', source: roomSource, content, episode: selectedEpisode,
      });
    };

    return (
      <motion.div
        key="step-title"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
        className="flex flex-col gap-5 w-full max-w-md"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRoomStep('source')}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors flex-shrink-0"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <p className="text-white/40 text-xs uppercase tracking-widest">Paso 2</p>
            <h2 className="text-white font-black text-lg leading-tight">
              Elegir contenido
              {roomSource && (
                <span className="ml-2 text-sm font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: roomSource.color + '33', color: roomSource.color }}>
                  {SOURCE_LOGOS[roomSource.id]}
                  {roomSource.label}
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* Anime internal */}
        {isInternal && (
          <>
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              <input
                type="text"
                value={titleQuery}
                onChange={(e) => handleAnimeInput(e.target.value)}
                placeholder="Buscar anime..."
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-violet-500/60 transition-all"
              />
            </div>
            {animeSearchLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={24} className="animate-spin text-violet-400" />
              </div>
            )}
            {!animeSearchLoading && animeSearchResults.length > 0 && (
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                {animeSearchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnimeSelect(r)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/10 transition-all text-left"
                  >
                    {r.image ? (
                      <img src={r.image} alt={r.title} className="w-10 h-14 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className={`w-10 h-14 rounded-lg bg-gradient-to-br ${gradientForTitle(r.title)} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white/30 text-lg font-black">{r.title?.charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold truncate">{r.title}</p>
                      <p className="text-violet-400 text-[11px] font-semibold mt-0.5">{r.provider}</p>
                      <div className="flex gap-1 mt-1">
                        {r.hasSub && <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold">SUB</span>}
                        {r.hasDub && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">DUB</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {!animeSearchLoading && titleQuery && animeSearchResults.length === 0 && (
              <div className="text-center py-8 text-white/25">
                <Search size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Sin resultados para "{titleQuery}"</p>
              </div>
            )}
            {!titleQuery && (
              <p className="text-white/25 text-xs text-center mt-2">Escribe el nombre de un anime para buscar</p>
            )}
          </>
        )}

        {/* YouTube */}
        {isYoutube && (
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Youtube size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-red-500/60 transition-all"
              />
            </div>
            {youtubeUrl && extractYoutubeId(youtubeUrl) && (
              <div className="rounded-2xl overflow-hidden border border-white/10">
                <img
                  src={`https://img.youtube.com/vi/${extractYoutubeId(youtubeUrl)}/hqdefault.jpg`}
                  alt="YouTube thumbnail"
                  className="w-full aspect-video object-cover"
                />
              </div>
            )}
            <button
              onClick={handleYoutubeContinue}
              disabled={!youtubeUrl.trim()}
              className={`w-full py-3 rounded-2xl font-bold text-sm transition-all ${youtubeUrl.trim() ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
            >
              Continuar
            </button>
          </div>
        )}

        {/* External (TMDB or manual) */}
        {isExternal && (
          <>
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              <input
                type="text"
                value={titleQuery}
                onChange={(e) => setTitleQuery(e.target.value)}
                placeholder="Buscar título..."
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-violet-500/60 transition-all"
              />
            </div>
            {TMDB_KEY ? (
              <>
                {titleResults.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto">
                    {titleResults.map((item) => {
                      const mapped = {
                        id: item.id, title: getTitle(item),
                        type: item.media_type === 'tv' ? 'series' : 'movie',
                        poster_path: item.poster_path, year: getYear(item),
                        name: item.name, media_type: item.media_type,
                        first_air_date: item.first_air_date, release_date: item.release_date,
                      };
                      return <PosterCard key={item.id} item={item} selected={false} onSelect={() => hostChooseContent(mapped)} />;
                    })}
                  </div>
                )}
                {titleQuery && titleResults.length === 0 && (
                  <div className="text-center py-8 text-white/25">
                    <Search size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Sin resultados para "{titleQuery}"</p>
                  </div>
                )}
                {!titleQuery && <p className="text-white/25 text-xs text-center mt-2">Escribe un título para buscar</p>}
              </>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-white/40 text-xs text-center">TMDB no disponible — ingresa el título manualmente</p>
                <input
                  type="text" value={roomTitle} onChange={(e) => setRoomTitle(e.target.value)}
                  placeholder="Ej: Attack on Titan"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-violet-500/60 transition-all"
                />
                <div className="flex gap-2">
                  {[{ id: 'movie', label: 'Película', icon: <Film size={14} /> }, { id: 'series', label: 'Serie', icon: <Tv size={14} /> }].map((opt) => (
                    <button
                      key={opt.id} onClick={() => setManualType(opt.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${manualType === opt.id ? 'bg-violet-600 text-white shadow-[0_0_14px_rgba(124,58,237,0.4)]' : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/70'}`}
                    >
                      {opt.icon}{opt.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    if (!roomTitle.trim()) { toast.error('Escribe un título'); return; }
                    hostChooseContent({ id: Date.now(), title: roomTitle.trim(), type: manualType, poster_path: null, year: '' });
                  }}
                  disabled={!roomTitle.trim()}
                  className={`w-full py-3 rounded-2xl font-bold text-sm transition-all ${roomTitle.trim() ? 'bg-violet-600 hover:bg-violet-500 text-white' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
                >
                  Continuar con "{roomTitle || '...'}"
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    );
  };

  // ─── Step: Episode picker ────────────────────────────────────────────────────

  const StepEpisode = () => {
    const isInternal = roomSource?.type === 'internal';

    return (
      <motion.div
        key="step-episode"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
        className="flex flex-col items-center gap-6 w-full max-w-md text-center"
      >
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Paso 3</p>
          <h2 className="text-white font-black text-xl">Elegir episodio</h2>
          {roomSource && (
            <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: roomSource.color + '33', color: roomSource.color }}>
              {SOURCE_LOGOS[roomSource.id]}
              {roomSource.label}
            </span>
          )}
          {roomContent && <p className="text-white/60 text-sm mt-2 font-semibold">{roomContent.title}</p>}
        </div>

        {/* Anime episode list */}
        {isInternal && episodesList.length > 0 && (
          <div className="w-full max-h-72 overflow-y-auto flex flex-col gap-1.5">
            {episodesList.map((ep, i) => (
              <button
                key={i}
                onClick={() => {
                  const animeEp = { id: ep.id, number: ep.number, provider: ep.provider || roomContent?.provider };
                  setSelectedAnimeEpisode(animeEp);
                  setRoomStep('ready');
                  setSyncState('idle');
                  channelRef.current?.track({
                    username: myUsername, isHost: true, status: myStatus,
                    step: 'ready', source: roomSource, content: roomContent,
                    episode: selectedEpisode, animeEpisode: animeEp,
                  });
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/10 transition-all text-left"
              >
                <span className="text-white/30 text-xs font-mono w-8 flex-shrink-0">
                  {String(ep.number).padStart(2, '0')}
                </span>
                <span className="text-white text-sm font-medium flex-1 truncate">
                  {ep.title || `Episodio ${ep.number}`}
                </span>
                <ChevronRight size={14} className="text-white/20 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* External T/E controls */}
        {!isInternal && (
          <>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <span className="text-white/40 text-[11px] uppercase tracking-widest">Temporada</span>
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl px-2 py-2">
                  <button onClick={() => setSelectedEpisode((e) => ({ ...e, season: Math.max(1, e.season - 1) }))} className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-white font-black text-2xl w-10 text-center">{selectedEpisode.season}</span>
                  <button onClick={() => setSelectedEpisode((e) => ({ ...e, season: e.season + 1 }))} className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-white/40 text-[11px] uppercase tracking-widest">Episodio</span>
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl px-2 py-2">
                  <button onClick={() => setSelectedEpisode((e) => ({ ...e, episode: Math.max(1, e.episode - 1) }))} className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-white font-black text-2xl w-10 text-center">{selectedEpisode.episode}</span>
                  <button onClick={() => setSelectedEpisode((e) => ({ ...e, episode: e.episode + 1 }))} className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
            <p className="text-white/30 text-sm">T{selectedEpisode.season} · E{selectedEpisode.episode}</p>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={hostConfirmEpisode}
              className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-2xl text-sm shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all"
            >
              Confirmar episodio
            </motion.button>
          </>
        )}
      </motion.div>
    );
  };

  // ─── Step: Ready ─────────────────────────────────────────────────────────────

  const StepReady = () => {
    const isInternal = roomSource?.type === 'internal';
    const isYoutube  = roomSource?.type === 'youtube';
    const isExternal = roomSource?.type === 'external';

    const handleStart = async () => {
      if (isInternal) {
        if (!selectedAnimeEpisode?.id) { toast.error('No hay episodio seleccionado'); return; }
        const provider = selectedAnimeEpisode.provider || roomContent?.provider;
        const sources  = await fetchStreamSources(selectedAnimeEpisode.id, provider);
        if (sources) {
          setRoomStep('watching');
          broadcastSync({ type: 'start_watch', sourceUrl: sources[0].url, format: sources[0].format || 'hls', time: 0 });
        }
      } else if (isYoutube) {
        setRoomStep('watching');
        broadcastSync({ type: 'start_watch', youtubeId: roomContent?.youtubeId, time: 0 });
      } else {
        // External: honor system countdown → watching
        startSync();
        setRoomStep('watching');
      }
    };

    const poster = roomContent?.poster_path
      ? `${TMDB_IMG}${roomContent.poster_path}`
      : roomContent?.animeImage || null;

    return (
      <motion.div
        key="step-ready"
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
        className="flex flex-col items-center gap-5 w-full max-w-xs text-center"
      >
        {poster ? (
          <img src={poster} alt={contentTitle} className="w-36 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.7)] ring-1 ring-white/10" />
        ) : (
          <div className={`w-36 aspect-[2/3] rounded-2xl bg-gradient-to-br ${gradientForTitle(contentTitle)} flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.7)] ring-1 ring-white/10`}>
            <span className="text-6xl font-black text-white/30">{contentTitle.charAt(0)}</span>
          </div>
        )}

        <div>
          <h2 className="text-white font-black text-xl tracking-tight leading-tight">{contentTitle}</h2>
          {roomContent?.year && <p className="text-white/40 text-xs mt-0.5">{roomContent.year}</p>}
          {roomSource && (
            <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: roomSource.color }}>
              {SOURCE_LOGOS[roomSource.id]}
              {roomSource.label}
            </span>
          )}
          {selectedAnimeEpisode && (
            <p className="text-white/40 text-xs mt-1.5">Episodio {selectedAnimeEpisode.number}</p>
          )}
          {!selectedAnimeEpisode && roomContent?.type === 'series' && (
            <p className="text-white/40 text-xs mt-1.5">Temporada {selectedEpisode.season} · Episodio {selectedEpisode.episode}</p>
          )}
        </div>

        {participants.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {participants.slice(0, 6).map((p, i) => <Avatar key={i} name={p.username} size={9} status={p.status} />)}
            {participants.length > 6 && (
              <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 text-xs font-bold">+{participants.length - 6}</div>
            )}
          </div>
        )}

        {isHost ? (
          <div className="flex flex-col items-center gap-3 w-full">
            {streamError && (
              <p className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{streamError}</p>
            )}
            <motion.button
              whileHover={{ scale: streamLoading ? 1 : 1.04 }}
              whileTap={{ scale: streamLoading ? 1 : 0.96 }}
              onClick={handleStart}
              disabled={streamLoading}
              animate={streamLoading ? {} : { boxShadow: ['0 0 20px rgba(124,58,237,0.4)', '0 0 40px rgba(124,58,237,0.7)', '0 0 20px rgba(124,58,237,0.4)'] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-violet-600 to-violet-500 rounded-2xl font-black text-white text-base disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {streamLoading ? <Loader2 size={20} className="animate-spin" /> : <Rocket size={20} />}
              {streamLoading ? 'Cargando...' : 'Iniciar Watch Party'}
            </motion.button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center"
            >
              <Rocket size={22} className="text-violet-400" />
            </motion.div>
            <p className="text-white font-semibold text-sm">El host está preparando la sesión<AnimatedDots /></p>
          </div>
        )}
      </motion.div>
    );
  };

  // ─── Step: Watching ──────────────────────────────────────────────────────────

  const StepWatching = () => {
    const isInternal = roomSource?.type === 'internal';
    const isYoutube  = roomSource?.type === 'youtube';
    const isExternal = roomSource?.type === 'external';

    if (isInternal) {
      return (
        <div className="flex flex-col h-full">
          {streamSources.length > 1 && isHost && (
            <div className="flex gap-2 px-4 pt-3 pb-1 flex-wrap flex-shrink-0">
              {streamSources.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSourceIdx(i)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeSourceIdx === i ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/50 border border-white/10'}`}
                >
                  {src.server || src.quality || `Fuente ${i + 1}`}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 relative min-h-0 p-4">
            {streamSources[activeSourceIdx] ? (
              <AnimePlayer
                source={streamSources[activeSourceIdx]}
                subtitles={streamSubtitles}
                isHost={isHost}
                externalState={externalPlayerState}
                onPlay={(time) => broadcastSync({ type: 'play', time })}
                onPause={(time) => broadcastSync({ type: 'pause_player', time })}
                onSeek={(time) => broadcastSync({ type: 'seek', time })}
                countdown={syncState === 'counting' ? countdown : null}
                floatingEmojis={floatingEmojis}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 size={32} className="animate-spin text-violet-400 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">Cargando video...</p>
                </div>
              </div>
            )}
          </div>
          <div className="px-4 py-2 flex items-center justify-between border-t border-white/5 flex-shrink-0">
            <div>
              <span className="text-white font-bold text-sm">{roomContent?.title}</span>
              {selectedAnimeEpisode && (
                <span className="text-white/40 text-xs ml-2">Ep. {selectedAnimeEpisode.number}</span>
              )}
            </div>
            {isHost && (
              <button onClick={() => setShowRating(true)} className="text-white/20 hover:text-white/40 text-xs transition-colors">
                Terminar sesión
              </button>
            )}
          </div>
        </div>
      );
    }

    if (isYoutube) {
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 relative">
            <div className="relative w-full aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${roomContent?.youtubeId}?autoplay=1`}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="YouTube player"
              />
            </div>
          </div>
          <div className="px-4 py-2 flex items-center justify-between border-t border-white/5 flex-shrink-0">
            <p className="text-white/40 text-xs">YouTube — sincronía manual entre participantes</p>
            {isHost && (
              <button onClick={() => setShowRating(true)} className="text-white/20 hover:text-white/40 text-xs transition-colors">
                Terminar sesión
              </button>
            )}
          </div>
        </div>
      );
    }

    // External honor system
    return (
      <div className="flex flex-col items-center gap-5 w-full max-w-xs text-center p-6">
        <div>
          <h2 className="text-white font-black text-xl">{contentTitle}</h2>
          {roomSource && (
            <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: roomSource.color }}>
              {SOURCE_LOGOS[roomSource.id]}
              {roomSource.label}
            </span>
          )}
        </div>
        {roomSource && roomSource.type === 'external' && (
          <a
            href={PLATFORM_LINKS[roomSource.id]?.(contentTitle) || '#'}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm hover:brightness-110 transition-all"
            style={{ backgroundColor: roomSource.color, boxShadow: `0 0 20px ${roomSource.color}66` }}
          >
            Abrir en {roomSource.label} <ExternalLink size={14} />
          </a>
        )}
        <SyncButton />
      </div>
    );
  };

  // ─── Guest waiting ───────────────────────────────────────────────────────────

  const GuestWaiting = () => (
    <motion.div key="guest-waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 text-center">
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center"
      >
        {roomSource ? (
          <span style={{ color: roomSource.color }}>{SOURCE_LOGOS_LG[roomSource.id]}</span>
        ) : (
          <Rocket size={22} className="text-violet-400" />
        )}
      </motion.div>
      <div>
        <p className="text-white font-black text-lg">
          {roomStep === 'source' && <>El host está eligiendo la fuente<AnimatedDots /></>}
          {roomStep === 'title'  && <>El host está buscando contenido<AnimatedDots /></>}
          {roomStep === 'episode' && <>El host está eligiendo el episodio<AnimatedDots /></>}
        </p>
        {roomSource && (
          <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: roomSource.color + '33', color: roomSource.color }}>
            {SOURCE_LOGOS[roomSource.id]}
            {roomSource.label}
          </span>
        )}
        {roomContent && <p className="text-white/50 text-sm mt-1 font-semibold">{roomContent.title}</p>}
      </div>
    </motion.div>
  );

  const GuestReady = () => (
    <motion.div key="guest-ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 text-center p-6">
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center"
      >
        <Rocket size={22} className="text-violet-400" />
      </motion.div>
      <div>
        <p className="text-white font-black text-lg">El host está preparando la sesión<AnimatedDots /></p>
        <p className="text-white/40 text-sm mt-1">Un momento más...</p>
      </div>
    </motion.div>
  );

  // ─── ContentStage ────────────────────────────────────────────────────────────

  const ContentStage = () => {
    const isWatching = roomStep === 'watching';
    return (
      <div className={`relative flex-1 flex flex-col ${isWatching ? '' : 'items-center justify-center'} overflow-hidden min-h-0 ${isWatching ? '' : 'p-6'}`}>
        {!isWatching && (
          <>
            {roomContent?.poster_path ? (
              <img src={`${TMDB_IMG}${roomContent.poster_path}`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15 blur-2xl scale-110 pointer-events-none" />
            ) : roomContent?.animeImage ? (
              <img src={roomContent.animeImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-10 blur-2xl scale-110 pointer-events-none" />
            ) : roomSource ? (
              <div className="absolute inset-0 opacity-5 blur-2xl pointer-events-none" style={{ background: `radial-gradient(ellipse at center, ${roomSource.color}, transparent)` }} />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-violet-900 to-indigo-900 opacity-10 blur-2xl pointer-events-none" />
            )}
          </>
        )}

        <div className={`relative z-10 flex flex-col ${isWatching ? 'h-full' : 'items-center'} w-full`}>
          <AnimatePresence mode="wait">
            {isHost ? (
              <>
                {roomStep === 'source'    && <StepSource />}
                {roomStep === 'title'     && <StepTitle />}
                {roomStep === 'episode'   && <StepEpisode />}
                {roomStep === 'ready'     && <StepReady />}
                {roomStep === 'watching'  && <StepWatching />}
              </>
            ) : (
              <>
                {(roomStep === 'source' || roomStep === 'title' || roomStep === 'episode') && <GuestWaiting />}
                {roomStep === 'ready'    && <GuestReady />}
                {roomStep === 'watching' && <StepWatching />}
              </>
            )}
          </AnimatePresence>
        </div>

        {!isWatching && (
          <>
            <AnimatePresence>
              {syncBanner && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 px-5 py-3 rounded-2xl font-bold text-sm shadow-xl backdrop-blur-md border whitespace-nowrap
                    ${syncBanner.type === 'go'     ? 'bg-green-500/20 border-green-500/40 text-green-300'
                    : syncBanner.type === 'pause'  ? 'bg-red-500/20 border-red-500/40 text-red-300'
                    : syncBanner.type === 'resume' ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    :                               'bg-violet-500/20 border-violet-500/40 text-violet-300'}`}
                >
                  {syncBanner.text}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <AnimatePresence>
                {floatingEmojis.map((e) => <FloatingEmoji key={e.id} {...e} />)}
              </AnimatePresence>
            </div>
          </>
        )}

        <AnimatePresence>
          {showRating && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="bg-[#0f0f1a] border border-white/10 rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl"
              >
                <div className="text-4xl mb-3">🎬</div>
                <h3 className="text-white font-black text-xl mb-1">¿Qué tal estuvo?</h3>
                <p className="text-white/40 text-sm mb-6">{contentTitle}</p>
                <div className="flex justify-center gap-2 mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setMyRating(star)} className={`text-3xl transition-transform hover:scale-110 active:scale-95 ${myRating >= star ? '' : 'opacity-30'}`}>
                      ⭐
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setShowRating(false);
                    broadcastSync({ type: 'session_end' });
                    setView('search');
                    setRoomStep('source');
                    setRoomContent(null);
                    setRoomSource(null);
                    setSyncState('idle');
                    setStreamSources([]);
                  }}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-bold text-sm transition-colors"
                >
                  {myRating > 0 ? `${myRating} estrellas y hasta la próxima!` : 'Terminar sin calificar'}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ── Social panel ──────────────────────────────────────────────────────────────

  const SocialPanel = () => (
    <div className="flex flex-col h-full" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="px-4 pt-4 pb-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-white/40" />
            <span className="text-white/60 text-xs font-semibold">{participants.length} en sala</span>
          </div>
          <button onClick={copyRoomCode} className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-2.5 py-1 transition-colors group">
            <span className="text-white/60 text-[11px] font-mono font-bold tracking-wider group-hover:text-white transition-colors">{roomCode}</span>
            <Copy size={11} className="text-white/30 group-hover:text-white/60 transition-colors" />
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-2 max-h-28 overflow-y-auto">
          {participants.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <Avatar name={p.username} size={7} status={p.status} />
              <span className="text-white/70 text-xs font-medium flex-1 truncate">{p.username}</span>
              {p.isHost && <Crown size={11} className="text-yellow-400 flex-shrink-0" />}
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${p.status === 'ready' ? 'text-green-400 bg-green-400/10' : p.status === 'watching' ? 'text-yellow-400 bg-yellow-400/10' : 'text-white/30 bg-white/5'}`}>
                {STATUS_LABEL[p.status] || 'Inactivo'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5 min-h-0">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <MessageSquare size={28} className="text-white/10 mb-2" />
            <p className="text-white/20 text-xs">Sin mensajes aún</p>
            <p className="text-white/15 text-[11px]">¡Rompe el hielo!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.own || msg.username === myUsername;
          return (
            <div key={i} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
              {!isOwn && <Avatar name={msg.username} size={7} />}
              <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {!isOwn && <span className="text-white/35 text-[10px] ml-1">{msg.username}</span>}
                <div className={`px-3 py-2 rounded-2xl text-sm leading-snug ${isOwn ? 'bg-violet-600 text-white rounded-tr-sm' : 'bg-white/5 text-white/80 rounded-tl-sm border border-white/10'}`}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <div className="px-4 py-2 border-t border-white/5 flex-shrink-0">
        <div className="flex items-center justify-around">
          {REACTIONS.map((emoji) => (
            <button key={emoji} onClick={() => sendReaction(emoji)} className="text-xl hover:scale-125 active:scale-110 transition-transform duration-100 select-none">
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 pb-4 pt-2 flex-shrink-0">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 focus-within:border-violet-500/50 transition-colors">
          <input
            type="text" value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Mensaje..."
            className="flex-1 bg-transparent text-white placeholder-white/25 text-sm focus:outline-none"
          />
          <button
            onClick={sendMessage} disabled={!chatInput.trim()}
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${chatInput.trim() ? 'bg-violet-600 hover:bg-violet-500 text-white' : 'bg-white/5 text-white/20'}`}
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: ROOM VIEW
  // ─────────────────────────────────────────────────────────────────────────────

  const isWatching = roomStep === 'watching';
  const contentWidth = isWatching ? '70%' : '60%';
  const chatWidth    = isWatching ? '30%' : '40%';

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#07070f' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <button onClick={() => setView('search')} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shadow-[0_0_12px_rgba(124,58,237,0.5)]">
            <Rocket size={14} className="text-white" />
          </div>
          <span className="text-white font-black text-sm tracking-tight">AstroParty</span>
          {roomName && <span className="text-white/30 text-xs">— {roomName}</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ backgroundColor: avatarColor(myUsername) }}>
              {myUsername.charAt(0).toUpperCase()}
            </div>
            <span className="text-white/70 text-xs font-semibold">{myUsername}</span>
            {isHost && <Crown size={10} className="text-yellow-400" />}
          </div>
          <button onClick={copyRoomCode} className="hidden sm:flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-2.5 py-1.5 text-white/50 hover:text-white transition-all text-xs group">
            <Share2 size={12} />
            <span className="font-mono font-bold tracking-wider">{roomCode}</span>
            <Copy size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          {onClose && (
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Sync banner (watching state) */}
      {isWatching && (
        <AnimatePresence>
          {syncBanner && (
            <motion.div
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className={`absolute top-14 left-1/2 -translate-x-1/2 z-20 px-5 py-3 rounded-2xl font-bold text-sm shadow-xl backdrop-blur-md border whitespace-nowrap
                ${syncBanner.type === 'go'     ? 'bg-green-500/20 border-green-500/40 text-green-300'
                : syncBanner.type === 'pause'  ? 'bg-red-500/20 border-red-500/40 text-red-300'
                : syncBanner.type === 'resume' ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                :                               'bg-violet-500/20 border-violet-500/40 text-violet-300'}`}
            >
              {syncBanner.text}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Main body */}
      <div className="flex-1 overflow-hidden flex">
        {/* Desktop layout */}
        <div className="hidden sm:flex w-full">
          <div className="flex flex-col" style={{ width: contentWidth, borderRight: '1px solid rgba(255,255,255,0.05)' }}>
            <ContentStage />
          </div>
          <div className="flex flex-col" style={{ width: chatWidth }}>
            <SocialPanel />
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="flex sm:hidden flex-col w-full">
          {activeTab === 'content' ? <ContentStage /> : <SocialPanel />}
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="flex sm:hidden border-t border-white/5 flex-shrink-0" style={{ background: '#0d0d1a' }}>
        {[
          { id: 'content', icon: <Rocket size={18} />, label: 'Contenido' },
          { id: 'chat',    icon: <MessageSquare size={18} />, label: 'Chat' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${activeTab === tab.id ? 'text-violet-400' : 'text-white/30 hover:text-white/50'}`}
          >
            {tab.icon}
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default memo(AstroPartyPage);
