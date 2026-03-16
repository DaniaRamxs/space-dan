// Manga Party — synchronized manga reading
import React, {
  useState, useEffect, useRef, useCallback, memo, useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, MessageSquare, Copy, X, Check, Send, Crown,
  BookOpen, Link, ExternalLink, AlertTriangle, ChevronLeft, ChevronRight,
  BookMarked, Brush, Play, Square, Sticker, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';
import PaginatedReader from './PaginatedReader';
import MangaSearchModal from './MangaSearchModal';
import HostTransferModal from './HostTransferModal';
import { useMangaMusic } from './useMangaMusic';
import MangaMusicPlayer from './MangaMusicPlayer';
import GifStickerPicker from './GifStickerPicker';

// ─── MangaDex proxy (routed through backend to avoid CORS) ────────────────────

const API_URL   = import.meta.env.VITE_API_URL || '';
const MANGA_API = `${API_URL}/api/manga`;

async function getChapterPages(chapterId) {
  const res  = await fetch(`${MANGA_API}/pages/${chapterId}`);
  if (!res.ok) throw new Error(`Pages fetch failed: ${res.status}`);
  const data = await res.json();
  return data.pages;
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

const MangaPartyPage = memo(({ onClose } = {}) => {
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

  // ── URL mode ──────────────────────────────────────────────────────────────────
  const [externalUrl, setExternalUrl]   = useState('');  // active URL for all
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft]         = useState('');

  // ── Drawing ───────────────────────────────────────────────────────────────────
  const [drawEvents, setDrawEvents]         = useState([]);

  // ── Theory mode ───────────────────────────────────────────────────────────────
  const [theoryNotes, setTheoryNotes]           = useState([]);
  const [theoryMode, setTheoryMode]             = useState(false);

  // ── Graffiti mode ─────────────────────────────────────────────────────────────
  const [graffitiMode, setGraffitiMode]         = useState(false);
  const [graffitiVisible, setGraffitiVisible]   = useState(true);
  const [graffitiTool, setGraffitiTool]         = useState('pencil');
  const [graffitiColor, setGraffitiColor]       = useState('#ef4444');
  const [graffitiSize, setGraffitiSize]         = useState(5);

  // ── Chapter navigation ────────────────────────────────────────────────────────
  const [chapterList, setChapterList]                   = useState([]);
  const [currentChapterIndex, setCurrentChapterIndex]   = useState(0);

  // ── Auto-read ─────────────────────────────────────────────────────────────────
  const [autoRead, setAutoRead]   = useState(false);
  const [autoSpeed, setAutoSpeed] = useState(15); // seconds per page

  // ── Stickers ──────────────────────────────────────────────────────────────────
  const [stickersByPage, setStickersByPage]   = useState({});
  const [stickerMode, setStickerMode]         = useState(false);
  const [pendingGif, setPendingGif]           = useState(null);
  const [stickerSize, setStickerSize]         = useState(80);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [stickersVisible, setStickersVisible] = useState(true);

  // ── Host transfer ─────────────────────────────────────────────────────────────
  const [hostUsername, setHostUsername]       = useState('');
  const [transferTarget, setTransferTarget]   = useState(null); // username to transfer to

  // ── UI ────────────────────────────────────────────────────────────────────────
  const [codeCopied, setCodeCopied]   = useState(false);
  const [newArrival, setNewArrival]   = useState(null);
  const [showSearch, setShowSearch]   = useState(false);
  const [mobilePanel, setMobilePanel] = useState(false);
  const [mobilePanelDot, setMobilePanelDot] = useState(false);

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
  const pagesRef         = useRef([]);
  const externalUrlRef   = useRef('');
  const prevNamesRef     = useRef(new Set());
  const chatEndRef    = useRef(null);
  const arrivalTimerRef = useRef(null);
  const theoryNotesRef  = useRef([]);
  const graffitiModeRef = useRef(false);
  const hostUsernameRef = useRef('');
  const autoTimerRef          = useRef(null);
  const autoReadRef           = useRef(false);
  const autoSpeedRef          = useRef(15);
  const chapterListRef        = useRef([]);
  const currentChapterIndexRef = useRef(0);
  const nextChapterRef        = useRef(null);
  const skipAutoReadResetRef  = useRef(false);
  const musicRef              = useRef(null);

  // Keep refs in sync
  useEffect(() => { profileRef.current  = profile; },      [profile]);
  useEffect(() => { isHostRef.current   = isHost; },       [isHost]);
  useEffect(() => { scrollYRef.current  = scrollY; },      [scrollY]);
  useEffect(() => { zoomRef.current     = zoom; },          [zoom]);
  useEffect(() => { mangaIdRef.current  = mangaId; },      [mangaId]);
  useEffect(() => { chapterIdRef.current = chapterId; },   [chapterId]);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { pagesRef.current      = pages; },       [pages]);
  useEffect(() => { externalUrlRef.current = externalUrl; }, [externalUrl]);
  useEffect(() => { theoryNotesRef.current  = theoryNotes; },  [theoryNotes]);
  useEffect(() => { graffitiModeRef.current = graffitiMode; }, [graffitiMode]);
  useEffect(() => { hostUsernameRef.current = hostUsername; }, [hostUsername]);
  useEffect(() => { autoReadRef.current  = autoRead; },  [autoRead]);
  useEffect(() => { autoSpeedRef.current = autoSpeed; }, [autoSpeed]);
  useEffect(() => { mangaTitleRef.current = mangaTitle; }, [mangaTitle]);
  useEffect(() => { chapterListRef.current = chapterList; }, [chapterList]);
  useEffect(() => { currentChapterIndexRef.current = currentChapterIndex; }, [currentChapterIndex]);

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
              type:         'state_snapshot',
              externalUrl:  externalUrlRef.current,
              mangaId:      mangaIdRef.current,
              mangaTitle:   mangaTitleRef.current,
              chapterId:    chapterIdRef.current,
              currentPage:  currentPageRef.current,
              scrollY:      scrollYRef.current,
              zoom:         zoomRef.current,
              pagesCount:   pagesRef.current.length,
              theoryNotes:   theoryNotesRef.current,
              graffitiMode:  graffitiModeRef.current,
              hostUsername:  hostUsernameRef.current,
              chapterList:   chapterListRef.current,
              chapterIndex:  currentChapterIndexRef.current,
            });
          }, 600);
        });
      })
      // ── Presence leave: auto host reassignment if host disconnects ────────
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((p) => {
          if (p.username !== hostUsernameRef.current) return;
          // Host left — get remaining participants from current state
          const remaining = Object.values(ch.presenceState()).flat()
            .filter((u) => u.username !== p.username);
          if (remaining.length === 0) return;
          // First remaining participant self-promotes (deterministic by Supabase order)
          const first = remaining[0];
          if (first.username !== myUsername) return; // only one client self-promotes
          setIsHost(true);
          isHostRef.current = true;
          const newName = myUsername;
          setHostUsername(newName);
          hostUsernameRef.current = newName;
          ch.track({ username: myUsername, isHost: true, avatar: profileRef.current?.avatar_url || null })
            .catch(() => {});
          broadcast('manga_sync', {
            type: 'host_transfer',
            newHostUsername: newName,
            prevHostUsername: p.username,
          });
          toast.success('El host se fue. ¡Ahora eres el host! 👑', { duration: 4000 });
        });
      })
      // ── manga_sync events ──────────────────────────────────────────────────
      .on('broadcast', { event: 'manga_sync' }, ({ payload }) => {
        if (!payload) return;

        switch (payload.type) {
          case 'state_snapshot':
            // Guest receives host's current state
            if (isHostRef.current) return;
            if (payload.externalUrl) {
              setExternalUrl(payload.externalUrl);
            }
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
            if (payload.theoryNotes) setTheoryNotes(payload.theoryNotes);
            if (payload.graffitiMode !== undefined) setGraffitiMode(payload.graffitiMode);
            if (payload.hostUsername) {
              setHostUsername(payload.hostUsername);
              hostUsernameRef.current = payload.hostUsername;
            }
            if (payload.chapterList) {
              setChapterList(payload.chapterList);
              chapterListRef.current = payload.chapterList;
            }
            if (payload.chapterIndex !== undefined) {
              setCurrentChapterIndex(payload.chapterIndex);
              currentChapterIndexRef.current = payload.chapterIndex;
            }
            break;

          case 'url_change':
            if (isHostRef.current) return;
            setExternalUrl(payload.url || '');
            if (payload.url) toast(`🔗 El host abrió una URL`, { duration: 3000 });
            break;

          case 'url_clear':
            if (isHostRef.current) return;
            setExternalUrl('');
            break;

          case 'chapter_change':
            if (isHostRef.current) return;
            setMangaId(payload.mangaId);
            setMangaTitle(payload.mangaTitle || '');
            setChapterId(payload.chapterId);
            setChapterNum(payload.chapterNum || '');
            setCurrentPage(0);
            currentPageRef.current = 0;
            setDrawEvents([]);
            if (payload.chapterList) {
              setChapterList(payload.chapterList);
              chapterListRef.current = payload.chapterList;
            }
            if (payload.chapterIndex !== undefined) {
              setCurrentChapterIndex(payload.chapterIndex);
              currentChapterIndexRef.current = payload.chapterIndex;
            }
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

          case 'draw_stroke': // new protocol: complete stroke on pointerup
          case 'draw_clear':
          case 'draw_undo':
          // Legacy streaming protocol (kept for backward compat — GraffitiCanvas ignores them)
          case 'draw_start':
          case 'draw_move':
          case 'draw_end':
            setDrawEvents((prev) => [...prev.slice(-500), payload]);
            break;

          case 'auto_toggle':
            setAutoRead(payload.enabled);
            if (!payload.enabled) {
              clearInterval(autoTimerRef.current);
              autoTimerRef.current = null;
              autoReadRef.current = false;
            }
            if (payload.speed) {
              setAutoSpeed(payload.speed);
              autoSpeedRef.current = payload.speed;
            }
            break;

          case 'note_add':
            setTheoryNotes((prev) =>
              prev.some((n) => n.id === payload.note?.id) ? prev : [...prev, payload.note]
            );
            break;

          case 'note_upvote':
            setTheoryNotes((prev) =>
              prev.map((n) =>
                n.id === payload.noteId
                  ? { ...n, upvotes: (n.upvotes || 0) + 1, upvotedBy: [...(n.upvotedBy || []), payload.by] }
                  : n
              )
            );
            break;

          case 'graffiti_toggle':
            setGraffitiMode(payload.enabled);
            break;

          case 'host_transfer': {
            const { newHostUsername, prevHostUsername } = payload;
            setHostUsername(newHostUsername);
            hostUsernameRef.current = newHostUsername;
            if (newHostUsername === myUsername) {
              // I am the new host
              setIsHost(true);
              isHostRef.current = true;
              channelRef.current
                ?.track({ username: myUsername, isHost: true, avatar: profileRef.current?.avatar_url || null })
                .catch(() => {});
              toast.success('¡Ahora eres el host! 👑', { duration: 4000 });
            } else if (prevHostUsername === myUsername) {
              // I was the host, now I'm not
              setIsHost(false);
              isHostRef.current = false;
              channelRef.current
                ?.track({ username: myUsername, isHost: false, avatar: profileRef.current?.avatar_url || null })
                .catch(() => {});
            } else {
              toast(`👑 @${newHostUsername} ahora es el host`, { duration: 3000 });
            }
            break;
          }

          case 'sticker_add':
            setStickersByPage((prev) => {
              const pageKey = payload.page ?? 0;
              const existing = prev[pageKey] || [];
              if (existing.some((s) => s.id === payload.sticker?.id)) return prev;
              return { ...prev, [pageKey]: [...existing, payload.sticker] };
            });
            break;

          case 'sticker_remove':
            setStickersByPage((prev) => {
              const pageKey = payload.page ?? 0;
              return {
                ...prev,
                [pageKey]: (prev[pageKey] || []).filter((s) => s.id !== payload.stickerId),
              };
            });
            break;

          case 'sticker_clear':
            setStickersByPage((prev) => ({ ...prev, [payload.page ?? 0]: [] }));
            break;

          case 'music_change':
          case 'music_pause':
          case 'music_resume':
          case 'music_volume':
          case 'music_vote':
          case 'music_add':
            musicRef.current?.onMusicEvent(payload);
            break;

          default:
            break;
        }
      })
      // ── manga_chat ──────────────────────────────────────────────────────────
      .on('broadcast', { event: 'manga_chat' }, ({ payload }) => {
        if (!payload) return;
        setMessages((prev) => [...prev.slice(-200), payload]);
        setMobilePanelDot(true);
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
            isHost:   isHostRef.current,
            avatar:   profileRef.current?.avatar_url || null,
          }).catch(() => {});
        }
      });

    channelRef.current = ch;
  }, [myUsername, broadcast, loadPages]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────────
  useEffect(() => () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current).catch(() => {});
    }
    clearTimeout(arrivalTimerRef.current);
    clearInterval(autoTimerRef.current);
  }, []);

  // ── Stop auto-read on chapter change (skip when auto-advancing) ──────────────
  useEffect(() => {
    if (skipAutoReadResetRef.current) {
      skipAutoReadResetRef.current = false;
      return;
    }
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
      setAutoRead(false);
      autoReadRef.current = false;
    }
  }, [chapterId]);

  // ── Clear stickers on chapter change ─────────────────────────────────────────
  useEffect(() => {
    setStickersByPage({});
    setStickerMode(false);
    setPendingGif(null);
  }, [chapterId]);

  // ── ESC cancels sticker placement mode ───────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setStickerMode(false);
        setPendingGif(null);
        setShowStickerPicker(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Create room ───────────────────────────────────────────────────────────────
  const handleCreateRoom = useCallback(() => {
    const code = generateCode();
    setRoomCode(code);
    setIsHost(true);
    isHostRef.current = true;
    setHostUsername(myUsername);
    hostUsernameRef.current = myUsername;
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
    clearInterval(autoTimerRef.current);
    autoTimerRef.current = null;
    setAutoRead(false);
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
    const {
      mangaId: mId, mangaTitle: mTitle, chapterId: cId, chapterNum: cNum, chapterTitle: cTitle,
      chapters = [], chapterIndex = 0,
    } = selection;

    setMangaId(mId);
    setMangaTitle(mTitle);
    mangaTitleRef.current = mTitle;
    setChapterId(cId);
    setChapterNum(cNum);
    setChapterList(chapters);
    chapterListRef.current = chapters;
    setCurrentChapterIndex(chapterIndex);
    currentChapterIndexRef.current = chapterIndex;
    setCurrentPage(0);
    currentPageRef.current = 0;
    setDrawEvents([]);
    await loadPages(cId);

    broadcast('manga_sync', {
      type:         'chapter_change',
      mangaId:      mId,
      mangaTitle:   mTitle,
      chapterId:    cId,
      chapterNum:   cNum,
      chapterTitle: cTitle,
      chapters,
      chapterIndex,
    });

    toast.success(`📚 ${mTitle} — Cap. ${cNum}`, { duration: 3000 });
  }, [broadcast, loadPages]);

  // ── URL mode ──────────────────────────────────────────────────────────────────
  const handleUrlSet = useCallback(() => {
    if (!isHostRef.current) return;
    const raw = urlDraft.trim();
    if (!raw) return;
    const url = raw.startsWith('http') ? raw : `https://${raw}`;
    setExternalUrl(url);
    setShowUrlInput(false);
    setUrlDraft('');
    broadcast('manga_sync', { type: 'url_change', url });
    toast.success('URL compartida con la sala');
  }, [urlDraft, broadcast]);

  const handleUrlClear = useCallback(() => {
    if (!isHostRef.current) return;
    setExternalUrl('');
    setShowUrlInput(false);
    setUrlDraft('');
    broadcast('manga_sync', { type: 'url_clear' });
  }, [broadcast]);

  // ── Scroll sync (host → guests) ───────────────────────────────────────────────
  const handleScroll = useCallback((sy) => {
    setScrollY(sy);
    scrollYRef.current = sy;
    broadcast('manga_sync', { type: 'scroll', scrollY: sy });
  }, [broadcast]);

  // ── Page change — host navigates, broadcasts to guests ───────────────────────
  const handlePageChange = useCallback((newPage) => {
    if (!isHostRef.current) return;
    const clamped = Math.max(0, Math.min(newPage, pagesRef.current.length - 1));
    if (clamped === currentPageRef.current) return;
    setCurrentPage(clamped);
    currentPageRef.current = clamped;
    broadcast('manga_sync', { type: 'page_change', page: clamped });
  }, [broadcast]);

  // ── Zoom ──────────────────────────────────────────────────────────────────────
  const handleZoom = useCallback((z) => {
    setZoom(z);
    zoomRef.current = z;
    if (isHostRef.current) {
      broadcast('manga_sync', { type: 'zoom', zoom: z });
    }
  }, [broadcast]);

  // ── Drawing events — anyone with canDraw can broadcast ───────────────────────
  const handleDrawEvent = useCallback((ev) => {
    broadcast('manga_sync', { ...ev });
  }, [broadcast]);

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

  // ── Theory note: add ─────────────────────────────────────────────────────────
  const handleAddNote = useCallback((noteData) => {
    const note = {
      id:        `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...noteData,
      author:    myUsername,
      upvotes:   0,
      upvotedBy: [],
      createdAt: Date.now(),
    };
    setTheoryNotes((prev) => [...prev, note]);
    broadcast('manga_sync', { type: 'note_add', note });
  }, [broadcast, myUsername]);

  // ── Theory note: upvote ───────────────────────────────────────────────────────
  const handleNoteUpvote = useCallback((noteId) => {
    if (!myUsername) return;
    setTheoryNotes((prev) => {
      const note = prev.find((n) => n.id === noteId);
      if (!note || note.upvotedBy?.includes(myUsername)) return prev;
      return prev.map((n) =>
        n.id === noteId
          ? { ...n, upvotes: (n.upvotes || 0) + 1, upvotedBy: [...(n.upvotedBy || []), myUsername] }
          : n
      );
    });
    broadcast('manga_sync', { type: 'note_upvote', noteId, by: myUsername });
  }, [broadcast, myUsername]);

  // ── Host transfer ─────────────────────────────────────────────────────────────
  const handleTransferHost = useCallback((targetUsername) => {
    if (!isHostRef.current || targetUsername === myUsername) return;
    // Optimistically update self before broadcast
    setIsHost(false);
    isHostRef.current = false;
    setHostUsername(targetUsername);
    hostUsernameRef.current = targetUsername;
    channelRef.current
      ?.track({ username: myUsername, isHost: false, avatar: profileRef.current?.avatar_url || null })
      .catch(() => {});
    broadcast('manga_sync', {
      type: 'host_transfer',
      newHostUsername: targetUsername,
      prevHostUsername: myUsername,
    });
    toast(`👑 Host transferido a @${targetUsername}`, { duration: 3000 });
    setTransferTarget(null);
  }, [broadcast, myUsername]);

  // ── Graffiti toggle (host only) ───────────────────────────────────────────────
  const handleGraffitiToggle = useCallback(() => {
    if (!isHostRef.current) return;
    setGraffitiMode((prev) => {
      const next = !prev;
      broadcast('manga_sync', { type: 'graffiti_toggle', enabled: next });
      return next;
    });
  }, [broadcast]);

  // ── Sticker handlers ──────────────────────────────────────────────────────────
  const handleSelectGif = useCallback((gifData) => {
    setPendingGif(gifData);
    setStickerMode(true);
    setShowStickerPicker(false);
  }, []);

  const handlePlaceSticker = useCallback((rx, ry) => {
    if (!pendingGif) return;
    const sticker = {
      id:       `sticker-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      gifUrl:   pendingGif.gifUrl,
      x:        rx,
      y:        ry,
      width:    stickerSize,
      username: myUsername,
      page:     currentPageRef.current,
    };
    setStickersByPage((prev) => {
      const pageKey = currentPageRef.current;
      return { ...prev, [pageKey]: [...(prev[pageKey] || []), sticker] };
    });
    broadcast('manga_sync', { type: 'sticker_add', page: currentPageRef.current, sticker });
    setStickerMode(false);
    setPendingGif(null);
  }, [pendingGif, stickerSize, myUsername, broadcast]);

  const handleRemoveSticker = useCallback((stickerId) => {
    const pageKey = currentPageRef.current;
    setStickersByPage((prev) => ({
      ...prev,
      [pageKey]: (prev[pageKey] || []).filter((s) => s.id !== stickerId),
    }));
    broadcast('manga_sync', { type: 'sticker_remove', page: pageKey, stickerId });
  }, [broadcast]);

  const handleClearStickers = useCallback(() => {
    const pageKey = currentPageRef.current;
    setStickersByPage((prev) => ({ ...prev, [pageKey]: [] }));
    broadcast('manga_sync', { type: 'sticker_clear', page: pageKey });
  }, [broadcast]);

  // ── Auto-read ─────────────────────────────────────────────────────────────────
  const handleStartAutoRead = useCallback((speed) => {
    clearInterval(autoTimerRef.current);
    setAutoRead(true);
    autoReadRef.current = true;
    autoTimerRef.current = setInterval(() => {
      const next = currentPageRef.current + 1;
      if (next >= pagesRef.current.length) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
        const canAdvance = currentChapterIndexRef.current + 1 < chapterListRef.current.length;
        if (canAdvance) {
          nextChapterRef.current?.(true); // autoRestart = true
        } else {
          setAutoRead(false);
          autoReadRef.current = false;
          broadcast('manga_sync', { type: 'auto_toggle', enabled: false });
          toast('📚 Autolectura completada', { duration: 3000 });
        }
        return;
      }
      setCurrentPage(next);
      currentPageRef.current = next;
      broadcast('manga_sync', { type: 'page_change', page: next });
    }, speed * 1000);
  }, [broadcast]);

  const handleStopAutoRead = useCallback(() => {
    clearInterval(autoTimerRef.current);
    autoTimerRef.current = null;
    setAutoRead(false);
    autoReadRef.current = false;
  }, []);

  const handleToggleAutoRead = useCallback(() => {
    if (!isHostRef.current) return;
    if (autoReadRef.current) {
      handleStopAutoRead();
      broadcast('manga_sync', { type: 'auto_toggle', enabled: false });
      toast('⏹ Autolectura detenida', { duration: 2000 });
    } else {
      handleStartAutoRead(autoSpeedRef.current);
      broadcast('manga_sync', { type: 'auto_toggle', enabled: true, speed: autoSpeedRef.current });
      toast(`▶ Autolectura: ${autoSpeedRef.current}s por página`, { duration: 2000 });
    }
  }, [handleStopAutoRead, handleStartAutoRead, broadcast]);

  const handleAutoSpeedChange = useCallback((s) => {
    setAutoSpeed(s);
    autoSpeedRef.current = s;
    if (autoReadRef.current) {
      handleStartAutoRead(s); // restart timer with new speed
      broadcast('manga_sync', { type: 'auto_toggle', enabled: true, speed: s });
    }
  }, [handleStartAutoRead, broadcast]);

  // ── Chapter navigation ────────────────────────────────────────────────────────
  const handleNextChapter = useCallback(async (autoRestart = false) => {
    if (!isHostRef.current) return;
    const list    = chapterListRef.current;
    const idx     = currentChapterIndexRef.current;
    const nextIdx = idx + 1;
    if (nextIdx >= list.length) return;

    const chapter = list[nextIdx];
    const cId     = chapter.id;
    const cNum    = chapter.attributes?.chapter ?? String(nextIdx + 1);
    const cTitle  = chapter.attributes?.title || '';
    const mTitle  = mangaTitleRef.current;
    const mId     = mangaIdRef.current;

    if (autoRestart) skipAutoReadResetRef.current = true;
    setChapterId(cId);
    chapterIdRef.current = cId;
    setChapterNum(cNum);
    setCurrentChapterIndex(nextIdx);
    currentChapterIndexRef.current = nextIdx;
    setCurrentPage(0);
    currentPageRef.current = 0;
    setDrawEvents([]);
    await loadPages(cId);

    broadcast('manga_sync', {
      type: 'chapter_change', mangaId: mId, mangaTitle: mTitle,
      chapterId: cId, chapterNum: cNum, chapterTitle: cTitle,
      chapters: list, chapterIndex: nextIdx,
    });

    toast.success(`📚 ${mTitle} — Cap. ${cNum}`, { duration: 3000 });

    if (autoRestart) {
      setAutoRead(true);
      autoReadRef.current = true;
      handleStartAutoRead(autoSpeedRef.current);
      broadcast('manga_sync', { type: 'auto_toggle', enabled: true, speed: autoSpeedRef.current });
    }
  }, [broadcast, loadPages, handleStartAutoRead]);

  const handlePrevChapter = useCallback(async () => {
    if (!isHostRef.current) return;
    const list    = chapterListRef.current;
    const idx     = currentChapterIndexRef.current;
    const prevIdx = idx - 1;
    if (prevIdx < 0) return;

    const chapter = list[prevIdx];
    const cId     = chapter.id;
    const cNum    = chapter.attributes?.chapter ?? String(prevIdx + 1);
    const cTitle  = chapter.attributes?.title || '';
    const mTitle  = mangaTitleRef.current;
    const mId     = mangaIdRef.current;

    setChapterId(cId);
    chapterIdRef.current = cId;
    setChapterNum(cNum);
    setCurrentChapterIndex(prevIdx);
    currentChapterIndexRef.current = prevIdx;
    setCurrentPage(0);
    currentPageRef.current = 0;
    setDrawEvents([]);
    await loadPages(cId);

    broadcast('manga_sync', {
      type: 'chapter_change', mangaId: mId, mangaTitle: mTitle,
      chapterId: cId, chapterNum: cNum, chapterTitle: cTitle,
      chapters: list, chapterIndex: prevIdx,
    });

    toast.success(`📚 ${mTitle} — Cap. ${cNum}`, { duration: 3000 });
  }, [broadcast, loadPages]);

  // Expose handleNextChapter to stale closures (auto-read interval)
  nextChapterRef.current = handleNextChapter;

  // ── Music ─────────────────────────────────────────────────────────────────────
  const music = useMangaMusic({ isHost, myUsername, broadcast });
  // Keep a ref so setupChannel's stale closure always calls the latest onMusicEvent
  musicRef.current = music;

  // ── Memoized sidebar content ──────────────────────────────────────────────────
  const sidebarContent = useMemo(() => {
    if (sideTab === 'participants') {
      return (
        <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#7c3aed33 transparent' }}>
          {participants.map((p) => {
            const isCurrentHost = p.username === hostUsername || p.isHost;
            const canTransfer   = isHost && p.username !== myUsername;
            return (
              <div
                key={p.username}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all
                            ${isCurrentHost
                              ? 'bg-amber-500/10 border-amber-500/20'
                              : 'bg-white/5 border-white/5'}`}
              >
                <Avatar name={p.username} size={8} />
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-sm font-bold truncate">{p.username}</p>
                  {isCurrentHost ? (
                    <p className="text-amber-400 text-[10px] font-black flex items-center gap-1">
                      <Crown size={8} />
                      Host
                    </p>
                  ) : p.username === myUsername ? (
                    <p className="text-white/30 text-[10px]">Tú</p>
                  ) : null}
                </div>
                {/* Transfer host button — only host sees it, not for self */}
                {canTransfer && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setTransferTarget(p.username)}
                    title={`Transferir host a @${p.username}`}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg
                               bg-amber-500/10 border border-amber-500/20 text-amber-400
                               hover:bg-amber-500/20 transition-all text-[10px] font-black
                               flex-shrink-0"
                  >
                    <Crown size={9} />
                    Host
                  </motion.button>
                )}
              </div>
            );
          })}
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
          <div className="text-center mb-8 relative">
            {onClose && (
              <button
                onClick={onClose}
                className="absolute right-0 top-0 w-8 h-8 rounded-lg bg-white/5 border border-white/10
                           flex items-center justify-center text-white/40 hover:text-red-400
                           hover:border-red-400/30 transition-all"
              >
                <X size={15} />
              </button>
            )}
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
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[#0a0a0f] overflow-hidden">

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

        {/* Prev / Next chapter (host only, when chapter list available) */}
        {isHost && chapterList.length > 1 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handlePrevChapter}
              disabled={currentChapterIndex <= 0}
              title="Capítulo anterior"
              className="flex items-center justify-center w-7 h-7 rounded-lg border text-xs
                         bg-white/5 border-white/10 text-white/50 hover:text-white/80
                         disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={14} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleNextChapter()}
              disabled={currentChapterIndex >= chapterList.length - 1}
              title="Siguiente capítulo"
              className="flex items-center justify-center w-7 h-7 rounded-lg border text-xs
                         bg-white/5 border-white/10 text-white/50 hover:text-white/80
                         disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={14} />
            </motion.button>
          </div>
        )}

        {/* URL mode button (host only) */}
        {isHost && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { setShowUrlInput((p) => !p); setUrlDraft(externalUrl); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              externalUrl
                ? 'bg-cyan-600/30 border-cyan-500/40 text-cyan-400'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
            }`}
          >
            <Link size={13} />
            <span className="hidden sm:inline">{externalUrl ? 'URL activa' : 'URL'}</span>
          </motion.button>
        )}


        {/* Theory mode toggle (all users) */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setTheoryMode((p) => !p)}
          title="Modo teoría"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
            theoryMode
              ? 'bg-violet-600/30 border-violet-500/40 text-violet-400'
              : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
          }`}
        >
          <BookMarked size={13} />
          <span className="hidden sm:inline">{theoryMode ? 'Teoría ON' : 'Teoría'}</span>
        </motion.button>

        {/* Graffiti toggle (host only) */}
        {isHost && (
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleGraffitiToggle}
              title="Graffiti"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                graffitiMode
                  ? 'bg-orange-600/30 border-orange-500/40 text-orange-400'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
              }`}
            >
              <Brush size={13} />
              <span className="hidden sm:inline">{graffitiMode ? 'Graffiti ON' : 'Graffiti'}</span>
            </motion.button>
            {/* Visibility toggle — always shown when graffiti mode is on */}
            {graffitiMode && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setGraffitiVisible((p) => !p)}
                title={graffitiVisible ? 'Ocultar dibujos' : 'Mostrar dibujos'}
                className="flex items-center justify-center w-7 h-7 rounded-xl border text-xs
                           bg-white/5 border-white/10 text-white/40 hover:text-white/70 transition-all"
              >
                {graffitiVisible ? <Eye size={12} /> : <EyeOff size={12} />}
              </motion.button>
            )}
          </div>
        )}

        {/* Sticker picker button (all users, when manga loaded) */}
        {pages.length > 0 && (
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (stickerMode) {
                  setStickerMode(false);
                  setPendingGif(null);
                } else {
                  setShowStickerPicker((p) => !p);
                }
              }}
              title="Stickers GIF"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                stickerMode || showStickerPicker
                  ? 'bg-pink-600/30 border-pink-500/40 text-pink-400'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
              }`}
            >
              <span className="text-sm leading-none">🎯</span>
              <span className="hidden sm:inline">{stickerMode ? 'Colocando…' : 'Stickers'}</span>
            </motion.button>
            {/* Toggle sticker visibility */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setStickersVisible((p) => !p)}
              title={stickersVisible ? 'Ocultar stickers' : 'Mostrar stickers'}
              className="flex items-center justify-center w-7 h-7 rounded-xl border text-xs
                         bg-white/5 border-white/10 text-white/40 hover:text-white/70 transition-all"
            >
              {stickersVisible ? <Eye size={12} /> : <EyeOff size={12} />}
            </motion.button>
            {/* Host: clear stickers from current page */}
            {isHost && (stickersByPage[currentPage] || []).length > 0 && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleClearStickers}
                title="Borrar stickers de esta página"
                className="flex items-center justify-center w-7 h-7 rounded-xl border text-xs
                           bg-white/5 border-white/10 text-red-400/50 hover:text-red-400
                           hover:bg-red-500/10 transition-all"
              >
                🧽
              </motion.button>
            )}
          </div>
        )}

        {/* Auto-read (host only, only when manga is loaded) */}
        {isHost && pages.length > 0 && (
          <div className="flex items-center gap-1">
            {[10, 15, 20].map((s) => (
              <button
                key={s}
                onClick={() => handleAutoSpeedChange(s)}
                className={`hidden sm:flex px-2 py-1.5 rounded-lg text-[10px] font-black border transition-all ${
                  autoSpeed === s
                    ? 'bg-violet-500/20 border-violet-500/40 text-violet-400'
                    : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60'
                }`}
              >
                {s}s
              </button>
            ))}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleToggleAutoRead}
              title={autoRead ? 'Detener autolectura' : `Autolectura (${autoSpeed}s/página)`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                autoRead
                  ? 'bg-violet-600/30 border-violet-500/40 text-violet-400'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
              }`}
            >
              {autoRead
                ? <Square size={11} fill="currentColor" />
                : <Play size={11} fill="currentColor" />}
              <span className="hidden sm:inline">{autoRead ? `Auto ${autoSpeed}s` : 'Auto'}</span>
            </motion.button>
          </div>
        )}

        {/* Auto-read indicator for guests */}
        {!isHost && autoRead && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl
                          bg-violet-500/10 border border-violet-500/20 text-violet-400/70
                          text-[10px] font-bold flex-shrink-0">
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ▶
            </motion.span>
            Auto {autoSpeed}s
          </div>
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

        {/* Leave / Close activity */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { handleLeaveRoom(); onClose?.(); }}
          title="Salir de Manga Party"
          className="w-7 h-7 rounded-lg bg-white/5 border border-white/10
                     flex items-center justify-center text-white/40 hover:text-red-400
                     hover:border-red-400/30 transition-all flex-shrink-0"
        >
          <X size={14} />
        </motion.button>
      </div>

      {/* URL input bar (host only, collapsible) */}
      <AnimatePresence>
        {isHost && showUrlInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 border-b border-white/10 bg-[#0d0d14] overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-2.5">
              <Link size={13} className="text-cyan-400 flex-shrink-0" />
              <input
                autoFocus
                type="url"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleUrlSet(); if (e.key === 'Escape') setShowUrlInput(false); }}
                placeholder="https://mangaonline.com/manga/titulo/capitulo-1"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5
                           text-xs text-white placeholder-white/30 outline-none
                           focus:border-cyan-500/50 transition-all font-mono"
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleUrlSet}
                disabled={!urlDraft.trim()}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500
                           text-white text-xs font-black disabled:opacity-30 transition-colors flex-shrink-0"
              >
                Compartir
              </motion.button>
              {externalUrl && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleUrlClear}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10
                             text-white/50 hover:text-red-400 text-xs font-bold transition-all flex-shrink-0"
                >
                  Quitar URL
                </motion.button>
              )}
              <p className="text-white/20 text-[10px] hidden md:block flex-shrink-0">
                Todos verán esta página en tiempo real
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Reader area */}
        <div className="flex-1 relative overflow-hidden h-full">
          {pagesLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0a0a0f]/70 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 text-white/50">
                <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                <p className="text-sm">Cargando páginas<AnimatedDots /></p>
              </div>
            </div>
          )}

          {/* URL iframe mode */}
          {externalUrl && (
            <div className="absolute inset-0 flex flex-col z-10 bg-[#0a0a0f]">
              {/* iframe bar */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0d0d14] border-b border-white/10 flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                <span className="text-cyan-400/70 text-[10px] font-mono truncate flex-1">{externalUrl}</span>
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
                  title="Abrir en nueva pestaña"
                >
                  <ExternalLink size={12} />
                </a>
                {isHost && (
                  <button
                    onClick={handleUrlClear}
                    className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0"
                    title="Cerrar URL"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              {/* iframe */}
              <div className="flex-1 relative">
                <iframe
                  key={externalUrl}
                  src={externalUrl}
                  className="w-full h-full border-0"
                  title="Manga URL"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  referrerPolicy="no-referrer"
                />
                {/* Blocked overlay hint — shown via CSS if iframe is empty, not detectable via JS */}
                <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2
                                flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full
                                px-3 py-1.5 border border-white/10 opacity-40">
                  <AlertTriangle size={10} className="text-yellow-400" />
                  <span className="text-white/50 text-[10px]">Algunos sitios bloquean el embed — usa "Abrir en pestaña"</span>
                </div>
              </div>
            </div>
          )}

          {!externalUrl && !mangaId && !pagesLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/20">
              <BookOpen size={56} className="opacity-20" />
              <p className="text-sm font-medium">
                {isHost
                  ? 'Elige un manga para empezar'
                  : 'Esperando que el host elija un manga'}
              </p>
              {isHost && (
                <div className="flex items-center gap-3 mt-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowSearch(true)}
                    className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500
                               text-white font-black text-sm transition-colors"
                  >
                    Buscar manga
                  </motion.button>
                  <span className="text-white/20 text-xs">o</span>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowUrlInput(true)}
                    className="px-5 py-2.5 rounded-xl bg-cyan-600/20 border border-cyan-500/30
                               hover:bg-cyan-600/30 text-cyan-400 font-black text-sm transition-colors"
                  >
                    Pegar URL
                  </motion.button>
                </div>
              )}
            </div>
          )}

          <PaginatedReader
            pages={pages}
            currentPage={currentPage}
            isHost={isHost}
            onPageChange={handlePageChange}
            drawEvents={drawEvents}
            onDrawEvent={handleDrawEvent}
            reactions={reactions}
            chapterId={chapterId}
            theoryMode={theoryMode}
            theoryNotes={theoryNotes}
            onAddNote={handleAddNote}
            onNoteUpvote={handleNoteUpvote}
            myUsername={myUsername}
            graffitiMode={graffitiMode}
            graffitiTool={graffitiTool}
            graffitiColor={graffitiColor}
            graffitiSize={graffitiSize}
            onGraffitiToolChange={setGraffitiTool}
            onGraffitiColorChange={setGraffitiColor}
            onGraffitiSizeChange={setGraffitiSize}
            canDraw={graffitiMode}
            graffitiVisible={graffitiVisible}
            onToggleGraffitiVisible={() => setGraffitiVisible((p) => !p)}
            stickers={stickersByPage[currentPage] || []}
            stickerMode={stickerMode}
            onPlaceSticker={handlePlaceSticker}
            onRemoveSticker={handleRemoveSticker}
            stickersVisible={stickersVisible}
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

      {/* ── Music player ─────────────────────────────────────────────────────── */}
      <MangaMusicPlayer {...music} isHost={isHost} />

      {/* ── Mobile chat FAB (< lg) ───────────────────────────────────────────── */}
      <div className="fixed bottom-20 right-3 z-40 lg:hidden">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => { setMobilePanel((p) => !p); setMobilePanelDot(false); }}
          className="w-12 h-12 rounded-full bg-violet-600 shadow-lg shadow-violet-500/40
                     flex items-center justify-center text-white relative"
        >
          {mobilePanel ? <X size={18} /> : <MessageSquare size={19} />}
          {!mobilePanel && mobilePanelDot && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-pink-500 border-2 border-[#0a0a0f]" />
          )}
        </motion.button>
      </div>

      {/* ── Mobile bottom panel ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobilePanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobilePanel(false)}
              className="fixed inset-0 z-[45] bg-black/50 lg:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[50] lg:hidden
                         bg-[#0d0d14] border-t border-white/10 rounded-t-2xl
                         flex flex-col"
              style={{ height: '65vh' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              {/* Tabs */}
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
                                    : 'border-transparent text-white/40'
                                }`}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>
              {/* Content */}
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {sidebarContent}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* GIF Sticker picker */}
      <GifStickerPicker
        isOpen={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onSelectGif={handleSelectGif}
        stickerSize={stickerSize}
        onSizeChange={setStickerSize}
      />

      {/* Manga search modal */}
      <MangaSearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelect={handleMangaSelect}
      />

      {/* Host transfer confirmation modal */}
      <HostTransferModal
        isOpen={!!transferTarget}
        targetUsername={transferTarget || ''}
        onConfirm={() => handleTransferHost(transferTarget)}
        onCancel={() => setTransferTarget(null)}
      />
    </div>
  );
});

MangaPartyPage.displayName = 'MangaPartyPage';

export default MangaPartyPage;
