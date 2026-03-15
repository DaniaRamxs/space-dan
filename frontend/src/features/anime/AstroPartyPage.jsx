import React, {
  useState, useEffect, useRef, useCallback, memo, useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Users, MessageSquare, Copy, Rocket, Play, Pause,
  X, Check, Send, Crown, ChevronLeft, ChevronRight, Clock,
  Bell, Film, Tv, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';
import AnimePlayer from './AnimePlayer';

// ─── Constants ────────────────────────────────────────────────────────────────

const API_URL  = import.meta.env.VITE_API_URL || '';
const TMDB_KEY = import.meta.env.VITE_TMDB_KEY;
const TMDB_IMG = 'https://image.tmdb.org/t/p/w342';

const SOURCES = [
  { id: 'netflix',     label: 'Netflix',     color: '#E50914', type: 'external' },
  { id: 'crunchyroll', label: 'Crunchyroll', color: '#F47521', type: 'external' },
  { id: 'disney',      label: 'Disney+',     color: '#113CCF', type: 'external' },
  { id: 'prime',       label: 'Prime Video', color: '#00A8E0', type: 'external' },
  { id: 'hbo',         label: 'HBO Max',     color: '#5822b4', type: 'external' },
  { id: 'anime',       label: 'Anime',       color: '#7c3aed', type: 'internal' },
  { id: 'youtube',     label: 'YouTube',     color: '#FF0000', type: 'youtube'  },
];

const PLATFORM_LOGOS_SM = {
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
  hbo: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M4 6h4v12H4V6zm6 0h4v5h-4V6zm0 7h4v5h-4v-5zm6-7h4v12h-4V6z"/>
    </svg>
  ),
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
};

const PLATFORM_LOGOS_LG = {
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
  hbo: (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
      <path d="M4 6h4v12H4V6zm6 0h4v5h-4V6zm0 7h4v5h-4v-5zm6-7h4v12h-4V6z"/>
    </svg>
  ),
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
};

const REACTIONS = ['😂', '🔥', '😱', '❤️', '👏', '🎉'];
const AVATAR_COLORS = ['#7c3aed', '#22d3ee', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const STATUS_RING  = { ready: 'ring-green-400', watching: 'ring-yellow-400', idle: 'ring-gray-600' };
const STATUS_LABEL = { ready: 'Listo', watching: 'Viendo', idle: 'Inactivo' };

const extractYoutubeId = (url) =>
  url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1] || null;

// ─── Micro components ─────────────────────────────────────────────────────────

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

const Avatar = memo(({ name, size = 10, status }) => (
  <div className="relative flex-shrink-0">
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold text-sm
        ${status ? `ring-2 ${STATUS_RING[status] || STATUS_RING.idle}` : ''}`}
      style={{
        backgroundColor: avatarColor(name),
        width: `${size * 4}px`,
        height: `${size * 4}px`,
        fontSize: size <= 7 ? '11px' : '14px',
      }}
    >
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  </div>
));

const FloatingEmoji = memo(({ emoji, id, x }) => (
  <motion.div
    key={id}
    initial={{ opacity: 1, y: 0, scale: 1 }}
    animate={{ opacity: 0, y: -160, scale: 1.4 }}
    transition={{ duration: 2.2, ease: 'easeOut' }}
    className="absolute bottom-16 pointer-events-none text-3xl select-none z-50"
    style={{ left: `${x}%` }}
  >
    {emoji}
  </motion.div>
));

const SearchResultItem = memo(({ item, onSelect }) => (
  <motion.button
    whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
    onClick={() => onSelect(item)}
    className="flex items-center gap-3 w-full px-4 py-3 text-left transition-colors rounded-xl"
  >
    {(item.poster_path || item.animeImage) ? (
      <img
        src={item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : item.animeImage}
        alt={item.title}
        className="rounded-lg object-cover flex-shrink-0"
        style={{ width: 48, height: 64 }}
        loading="lazy"
      />
    ) : (
      <div
        className="rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0"
        style={{ width: 48, height: 64 }}
      >
        <span className="text-white/30 font-black text-lg">{item.title?.charAt(0)}</span>
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-white font-semibold text-sm truncate">{item.title}</p>
      <div className="flex items-center gap-2 mt-0.5">
        {item.year && <span className="text-white/40 text-xs">{item.year}</span>}
        {item.vote_average > 0 && (
          <span className="text-white/40 text-xs">★ {Number(item.vote_average).toFixed(1)}</span>
        )}
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full
          ${item.type === 'series'
            ? 'bg-violet-500/20 text-violet-300'
            : 'bg-cyan-500/20 text-cyan-300'}`}>
          {item.type === 'series' ? 'Serie' : 'Película'}
        </span>
      </div>
    </div>
    <ChevronRight size={14} className="text-white/20 flex-shrink-0" />
  </motion.button>
));

// ─── Main Component ───────────────────────────────────────────────────────────

