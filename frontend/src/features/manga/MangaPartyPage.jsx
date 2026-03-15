import React, {
  useState, useEffect, useRef, useCallback, memo, useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, MessageSquare, Copy, X, Check, Send, Crown,
  BookOpen, Pencil, Smile, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';
import MangaReader from './MangaReader';
import MangaSearchModal from './MangaSearchModal';

// ─── MangaDex API ─────────────────────────────────────────────────────────────

const MANGADEX = 'https://api.mangadex.org';
const UPLOADS  = 'https://uploads.mangadex.org';

async function getChapterPages(chapterId) {
  const res  = await fetch(`${MANGADEX}/at-home/server/${chapterId}`);
  const data = await res.json();
  const { baseUrl, chapter } = data;
  return chapter.data.map((f) => `${baseUrl}/data/${chapter.hash}/${f}`);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REACTIONS_LIST = ['❤️', '😂', '🔥', '⭐', '👏', '😭'];
const AVATAR_COLORS  = ['#7c3aed', '#22d3ee', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

const avatarColor = (name) =>
  AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const generateCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

// ─── localStorage helpers ─────────────────────────────────────────────────────

const loadRoomHistory = () => {
  try { return JSON.parse(localStorage.getItem('manga_rooms') || '[]'); }
  catch { return []; }
};

const saveRoomHistory = (entry) => {
  try {
    const prev = loadRoomHistory();
    const filtered = prev.filter((r) => r.code !== entry.code);
    localStorage.setItem('manga_rooms', JSON.stringify([entry, ...filtered].slice(0, 5)));
  } catch {}
};

// ─── Arrival sound (Web Audio API) ───────────────────────────────────────────

const playArrival = () => {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
};

// ─── Micro components ─────────────────────────────────────────────────────────

const Avatar = memo(({ name, size = 8 }) => (
  <div
    className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
    style={{
      backgroundColor: avatarColor(name),
      width:  `${size * 4}px`,
      height: `${size * 4}px`,
      fontSize: size <= 7 ? '11px' : '13px',
    }}
  >
    {name?.charAt(0)?.toUpperCase() || '?'}
  </div>
));
Avatar.displayName = 'Avatar';

const AnimatedDots = () => (
  <span className="inline-flex gap-0.5 ml-1">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        className="inline-block w-1 h-1 rounded-full bg-current"
      />
    ))}
  </span>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const MangaPartyPage = memo(() => {
  const { profile } = useAuthContext();
  const myUsername  = profile?.username || profile?.email?.split('@')[0] || 'Lector';

  // ── View ──────────────────────────────────────────────────────────────────────
  const [view, setView] = useState('lobby'); // 'lobby' | 'room'

  // ── Room ──────────────────────────────────────────────────────────────────────
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isHost, setIsHost]     = useState(false);

  // ── Room history ──────────────────────────────────────────────────────────────
  const [roomHistory, setRoomHistory] = useState([]);

  // ── Participants ──────────────────────────────────────────────────────────────
  const [participants, setParticipants] = useState([]);

  // ── Chat ──────────────────────────────────────────────────────────────────────
  const [messages, setMessages]   = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sideTab, setSideTab]     = useState('chat'); // 'chat' | 'participants'

  // ── Floating reactions ────────────────────────────────────────────────────────
  const [reactions, setReactions] = useState([]); // for ReactionsOverlay
  const [floatingEmojis, setFloatingEmojis] = useState([]);

  // ── Synced manga state ────────────────────────────────────────────────────────
  const [mangaId, setMangaId]         = useState(null);
  const [mangaTitle, setMangaTitle]   = useState('');
  const [chapterId, setChapterId]     = useState(null);
  const [chapterNum, setChapterNum]   = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [scrollY, setScrollY]         = useState(0);
  const [zoom, setZoom]               = useState(1);
  const [pages, setPages]             = useState([]);
  const [pagesLoading, setPagesLoading] = useState(false);

  // ── External scroll (guest receives host scroll) ──────────────────────────────
  const [externalScrollY, setExternalScrollY] = useState(null);

  // ── Drawing ───────────────────────────────────────────────────────────────────
  const [drawingEnabled, setDrawingEnabled] = useState(false);
  const [drawEvents, setDrawEvents]         = useState([]);

  // ── UI ────────────────────────────────────────────────────────────────────────
  const [codeCopied, setCodeCopied]   = useState(false);
  const [newArrival, setNewArrival]   = useState(null);
  const [showSearch, setShowSearch]   = useState(false);

  // ── Refs (avoid stale closures) ───────────────────────────────────────────────
  const channelRef    = useRef(null);
  const isHostRef     = useRef(false);
  const profileRef    = useRef(profile);
  const scrollYRef    = useRef(0);
  const zoomRef       = useRef(1);
  const mangaIdRef    = useRef(null);
  const mangaTitleRef = useRef('');
  const chapterIdRef  = useRef(null);
  const currentPageRef = useRef(0);
  const pagesRef      = useRef([]);
  const prevNamesRef  = useRef(new Set());
  const chatEndRef    = useRef(null);
  const arrivalTimerRef = useRef(null);

  // Keep refs in sync
  useEffect(() => { profileRef.current  = profile; },      [profile]);
  useEffect(() => { isHostRef.current   = isHost; },       [isHost]);
  useEffect(() => { scrollYRef.current  = scrollY; },      [scrollY]);
  useEffect(() => { zoomRef.current     = zoom; },          [zoom]);
  useEffect(() => { mangaIdRef.current  = mangaId; },      [mangaId]);
  useEffect(() => { chapterIdRef.current = chapterId; },   [chapterId]);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { pagesRef.current    = pages; },        [pages]);

  // Load room history on mount
  useEffect(() => {
    setRoomHistory(loadRoomHistory());
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Fetch chapter pages ───────────────────────────────────────────────────────
  const loadPages = useCallback(async (cId) => {
    if (!cId) return;
    setPagesLoading(true);
    setPages([]);
    try {
      const urls = await getChapterPages(cId);
      setPages(urls);
      pagesRef.current = urls;
    } catch {
      toast.error('No se pudieron cargar las páginas del capítulo');
    } finally {
      setPagesLoading(false);
    }
  }, []);

  // ── Broadcast helpers ─────────────────────────────────────────────────────────
  const broadcast = useCallback((event, payload) => {
    channelRef.current?.send({ type: 'broadcast', event, payload }).catch(() => {});
  }, []);

  // ── Supabase channel setup ────────────────────────────────────────────────────
  const setupChannel = useCallback((code, hosting) => {
    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current).catch(() => {});
      channelRef.current = null;
    }

    const ch = supabase.channel(`manga-${code}`, {
      config: { presence: { key: myUsername } },
    });

    ch
      // ── Presence sync ─────────────────────────────────────────────────────
      .on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState();
        const users = Object.values(state).flat().map((p) => ({
          username: p.username,
          isHost:   p.isHost,
          avatar:   p.avatar,
        }));
        setParticipants(users);

        // Detect new arrivals
        const newNames = new Set(users.map((u) => u.username));
        newNames.forEach((name) => {
          if (!prevNamesRef.current.has(name) && name !== myUsername) {
            playArrival();
            setNewArrival(name);
            clearTimeout(arrivalTimerRef.current);
            arrivalTimerRef.current = setTimeout(() => setNewArrival(null), 2500);
          }
        });
        prevNamesRef.current = newNames;
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        // If I'm the host, send state snapshot to late joiners
        if (!isHostRef.current) return;
        newPresences.forEach((p) => {
          if (p.username === myUsername) return;
          // Small delay to ensure guest is subscribed
          setTimeout(() => {
            broadcast('manga_sync', {
              type:        'state_snapshot',
              mangaId:     mangaIdRef.current,
              mangaTitle,
              chapterId:   chapterIdRef.current,
              currentPage: currentPageRef.current,
              scrollY:     scrollYRef.current,
              zoom:        zoomRef.current,
              pagesCount:  pagesRef.current.length,
            });
          }, 600);
        });
      })
      // ── manga_sync events ──────────────────────────────────────────────────
      .on('broadcast', { event: 'manga_sync' }, ({ payload }) => {
        if (!payload) return;

        switch (payload.type) {
          case 'state_snapshot':
            // Guest receives host's current state
            if (isHostRef.current) return;
            if (payload.mangaId && payload.mangaId !== mangaIdRef.current) {
              setMangaId(payload.mangaId);
              setMangaTitle(payload.mangaTitle || '');
            }
            if (payload.chapterId && payload.chapterId !== chapterIdRef.current) {
              setChapterId(payload.chapterId);
              setChapterNum(payload.chapterNum || '');
              loadPages(payload.chapterId);
            }
            setCurrentPage(payload.currentPage ?? 0);
            setExternalScrollY(payload.scrollY ?? 0);
            setZoom(payload.zoom ?? 1);
            break;

          case 'chapter_change':
            if (isHostRef.current) return;
            setMangaId(payload.mangaId);
            setMangaTitle(payload.mangaTitle || '');
            setChapterId(payload.chapterId);
            setChapterNum(payload.chapterNum || '');
            setCurrentPage(0);
            setExternalScrollY(0);
            setDrawEvents([]);
            loadPages(payload.chapterId);
            toast(`📚 ${payload.mangaTitle} — Cap. ${payload.chapterNum}`, { duration: 3000 });
            break;

          case 'page_change':
            if (isHostRef.current) return;
            setCurrentPage(payload.page);
            break;

          case 'scroll':
            if (isHostRef.current) return;
            setExternalScrollY(payload.scrollY);
            break;

          case 'zoom':
            if (isHostRef.current) return;
            setZoom(payload.zoom);
            break;

          case 'draw_start':
          case 'draw_move':
          case 'draw_end':
          case 'draw_clear':
            if (isHostRef.current) return;
            setDrawEvents((prev) => [...prev, payload]);
            break;

          case 'drawing_toggle':
            if (!isHostRef.current) {
              setDrawingEnabled(payload.enabled);
            }
            break;

          default:
            break;
        }
      })
      // ── manga_chat ──────────────────────────────────────────────────────────
      .on('broadcast', { event: 'manga_chat' }, ({ payload }) => {
        if (!payload) return;
        setMessages((prev) => [...prev.slice(-200), payload]);
      })
      // ── manga_reaction ──────────────────────────────────────────────────────
      .on('broadcast', { event: 'manga_reaction' }, ({ payload }) => {
        if (!payload) return;
        const newReaction = {
          id:           `r-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          emoji:        payload.emoji,
          x:            payload.x ?? Math.floor(10 + Math.random() * 80),
          fromUsername: payload.username,
        };
        setReactions((prev) => [...prev.slice(-19), newReaction]);
        // Auto-remove after 2.5s
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
        }, 2500);

        // Also add floating emoji in chat area
        setFloatingEmojis((prev) => {
          const fe = {
            id: `fe-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            emoji: payload.emoji,
            x: Math.floor(10 + Math.random() * 80),
          };
          return [...prev.slice(-14), fe];
        });
        setTimeout(() => {
          setFloatingEmojis((prev) => prev.filter((e) => e.id !== newReaction.id));
        }, 2500);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await ch.track({
            username: myUsername,
            isHost:   hosting,
            avatar:   profileRef.current?.avatar_url || null,
          }).catch(() => {});
        }
      });

    channelRef.current = ch;
  }, [myUsername, broadcast, loadPages, mangaTitle]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────────
  useEffect(() => () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current).catch(() => {});
    }
    clearTimeout(arrivalTimerRef.current);
  }, []);

  // ── Create room ───────────────────────────────────────────────────────────────
  const handleCreateRoom = useCallback(() => {
    const code = generateCode();
    setRoomCode(code);
    setIsHost(true);
    isHostRef.current = true;
    setView('room');
    setMessages([]);
    setParticipants([]);
    setDrawEvents([]);
    setReactions([]);
    setFloatingEmojis([]);
    saveRoomHistory({ code, createdAt: new Date().toISOString(), role: 'host' });
    setRoomHistory(loadRoomHistory());
    setupChannel(code, true);
    toast.success(`Sala creada: ${code}`, { duration: 3000 });
  }, [setupChannel]);

  // ── Join room ─────────────────────────────────────────────────────────────────
  const handleJoinRoom = useCallback((codeArg) => {
    const code = (codeArg || joinCode).trim().toUpperCase();
    if (!code || code.length < 4) {
      toast.error('Ingresa un código de sala válido');
      return;
    }
    setRoomCode(code);
    setIsHost(false);
    isHostRef.current = false;
    setView('room');
    setMessages([]);
    setParticipants([]);
    setDrawEvents([]);
    setReactions([]);
    setFloatingEmojis([]);
    saveRoomHistory({ code, createdAt: new Date().toISOString(), role: 'guest' });
    setRoomHistory(loadRoomHistory());
    setupChannel(code, false);
  }, [joinCode, setupChannel]);

  // ── Leave room ────────────────────────────────────────────────────────────────
  const handleLeaveRoom = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.untrack().catch(() => {});
      supabase.removeChannel(channelRef.current).catch(() => {});
      channelRef.current = null;
    }
    setView('lobby');
    setRoomCode('');
    setIsHost(false);
    isHostRef.current = false;
    setParticipants([]);
    setMessages([]);
    setMangaId(null);
    setChapterId(null);
    setPages([]);
    setCurrentPage(0);
    setScrollY(0);
    setZoom(1);
    setDrawEvents([]);
    setReactions([]);
    setFloatingEmojis([]);
  }, []);

  // ── Copy room code ────────────────────────────────────────────────────────────
  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(roomCode).catch(() => {});
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
    toast.success('Código copiado');
  }, [roomCode]);

  // ── Manga selection ───────────────────────────────────────────────────────────
  const handleMangaSelect = useCallback(async (selection) => {
    if (!isHostRef.current) return;
    const { mangaId: mId, mangaTitle: mTitle, chapterId: cId, chapterNum: cNum, chapterTitle: cTitle } = selection;

    setMangaId(mId);
    setMangaTitle(mTitle);
    setChapterId(cId);
    setChapterNum(cNum);
    setCurrentPage(0);
    setScrollY(0);
    setExternalScrollY(null);
    setZoom(1);
    setDrawEvents([]);
    await loadPages(cId);

    broadcast('manga_sync', {
      type:         'chapter_change',
      mangaId:      mId,
      mangaTitle:   mTitle,
      chapterId:    cId,
      chapterNum:   cNum,
      chapterTitle: cTitle,
    });

    toast.success(`📚 ${mTitle} — Cap. ${cNum}`, { duration: 3000 });
  }, [broadcast, loadPages]);

  // ── Scroll sync (host → guests) ───────────────────────────────────────────────
  const handleScroll = useCallback((sy) => {
    setScrollY(sy);
    scrollYRef.current = sy;
    broadcast('manga_sync', { type: 'scroll', scrollY: sy });
  }, [broadcast]);

  // ── Page change (detect which page is visible) ────────────────────────────────
  const handlePageChange = useCallback((page) => {
    if (page === currentPageRef.current) return;
    setCurrentPage(page);
    currentPageRef.current = page;
    if (isHostRef.current) {
      broadcast('manga_sync', { type: 'page_change', page });
    }
  }, [broadcast]);

  // ── Zoom ──────────────────────────────────────────────────────────────────────
  const handleZoom = useCallback((z) => {
    setZoom(z);
    zoomRef.current = z;
    if (isHostRef.current) {
      broadcast('manga_sync', { type: 'zoom', zoom: z });
    }
  }, [broadcast]);

  // ── Drawing events ────────────────────────────────────────────────────────────
  const handleDrawEvent = useCallback((ev) => {
    if (!isHostRef.current) return;
    broadcast('manga_sync', { ...ev });
  }, [broadcast]);

  // ── Toggle drawing mode (host only) ──────────────────────────────────────────
  const handleToggleDrawing = useCallback(() => {
    if (!isHostRef.current) return;
    const next = !drawingEnabled;
    setDrawingEnabled(next);
    broadcast('manga_sync', { type: 'drawing_toggle', enabled: next });
  }, [drawingEnabled, broadcast]);

  // ── Send chat message ─────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(() => {
    const text = chatInput.trim();
    if (!text) return;
    const msg = {
      id:       `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      username: myUsername,
      text,
      at:       Date.now(),
    };
    setMessages((prev) => [...prev.slice(-200), msg]);
    broadcast('manga_chat', msg);
    setChatInput('');
  }, [chatInput, myUsername, broadcast]);

  const handleChatKey = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // ── Send reaction ─────────────────────────────────────────────────────────────
  const handleReaction = useCallback((emoji) => {
    const x = Math.floor(10 + Math.random() * 80);
    const newReaction = {
      id:           `r-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      emoji,
      x,
      fromUsername: myUsername,
    };
    setReactions((prev) => [...prev.slice(-19), newReaction]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2500);
    broadcast('manga_reaction', { emoji, x, username: myUsername });
  }, [myUsername, broadcast]);

  // ── Memoized sidebar content ──────────────────────────────────────────────────
  const sidebarContent = useMemo(() => {
    if (sideTab === 'participants') {
      return (
        <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#7c3aed33 transparent' }}>
          {participants.map((p) => (
            <div
              key={p.username}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 border border-white/5"
            >
              <Avatar name={p.username} size={8} />
              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-sm font-bold truncate">{p.username}</p>
                {p.isHost && (
                  <p className="text-violet-400 text-[10px] font-black flex items-center gap-1">
                    <Crown size={8} />
                    Host
                  </p>
                )}
              </div>
            </div>
          ))}
          {participants.length === 0 && (
            <p className="text-white/20 text-xs text-center py-4">Esperando participantes<AnimatedDots /></p>
          )}
        </div>
      );
    }

    // Chat tab
    return (
      <>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 relative"
             style={{ scrollbarWidth: 'thin', scrollbarColor: '#7c3aed33 transparent' }}>

          {/* Floating emojis in chat area */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <AnimatePresence>
              {floatingEmojis.map((fe) => (
                <motion.div
                  key={fe.id}
                  initial={{ opacity: 1, y: 0, scale: 1 }}
                  animate={{ opacity: 0, y: -100, scale: 1.4 }}
                  transition={{ duration: 2.2, ease: 'easeOut' }}
                  className="absolute bottom-16 text-2xl select-none z-50"
                  style={{ left: `${fe.x}%` }}
                >
                  {fe.emoji}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {messages.length === 0 && (
            <p className="text-white/20 text-xs text-center py-6">
              El chat está vacío — ¡di algo!
            </p>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-2">
              <Avatar name={msg.username} size={6} />
              <div className="flex-1 min-w-0">
                <p className="text-violet-400 text-[10px] font-black">{msg.username}</p>
                <p className="text-white/70 text-sm break-words leading-snug">{msg.text}</p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Reaction bar */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-t border-white/5 flex-shrink-0">
          {REACTIONS_LIST.map((emoji) => (
            <motion.button
              key={emoji}
              whileTap={{ scale: 0.8 }}
              onClick={() => handleReaction(emoji)}
              className="text-lg hover:scale-110 transition-transform"
            >
              {emoji}
            </motion.button>
          ))}
        </div>

        {/* Chat input */}
        <div className="p-3 border-t border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10
                          focus-within:border-violet-500/40 transition-all px-3 py-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKey}
              placeholder="Escribe algo..."
              maxLength={300}
              className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
            />
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleSendMessage}
              disabled={!chatInput.trim()}
              className="text-violet-400 hover:text-violet-300 disabled:opacity-30 transition-colors"
            >
              <Send size={14} />
            </motion.button>
          </div>
        </div>
      </>
    );
  }, [
    sideTab, participants, messages, chatInput, floatingEmojis,
    handleSendMessage, handleChatKey, handleReaction,
  ]);

  // ─── Lobby view ───────────────────────────────────────────────────────────────

  if (view === 'lobby') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="text-4xl">📚</span>
              <h1 className="text-3xl font-black text-white">Manga Party</h1>
            </div>
            <p className="text-white/40 text-sm">
              Lee manga sincronizado en tiempo real con tus amigos
            </p>
          </div>

          <div className="bg-[#0d0d14] border border-white/10 rounded-2xl p-6 space-y-6">
            {/* Create room */}
            <div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCreateRoom}
                className="w-full py-4 rounded-xl bg-violet-600 hover:bg-violet-500
                           text-white font-black text-base transition-colors
                           flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
              >
                <BookOpen size={18} />
                Crear sala
              </motion.button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/20 text-xs font-bold">o únete</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Join room */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                  placeholder="Código de sala"
                  maxLength={8}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3
                             text-white font-mono text-sm placeholder-white/20 outline-none
                             focus:border-violet-500/50 transition-all uppercase tracking-widest"
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleJoinRoom()}
                  disabled={!joinCode.trim()}
                  className="px-5 py-3 rounded-xl bg-pink-600 hover:bg-pink-500
                             text-white font-black text-sm transition-colors
                             disabled:opacity-30 flex items-center gap-1.5"
                >
                  Unirse
                  <ChevronRight size={14} />
                </motion.button>
              </div>
            </div>

            {/* Recent rooms */}
            {roomHistory.length > 0 && (
              <div className="space-y-2">
                <p className="text-white/30 text-xs font-bold uppercase tracking-wider">
                  Salas recientes
                </p>
                <div className="flex flex-wrap gap-2">
                  {roomHistory.map((r) => (
                    <motion.button
                      key={r.code}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => handleJoinRoom(r.code)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                 bg-white/5 border border-white/10 hover:border-white/20
                                 text-white/50 hover:text-white/80 text-xs font-mono
                                 transition-all"
                    >
                      {r.role === 'host' && <Crown size={10} className="text-violet-400" />}
                      {r.code}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Room view ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f] overflow-hidden">

      {/* Room header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10
                      bg-[#0d0d14] flex-shrink-0 z-10">
        {/* Title */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xl">📚</span>
          <h1 className="text-white font-black text-sm hidden sm:block">Manga Party</h1>
        </div>

        {/* Manga info */}
        {mangaTitle && (
          <div className="flex-1 min-w-0 hidden sm:block">
            <p className="text-white/60 text-xs truncate">
              {mangaTitle}
              {chapterNum && <span className="text-violet-400 ml-1">Cap. {chapterNum}</span>}
            </p>
          </div>
        )}
        {!mangaTitle && <div className="flex-1" />}

        {/* Host controls */}
        {isHost && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                       bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/30
                       text-violet-400 text-xs font-bold transition-all"
          >
            <BookOpen size={13} />
            <span className="hidden sm:inline">Cambiar manga</span>
            <span className="sm:hidden">Manga</span>
          </motion.button>
        )}

        {/* Drawing toggle (host only) */}
        {isHost && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleToggleDrawing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              drawingEnabled
                ? 'bg-pink-600/30 border-pink-500/40 text-pink-400'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
            }`}
          >
            <Pencil size={13} />
            <span className="hidden sm:inline">{drawingEnabled ? 'Dibujo ON' : 'Dibujar'}</span>
          </motion.button>
        )}

        {/* Room code */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                     bg-white/5 border border-white/10 hover:border-white/20
                     text-white/50 hover:text-white/70 text-xs font-mono transition-all"
        >
          <span className="tracking-widest">{roomCode}</span>
          {codeCopied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
        </motion.button>

        {/* Participants count */}
        <div className="flex items-center gap-1 text-white/40 text-xs flex-shrink-0">
          <Users size={13} />
          <span>{participants.length}</span>
        </div>

        {/* Leave */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleLeaveRoom}
          className="w-7 h-7 rounded-lg bg-white/5 border border-white/10
                     flex items-center justify-center text-white/40 hover:text-red-400
                     hover:border-red-400/30 transition-all flex-shrink-0"
        >
          <X size={14} />
        </motion.button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Reader area */}
        <div className="flex-1 relative overflow-hidden">
          {pagesLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0a0a0f]/70 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 text-white/50">
                <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                <p className="text-sm">Cargando páginas<AnimatedDots /></p>
              </div>
            </div>
          )}

          {!mangaId && !pagesLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/20">
              <BookOpen size={56} className="opacity-20" />
              <p className="text-sm font-medium">
                {isHost
                  ? 'Elige un manga para empezar'
                  : 'Esperando que el host elija un manga'}
              </p>
              {isHost && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSearch(true)}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500
                             text-white font-black text-sm transition-colors"
                >
                  Buscar manga
                </motion.button>
              )}
            </div>
          )}

          <MangaReader
            pages={pages}
            currentPage={currentPage}
            zoom={zoom}
            isHost={isHost}
            drawingEnabled={drawingEnabled}
            onScroll={handleScroll}
            onZoom={handleZoom}
            onPageChange={handlePageChange}
            externalScrollY={isHost ? null : externalScrollY}
            drawEvents={drawEvents}
            onDrawEvent={handleDrawEvent}
            reactions={reactions}
            chapterId={chapterId}
          />
        </div>

        {/* Right sidebar */}
        <div className="w-72 flex-shrink-0 bg-[#0d0d14] border-l border-white/10
                        hidden lg:flex flex-col">
          {/* Sidebar tabs */}
          <div className="flex border-b border-white/10 flex-shrink-0">
            {[
              { key: 'chat', label: 'Chat', icon: MessageSquare },
              { key: 'participants', label: `Sala (${participants.length})`, icon: Users },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSideTab(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold
                            border-b-2 transition-all ${
                              sideTab === key
                                ? 'border-violet-500 text-violet-400'
                                : 'border-transparent text-white/40 hover:text-white/60'
                            }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {sidebarContent}
        </div>
      </div>

      {/* New arrival badge */}
      <AnimatePresence>
        {newArrival && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50
                       bg-[#0d0d14]/95 border border-violet-500/30 rounded-2xl
                       px-4 py-2.5 shadow-xl backdrop-blur-md flex items-center gap-2"
          >
            <Avatar name={newArrival} size={6} />
            <p className="text-white/80 text-sm font-bold">
              <span className="text-violet-400">{newArrival}</span> se unió
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manga search modal */}
      <MangaSearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelect={handleMangaSelect}
      />
    </div>
  );
});

MangaPartyPage.displayName = 'MangaPartyPage';

export default MangaPartyPage;
