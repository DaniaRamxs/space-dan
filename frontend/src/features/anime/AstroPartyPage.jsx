import React, {
  useState, useEffect, useRef, useCallback, memo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, MessageSquare, Copy, Rocket, X, Check, Send, Crown,
  ChevronLeft, Clock, Bell, Loader2, Link, Monitor, Gift, Pause,
  MapPin, BarChart2, Wifi, WifiOff, Volume2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';
import AnimePlayer from './AnimePlayer';
import GifPickerModal from '@/components/reactions/GifPickerModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const buildPcConfig = () => {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  const turnUrl  = import.meta.env.VITE_TURN_URL;
  const turnUser = import.meta.env.VITE_TURN_USER || '';
  const turnPass = import.meta.env.VITE_TURN_PASS || '';
  if (turnUrl) {
    iceServers.push({ urls: turnUrl, username: turnUser, credential: turnPass });
  }
  return { iceServers };
};

const REACTIONS = ['😂', '🔥', '😱', '❤️', '👏', '🎉'];
const AVATAR_COLORS = ['#7c3aed', '#22d3ee', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];
const WEBRTC_RETRY_DELAYS = [2000, 4000, 8000];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
const STATUS_RING  = { ready: 'ring-green-400', watching: 'ring-yellow-400', idle: 'ring-gray-600' };
const STATUS_LABEL = { ready: 'Listo', watching: 'Viendo', idle: 'Inactivo' };

const getVideoFormat = (url = '') => {
  if (url.includes('.m3u8')) return 'HLS';
  if (url.includes('.webm')) return 'WebM';
  return 'MP4';
};

const formatVideoTime = (t) =>
  Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');

const loadRoomHistory = () => {
  try {
    return JSON.parse(localStorage.getItem('astroparty_rooms') || '[]');
  } catch {
    return [];
  }
};

const saveRoomHistory = (entry) => {
  try {
    const existing = loadRoomHistory();
    const filtered = existing.filter((r) => r.code !== entry.code);
    const next = [entry, ...filtered].slice(0, 5);
    localStorage.setItem('astroparty_rooms', JSON.stringify(next));
  } catch {}
};

const updateRoomHistoryContentMode = (code, contentMode) => {
  try {
    const existing = loadRoomHistory();
    const next = existing.map((r) => r.code === code ? { ...r, contentMode } : r);
    localStorage.setItem('astroparty_rooms', JSON.stringify(next));
  } catch {}
};

const playArrival = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
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
  } catch (e) {}
};

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

