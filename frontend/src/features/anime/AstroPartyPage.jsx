import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Users, MessageSquare, Copy, ExternalLink,
  Rocket, Play, Pause, X, Check, Send, Crown, Share2, ChevronLeft,
  Clock, Bell,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';

// ─── Constants ────────────────────────────────────────────────────────────────

const TMDB_KEY = import.meta.env.VITE_TMDB_KEY;
const TMDB_IMG = 'https://image.tmdb.org/t/p/w342';

const PLATFORMS = [
  { id: 'netflix',     label: 'Netflix',      color: '#E50914' },
  { id: 'crunchyroll', label: 'Crunchyroll',  color: '#F47521' },
  { id: 'disney',      label: 'Disney+',      color: '#113CCF' },
  { id: 'prime',       label: 'Prime',        color: '#00A8E0' },
  { id: 'hbo',         label: 'HBO Max',      color: '#5822b4' },
];

const PLATFORM_LINKS = {
  netflix:     (t) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}`,
  crunchyroll: (t) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(t)}`,
  disney:      (t) => `https://www.disneyplus.com/search/${encodeURIComponent(t)}`,
  prime:       (t) => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(t)}`,
  hbo:         (t) => `https://www.max.com/search?q=${encodeURIComponent(t)}`,
};

const MOCK_RESULTS = [
  { id: 1,  name: 'Stranger Things',       media_type: 'tv',    poster_path: null, first_air_date: '2016-07-15', vote_average: 8.7 },
  { id: 2,  name: 'The Last of Us',        media_type: 'tv',    poster_path: null, first_air_date: '2023-01-15', vote_average: 8.8 },
  { id: 3,  name: 'Dune: Part Two',        media_type: 'movie', poster_path: null, release_date:   '2024-03-01', vote_average: 8.5 },
  { id: 4,  name: 'Attack on Titan',       media_type: 'tv',    poster_path: null, first_air_date: '2013-04-07', vote_average: 9.0 },
  { id: 5,  name: 'Oppenheimer',           media_type: 'movie', poster_path: null, release_date:   '2023-07-21', vote_average: 8.9 },
  { id: 6,  name: 'Succession',            media_type: 'tv',    poster_path: null, first_air_date: '2018-06-03', vote_average: 8.9 },
  { id: 7,  name: 'Severance',             media_type: 'tv',    poster_path: null, first_air_date: '2022-02-18', vote_average: 8.7 },
  { id: 8,  name: 'Demon Slayer',          media_type: 'tv',    poster_path: null, first_air_date: '2019-04-06', vote_average: 8.7 },
];

const REACTIONS = ['😂', '🔥', '😱', '❤️', '👏', '🎉'];