const AstroPartyPage = ({ onClose, roomName }) => {
  const { profile } = useAuthContext();

  // ── Views & steps ────────────────────────────────────────────────────────────
  const [view, setView]         = useState('lobby');
  const [roomStep, setRoomStep] = useState('platform');
  // 'platform' | 'search' | 'episode' | 'loading' | 'watching'

  // ── Source / content ─────────────────────────────────────────────────────────
  const [roomSource, setRoomSource]   = useState(null);
  const [roomContent, setRoomContent] = useState(null);
  const [episodesList, setEpisodesList]         = useState([]);
  const [selectedEpisode, setSelectedEpisode]   = useState({ season: 1, episode: 1 });
  const [selectedAnimeEp, setSelectedAnimeEp]   = useState(null);

  // ── Stream ───────────────────────────────────────────────────────────────────
  const [streamSources, setStreamSources]     = useState([]);
  const [activeSourceIdx, setActiveSourceIdx] = useState(0);
  const [streamSubtitles, setStreamSubtitles] = useState([]);
  const [streamError, setStreamError]         = useState(null);

  // ── Search ───────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // ── External player sync ─────────────────────────────────────────────────────
  const [externalPlayerState, setExternalPlayerState] = useState({});

  // ── Room ─────────────────────────────────────────────────────────────────────
  const [roomCode, setRoomCode]   = useState('');
  const [joinCode, setJoinCode]   = useState('');
  const [isHost, setIsHost]       = useState(false);
  const [syncState, setSyncState] = useState('idle');
  const [countdown, setCountdown] = useState(null);
  const [syncBanner, setSyncBanner]     = useState(null);
  const [currentTimestamp, setCurrentTimestamp] = useState('');
  const [myStatus, setMyStatus]         = useState('idle');

  // ── Social ───────────────────────────────────────────────────────────────────
  const [participants, setParticipants]   = useState([]);
  const [messages, setMessages]           = useState([]);
  const [chatInput, setChatInput]         = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState([]);

  // ── Mobile ───────────────────────────────────────────────────────────────────
  const [mobileTab, setMobileTab] = useState('player');

  // ── Rating ───────────────────────────────────────────────────────────────────
  const [showRating, setShowRating] = useState(false);
  const [myRating, setMyRating]     = useState(0);

  // ── YouTube manual input ─────────────────────────────────────────────────────
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const chatEndRef       = useRef(null);
  const channelRef       = useRef(null);
  const searchTimeout    = useRef(null);
  const countdownTimer   = useRef(null);
  const isHostRef        = useRef(isHost);
  const prevHostRef      = useRef(true);
  const hasAutoJoinedRef = useRef(false);

  const myUsername = profile?.username || profile?.email?.split('@')[0] || 'Tú';

  useEffect(() => { isHostRef.current = isHost; }, [isHost]);

  // Auto-join from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) setJoinCode(roomParam.toUpperCase());
  }, []);

  // ── Broadcast ────────────────────────────────────────────────────────────────

  const broadcastSync = useCallback((payload) => {
    channelRef.current?.send({ type: 'broadcast', event: 'astro_sync', payload });
  }, []);

  const broadcastChat = useCallback((text) => {
    channelRef.current?.send({
      type: 'broadcast', event: 'astro_chat',
      payload: { username: myUsername, text, time: Date.now() },
    });
  }, [myUsername]);

  // ── Presence tracking ────────────────────────────────────────────────────────

  const trackPresence = useCallback((overrides = {}) => {
    if (!channelRef.current) return;
    channelRef.current.track({
      username: myUsername,
      isHost: isHostRef.current,
      status: myStatus,
      step: roomStep,
      source: roomSource,
      content: roomContent,
      episode: selectedEpisode,
      animeEp: selectedAnimeEp,
      ...overrides,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUsername, myStatus, roomStep, roomSource, roomContent, selectedEpisode, selectedAnimeEp]);

  // ── Channel setup ────────────────────────────────────────────────────────────

  const setupChannel = useCallback((code, asHost) => {
    const channel = supabase.channel(`astro-${code}`, {
      config: { presence: { key: myUsername } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const parts = Object.values(state).flat().map((p) => ({
          username: p.username || p.presence_ref || 'Anónimo',
          status:   p.status  || 'idle',
          isHost:   p.isHost  || false,
        }));
        setParticipants(parts.length ? parts : [{ username: myUsername, status: 'idle', isHost: asHost }]);

        const hostPresence = Object.values(state).flat().find((p) => p.isHost);
        if (hostPresence && !isHostRef.current) {
          if (hostPresence.step)    setRoomStep(hostPresence.step);
          if (hostPresence.source)  setRoomSource(hostPresence.source);
          if (hostPresence.content) setRoomContent(hostPresence.content);
          if (hostPresence.episode) setSelectedEpisode(hostPresence.episode);
          if (hostPresence.animeEp) setSelectedAnimeEp(hostPresence.animeEp);
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
        if (payload.type === 'play') {
          setExternalPlayerState({ playing: true, currentTime: payload.time });
          if (!asHost) {
            setSyncBanner({ text: 'El host dio play', type: 'go' });
            setTimeout(() => setSyncBanner(null), 2000);
          }
        }
        if (payload.type === 'pause_player') {
          setExternalPlayerState({ playing: false, currentTime: payload.time });
          if (!asHost) {
            setSyncBanner({ text: 'El host pausó', type: 'pause' });
            setTimeout(() => setSyncBanner(null), 3000);
          }
        }
        if (payload.type === 'seek') {
          setExternalPlayerState((prev) => ({ ...prev, currentTime: payload.time }));
        }
        if (payload.type === 'start_watch') {
          if (!isHostRef.current) {
            if (payload.sourceUrl) {
              setStreamSources([{ url: payload.sourceUrl, format: payload.format || 'hls' }]);
            }
            if (payload.youtubeId) {
              setRoomContent((prev) => ({
                ...(prev || {}),
                youtubeId: payload.youtubeId,
              }));
            }
            setRoomStep('watching');
          }
        }
        if (payload.type === 'session_end') {
          setSyncBanner({ text: 'El host terminó la sesión', type: 'pause' });
          setTimeout(() => {
            setSyncBanner(null);
            setView('lobby');
            setRoomStep('platform');
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
            status:   'idle',
            isHost:   asHost,
            step:     asHost ? 'platform' : undefined,
            source:   null,
            content:  null,
            episode:  { season: 1, episode: 1 },
          });
        }
      });

    channelRef.current = channel;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUsername]);

  // ── Room create / join ────────────────────────────────────────────────────────

  const createRoom = useCallback(async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
    setIsHost(true);
    isHostRef.current = true;
    setSyncState('idle');
    setMyStatus('idle');
    setMessages([]);
    setRoomStep('platform');
    setRoomSource(null);
    setRoomContent(null);
    setSelectedEpisode({ season: 1, episode: 1 });
    setStreamSources([]);
    setStreamError(null);
    setSearchQuery('');
    setSearchResults([]);
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

  // Auto-join from URL
  useEffect(() => {
    if (joinCode && !hasAutoJoinedRef.current && view === 'lobby') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room')) {
        hasAutoJoinedRef.current = true;
        setTimeout(() => joinRoom(), 50);
      }
    }
  }, [joinCode, view, joinRoom]);

  // ── Search ───────────────────────────────────────────────────────────────────

  const performSearch = useCallback(async (q) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      if (roomSource?.type === 'internal') {
        const res  = await fetch(`${API_URL}/api/anime-multi/search/${encodeURIComponent(q)}`);
        const data = await res.json();
        const results = (Array.isArray(data) ? data : data.data || []).slice(0, 15).map((a) => ({
          id:         a.id,
          title:      a.title,
          type:       'series',
          poster_path: null,
          animeImage: a.image,
          provider:   a.provider || (a.source || '').toLowerCase().replace(/\s/g, ''),
          year:       '',
          media_type: 'tv',
        }));
        setSearchResults(results);
      } else if (TMDB_KEY) {
        const res  = await fetch(
          `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=es-ES&include_adult=false`
        );
        const data = await res.json();
        const results = (data.results || [])
          .filter((x) => x.media_type === 'tv' || x.media_type === 'movie')
          .slice(0, 15)
          .map((x) => ({
            id:           x.id,
            title:        x.title || x.name,
            type:         x.media_type === 'tv' ? 'series' : 'movie',
            poster_path:  x.poster_path,
            year:         (x.first_air_date || x.release_date || '').slice(0, 4),
            vote_average: x.vote_average,
            media_type:   x.media_type,
          }));
        setSearchResults(results);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [roomSource]);

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(() => performSearch(searchQuery), 400);
    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery, performSearch]);

  // ── Host step helpers ─────────────────────────────────────────────────────────

  const goToSearch = useCallback((source) => {
    setRoomSource(source);
    setRoomStep('search');
    setSearchQuery('');
    setSearchResults([]);
    setYoutubeUrl('');
    trackPresence({ step: 'search', source });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectContent = useCallback(async (content) => {
    setRoomContent(content);
    if (content.type === 'series') {
      if (roomSource?.type === 'internal') {
        try {
          const res  = await fetch(`${API_URL}/api/anime-multi/info/${content.id}/${content.provider}`);
          const data = await res.json();
          setEpisodesList(data.episodes || []);
        } catch {
          setEpisodesList([]);
        }
      }
      setRoomStep('episode');
      trackPresence({ step: 'episode', content });
    } else {
      await startLoading(content, null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomSource]);

  const startLoading = useCallback(async (content, episodeInfo) => {
    const src = roomSource;
    setRoomStep('loading');
    setStreamError(null);
    trackPresence({ step: 'loading', content, episode: episodeInfo });

    if (src?.type === 'internal' && episodeInfo) {
      try {
        const res  = await fetch(
          `${API_URL}/api/anime-multi/episodes/${episodeInfo.id}/${episodeInfo.provider || content?.provider}`
        );
        const data = await res.json();
        if (data.success && data.data?.sources?.length) {
          setStreamSources(data.data.sources);
          setStreamSubtitles(data.data.subtitles || []);
          setActiveSourceIdx(0);
          broadcastSync({
            type: 'start_watch',
            sourceUrl: data.data.sources[0].url,
            format: data.data.sources[0].format || 'hls',
          });
          setRoomStep('watching');
          trackPresence({ step: 'watching' });
        } else {
          setStreamError('No se encontraron fuentes de video.');
        }
      } catch (e) {
        setStreamError(e.message || 'Error al cargar el video.');
      }
    } else if (src?.type === 'youtube' && content?.youtubeId) {
      broadcastSync({ type: 'start_watch', youtubeId: content.youtubeId });
      setRoomStep('watching');
      trackPresence({ step: 'watching' });
    } else if (src?.type === 'youtube' && youtubeUrl) {
      const vid = extractYoutubeId(youtubeUrl);
      if (!vid) { setStreamError('URL de YouTube no válida'); return; }
      const updated = { ...(content || {}), youtubeId: vid, title: content?.title || 'YouTube' };
      setRoomContent(updated);
      broadcastSync({ type: 'start_watch', youtubeId: vid });
      setRoomStep('watching');
      trackPresence({ step: 'watching' });
    } else {
      // External honor system
      broadcastSync({ type: 'start_watch', honorSystem: true });
      setRoomStep('watching');
      trackPresence({ step: 'watching' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomSource, youtubeUrl, broadcastSync]);

  // ── Sync countdown ────────────────────────────────────────────────────────────

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
    const next = myStatus === 'ready' ? 'idle' : 'ready';
    setMyStatus(next);
    await channelRef.current?.track({ username: myUsername, status: next, isHost });
  }, [myStatus, myUsername, isHost]);

  const sendTimeCheck = useCallback(() => {
    if (!currentTimestamp.trim()) { toast.error('Ingresa el minuto actual (ej: 14:32)'); return; }
    broadcastSync({ type: 'time_check', timestamp: currentTimestamp });
    toast.success(`Enviaste el minuto ${currentTimestamp} a la sala`);
  }, [currentTimestamp, broadcastSync]);

  // ── Chat & reactions ──────────────────────────────────────────────────────────

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
      clearTimeout(searchTimeout.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const contentTitle = roomContent?.title || 'Sin contenido';
  const readyCount   = participants.filter((p) => p.status === 'ready').length;
  const totalCount   = participants.length;

  // ─────────────────────────────────────────────────────────────────────────────
  // LOBBY VIEW
  // ─────────────────────────────────────────────────────────────────────────────

  if (view === 'lobby') {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ background: '#0a0a0f' }}
      >
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        )}

        <div className="flex flex-col items-center gap-10 px-6 w-full max-w-sm">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <motion.div
              animate={{ boxShadow: ['0 0 24px rgba(124,58,237,0.5)', '0 0 48px rgba(124,58,237,0.8)', '0 0 24px rgba(124,58,237,0.5)'] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center"
            >
              <Rocket size={24} className="text-white" />
            </motion.div>
            <div className="text-center">
              <h1 className="text-white font-black text-3xl tracking-tight leading-none">AstroParty</h1>
              <p className="text-white/30 text-xs tracking-widest uppercase mt-1">Watch Together</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-4 w-full">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={createRoom}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-full font-black text-base text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                boxShadow: '0 0 28px rgba(124,58,237,0.5)',
              }}
            >
              <Rocket size={20} />
              Crear sala
            </motion.button>

            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-transparent border border-white/15 rounded-full px-4 py-3 focus-within:border-violet-500/50 transition-colors">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 8))}
                  onKeyDown={(e) => e.key === 'Enter' && joinCode.length >= 4 && joinRoom()}
                  placeholder="Código de sala"
                  className="flex-1 bg-transparent text-white placeholder-white/25 text-sm font-mono tracking-widest focus:outline-none"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={joinRoom}
                disabled={joinCode.length < 4}
                className={`px-5 py-3 rounded-full text-sm font-bold transition-all border
                  ${joinCode.length >= 4
                    ? 'border-violet-500/60 text-violet-300 hover:bg-violet-500/10'
                    : 'border-white/10 text-white/20 cursor-not-allowed'}`}
              >
                Unirse
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ROOM INNER COMPONENTS (defined inside so they close over state)
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── Room Header ─────────────────────────────────────────────────────────────

  const RoomHeader = () => (
    <div
      className="flex items-center justify-between px-4 flex-shrink-0 border-b border-white/5"
      style={{ height: 48, background: '#0a0a0f' }}
    >
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setView('lobby')}
          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
        >
          <ChevronLeft size={15} />
        </button>
        <div className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center shadow-[0_0_10px_rgba(124,58,237,0.5)]">
          <Rocket size={12} className="text-white" />
        </div>
        <span className="text-white font-black text-sm tracking-tight">AstroParty</span>
        {roomName && <span className="text-white/30 text-xs hidden sm:inline">— {roomName}</span>}
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2 py-1">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
            style={{ backgroundColor: avatarColor(myUsername), fontSize: 10 }}
          >
            {myUsername.charAt(0).toUpperCase()}
          </div>
          <span className="text-white/70 text-xs font-semibold">{myUsername}</span>
          {isHost && <Crown size={10} className="text-yellow-400" />}
        </div>
        <button
          onClick={copyRoomCode}
          className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-2.5 py-1 text-white/50 hover:text-white transition-all"
        >
          <span className="text-[11px] font-mono font-bold tracking-wider">{roomCode}</span>
          <Copy size={11} />
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );

  // ─── Step: Platform picker ────────────────────────────────────────────────────

  const StepPlatform = () => (
    <motion.div
      key="step-platform"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="flex flex-col items-center gap-6 w-full max-w-sm"
    >
      <h2 className="text-white font-black text-xl">Donde quieres ver?</h2>

      <div className="grid grid-cols-3 gap-3 w-full">
        {SOURCES.map((s) => (
          <motion.button
            key={s.id}
            whileTap={{ scale: 0.96 }}
            onClick={() => goToSearch(s)}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 transition-all duration-200 focus:outline-none"
            style={{
              height: 80,
              background: `${s.color}22`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = `0 0 20px ${s.color}55`;
              e.currentTarget.style.borderColor = s.color;
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '';
              e.currentTarget.style.borderColor = '';
              e.currentTarget.style.transform = '';
            }}
          >
            <span style={{ color: s.color }}>{PLATFORM_LOGOS_LG[s.id]}</span>
            <span className="text-white font-bold text-xs leading-tight text-center px-1">{s.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );

  // ─── Step: Search ─────────────────────────────────────────────────────────────

  const StepSearch = () => {
    const isYoutube = roomSource?.type === 'youtube';
    const noTmdb    = roomSource?.type === 'external' && !TMDB_KEY;

    const handleYoutubeProceed = () => {
      const vid = extractYoutubeId(youtubeUrl);
      if (!vid) { toast.error('URL de YouTube no válida'); return; }
      const content = { id: vid, title: 'YouTube', type: 'movie', youtubeId: vid };
      startLoading(content, null);
    };

    return (
      <motion.div
        key="step-search"
        initial={{ opacity: 0, x: 32 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -32 }}
        className="flex flex-col gap-4 w-full max-w-md h-full"
      >
        {/* Header row */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRoomStep('platform')}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors flex-shrink-0"
          >
            <ChevronLeft size={16} />
          </button>
          {roomSource && (
            <div className="flex items-center gap-2">
              <span style={{ color: roomSource.color }}>{PLATFORM_LOGOS_SM[roomSource.id]}</span>
              <span className="text-white font-bold text-sm">Buscar en {roomSource.label}</span>
            </div>
          )}
        </div>

        {/* YouTube special case */}
        {isYoutube && (
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
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
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleYoutubeProceed}
              disabled={!youtubeUrl.trim()}
              className={`w-full py-3 rounded-2xl font-bold text-sm transition-all
                ${youtubeUrl.trim() ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
            >
              Continuar
            </motion.button>
          </div>
        )}

        {/* No TMDB fallback for external */}
        {noTmdb && (
          <NoTmdbFallback onSelect={(content) => selectContent(content)} />
        )}

        {/* Normal search */}
        {!isYoutube && !noTmdb && (
          <>
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar una serie o pelicula..."
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-violet-500/60 transition-all"
              />
            </div>

            {searchLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={24} className="animate-spin text-violet-400" />
              </div>
            )}

            {!searchLoading && searchResults.length > 0 && (
              <div className="flex flex-col overflow-y-auto" style={{ maxHeight: 380 }}>
                {searchResults.map((item, i) => (
                  <SearchResultItem key={`${item.id}-${i}`} item={item} onSelect={selectContent} />
                ))}
              </div>
            )}

            {!searchLoading && searchQuery && searchResults.length === 0 && (
              <div className="text-center py-10 text-white/25">
                <Search size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Sin resultados para "{searchQuery}"</p>
              </div>
            )}

            {!searchQuery && (
              <p className="text-white/25 text-xs text-center mt-2">
                Escribe para buscar
              </p>
            )}
          </>
        )}
      </motion.div>
    );
  };

  // ─── No TMDB fallback ─────────────────────────────────────────────────────────

  const NoTmdbFallback = ({ onSelect }) => {
    const [manualTitle, setManualTitle] = useState('');
    const [manualType, setManualType]   = useState('movie');
    return (
      <div className="flex flex-col gap-4">
        <p className="text-white/40 text-xs text-center">Ingresa el título manualmente</p>
        <input
          type="text"
          value={manualTitle}
          onChange={(e) => setManualTitle(e.target.value)}
          placeholder="Ej: Breaking Bad"
          autoFocus
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-violet-500/60 transition-all"
        />
        <div className="flex gap-2">
          {[{ id: 'movie', label: 'Película', icon: <Film size={14} /> }, { id: 'series', label: 'Serie', icon: <Tv size={14} /> }].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setManualType(opt.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all
                ${manualType === opt.id
                  ? 'bg-violet-600 text-white shadow-[0_0_14px_rgba(124,58,237,0.4)]'
                  : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/70'}`}
            >
              {opt.icon}{opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            if (!manualTitle.trim()) { toast.error('Escribe un título'); return; }
            onSelect({ id: Date.now(), title: manualTitle.trim(), type: manualType, poster_path: null, year: '' });
          }}
          disabled={!manualTitle.trim()}
          className={`w-full py-3 rounded-2xl font-bold text-sm transition-all
            ${manualTitle.trim()
              ? 'bg-violet-600 hover:bg-violet-500 text-white'
              : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
        >
          Continuar con "{manualTitle || '...'}"
        </button>
      </div>
    );
  };

  // ─── Step: Episode picker ─────────────────────────────────────────────────────

  const StepEpisode = () => {
    const isInternal = roomSource?.type === 'internal';
    const poster     = roomContent?.animeImage || null;

    return (
      <motion.div
        key="step-episode"
        initial={{ opacity: 0, x: 32 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -32 }}
        className="flex flex-col gap-5 w-full max-w-xs"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRoomStep('search')}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors flex-shrink-0"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            {roomSource && (
              <span style={{ color: roomSource.color }}>{PLATFORM_LOGOS_SM[roomSource.id]}</span>
            )}
            <span className="text-white font-black text-base truncate">
              {roomContent?.title || 'Episodio'}
            </span>
          </div>
        </div>

        {poster && (
          <img
            src={poster}
            alt={roomContent?.title}
            className="rounded-xl object-cover shadow-xl ring-1 ring-white/10 mx-auto"
            style={{ width: 80, height: 120 }}
          />
        )}

        {/* Anime: scrollable episode list */}
        {isInternal && (
          <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: 320 }}>
            {episodesList.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={22} className="animate-spin text-violet-400" />
              </div>
            )}
            {episodesList.map((ep, i) => (
              <motion.button
                key={i}
                whileHover={{ backgroundColor: 'rgba(124,58,237,0.12)' }}
                onClick={() => {
                  const animeEp = {
                    id: ep.id,
                    number: ep.number,
                    provider: ep.provider || roomContent?.provider,
                  };
                  setSelectedAnimeEp(animeEp);
                  startLoading(roomContent, animeEp);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/5 hover:border-violet-500/30 transition-all text-left"
              >
                <span className="text-white/30 text-xs font-mono w-8 flex-shrink-0">
                  {String(ep.number).padStart(2, '0')}
                </span>
                <span className="text-white text-sm font-medium flex-1 truncate">
                  {ep.title || `Episodio ${ep.number}`}
                </span>
                <ChevronRight size={14} className="text-white/20 flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        )}

        {/* External: T/E controls + Ver button */}
        {!isInternal && (
          <div className="flex flex-col items-center gap-5">
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <span className="text-white/40 text-[10px] uppercase tracking-widest">Temporada</span>
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl px-2 py-2">
                  <button
                    onClick={() => setSelectedEpisode((e) => ({ ...e, season: Math.max(1, e.season - 1) }))}
                    className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-white font-black text-2xl w-10 text-center">{selectedEpisode.season}</span>
                  <button
                    onClick={() => setSelectedEpisode((e) => ({ ...e, season: e.season + 1 }))}
                    className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className="text-white/40 text-[10px] uppercase tracking-widest">Episodio</span>
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl px-2 py-2">
                  <button
                    onClick={() => setSelectedEpisode((e) => ({ ...e, episode: Math.max(1, e.episode - 1) }))}
                    className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-white font-black text-2xl w-10 text-center">{selectedEpisode.episode}</span>
                  <button
                    onClick={() => setSelectedEpisode((e) => ({ ...e, episode: e.episode + 1 }))}
                    className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => startLoading(roomContent, null)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-white text-base transition-all"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                boxShadow: '0 0 20px rgba(124,58,237,0.4)',
              }}
            >
              <Play size={18} className="fill-white" />
              Ver
            </motion.button>
          </div>
        )}
      </motion.div>
    );
  };

  // ─── Step: Loading ─────────────────────────────────────────────────────────────

  const StepLoading = () => (
    <motion.div
      key="step-loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-4 text-center"
    >
      <div className="relative w-16 h-16">
        <div
          className="absolute inset-0 rounded-full border-4 border-transparent animate-spin"
          style={{ borderTopColor: '#7c3aed' }}
        />
        <div className="absolute inset-2 rounded-full bg-violet-600/10 flex items-center justify-center">
          <Rocket size={18} className="text-violet-400" />
        </div>
      </div>
      <div>
        <p className="text-white font-black text-lg">Cargando stream...</p>
        <p className="text-white/40 text-sm mt-1">
          {roomContent?.title}
          {selectedAnimeEp ? ` • Ep. ${selectedAnimeEp.number}` : ''}
          {!selectedAnimeEp && roomContent?.type === 'series'
            ? ` • T${selectedEpisode.season}E${selectedEpisode.episode}`
            : ''}
        </p>
      </div>
      {streamError && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{streamError}</p>
          <button
            onClick={() => setRoomStep('episode')}
            className="text-white/50 hover:text-white text-xs underline transition-colors"
          >
            Volver a episodios
          </button>
        </div>
      )}
    </motion.div>
  );

  // ─── Step: Watching ───────────────────────────────────────────────────────────

  const StepWatching = () => {
    const isInternal = roomSource?.type === 'internal';
    const isYoutube  = roomSource?.type === 'youtube';

    if (isInternal) {
      return (
        <div className="flex flex-col h-full">
          {streamSources.length > 1 && isHost && (
            <div className="flex gap-2 px-4 pt-3 pb-1 flex-wrap flex-shrink-0">
              {streamSources.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSourceIdx(i)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all
                    ${activeSourceIdx === i ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/50 border border-white/10'}`}
                >
                  {src.server || src.quality || `Fuente ${i + 1}`}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 relative min-h-0 p-3">
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
                <Loader2 size={32} className="animate-spin text-violet-400" />
              </div>
            )}
          </div>
          <div className="px-4 py-2 flex items-center justify-between border-t border-white/5 flex-shrink-0">
            <div>
              <span className="text-white font-bold text-sm">{roomContent?.title}</span>
              {selectedAnimeEp && (
                <span className="text-white/40 text-xs ml-2">Ep. {selectedAnimeEp.number}</span>
              )}
              {roomSource && (
                <span
                  className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: roomSource.color + '33', color: roomSource.color }}
                >
                  {roomSource.label}
                </span>
              )}
            </div>
            {isHost && (
              <button
                onClick={() => setShowRating(true)}
                className="text-white/20 hover:text-white/40 text-xs transition-colors"
              >
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
          <div className="flex-1 relative min-h-0 p-3">
            <div className="relative w-full h-full">
              <iframe
                src={`https://www.youtube.com/embed/${roomContent?.youtubeId}?autoplay=1`}
                className="absolute inset-0 w-full h-full rounded-xl"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="YouTube player"
              />
            </div>
          </div>
          <div className="px-4 py-2 flex items-center justify-between border-t border-white/5 flex-shrink-0">
            <p className="text-white/40 text-xs">YouTube — sincroniza manualmente</p>
            {isHost && (
              <button
                onClick={() => setShowRating(true)}
                className="text-white/20 hover:text-white/40 text-xs transition-colors"
              >
                Terminar sesión
              </button>
            )}
          </div>
        </div>
      );
    }

    // External — honor system in player area
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center relative p-6">
          {/* Platform overlay in player area */}
          <div className="flex flex-col items-center gap-5 max-w-xs text-center w-full">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: roomSource ? (roomSource.color + '22') : 'transparent' }}
            >
              {roomSource && (
                <span style={{ color: roomSource.color }}>
                  {PLATFORM_LOGOS_LG[roomSource.id]}
                </span>
              )}
            </div>
            <div>
              <p className="text-white font-black text-xl">{contentTitle}</p>
              <p className="text-white/50 text-sm mt-1">
                Abre {roomSource?.label} en tu dispositivo
              </p>
              {roomContent?.type === 'series' && (
                <p className="text-white/35 text-xs mt-0.5">
                  T{selectedEpisode.season} · E{selectedEpisode.episode}
                </p>
              )}
            </div>

            {/* AstroSync controls */}
            <div className="w-full">
              <HonorSyncControls />
            </div>
          </div>

          {/* Floating emojis */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <AnimatePresence>
              {floatingEmojis.map((e) => <FloatingEmoji key={e.id} {...e} />)}
            </AnimatePresence>
          </div>
        </div>

        <div className="px-4 py-2 flex items-center justify-between border-t border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-xs font-semibold">{contentTitle}</span>
            {roomSource && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: roomSource.color + '33', color: roomSource.color }}
              >
                {roomSource.label}
              </span>
            )}
          </div>
          {isHost && (
            <button
              onClick={() => setShowRating(true)}
              className="text-white/20 hover:text-white/40 text-xs transition-colors"
            >
              Terminar sesión
            </button>
          )}
        </div>
      </div>
    );
  };

  // ─── Honor sync controls ──────────────────────────────────────────────────────

  const HonorSyncControls = () => {
    if (!isHost) {
      return (
        <div className="flex flex-col items-center gap-3 w-full">
          {syncState === 'counting' && (
            <AnimatePresence mode="wait">
              <motion.div
                key={countdown}
                initial={{ scale: 1.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="text-7xl font-black text-white"
                style={{ textShadow: '0 0 40px rgba(124,58,237,0.8)' }}
              >
                {countdown === 0 ? '🚀' : countdown}
              </motion.div>
            </AnimatePresence>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={markReady}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all
              ${myStatus === 'ready'
                ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                : 'bg-white/5 border border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'}`}
          >
            <Check size={15} strokeWidth={2.5} />
            {myStatus === 'ready' ? 'Listo!' : 'Marcarme listo'}
          </motion.button>
          {syncState === 'idle' && (
            <p className="text-white/25 text-xs">Esperando que el host inicie</p>
          )}
        </div>
      );
    }

    if (syncState === 'counting') {
      return (
        <div className="flex flex-col items-center gap-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={countdown}
              initial={{ scale: 1.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
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
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 text-green-400 font-black text-lg"
          >
            <Check size={22} strokeWidth={3} /> A ver!
          </motion.div>
          <div className="flex items-center gap-2 w-full">
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex-1">
              <Clock size={12} className="text-white/30 flex-shrink-0" />
              <input
                type="text"
                value={currentTimestamp}
                onChange={(e) => setCurrentTimestamp(e.target.value)}
                placeholder="14:32"
                className="bg-transparent text-white/70 text-xs w-full focus:outline-none placeholder-white/20"
              />
            </div>
            <button
              onClick={sendTimeCheck}
              className="px-3 py-2 bg-cyan-600/20 border border-cyan-500/30 rounded-xl text-cyan-400 text-xs font-bold hover:bg-cyan-600/30 transition-all whitespace-nowrap"
            >
              <Bell size={12} className="inline mr-1" />Avisar
            </button>
          </div>
          <button
            onClick={pauseSync}
            className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs transition-colors"
          >
            <Pause size={12} /> Pausar para todos
          </button>
        </div>
      );
    }

    // idle or paused
    return (
      <div className="flex flex-col items-center gap-3 w-full">
        {syncState === 'idle' && totalCount > 1 && (
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold ${readyCount === totalCount ? 'text-green-400' : 'text-white/40'}`}>
              {readyCount}/{totalCount} listos
            </span>
          </div>
        )}
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={syncState === 'paused' ? resumeSync : startSync}
          animate={{ boxShadow: ['0 0 20px rgba(124,58,237,0.4)', '0 0 40px rgba(124,58,237,0.7)', '0 0 20px rgba(124,58,237,0.4)'] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-white text-base"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
        >
          <Rocket size={20} />
          {syncState === 'paused' ? 'Reanudar AstroSync' : 'Iniciar AstroSync'}
        </motion.button>
      </div>
    );
  };

  // ─── Guest waiting ─────────────────────────────────────────────────────────────

  const GuestWaiting = () => {
    const accent = roomSource?.color || '#7c3aed';
    const stepMsg = {
      platform: 'El host está eligiendo la plataforma',
      search:   `El host está buscando en ${roomSource?.label || '...'}`,
      episode:  'El host está eligiendo el episodio',
      loading:  'Preparando la watch party',
    }[roomStep] || 'Esperando al host';

    return (
      <motion.div
        key="guest-waiting"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center border"
          style={{
            backgroundColor: `${accent}22`,
            borderColor: `${accent}55`,
          }}
        >
          {roomSource
            ? <span style={{ color: accent }}>{PLATFORM_LOGOS_LG[roomSource.id]}</span>
            : <Rocket size={22} className="text-violet-400" />}
        </motion.div>
        <div>
          <p className="text-white font-black text-lg">
            {stepMsg}
            {roomStep !== 'loading' && <AnimatedDots />}
          </p>
          {roomStep === 'loading' && (
            <div className="mt-2 flex justify-center">
              <Loader2 size={18} className="animate-spin" style={{ color: accent }} />
            </div>
          )}
          {roomSource && roomStep !== 'platform' && (
            <span
              className="inline-flex items-center gap-1 mt-2 text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${accent}33`, color: accent }}
            >
              {PLATFORM_LOGOS_SM[roomSource.id]}
              {roomSource.label}
            </span>
          )}
          {roomContent && (
            <p className="text-white/50 text-sm mt-1 font-semibold">{roomContent.title}</p>
          )}
        </div>
      </motion.div>
    );
  };

  // ─── Social panel ──────────────────────────────────────────────────────────────

  const SocialPanel = () => (
    <div className="flex flex-col h-full" style={{ background: 'rgba(255,255,255,0.015)' }}>
      {/* Participants */}
      <div className="px-4 pt-4 pb-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-1.5 mb-2">
          <Users size={13} className="text-white/40" />
          <span className="text-white/50 text-xs font-semibold">Participantes ({participants.length})</span>
        </div>
        <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto">
          {participants.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <Avatar name={p.username} size={7} status={p.status} />
              <span className="text-white/70 text-xs font-medium flex-1 truncate">{p.username}</span>
              {p.isHost && <Crown size={11} className="text-yellow-400 flex-shrink-0" />}
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0
                ${p.status === 'ready'    ? 'text-green-400 bg-green-400/10'
                : p.status === 'watching' ? 'text-yellow-400 bg-yellow-400/10'
                : 'text-white/30 bg-white/5'}`}>
                {STATUS_LABEL[p.status] || 'Inactivo'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5 min-h-0">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <MessageSquare size={28} className="text-white/10 mb-2" />
            <p className="text-white/20 text-xs">Sin mensajes aun</p>
            <p className="text-white/15 text-[11px]">Rompe el hielo!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.own || msg.username === myUsername;
          return (
            <div key={i} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
              {!isOwn && <Avatar name={msg.username} size={7} />}
              <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {!isOwn && <span className="text-white/35 text-[10px] ml-1">{msg.username}</span>}
                <div className={`px-3 py-2 rounded-2xl text-sm leading-snug
                  ${isOwn
                    ? 'bg-violet-600 text-white rounded-tr-sm'
                    : 'bg-white/5 text-white/80 rounded-tl-sm border border-white/10'}`}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Reactions bar */}
      <div className="px-4 py-2 border-t border-white/5 flex-shrink-0">
        <div className="flex items-center justify-around">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendReaction(emoji)}
              className="text-xl hover:scale-125 active:scale-110 transition-transform duration-100 select-none"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Chat input */}
      <div className="px-3 pb-4 pt-2 flex-shrink-0">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 focus-within:border-violet-500/50 transition-colors">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Mensaje..."
            className="flex-1 bg-transparent text-white placeholder-white/25 text-sm focus:outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={!chatInput.trim()}
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all
              ${chatInput.trim() ? 'bg-violet-600 hover:bg-violet-500 text-white' : 'bg-white/5 text-white/20'}`}
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Rating modal ─────────────────────────────────────────────────────────────

  const RatingModal = () => (
    <AnimatePresence>
      {showRating && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
            className="rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl border border-white/10"
            style={{ background: '#0f0f1a' }}
          >
            <div className="text-4xl mb-3">🎬</div>
            <h3 className="text-white font-black text-xl mb-1">Que tal estuvo?</h3>
            <p className="text-white/40 text-sm mb-6">{contentTitle}</p>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setMyRating(star)}
                  className={`text-3xl transition-transform hover:scale-110 active:scale-95 ${myRating >= star ? '' : 'opacity-30'}`}
                >
                  ⭐
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowRating(false);
                broadcastSync({ type: 'session_end' });
                setView('lobby');
                setRoomStep('platform');
                setRoomContent(null);
                setRoomSource(null);
                setSyncState('idle');
                setStreamSources([]);
              }}
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-bold text-sm transition-colors"
            >
              {myRating > 0 ? `${myRating} estrellas y hasta la proxima!` : 'Terminar sin calificar'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ─── Sync banner ──────────────────────────────────────────────────────────────

  const SyncBanner = () => (
    <AnimatePresence>
      {syncBanner && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
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
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // ROOM VIEW
  // ─────────────────────────────────────────────────────────────────────────────

  const isWatching = roomStep === 'watching';

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0a0a0f' }}>
      <RoomHeader />

      {/* Body */}
      {!isWatching ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Setup wizard — centered content */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto relative">
            <SyncBanner />
            <AnimatePresence mode="wait">
              {isHost ? (
                <React.Fragment key="host-steps">
                  {roomStep === 'platform' && <StepPlatform />}
                  {roomStep === 'search'   && <StepSearch />}
                  {roomStep === 'episode'  && <StepEpisode />}
                  {roomStep === 'loading'  && <StepLoading />}
                </React.Fragment>
              ) : (
                <GuestWaiting key="guest-waiting" />
              )}
            </AnimatePresence>
          </div>

          {/* Social sidebar — desktop only */}
          <div
            className="hidden lg:flex flex-col border-l border-white/5 flex-shrink-0"
            style={{ width: 280 }}
          >
            <SocialPanel />
          </div>
        </div>
      ) : (
        /* Watching layout */
        <div className="flex-1 flex overflow-hidden">
          {/* Player panel */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <SyncBanner />
            {/* Desktop: full player */}
            <div className="hidden sm:flex flex-col h-full">
              <StepWatching />
            </div>
            {/* Mobile: player or social based on tab */}
            <div className="flex sm:hidden flex-col h-full">
              {mobileTab === 'player' ? <StepWatching /> : <SocialPanel />}
            </div>
          </div>

          {/* Social sidebar — desktop only */}
          <div
            className="hidden lg:flex flex-col border-l border-white/5 flex-shrink-0"
            style={{ width: 280 }}
          >
            <SocialPanel />
          </div>
        </div>
      )}

      {/* Mobile tab bar — only while watching */}
      {isWatching && (
        <div
          className="flex sm:hidden border-t border-white/5 flex-shrink-0"
          style={{ background: '#0a0a0f' }}
        >
          {[
            { id: 'player', icon: <Rocket size={18} />, label: 'Player' },
            { id: 'social', icon: <MessageSquare size={18} />, label: 'Chat' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors
                ${mobileTab === tab.id ? 'text-violet-400' : 'text-white/30 hover:text-white/50'}`}
            >
              {tab.icon}
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      <RatingModal />
    </div>
  );
};

export default memo(AstroPartyPage);