const Avatar = memo(({ name, size = 10, status, highlight }) => (
  <div className="relative flex-shrink-0">
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold
        ${status ? `ring-2 ${STATUS_RING[status] || STATUS_RING.idle}` : ''}
        ${highlight ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-black' : ''}`}
      style={{
        backgroundColor: avatarColor(name),
        width: `${size * 4}px`,
        height: `${size * 4}px`,
        fontSize: size <= 7 ? '11px' : '14px',
      }}
    >
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
    {highlight && (
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 border border-black flex items-center justify-center"
        style={{ fontSize: 7 }}
      >
        +
      </motion.div>
    )}
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

// ─── GIF overlay ──────────────────────────────────────────────────────────────

const GifOverlay = memo(({ gifUrl, id }) => (
  <motion.img
    key={id}
    src={gifUrl}
    initial={{ opacity: 0, scale: 0.7 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.7 }}
    transition={{ duration: 0.3 }}
    className="absolute top-1/4 left-1/2 -translate-x-1/2 max-w-[38%] rounded-xl shadow-2xl border border-white/10 pointer-events-none z-40"
    alt="gif reaction"
  />
));

// ─── Screen share overlays wrapper ────────────────────────────────────────────

const ScreenOverlays = ({ floatingEmojis, gifOverlays }) => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <AnimatePresence>
      {floatingEmojis.map((e) => (
        <FloatingEmoji key={e.id} emoji={e.emoji || e.content} id={e.id} x={e.x} />
      ))}
    </AnimatePresence>
    <AnimatePresence>
      {gifOverlays.map((g) => (
        <GifOverlay key={g.id} gifUrl={g.gifUrl} id={g.id} />
      ))}
    </AnimatePresence>
  </div>
);

// ─── WebRTC status dot ────────────────────────────────────────────────────────

const WebrtcDot = ({ status }) => {
  const color =
    status === 'connected'    ? 'bg-green-400'
    : status === 'poor'       ? 'bg-yellow-400'
    : status === 'reconnecting' ? 'bg-yellow-400'
    : status === 'failed'     ? 'bg-red-400'
    : 'bg-gray-500';
  const pulse = status === 'reconnecting' || status === 'connecting';
  return (
    <div
      className={`w-2 h-2 rounded-full flex-shrink-0 ${color} ${pulse ? 'animate-pulse' : ''}`}
      title={status}
    />
  );
};

// ─── Poll bar ─────────────────────────────────────────────────────────────────

const PollBar = ({ label, votes, total, onVote, hasVoted }) => {
  const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
  return (
    <button
      onClick={onVote}
      disabled={hasVoted}
      className={`w-full text-left rounded-xl overflow-hidden border transition-all
        ${hasVoted ? 'border-white/10 cursor-default' : 'border-violet-500/30 hover:border-violet-500/60 cursor-pointer'}`}
    >
      <div className="relative px-3 py-2">
        <div
          className="absolute inset-0 bg-violet-600/20 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
        <div className="relative flex items-center justify-between">
          <span className="text-white/80 text-xs font-medium">{label}</span>
          {hasVoted && <span className="text-white/50 text-xs">{pct}%</span>}
        </div>
      </div>
    </button>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const AstroPartyPage = ({ onClose, roomName }) => {
  const { profile } = useAuthContext();

  // ── Views & steps ────────────────────────────────────────────────────────────
  const [view, setView]         = useState('lobby');
  const [roomStep, setRoomStep] = useState('content');
  // 'content' | 'videolink' | 'screenshare' | 'watching'

  // ── Content mode ─────────────────────────────────────────────────────────────
  const [contentMode, setContentMode] = useState(null); // 'videolink' | 'screenshare'
  const [videoUrl, setVideoUrl]       = useState('');

  // ── Screen share (WebRTC) ────────────────────────────────────────────────────
  const [screenStream, setScreenStream] = useState(null);
  const screenStreamRef = useRef(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef          = useRef({});
  const localStreamRef = useRef(null);

  // ── WebRTC reconnection ──────────────────────────────────────────────────────
  const [webrtcStatus, setWebrtcStatus] = useState('idle'); // 'idle'|'connecting'|'connected'|'reconnecting'|'poor'|'failed'
  const webrtcRetryCountRef = useRef(0);
  const webrtcRetryTimerRef = useRef(null);
  const statsTimerRef       = useRef(null);
  const statsSnapshotRef    = useRef(0);

  // ── Sync refs ────────────────────────────────────────────────────────────────
  const webrtcCallbacksRef = useRef({ handleRequest: null, handleOffer: null, handleAnswer: null, handleIce: null });
  const socialCallbacksRef = useRef({ addGifOverlay: null, addFloatingEmoji: null });
  const pollCallbacksRef   = useRef({ onLaunch: null, onVote: null });
  const syncCallbacksRef   = useRef({ onSyncReq: null });

  // ── Stream (video link) ──────────────────────────────────────────────────────
  const [externalPlayerState, setExternalPlayerState] = useState({});
  const [activeSourceIdx, setActiveSourceIdx]         = useState(0);

  // ── Host current time ref (for late joiner sync) ──────────────────────────────
  const hostCurrentTimeRef = useRef(0);
  const currentVideoTimeRef = useRef(0);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const lastTimeUpdateRef = useRef(0);

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
  const [gifOverlays, setGifOverlays]     = useState([]);
  const [showGifPicker, setShowGifPicker] = useState(false);

  // ── Mobile ───────────────────────────────────────────────────────────────────
  const [mobileTab, setMobileTab] = useState('player');

  // ── Rating ───────────────────────────────────────────────────────────────────
  const [showRating, setShowRating] = useState(false);
  const [myRating, setMyRating]     = useState(0);

  // ── Chat timestamp pin ────────────────────────────────────────────────────────
  const [pinTimestamp, setPinTimestamp] = useState(false);

  // ── Live poll ─────────────────────────────────────────────────────────────────
  const [activePoll, setActivePoll] = useState(null); // { id, question, options, votes, closesAt }
  const pollTimerRef = useRef(null);

  // ── Cinema mode ───────────────────────────────────────────────────────────────
  const [cinemaMode, setCinemaMode] = useState(false);
  const cinemTimerRef = useRef(null);

  // ── Room history ──────────────────────────────────────────────────────────────
  const [roomHistory, setRoomHistory] = useState([]);

  // ── Arrival notification ──────────────────────────────────────────────────────
  const [newArrival, setNewArrival] = useState(null); // username string
  const prevParticipantNamesRef = useRef(new Set());

  // ── Host preview for guests ────────────────────────────────────────────────────
  const [hostPreviewInfo, setHostPreviewInfo] = useState(null); // { contentMode, videoUrl }|null

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const chatEndRef       = useRef(null);
  const channelRef       = useRef(null);
  const countdownTimer   = useRef(null);
  const isHostRef        = useRef(isHost);
  const prevHostRef      = useRef(true);
  const hasAutoJoinedRef = useRef(false);
  const profileRef       = useRef(profile);
  const videoUrlRef      = useRef(videoUrl);
  const contentModeRef   = useRef(contentMode);

  const myUsername = profile?.username || profile?.email?.split('@')[0] || 'Tu';

  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { videoUrlRef.current = videoUrl; }, [videoUrl]);
  useEffect(() => { contentModeRef.current = contentMode; }, [contentMode]);

  // Load history on mount
  useEffect(() => {
    setRoomHistory(loadRoomHistory());
  }, []);

  // Auto-join from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) setJoinCode(roomParam.toUpperCase());
  }, []);

  // localVideoRef and remoteVideoRef assignments handled by ref callbacks in JSX to avoid timing race

  // Cinema mode cleanup when leaving watching
  useEffect(() => {
    if (roomStep !== 'watching') {
      setCinemaMode(false);
      clearTimeout(cinemTimerRef.current);
    }
  }, [roomStep]);

  // ── Cinema mode mouse handler ──────────────────────────────────────────────────

  const handleMouseMove = useCallback(() => {
    if (roomStep !== 'watching') return;
    setCinemaMode(false);
    clearTimeout(cinemTimerRef.current);
    cinemTimerRef.current = setTimeout(() => setCinemaMode(true), 4000);
  }, [roomStep]);

  // ── Social helpers ────────────────────────────────────────────────────────────

  const addGifOverlay = useCallback((gifUrl) => {
    const id = Date.now() + Math.random();
    setGifOverlays((prev) => [...prev.slice(-4), { id, gifUrl }]);
    setTimeout(() => setGifOverlays((prev) => prev.filter((g) => g.id !== id)), 5000);
  }, []);

  const addFloatingEmojiLocal = useCallback((emoji) => {
    const id = Date.now() + Math.random();
    const x  = 10 + Math.random() * 80;
    setFloatingEmojis((prev) => [...prev, { id, content: emoji, emoji, x }]);
    setTimeout(() => setFloatingEmojis((prev) => prev.filter((e) => e.id !== id)), 2500);
  }, []);

  useEffect(() => {
    socialCallbacksRef.current = { addGifOverlay, addFloatingEmoji: addFloatingEmojiLocal };
  }, [addGifOverlay, addFloatingEmojiLocal]);

  // ICE candidate queue
  const pendingIceRef = useRef([]);

  // ── Broadcast ────────────────────────────────────────────────────────────────

  const broadcastSync = useCallback((payload) => {
    channelRef.current?.send({ type: 'broadcast', event: 'astro_sync', payload });
  }, []);

  const broadcastChat = useCallback((text, extra = {}) => {
    channelRef.current?.send({
      type: 'broadcast', event: 'astro_chat',
      payload: { username: myUsername, text, time: Date.now(), ...extra },
    });
  }, [myUsername]);

  // ── Poll actions ──────────────────────────────────────────────────────────────

  const launchPoll = useCallback(() => {
    if (!isHostRef.current) return;
    const id = Date.now();
    const poll = {
      id,
      question: '¿Como va?',
      options: ['🔥 Fuego', '👍 Bueno', '😐 Regular', '💤 Aburrido'],
      votes: {},
      closesAt: Date.now() + 30000,
    };
    setActivePoll(poll);
    channelRef.current?.send({ type: 'broadcast', event: 'astro_poll_launch', payload: poll });
    clearTimeout(pollTimerRef.current);
    pollTimerRef.current = setTimeout(() => setActivePoll(null), 30000);
  }, []);

  const votePoll = useCallback((optionIndex) => {
    const uid = profileRef.current?.id || myUsername;
    setActivePoll((prev) => {
      if (!prev || prev.votes[uid] !== undefined) return prev;
      const next = { ...prev, votes: { ...prev.votes, [uid]: optionIndex } };
      channelRef.current?.send({
        type: 'broadcast', event: 'astro_poll_vote',
        payload: { pollId: prev.id, userId: uid, optionIndex },
      });
      return next;
    });
  }, [myUsername]);

  useEffect(() => {
    pollCallbacksRef.current = { onLaunch: null, onVote: null };
  }, []);

  // ── Sync req handler refs ─────────────────────────────────────────────────────

  useEffect(() => {
    syncCallbacksRef.current.onSyncReq = ({ fromId }) => {
      if (!isHostRef.current) return;
      channelRef.current?.send({
        type: 'broadcast', event: 'astro_sync',
        payload: {
          type: 'state_snapshot',
          toId: fromId,
          currentTime: hostCurrentTimeRef.current,
          playing: true,
          videoUrl: videoUrlRef.current,
          contentMode: contentModeRef.current,
        },
      });
    };
  });

  // ── WebRTC handlers ──────────────────────────────────────────────────────────

  const handleScreenRequest = useCallback(async ({ fromId, fromUsername }) => {
    if (!isHostRef.current || !localStreamRef.current) return;
    console.log('[AstroParty] screen_request from', fromUsername);

    const pc = new RTCPeerConnection(buildPcConfig());
    pcRef.current[fromId] = pc;

    localStreamRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current);
    });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        channelRef.current?.send({
          type: 'broadcast', event: 'screen_ice',
          payload: { fromId: profileRef.current?.id, toId: fromId, candidate: candidate.toJSON() },
        }).catch(() => {});
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    channelRef.current?.send({
      type: 'broadcast', event: 'screen_offer',
      payload: { fromId: profileRef.current?.id, toId: fromId, sdp: offer.sdp, type: offer.type },
    }).catch(() => {});
  }, []);

  const handleScreenOffer = useCallback(async ({ fromId, toId, sdp, type: sdpType }) => {
    if (isHostRef.current || toId !== profileRef.current?.id) return;
    console.log('[AstroParty] screen_offer received from host');

    setWebrtcStatus('connecting');
    const pc = new RTCPeerConnection(buildPcConfig());
    pcRef.current['host'] = pc;

    // Stats polling for connection quality
    const startStats = () => {
      clearInterval(statsTimerRef.current);
      statsSnapshotRef.current = 0;
      statsTimerRef.current = setInterval(async () => {
        try {
          const stats = await pc.getStats();
          let bytesReceived = 0;
          const prev = statsSnapshotRef.current || 0;
          stats.forEach((s) => {
            if (s.type === 'inbound-rtp' && s.kind === 'video') bytesReceived = s.bytesReceived;
          });
          const bps = ((bytesReceived - prev) / 3) * 8;
          statsSnapshotRef.current = bytesReceived;
          setWebrtcStatus(bps > 400_000 ? 'connected' : bps > 100_000 ? 'poor' : 'connecting');
        } catch {}
      }, 3000);
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        webrtcRetryCountRef.current = 0;
        clearTimeout(webrtcRetryTimerRef.current);
        setWebrtcStatus('connected');
        startStats();
      } else if (state === 'disconnected' || state === 'failed') {
        setWebrtcStatus('reconnecting');
        clearInterval(statsTimerRef.current);
        const attempt = webrtcRetryCountRef.current;
        if (attempt < WEBRTC_RETRY_DELAYS.length) {
          webrtcRetryCountRef.current = attempt + 1;
          const delay = WEBRTC_RETRY_DELAYS[attempt];
          webrtcRetryTimerRef.current = setTimeout(() => {
            channelRef.current?.send({
              type: 'broadcast', event: 'screen_request',
              payload: { fromId: profileRef.current?.id, fromUsername: profileRef.current?.username || 'Anon' },
            }).catch(() => {});
          }, delay);
        } else {
          setWebrtcStatus('failed');
        }
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        channelRef.current?.send({
          type: 'broadcast', event: 'screen_ice',
          payload: { fromId: profileRef.current?.id, toId: fromId, candidate: candidate.toJSON() },
        }).catch(() => {});
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams?.[0] ?? new MediaStream([event.track]);
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      pendingIceRef.current.forEach((c) => pc.addIceCandidate(c).catch(() => {}));
      pendingIceRef.current = [];
    };

    await pc.setRemoteDescription({ type: sdpType, sdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    channelRef.current?.send({
      type: 'broadcast', event: 'screen_answer',
      payload: { fromId: profileRef.current?.id, toId: fromId, sdp: answer.sdp, type: answer.type },
    }).catch(() => {});
  }, []);

  const handleScreenAnswer = useCallback(async ({ fromId, toId, sdp, type: sdpType }) => {
    if (!isHostRef.current || toId !== profileRef.current?.id) return;
    const pc = pcRef.current[fromId];
    if (!pc) return;
    await pc.setRemoteDescription({ type: sdpType, sdp });
  }, []);

  const handleScreenIce = useCallback(async ({ fromId, toId, candidate }) => {
    if (toId !== profileRef.current?.id || !candidate) return;
    const pc = isHostRef.current ? pcRef.current[fromId] : pcRef.current['host'];
    if (!pc) {
      pendingIceRef.current.push(new RTCIceCandidate(candidate));
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('[AstroParty] ICE error:', err);
    }
  }, []);

  useEffect(() => {
    webrtcCallbacksRef.current = {
      handleRequest: handleScreenRequest,
      handleOffer:   handleScreenOffer,
      handleAnswer:  handleScreenAnswer,
      handleIce:     handleScreenIce,
    };
  }, [handleScreenRequest, handleScreenOffer, handleScreenAnswer, handleScreenIce]);

  // Send screen_request whenever we enter screenshare watching mode as a guest
  const screenRequestSentRef = useRef(false);
  useEffect(() => {
    if (isHost || contentMode !== 'screenshare' || roomStep !== 'watching') {
      screenRequestSentRef.current = false;
      return;
    }
    if (screenRequestSentRef.current) return;
    screenRequestSentRef.current = true;
    const send = () => {
      channelRef.current?.send({
        type: 'broadcast', event: 'screen_request',
        payload: { fromId: profileRef.current?.id, fromUsername: profileRef.current?.username || 'Anon' },
      }).catch(() => {});
    };
    const t = setTimeout(send, 800);
    return () => clearTimeout(t);
  }, [isHost, contentMode, roomStep]);

  // ── Channel setup ────────────────────────────────────────────────────────────

  const setupChannel = useCallback((code, asHost) => {
    const channel = supabase.channel(`astro-${code}`, {
      config: { presence: { key: myUsername } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const parts = Object.values(state).flat().map((p) => ({
          username: p.username || p.presence_ref || 'Anonimo',
          status:   p.status  || 'idle',
          isHost:   p.isHost  || false,
        }));
        setParticipants(parts.length ? parts : [{ username: myUsername, status: 'idle', isHost: asHost }]);

        const hostPresence = Object.values(state).flat().find((p) => p.isHost);
        if (hostPresence && !isHostRef.current) {
          if (hostPresence.step)        setRoomStep(hostPresence.step);
          if (hostPresence.contentMode) setContentMode(hostPresence.contentMode);
          if (hostPresence.videoUrl)    setVideoUrl(hostPresence.videoUrl);
          if (hostPresence.contentMode || hostPresence.videoUrl) {
            setHostPreviewInfo({
              contentMode: hostPresence.contentMode || null,
              videoUrl: hostPresence.videoUrl || null,
            });
          }
        }

        const hostPresent = Object.values(state).flat().some((p) => p.isHost);
        if (prevHostRef.current && !hostPresent && !isHostRef.current) {
          setSyncBanner({ text: 'El host abandono la sala', type: 'pause' });
          setTimeout(() => setSyncBanner(null), 8000);
        }
        prevHostRef.current = hostPresent;
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const joinedUsername = newPresences?.[0]?.username || key;
        if (joinedUsername && joinedUsername !== myUsername) {
          playArrival();
          setNewArrival(joinedUsername);
          setTimeout(() => setNewArrival(null), 2500);
        }
      })
      .on('broadcast', { event: 'astro_sync' }, ({ payload }) => {
        if (!payload) return;

        if (payload.type === 'state_snapshot' && payload.toId === profileRef.current?.id) {
          setExternalPlayerState({
            playing: payload.playing,
            currentTime: payload.currentTime,
          });
          if (payload.videoUrl)    setVideoUrl(payload.videoUrl);
          if (payload.contentMode) setContentMode(payload.contentMode);
          return;
        }
        if (payload.type === 'seek' && !isHostRef.current) {
          setExternalPlayerState((prev) => ({ ...prev, currentTime: payload.time }));
          return;
        }
        if (payload.type === 'source_change' && !isHostRef.current) {
          setActiveSourceIdx(payload.idx || 0);
          return;
        }

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
          setSyncBanner({ text: `Host pauso${label} — detente`, type: 'pause' });
          setTimeout(() => setSyncBanner(null), 6000);
        }
        if (payload.type === 'resume') {
          setSyncState('synced');
          setMyStatus('watching');
          const label = payload.timestamp ? ` desde ${payload.timestamp}` : '';
          setSyncBanner({ text: `Host reanudo${label} — dale play`, type: 'resume' });
          setTimeout(() => setSyncBanner(null), 5000);
        }
        if (payload.type === 'time_check') {
          setSyncBanner({ text: `Estamos en el minuto ${payload.timestamp}`, type: 'time' });
          setTimeout(() => setSyncBanner(null), 6000);
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
            setSyncBanner({ text: 'El host pauso', type: 'pause' });
            setTimeout(() => setSyncBanner(null), 3000);
          }
        }
        if (payload.type === 'seek' && isHostRef.current) {
          // host itself seeking — no-op for host
        }
        if (payload.type === 'start_watch') {
          if (!asHost) {
            const mode = payload.contentMode;
            setContentMode(mode || null);
            if (payload.videoUrl) setVideoUrl(payload.videoUrl);
            setRoomStep('watching');
            // After entering watching mode as guest, broadcast sync req for late join
            setTimeout(() => {
              channelRef.current?.send({
                type: 'broadcast', event: 'astro_sync_req',
                payload: { fromId: profileRef.current?.id },
              }).catch(() => {});
            }, 600);
          }
        }
        if (payload.type === 'session_end') {
          setSyncBanner({ text: 'El host termino la sesion', type: 'pause' });
          setTimeout(() => {
            setSyncBanner(null);
            setView('lobby');
            setRoomStep('content');
            setContentMode(null);
            setVideoUrl('');
            setSyncState('idle');
            setRemoteStream(null);
            setActivePoll(null);
          }, 3000);
        }
      })
      .on('broadcast', { event: 'astro_sync_req' }, ({ payload }) => {
        if (!payload) return;
        syncCallbacksRef.current.onSyncReq?.(payload);
      })
      .on('broadcast', { event: 'astro_chat' }, ({ payload }) => {
        if (!payload) return;
        setMessages((prev) => [...prev, payload]);
      })
      .on('broadcast', { event: 'astro_gif' }, ({ payload }) => {
        if (payload?.gifUrl && payload.fromId !== profileRef.current?.id) {
          socialCallbacksRef.current.addGifOverlay?.(payload.gifUrl);
        }
      })
      .on('broadcast', { event: 'astro_emoji' }, ({ payload }) => {
        if (payload?.emoji && payload.fromId !== profileRef.current?.id) {
          socialCallbacksRef.current.addFloatingEmoji?.(payload.emoji);
        }
      })
      .on('broadcast', { event: 'astro_poll_launch' }, ({ payload }) => {
        if (!payload) return;
        setActivePoll({ ...payload, votes: {} });
        clearTimeout(pollTimerRef.current);
        const msLeft = Math.max(0, payload.closesAt - Date.now());
        pollTimerRef.current = setTimeout(() => setActivePoll(null), msLeft);
      })
      .on('broadcast', { event: 'astro_poll_vote' }, ({ payload }) => {
        if (!payload) return;
        setActivePoll((prev) => {
          if (!prev || prev.id !== payload.pollId) return prev;
          return { ...prev, votes: { ...prev.votes, [payload.userId]: payload.optionIndex } };
        });
      })
      .on('broadcast', { event: 'screen_request' }, ({ payload }) => {
        webrtcCallbacksRef.current.handleRequest?.(payload);
      })
      .on('broadcast', { event: 'screen_offer' }, ({ payload }) => {
        webrtcCallbacksRef.current.handleOffer?.(payload);
      })
      .on('broadcast', { event: 'screen_answer' }, ({ payload }) => {
        webrtcCallbacksRef.current.handleAnswer?.(payload);
      })
      .on('broadcast', { event: 'screen_ice' }, ({ payload }) => {
        webrtcCallbacksRef.current.handleIce?.(payload);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            username: myUsername,
            status:   'idle',
            isHost:   asHost,
            step:     asHost ? 'content' : undefined,
            contentMode: null,
            videoUrl: null,
          });
        }
      });

    channelRef.current = channel;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUsername]);

  // ── Presence tracking ────────────────────────────────────────────────────────

  const trackPresence = useCallback((overrides = {}) => {
    if (!channelRef.current) return;
    channelRef.current.track({
      username:    myUsername,
      isHost:      isHostRef.current,
      status:      myStatus,
      step:        roomStep,
      contentMode,
      videoUrl,
      ...overrides,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUsername, myStatus, roomStep, contentMode, videoUrl]);

  // ── Room create / join ────────────────────────────────────────────────────────

  const createRoom = useCallback(async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
    setIsHost(true);
    isHostRef.current = true;
    setSyncState('idle');
    setMyStatus('idle');
    setMessages([]);
    setRoomStep('content');
    setContentMode(null);
    setVideoUrl('');
    setScreenStream(null);
    setRemoteStream(null);
    setActivePoll(null);
    setupChannel(code, true);
    setView('room');
    window.history.pushState({}, '', `?room=${code}`);
    saveRoomHistory({ code, date: Date.now(), contentMode: null, isHost: true });
    setRoomHistory(loadRoomHistory());
    toast.success(`Sala creada! Codigo: ${code}`, {
      description: 'Comparte el link con tus amigos',
      action: {
        label: 'Copiar link',
        onClick: () => navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?room=${code}`),
      },
      duration: 10000,
    });
  }, [setupChannel]);

  const joinRoom = useCallback(async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) { toast.error('Ingresa un codigo valido'); return; }
    setRoomCode(code);
    setIsHost(false);
    isHostRef.current = false;
    setSyncState('idle');
    setMyStatus('idle');
    setMessages([]);
    setupChannel(code, false);
    setView('room');
    saveRoomHistory({ code, date: Date.now(), contentMode: null, isHost: false });
    setRoomHistory(loadRoomHistory());
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

  // ── Content mode entry ────────────────────────────────────────────────────────

  const startVideoLink = useCallback(() => {
    if (!videoUrl.trim()) { toast.error('Pega un link de video'); return; }
    setContentMode('videolink');
    setRoomStep('watching');
    updateRoomHistoryContentMode(roomCode, 'videolink');
    setRoomHistory(loadRoomHistory());
    trackPresence({ step: 'watching', contentMode: 'videolink', videoUrl: videoUrl.trim() });
    broadcastSync({ type: 'start_watch', contentMode: 'videolink', videoUrl: videoUrl.trim() });
  }, [videoUrl, roomCode, broadcastSync, trackPresence]);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      screenStreamRef.current = stream;
      setScreenStream(stream);
      setContentMode('screenshare');
      setRoomStep('watching');
      updateRoomHistoryContentMode(roomCode, 'screenshare');
      setRoomHistory(loadRoomHistory());
      trackPresence({ step: 'watching', contentMode: 'screenshare' });
      broadcastSync({ type: 'start_watch', contentMode: 'screenshare' });

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShareCleanup();
      };
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        toast.error('No se pudo iniciar la comparticion de pantalla');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastSync, trackPresence, roomCode]);

  const stopScreenShareCleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setScreenStream(null);
    Object.values(pcRef.current).forEach((pc) => pc.close());
    pcRef.current = {};
    clearInterval(statsTimerRef.current);
    setWebrtcStatus('idle');
    broadcastSync({ type: 'session_end' });
    setView('lobby');
    setRoomStep('content');
    setContentMode(null);
    setSyncState('idle');
  }, [broadcastSync]);

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
    const t = currentVideoTimeRef.current;
    const extra = pinTimestamp && t > 0
      ? { timestamp: t, timestampLabel: formatVideoTime(t) }
      : {};
    setMessages((prev) => [...prev, { username: myUsername, text, time: Date.now(), own: true, ...extra }]);
    broadcastChat(text, extra);
    setChatInput('');
  }, [chatInput, myUsername, broadcastChat, pinTimestamp]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendReaction = useCallback((emoji) => {
    addFloatingEmojiLocal(emoji);
    channelRef.current?.send({
      type: 'broadcast', event: 'astro_emoji',
      payload: { fromId: profile?.id, emoji },
    }).catch(() => {});
  }, [profile?.id, addFloatingEmojiLocal]);

  const sendGif = useCallback((gif) => {
    addGifOverlay(gif.url);
    setShowGifPicker(false);
    channelRef.current?.send({
      type: 'broadcast', event: 'astro_gif',
      payload: { fromId: profile?.id, gifUrl: gif.url },
    }).catch(() => {});
  }, [profile?.id, addGifOverlay]);

  const copyRoomCode = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast.success('URL copiada al portapapeles');
    });
  }, []);

  const seekToTimestamp = useCallback((t) => {
    if (!isHost) return;
    broadcastSync({ type: 'seek', time: t });
    setExternalPlayerState((prev) => ({ ...prev, currentTime: t }));
  }, [isHost, broadcastSync]);

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearInterval(countdownTimer.current);
      clearTimeout(pollTimerRef.current);
      clearTimeout(cinemTimerRef.current);
      clearInterval(statsTimerRef.current);
      clearTimeout(webrtcRetryTimerRef.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      Object.values(pcRef.current).forEach((pc) => pc.close());
    };
  }, []);

  const readyCount = participants.filter((p) => p.status === 'ready').length;
  const totalCount = participants.length;

  // ─────────────────────────────────────────────────────────────────────────────
  // LOBBY VIEW
  // ─────────────────────────────────────────────────────────────────────────────

  if (view === 'lobby') {
    const recentRooms = roomHistory.slice(0, 3);
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: '#0a0a0f' }}>
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        )}

        <div className="flex flex-col items-center gap-10 px-6 w-full max-w-sm">
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

          <div className="flex flex-col gap-4 w-full">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={createRoom}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-full font-black text-base text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 0 28px rgba(124,58,237,0.5)' }}
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
                  placeholder="Codigo de sala"
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

            {recentRooms.length > 0 && (
              <div className="flex flex-col gap-2 mt-1">
                <span className="text-white/30 text-xs font-semibold tracking-wider uppercase px-1">Recientes</span>
                <div className="flex flex-wrap gap-2">
                  {recentRooms.map((r) => (
                    <button
                      key={r.code}
                      onClick={() => setJoinCode(r.code)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/10 transition-all"
                    >
                      <span className="text-white/60 text-xs font-mono font-bold">{r.code}</span>
                      {r.isHost && <Crown size={9} className="text-yellow-400/60" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ROOM INNER COMPONENTS
  // ─────────────────────────────────────────────────────────────────────────────

  const isWatching = roomStep === 'watching';

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

  // ─── Step: Content mode selector ──────────────────────────────────────────────

  const StepContent = () => (
    <motion.div
      key="step-content"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="flex flex-col items-center gap-6 w-full max-w-sm"
    >
      <div className="text-center">
        <h2 className="text-white font-black text-xl">Que quieres ver?</h2>
        <p className="text-white/40 text-sm mt-1">Elige como compartir contenido</p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setRoomStep('videolink')}
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-violet-500/15 hover:border-violet-500/40 transition-all p-6 focus:outline-none"
        >
          <div className="w-12 h-12 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <Link size={24} className="text-violet-400" />
          </div>
          <div className="text-center">
            <div className="text-white font-bold text-sm">Link de video</div>
            <div className="text-white/40 text-xs mt-0.5">.m3u8 · .mp4 · .webm</div>
          </div>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setRoomStep('screenshare')}
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-cyan-500/15 hover:border-cyan-500/40 transition-all p-6 focus:outline-none"
        >
          <div className="w-12 h-12 rounded-xl bg-cyan-500/15 flex items-center justify-center">
            <Monitor size={24} className="text-cyan-400" />
          </div>
          <div className="text-center">
            <div className="text-white font-bold text-sm">Compartir pantalla</div>
            <div className="text-white/40 text-xs mt-0.5">Netflix · YouTube · etc.</div>
          </div>
        </motion.button>
      </div>
    </motion.div>
  );

  // ─── Step: Video link input ────────────────────────────────────────────────────

  const StepVideoLink = () => {
    const fmt = getVideoFormat(videoUrl);
    const hasFmt = videoUrl.trim().length > 0;
    return (
      <motion.div
        key="step-videolink"
        initial={{ opacity: 0, x: 32 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -32 }}
        className="flex flex-col gap-4 w-full max-w-md"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRoomStep('content')}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors flex-shrink-0"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <Link size={15} className="text-violet-400" />
            <span className="text-white font-bold text-sm">Pega el link del video</span>
          </div>
        </div>

        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://... (.m3u8, .mp4 o .webm)"
          autoFocus
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-violet-500/60 transition-all"
        />

        {hasFmt && (
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-green-400/80 text-xs font-bold">Formato detectado: {fmt}</span>
          </div>
        )}

        <motion.button
          whileHover={{ scale: videoUrl.trim() ? 1.02 : 1 }}
          whileTap={{ scale: videoUrl.trim() ? 0.97 : 1 }}
          onClick={startVideoLink}
          disabled={!videoUrl.trim()}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-white text-base transition-all
            ${videoUrl.trim() ? 'bg-violet-600 hover:bg-violet-500 shadow-[0_0_20px_rgba(124,58,237,0.4)]' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
        >
          Ver juntos
        </motion.button>
      </motion.div>
    );
  };

  // ─── Step: Screen share setup ──────────────────────────────────────────────────

  const StepScreenShare = () => {
    const [showAudioTip, setShowAudioTip] = React.useState(false);
    return (
      <motion.div
        key="step-screenshare"
        initial={{ opacity: 0, x: 32 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -32 }}
        className="flex flex-col items-center gap-6 w-full max-w-sm text-center"
      >
        <div className="flex items-center gap-3 self-start">
          <button
            onClick={() => setRoomStep('content')}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors flex-shrink-0"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <Monitor size={15} className="text-cyan-400" />
            <span className="text-white font-bold text-sm">Compartir pantalla</span>
          </div>
        </div>

        <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <Monitor size={36} className="text-cyan-400" />
        </div>

        <div>
          <h3 className="text-white font-black text-xl">Comparte tu pantalla</h3>
          <p className="text-white/40 text-sm mt-2 leading-relaxed max-w-xs">
            Todos en la sala veran tu pantalla en tiempo real. Ideal para Netflix, YouTube, videos locales o cualquier app.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={startScreenShare}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-white text-base bg-cyan-600 hover:bg-cyan-500 transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)]"
        >
          <Monitor size={18} />
          Iniciar compartir pantalla
        </motion.button>

        {/* Audio tip */}
        <div className="w-full">
          <button
            onClick={() => setShowAudioTip((v) => !v)}
            className="flex items-center gap-2 text-yellow-400/60 hover:text-yellow-400/90 text-xs transition-colors"
          >
            <Volume2 size={12} />
            <span>Tip: compartir audio en Chrome</span>
            <ChevronLeft size={10} className={`transition-transform ${showAudioTip ? '-rotate-90' : 'rotate-180'}`} />
          </button>
          <AnimatePresence>
            {showAudioTip && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 px-3 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-left">
                  <p className="text-yellow-300/80 text-xs leading-relaxed">
                    Para compartir audio en Chrome: selecciona la pestana o ventana y marca "Compartir audio"
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  // ─── Guest waiting ─────────────────────────────────────────────────────────────

  const GuestWaiting = () => {
    const msg = {
      content:     'El host esta eligiendo contenido',
      videolink:   'El host esta configurando el video',
      screenshare: 'El host esta preparando la comparticion',
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
          className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center"
        >
          {roomStep === 'screenshare'
            ? <Monitor size={22} className="text-cyan-400" />
            : roomStep === 'videolink'
              ? <Link size={22} className="text-violet-400" />
              : <Rocket size={22} className="text-violet-400" />}
        </motion.div>
        <div>
          <p className="text-white font-black text-lg">
            {msg}
            {<AnimatedDots />}
          </p>
        </div>

        {/* Content preview */}
        {hostPreviewInfo && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 w-full max-w-xs"
          >
            {hostPreviewInfo.contentMode === 'videolink' && hostPreviewInfo.videoUrl ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <Link size={13} className="text-violet-400 flex-shrink-0" />
                <span className="text-violet-300/80 text-xs truncate">{hostPreviewInfo.videoUrl}</span>
              </div>
            ) : hostPreviewInfo.contentMode === 'screenshare' ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <Monitor size={13} className="text-cyan-400 flex-shrink-0" />
                <span className="text-cyan-300/80 text-xs">Compartiendo pantalla</span>
              </div>
            ) : null}
          </motion.div>
        )}
      </motion.div>
    );
  };

  // ─── Step: Watching ───────────────────────────────────────────────────────────

  const StepWatching = () => {
    const fmt = getVideoFormat(videoUrl);

    // Video link mode
    if (contentMode === 'videolink') {
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 relative min-h-0 p-3">
            <div className="relative w-full h-full">
              <AnimePlayer
                source={{ url: videoUrl, format: fmt.toLowerCase() === 'hls' ? 'hls' : 'mp4', quality: 'Direct', server: 'direct' }}
                subtitles={[]}
                isHost={isHost}
                externalState={externalPlayerState}
                onPlay={(time) => broadcastSync({ type: 'play', time })}
                onPause={(time) => broadcastSync({ type: 'pause_player', time })}
                onSeek={(time) => broadcastSync({ type: 'seek', time })}
                onTimeUpdate={(time) => {
                  hostCurrentTimeRef.current = time;
                  currentVideoTimeRef.current = time;
                  // Only trigger re-render at most once per second to avoid flickering
                  const now = Date.now();
                  if (now - lastTimeUpdateRef.current >= 1000) {
                    lastTimeUpdateRef.current = now;
                    setCurrentVideoTime(time);
                  }
                }}
                countdown={syncState === 'counting' ? countdown : null}
                floatingEmojis={floatingEmojis}
                gifOverlays={gifOverlays}
              />
              <ScreenOverlays floatingEmojis={floatingEmojis} gifOverlays={gifOverlays} />
            </div>
          </div>
          <div className="px-4 py-2 flex items-center justify-between border-t border-white/5 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Link size={11} className="text-violet-400 flex-shrink-0" />
              <span className="text-white/40 text-xs truncate max-w-[200px]">{videoUrl}</span>
              <span className="text-white/20 text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 flex-shrink-0">{fmt}</span>
            </div>
            {isHost && (
              <button onClick={() => setShowRating(true)} className="text-white/20 hover:text-white/40 text-xs transition-colors flex-shrink-0 ml-2">
                Terminar sesion
              </button>
            )}
          </div>
        </div>
      );
    }

    // Screen share mode
    if (contentMode === 'screenshare') {
      return (
        <div className="flex flex-col h-full bg-black">
          <div className="flex-1 relative min-h-0">
            {isHost ? (
              <div className="relative w-full h-full">
                <video
                  ref={(node) => {
                    localVideoRef.current = node;
                    if (node && screenStreamRef.current) {
                      node.srcObject = screenStreamRef.current;
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />
                <ScreenOverlays floatingEmojis={floatingEmojis} gifOverlays={gifOverlays} />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-white text-xs font-bold">En vivo</span>
                  <button
                    onClick={stopScreenShareCleanup}
                    className="ml-1 text-red-400 hover:text-red-300 text-xs font-bold transition-colors"
                  >
                    Detener
                  </button>
                </div>
              </div>
            ) : remoteStream ? (
              <div className="relative w-full h-full">
                <video
                  ref={(node) => {
                    remoteVideoRef.current = node;
                    if (node && remoteStreamRef.current) {
                      node.srcObject = remoteStreamRef.current;
                    }
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
                <ScreenOverlays floatingEmojis={floatingEmojis} gifOverlays={gifOverlays} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 size={32} className="animate-spin text-violet-400" />
                <p className="text-white/50 text-sm">Conectando con el host...</p>
              </div>
            )}
          </div>
          <div className="px-4 py-2 flex items-center justify-between border-t border-white/5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Monitor size={11} className="text-cyan-400" />
              <span className="text-white/40 text-xs">Compartiendo pantalla</span>
              {!isHost && <WebrtcDot status={webrtcStatus} />}
              {!isHost && webrtcStatus === 'reconnecting' && (
                <span className="text-yellow-400/70 text-[10px] font-semibold">Reconectando...</span>
              )}
              {!isHost && webrtcStatus === 'failed' && (
                <span className="text-red-400/70 text-[10px] font-semibold">Fallo la conexion</span>
              )}
            </div>
            {isHost && (
              <button onClick={stopScreenShareCleanup} className="text-red-400/60 hover:text-red-400 text-xs transition-colors">
                Detener
              </button>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // ─── Honor sync controls (video link mode only) ───────────────────────────────

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

  // ─── Live Poll ────────────────────────────────────────────────────────────────

  const LivePoll = () => {
    if (!activePoll) return null;
    const myUid = profileRef.current?.id || myUsername;
    const myVote = activePoll.votes[myUid];
    const hasVoted = myVote !== undefined;
    const totalVotes = Object.keys(activePoll.votes).length;
    const secondsLeft = Math.max(0, Math.round((activePoll.closesAt - Date.now()) / 1000));

    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="mx-4 mb-3 p-3 rounded-2xl border border-violet-500/20 bg-violet-500/5"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <BarChart2 size={12} className="text-violet-400" />
            <span className="text-violet-300/80 text-xs font-bold">{activePoll.question}</span>
          </div>
          <span className="text-white/30 text-[10px]">{secondsLeft}s</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {activePoll.options.map((opt, i) => {
            const optVotes = Object.values(activePoll.votes).filter((v) => v === i).length;
            return (
              <PollBar
                key={i}
                label={opt}
                votes={optVotes}
                total={totalVotes}
                hasVoted={hasVoted}
                onVote={() => votePoll(i)}
              />
            );
          })}
        </div>
        {hasVoted && (
          <p className="text-white/30 text-[10px] mt-2 text-center">
            {totalVotes} voto{totalVotes !== 1 ? 's' : ''}
          </p>
        )}
      </motion.div>
    );
  };

  // ─── Social panel ──────────────────────────────────────────────────────────────

  const SocialPanel = () => (
    <div className={`flex flex-col h-full transition-all duration-500 ${cinemaMode && isWatching ? 'opacity-20 hover:opacity-100' : ''}`} style={{ background: 'rgba(255,255,255,0.015)' }}>
      {/* Participants */}
      <div className="px-4 pt-4 pb-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-1.5 mb-2">
          <Users size={13} className="text-white/40" />
          <span className="text-white/50 text-xs font-semibold">Participantes ({participants.length})</span>
        </div>
        <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto">
          {participants.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <AnimatePresence>
                {newArrival === p.username ? (
                  <Avatar name={p.username} size={7} status={p.status} highlight />
                ) : (
                  <Avatar name={p.username} size={7} status={p.status} />
                )}
              </AnimatePresence>
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

        {/* Host poll launch button */}
        {isHost && isWatching && (
          <button
            onClick={launchPoll}
            className="mt-2 flex items-center gap-1.5 text-violet-400/60 hover:text-violet-400/90 text-[11px] transition-colors"
          >
            <BarChart2 size={11} />
            Lanzar vibe check
          </button>
        )}
      </div>

      {/* Live poll */}
      <AnimatePresence>
        {activePoll && <LivePoll />}
      </AnimatePresence>

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
                {msg.gifUrl ? (
                  <img
                    src={msg.gifUrl}
                    alt="gif"
                    className="max-w-full rounded-xl border border-white/10 shadow-lg"
                  />
                ) : (
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-snug
                    ${isOwn
                      ? 'bg-violet-600 text-white rounded-tr-sm'
                      : 'bg-white/5 text-white/80 rounded-tl-sm border border-white/10'}`}>
                    {msg.text}
                  </div>
                )}
                {msg.timestamp !== undefined && (
                  <button
                    onClick={() => seekToTimestamp(msg.timestamp)}
                    className="flex items-center gap-1 text-[10px] text-cyan-400/70 hover:text-cyan-400 transition-colors mt-0.5"
                    title={isHost ? 'Click para saltar a este momento' : 'Timestamp del video'}
                  >
                    <MapPin size={9} />
                    {msg.timestampLabel || formatVideoTime(msg.timestamp)}
                  </button>
                )}
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
          <button
            type="button"
            onClick={() => setShowGifPicker(true)}
            className="w-7 h-7 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10 transition-all flex-shrink-0"
          >
            <Gift size={14} />
          </button>
          {isWatching && (
            <button
              type="button"
              onClick={() => setPinTimestamp((v) => !v)}
              title={pinTimestamp ? 'Quitar timestamp' : 'Agregar timestamp del video'}
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all flex-shrink-0
                ${pinTimestamp ? 'text-cyan-400 bg-cyan-500/15' : 'text-white/25 hover:text-white/50 hover:bg-white/10'}`}
            >
              <MapPin size={13} />
            </button>
          )}
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={pinTimestamp && currentVideoTime > 0 ? `Mensaje @ ${formatVideoTime(currentVideoTime)}` : 'Mensaje...'}
            className="flex-1 bg-transparent text-white placeholder-white/25 text-sm focus:outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={!chatInput.trim()}
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all flex-shrink-0
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
            <p className="text-white/40 text-sm mb-6">
              {contentMode === 'screenshare' ? 'Comparticion de pantalla' : videoUrl || 'Sin contenido'}
            </p>
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
                setRoomStep('content');
                setContentMode(null);
                setVideoUrl('');
                setSyncState('idle');
                setActivePoll(null);
                localStreamRef.current?.getTracks().forEach((t) => t.stop());
                localStreamRef.current = null;
                setScreenStream(null);
                Object.values(pcRef.current).forEach((pc) => pc.close());
                pcRef.current = {};
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

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#0a0a0f' }}
      onMouseMove={isWatching ? handleMouseMove : undefined}
    >
      <RoomHeader />

      {/* Body */}
      {!isWatching ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Setup wizard */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto relative">
            <SyncBanner />
            <AnimatePresence mode="wait">
              {isHost ? (
                <React.Fragment key="host-steps">
                  {roomStep === 'content'     && <StepContent />}
                  {roomStep === 'videolink'   && <StepVideoLink />}
                  {roomStep === 'screenshare' && <StepScreenShare />}
                </React.Fragment>
              ) : (
                <GuestWaiting key="guest-waiting" />
              )}
            </AnimatePresence>
          </div>

          {/* Social sidebar — desktop only */}
          <div className="hidden lg:flex flex-col border-l border-white/5 flex-shrink-0" style={{ width: 280 }}>
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
          <div className="hidden lg:flex flex-col border-l border-white/5 flex-shrink-0" style={{ width: 280 }}>
            <SocialPanel />
          </div>
        </div>
      )}

      {/* Mobile tab bar — only while watching */}
      {isWatching && (
        <div
          className={`flex sm:hidden border-t border-white/5 flex-shrink-0 transition-opacity duration-500 ${cinemaMode ? 'opacity-30' : 'opacity-100'}`}
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

      <GifPickerModal
        isOpen={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelect={sendGif}
      />
    </div>
  );
};

export default memo(AstroPartyPage);