const AVATAR_COLORS = ['#7c3aed', '#22d3ee', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getYear = (item) => {
  const d = item.first_air_date || item.release_date || '';
  return d.slice(0, 4);
};

const getTitle = (item) => item.title || item.name || 'Untitled';

const gradientForTitle = (title) => {
  const gradients = [
    'from-violet-900 to-indigo-900',
    'from-cyan-900 to-blue-900',
    'from-rose-900 to-pink-900',
    'from-emerald-900 to-teal-900',
    'from-amber-900 to-orange-900',
  ];
  const idx = (title?.charCodeAt(0) || 0) % gradients.length;
  return gradients[idx];
};

const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const STATUS_RING = { ready: 'ring-green-400', watching: 'ring-yellow-400', idle: 'ring-gray-600' };
const STATUS_LABEL = { ready: 'Listo', watching: 'Viendo', idle: 'Inactivo' };

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
          : 'ring-1 ring-white/10 hover:ring-violet-500/40'
        }`}
    >
      {/* Poster */}
      {item.poster_path ? (
        <img
          src={`${TMDB_IMG}${item.poster_path}`}
          alt={title}
          className="w-full aspect-[2/3] object-cover"
          loading="lazy"
        />
      ) : (
        <div className={`w-full aspect-[2/3] bg-gradient-to-br ${gradientForTitle(title)} flex items-center justify-center`}>
          <span className="text-5xl font-black text-white/30 select-none">
            {title.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Overlay info */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-8 pb-3 px-3">
        <p className="text-white text-xs font-bold leading-tight line-clamp-2">{title}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-white/50 text-[10px]">{year}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full
            ${isTV ? 'bg-violet-500/30 text-violet-300' : 'bg-cyan-500/30 text-cyan-300'}`}>
            {isTV ? 'Serie' : 'Película'}
          </span>
        </div>
      </div>

      {/* Selected checkmark */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
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

// ─── Main Component ───────────────────────────────────────────────────────────

const AstroPartyPage = ({ onClose, roomName }) => {
  const { profile } = useAuthContext();

  // View & search
  const [view, setView]                     = useState('search');
  const [query, setQuery]                   = useState('');
  const [searchResults, setSearchResults]   = useState(MOCK_RESULTS);
  const [selectedContent, setSelectedContent] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  // Room
  const [roomCode, setRoomCode]             = useState('');
  const [joinCode, setJoinCode]             = useState('');
  const [isHost, setIsHost]                 = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState({ season: 1, episode: 1 });

  // Sync state machine
  const [syncState, setSyncState]           = useState('idle'); // idle | counting | synced | paused
  const [countdown, setCountdown]           = useState(null);
  const [syncBanner, setSyncBanner]         = useState(null); // { text, type } notification banner
  const [currentTimestamp, setCurrentTimestamp] = useState(''); // manual time input e.g. "14:32"
  const [myStatus, setMyStatus]             = useState('idle'); // idle | ready | watching

  // Social
  const [participants, setParticipants]     = useState([]);
  const [messages, setMessages]             = useState([]);
  const [chatInput, setChatInput]           = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState([]);

  // Mobile
  const [activeTab, setActiveTab]           = useState('content');

  // Refs
  const chatEndRef     = useRef(null);
  const channelRef     = useRef(null);
  const searchTimeout  = useRef(null);
  const countdownTimer = useRef(null);
  const myUsername     = profile?.username || profile?.email?.split('@')[0] || 'Tú';

  // ── TMDB Search ─────────────────────────────────────────────────────────────

  const searchTMDB = useCallback(async (q) => {
    if (!q.trim()) { setSearchResults(MOCK_RESULTS); return; }
    if (!TMDB_KEY) { setSearchResults(MOCK_RESULTS); return; }
    try {
      const res  = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=es-ES&include_adult=false`
      );
      const data = await res.json();
      const filtered = (data.results || [])
        .filter((x) => x.poster_path && (x.media_type === 'tv' || x.media_type === 'movie'))
        .slice(0, 12);
      setSearchResults(filtered.length ? filtered : MOCK_RESULTS);
    } catch {
      setSearchResults(MOCK_RESULTS);
    }
  }, []);

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    if (!query.trim()) { setSearchResults(MOCK_RESULTS); return; }
    searchTimeout.current = setTimeout(() => searchTMDB(query), 400);
    return () => clearTimeout(searchTimeout.current);
  }, [query, searchTMDB]);

  // ── Supabase channel broadcast ───────────────────────────────────────────────

  const broadcastSync = useCallback((payload) => {
    channelRef.current?.send({ type: 'broadcast', event: 'astro_sync', payload });
  }, []);

  const broadcastChat = useCallback((text) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'astro_chat',
      payload: { username: myUsername, text, time: Date.now() },
    });
  }, [myUsername]);

  // ── Room creation ────────────────────────────────────────────────────────────

  const setupChannel = useCallback((code, asHost, content) => {
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
            setSyncBanner({ text: '🚀 ¡Dale PLAY ahora!', type: 'go' });
            setTimeout(() => setSyncBanner(null), 4000);
          }
        }
        if (payload.type === 'pause') {
          setSyncState('paused');
          setMyStatus('idle');
          const label = payload.timestamp ? ` en ${payload.timestamp}` : '';
          setSyncBanner({ text: `⏸ Host pausó${label} — detente`, type: 'pause' });
          setTimeout(() => setSyncBanner(null), 6000);
        }
        if (payload.type === 'resume') {
          setSyncState('synced');
          setMyStatus('watching');
          const label = payload.timestamp ? ` desde ${payload.timestamp}` : '';
          setSyncBanner({ text: `▶ Host reanudó${label} — dale play`, type: 'resume' });
          setTimeout(() => setSyncBanner(null), 5000);
        }
        if (payload.type === 'time_check') {
          setSyncBanner({ text: `🕐 Estamos en el minuto ${payload.timestamp}`, type: 'time' });
          setTimeout(() => setSyncBanner(null), 6000);
        }
      })
      .on('broadcast', { event: 'astro_chat' }, ({ payload }) => {
        if (!payload) return;
        setMessages((prev) => [...prev, payload]);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ username: myUsername, status: 'idle', isHost: asHost });
        }
      });

    channelRef.current = channel;
  }, [myUsername]);

  const createRoom = useCallback(async () => {
    if (!selectedContent) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
    setIsHost(true);
    setSyncState('idle');
    setMyStatus('idle');
    setMessages([]);
    setupChannel(code, true, selectedContent);
    setView('room');
  }, [selectedContent, setupChannel]);

  const joinRoom = useCallback(async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) { toast.error('Ingresa un código válido'); return; }
    setRoomCode(code);
    setIsHost(false);
    setSyncState('idle');
    setMyStatus('idle');
    setMessages([]);
    setSelectedContent(selectedContent || MOCK_RESULTS[0]);
    setupChannel(code, false, selectedContent);
    setView('room');
  }, [joinCode, selectedContent, setupChannel]);

  // ── Sync countdown ───────────────────────────────────────────────────────────

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
    setSyncBanner({ text: `⏸ Pausaste${currentTimestamp ? ` en ${currentTimestamp}` : ''} — avisando...`, type: 'pause' });
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
    const msg = { username: myUsername, text, time: Date.now(), own: true };
    setMessages((prev) => [...prev, msg]);
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

  // ── Copy room code ────────────────────────────────────────────────────────────

  const copyRoomCode = useCallback(() => {
    navigator.clipboard.writeText(roomCode).then(() => {
      toast.success('Código copiado al portapapeles');
    });
  }, [roomCode]);

  // ── Platform toggle ──────────────────────────────────────────────────────────

  const togglePlatform = useCallback((id) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearInterval(countdownTimer.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: SEARCH VIEW
  // ─────────────────────────────────────────────────────────────────────────────

  if (view === 'search') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#07070f' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-8 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-[0_0_16px_rgba(124,58,237,0.6)]">
              <Rocket size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-black text-xl tracking-tight leading-none">AstroParty</h1>
              <p className="text-white/30 text-[11px] tracking-widest uppercase">Watch Together</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Search area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-32">
          <div className="max-w-4xl mx-auto">
            {/* Hero search */}
            <div className="mt-8 mb-6">
              <h2 className="text-white text-2xl sm:text-3xl font-black tracking-tight mb-1">
                ¿Qué vamos a ver?
              </h2>
              <p className="text-white/30 text-sm mb-5">Busca una serie o película para ver juntos</p>

              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Stranger Things, Dune, Attack on Titan..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-white
                    placeholder-white/25 text-sm focus:outline-none focus:border-violet-500/60
                    focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Platform filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              {PLATFORMS.map((p) => {
                const active = selectedPlatforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-150
                      ${active ? 'text-white shadow-lg' : 'text-white/50 bg-white/5 hover:bg-white/10 border border-white/10'}`}
                    style={active ? { backgroundColor: p.color, boxShadow: `0 0 14px ${p.color}55` } : {}}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Results grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {searchResults.map((item) => (
                <PosterCard
                  key={item.id}
                  item={item}
                  selected={selectedContent?.id === item.id}
                  onSelect={setSelectedContent}
                />
              ))}
            </div>

            {searchResults.length === 0 && query && (
              <div className="text-center py-16 text-white/25">
                <Search size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Sin resultados para "{query}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom sticky bar */}
        <div className="fixed bottom-0 inset-x-0 px-4 sm:px-8 pb-6 pt-4"
          style={{ background: 'linear-gradient(to top, #07070f 70%, transparent)' }}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            {selectedContent && (
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 flex-1 min-w-0"
              >
                {selectedContent.poster_path ? (
                  <img
                    src={`${TMDB_IMG}${selectedContent.poster_path}`}
                    alt=""
                    className="w-8 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className={`w-8 h-10 rounded-lg bg-gradient-to-br ${gradientForTitle(getTitle(selectedContent))}
                    flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white/50 text-sm font-black">
                      {getTitle(selectedContent).charAt(0)}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-white text-xs font-bold truncate">{getTitle(selectedContent)}</p>
                  <p className="text-white/40 text-[10px]">{getYear(selectedContent)}</p>
                </div>
                <button
                  onClick={() => setSelectedContent(null)}
                  className="ml-auto text-white/30 hover:text-white/70 flex-shrink-0 transition-colors"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}

            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="Código de sala"
                className="bg-transparent text-white placeholder-white/20 text-sm font-mono tracking-widest w-28 focus:outline-none"
              />
              <button
                onClick={joinRoom}
                disabled={joinCode.length < 4}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all
                  ${joinCode.length >= 4
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                    : 'text-white/20 cursor-not-allowed'}`}
              >
                Unirse
              </button>
            </div>

            <motion.button
              whileHover={selectedContent ? { scale: 1.02 } : {}}
              whileTap={selectedContent ? { scale: 0.97 } : {}}
              onClick={createRoom}
              disabled={!selectedContent}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-200
                ${selectedContent
                  ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_24px_rgba(124,58,237,0.5)] hover:shadow-[0_0_32px_rgba(124,58,237,0.7)]'
                  : 'bg-white/5 text-white/25 cursor-not-allowed border border-white/10'
                }`}
            >
              <Rocket size={16} />
              Crear sala
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: ROOM VIEW
  // ─────────────────────────────────────────────────────────────────────────────

  const contentTitle    = getTitle(selectedContent);
  const primaryPlatform = selectedPlatforms[0];
  const platformInfo    = PLATFORMS.find((p) => p.id === primaryPlatform) || PLATFORMS[0];

  const SyncButton = () => {
    // Non-host: just show status + ready button
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
          {syncState === 'synced' && (
            <a
              href={PLATFORM_LINKS[platformInfo.id]?.(contentTitle) || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm transition-all hover:brightness-110"
              style={{ backgroundColor: platformInfo.color, boxShadow: `0 0 20px ${platformInfo.color}66` }}
            >
              Abrir en {platformInfo.label} <ExternalLink size={14} />
            </a>
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
            {myStatus === 'ready' ? '¡Listo!' : 'Marcarme listo'}
          </motion.button>
          {syncState === 'idle' && (
            <p className="text-white/25 text-xs text-center">Esperando que el host inicie la sincronía</p>
          )}
        </div>
      );
    }

    // Host controls
    if (syncState === 'idle' || syncState === 'paused') {
      return (
        <div className="flex flex-col items-center gap-3 w-full">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={syncState === 'paused' ? resumeSync : startSync}
            animate={{ boxShadow: ['0 0 20px rgba(124,58,237,0.4)', '0 0 40px rgba(124,58,237,0.7)', '0 0 20px rgba(124,58,237,0.4)'] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-violet-600 to-violet-500 rounded-2xl font-black text-white text-base"
          >
            <Rocket size={20} />
            {syncState === 'paused' ? '▶ Reanudar AstroSync' : '🚀 ¡Iniciar AstroSync!'}
          </motion.button>
          {syncState === 'paused' && (
            <p className="text-white/30 text-xs">Pausado — todos esperan tu señal</p>
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
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 text-green-400 font-black text-lg">
            <Check size={22} strokeWidth={3} /> ¡A ver!
          </motion.div>
          <a
            href={PLATFORM_LINKS[platformInfo.id]?.(contentTitle) || '#'}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm hover:brightness-110 active:scale-95 transition-all"
            style={{ backgroundColor: platformInfo.color, boxShadow: `0 0 20px ${platformInfo.color}66` }}
          >
            Abrir en {platformInfo.label} <ExternalLink size={14} />
          </a>
          {/* Host time controls */}
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
            <button onClick={sendTimeCheck}
              className="px-3 py-2 bg-cyan-600/20 border border-cyan-500/30 rounded-xl text-cyan-400 text-xs font-bold hover:bg-cyan-600/30 transition-all whitespace-nowrap">
              <Bell size={12} className="inline mr-1" />Avisar
            </button>
          </div>
          <button onClick={pauseSync}
            className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs transition-colors">
            <Pause size={12} /> Pausar para todos
          </button>
        </div>
      );
    }

    return null;
  };

  // ── Content stage (left panel) ───────────────────────────────────────────────

  const ContentStage = () => (
    <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden min-h-0 p-6">
      {/* Blurred background poster */}
      {selectedContent?.poster_path ? (
        <img
          src={`${TMDB_IMG}${selectedContent.poster_path}`}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-20 blur-2xl scale-110 pointer-events-none"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientForTitle(contentTitle)} opacity-20 blur-2xl pointer-events-none`} />
      )}

      <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-xs text-center">
        {/* Poster */}
        {selectedContent?.poster_path ? (
          <img
            src={`${TMDB_IMG}${selectedContent.poster_path}`}
            alt={contentTitle}
            className="w-40 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.7)] ring-1 ring-white/10"
          />
        ) : (
          <div className={`w-40 aspect-[2/3] rounded-2xl bg-gradient-to-br ${gradientForTitle(contentTitle)}
            flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.7)] ring-1 ring-white/10`}>
            <span className="text-6xl font-black text-white/30">{contentTitle.charAt(0)}</span>
          </div>
        )}

        {/* Title & info */}
        <div>
          <h2 className="text-white font-black text-xl tracking-tight leading-tight">{contentTitle}</h2>
          <p className="text-white/40 text-xs mt-1">{getYear(selectedContent)}</p>

          {/* Platform badge */}
          <div className="flex items-center justify-center gap-2 mt-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: platformInfo.color }}
            >
              {platformInfo.label}
            </span>
            {selectedContent.media_type === 'tv' && (
              <span className="text-white/40 text-xs">
                T{selectedEpisode.season} E{selectedEpisode.episode}
              </span>
            )}
          </div>
        </div>

        {/* Participants row */}
        {participants.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {participants.slice(0, 6).map((p, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <Avatar name={p.username} size={9} status={p.status} />
              </div>
            ))}
            {participants.length > 6 && (
              <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center
                text-white/40 text-xs font-bold">
                +{participants.length - 6}
              </div>
            )}
          </div>
        )}

        {/* Sync button */}
        <SyncButton />
      </div>

      {/* Sync banner notification */}
      <AnimatePresence>
        {syncBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 px-5 py-3 rounded-2xl font-bold text-sm
              shadow-xl backdrop-blur-md border whitespace-nowrap
              ${syncBanner.type === 'go'     ? 'bg-green-500/20 border-green-500/40 text-green-300'
              : syncBanner.type === 'pause'  ? 'bg-red-500/20 border-red-500/40 text-red-300'
              : syncBanner.type === 'resume' ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
              :                               'bg-violet-500/20 border-violet-500/40 text-violet-300'}`}
          >
            {syncBanner.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating emojis */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {floatingEmojis.map((e) => (
            <FloatingEmoji key={e.id} {...e} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );

  // ── Social panel (right panel) ───────────────────────────────────────────────

  const SocialPanel = () => (
    <div className="flex flex-col h-full" style={{ background: 'rgba(255,255,255,0.02)' }}>
      {/* Panel header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-white/40" />
            <span className="text-white/60 text-xs font-semibold">
              {participants.length} en sala
            </span>
          </div>
          <button
            onClick={copyRoomCode}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10
              rounded-lg px-2.5 py-1 transition-colors group"
          >
            <span className="text-white/60 text-[11px] font-mono font-bold tracking-wider group-hover:text-white transition-colors">
              {roomCode}
            </span>
            <Copy size={11} className="text-white/30 group-hover:text-white/60 transition-colors" />
          </button>
        </div>

        {/* Participants list */}
        <div className="mt-3 flex flex-col gap-2 max-h-28 overflow-y-auto">
          {participants.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <Avatar name={p.username} size={7} status={p.status} />
              <span className="text-white/70 text-xs font-medium flex-1 truncate">{p.username}</span>
              {p.isHost && <Crown size={11} className="text-yellow-400 flex-shrink-0" />}
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0
                ${p.status === 'ready' ? 'text-green-400 bg-green-400/10'
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
                {!isOwn && (
                  <span className="text-white/35 text-[10px] ml-1">{msg.username}</span>
                )}
                <div className={`px-3 py-2 rounded-2xl text-sm leading-snug
                  ${isOwn
                    ? 'bg-violet-600 text-white rounded-tr-sm'
                    : 'bg-white/6 text-white/80 rounded-tl-sm border border-white/8'
                  }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Reaction bar */}
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

      {/* Message input */}
      <div className="px-3 pb-4 pt-2 flex-shrink-0">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2
          focus-within:border-violet-500/50 transition-colors">
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
              ${chatInput.trim()
                ? 'bg-violet-600 hover:bg-violet-500 text-white'
                : 'bg-white/5 text-white/20'}`}
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );

  // ── Room render ──────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#07070f' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setView('search')}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center
              text-white/50 hover:text-white transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center
            shadow-[0_0_12px_rgba(124,58,237,0.5)]">
            <Rocket size={14} className="text-white" />
          </div>
          <span className="text-white font-black text-sm tracking-tight">AstroParty</span>
          {roomName && (
            <span className="text-white/30 text-xs">— {roomName}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyRoomCode}
            className="hidden sm:flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10
              rounded-lg px-2.5 py-1.5 text-white/50 hover:text-white transition-all text-xs group"
          >
            <Share2 size={12} />
            <span className="font-mono font-bold tracking-wider">{roomCode}</span>
            <Copy size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center
                text-white/50 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Desktop: two-column / Mobile: tabs */}
      <div className="flex-1 overflow-hidden flex">
        {/* Desktop layout */}
        <div className="hidden sm:flex w-full">
          {/* Left: content stage (60%) */}
          <div className="flex flex-col" style={{ width: '60%', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
            <ContentStage />
          </div>
          {/* Right: social (40%) */}
          <div className="flex flex-col" style={{ width: '40%' }}>
            <SocialPanel />
          </div>
        </div>

        {/* Mobile layout: tabs */}
        <div className="flex sm:hidden flex-col w-full">
          {activeTab === 'content' ? <ContentStage /> : <SocialPanel />}
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="flex sm:hidden border-t border-white/5 flex-shrink-0"
        style={{ background: '#0d0d1a' }}>
        {[
          { id: 'content', icon: <Rocket size={18} />, label: 'Contenido' },
          { id: 'chat',    icon: <MessageSquare size={18} />, label: 'Chat' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors
              ${activeTab === tab.id ? 'text-violet-400' : 'text-white/30 hover:text-white/50'}`}
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
