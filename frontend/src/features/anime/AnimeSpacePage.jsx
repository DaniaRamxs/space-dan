import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Radio, Users, MessageSquare, ChevronLeft, Tv, Send, Crown, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlaybackSync } from '@/hooks/usePlaybackSync';
import { useReactionEngine } from '@/hooks/useReactionEngine';
import { animeService } from './animeService';
import { liveActivitiesService } from '@/services/liveActivitiesService';
import { supabase } from '@/supabaseClient';
import { joinOrCreateRoom, client as colyseusClient } from '@/services/colyseusClient';
import AnimeEpisodeList from './AnimeEpisodeList';
import AnimePlayer from './AnimePlayer';
import AnimeSearch from './AnimeSearch';

const AnimeSpacePage = ({ onClose, roomName }) => {
  // ── 1. Context ───────────────────────────────────────────────────────────
  const { profile } = useAuthContext();
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // ── 2. All state (declared first so service hooks can depend on them) ────
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [view, setView] = useState('search');
  const [mobilePanel, setMobilePanel] = useState('info');
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [streamData, setStreamData] = useState(null);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [room, setRoom] = useState(null);
  const [roomState, setRoomState] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [remoteHostInfo, setRemoteHostInfo] = useState(null); // host info recibido via broadcast/presence antes de Colyseus
  const [presenceIsHost, setPresenceIsHost] = useState(false); // soy el primero en el canal (host por presencia)
  const [presenceReady, setPresenceReady] = useState(false); // al menos un sync de presencia completado
  const [presenceParticipants, setPresenceParticipants] = useState([]); // todos los usuarios en el canal via Presence
  const [bufferingUsers, setBufferingUsers] = useState({});
  const [countdown, setCountdown] = useState(null);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [debugInfo, setDebugInfo] = useState({ channel: '', trackOk: null, subscribeStatus: '' });

  // ── 3. All refs (declared before any hook that references them) ───────────
  const chatEndRef = useRef(null);
  const leavingRoomRef = useRef(false);
  const syncChannelRef = useRef(null);
  const applyingRemoteStateRef = useRef(false);
  const roomRef = useRef(null);
  const connectToWatchPartyRef = useRef(null);
  const colyseusRoomIdRef = useRef(null);
  const lastSyncedSecondRef = useRef(-1);
  const lastSyncedEpisodeIdRef = useRef(null);
  const animeSelectAbortRef = useRef(null);
  const episodeSelectAbortRef = useRef(null);
  const isSyncedHostRef = useRef(false);
  const presenceHostDeterminedRef = useRef(false);
  const presenceHostTimerRef = useRef(null);
  const channelCallbacksRef = useRef({ syncCurrentState: null, addGifOverlay: null, addFloatingEmoji: null });
  const runCountdownRef = useRef(null);
  const heartbeatRef = useRef(null);
  const joinedAtRef = useRef(null);
  const lastBroadcastRef = useRef(0);
  const savedPositionRef = useRef(null);
  const isHostRef = useRef(false);

  // Temporary handlePlaybackStateUpdate before usePlaybackSync (to avoid initialization error)
  const handlePlaybackStateUpdate = useCallback((state) => {
    if (state.type === 'play_countdown') {
      // Will be updated later when runCountdownRef is available
      setTimeout(() => {
        runCountdownRef.current?.(state.payload?.currentTime ?? 0);
      }, 0);
    }
  }, []);

  // ── 4. Service hooks (depend on state/refs above) ─────────────────────────
  const {
    playbackState,
    isHost: isSyncedHost,
    reactions,
    updatePlayback
  } = usePlaybackSync({
    roomName: roomName || 'general',
    colyseusRoom: room,
    onStateUpdate: handlePlaybackStateUpdate
  });

  const { gifOverlays, isStorming, addGifOverlay } = useReactionEngine({
    room,
    getVideoTimestamp: () => playbackState?.currentTime ?? 0
  });

  // ── 5. Derived values (useMemo after all hooks) ───────────────────────────
  const hostParticipant = useMemo(() => {
    // Prioridad: 1) isSyncedHost (Colyseus), 2) participante con isHost, 3) playbackState.hostId, 4) remoteHostInfo (broadcast)
    if (isSyncedHost) {
      return participants.find(p => p.userId === profile?.id) || { username: profile?.username, avatar: profile?.avatar_url, isHost: true, userId: profile?.id };
    }

    const explicitHost = participants.find(p => p.isHost === true);
    if (explicitHost) return explicitHost;

    if (playbackState?.hostId) {
      return participants.find(p => p.userId === playbackState.hostId) || null;
    }

    // Fallback: info del host recibida via broadcast (antes de que Colyseus se conecte)
    if (remoteHostInfo) return { ...remoteHostInfo, isHost: true };

    return null;
  }, [participants, playbackState?.hostId, isSyncedHost, profile?.id, profile?.username, profile?.avatar_url, remoteHostInfo]);

  const isHost = isSyncedHost || presenceIsHost || hostParticipant?.userId === profile?.id;

  const clearRoomState = useCallback(() => {
    setRoom(null);
    setRoomState(null);
    setParticipants([]);
    colyseusRoomIdRef.current = null;
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // State refs for stable broadcasting
  const stateRef = useRef({ view, selectedAnime, episodes, currentEpisode, streamData, activeSourceIndex, roomState });
  useEffect(() => {
    stateRef.current = { view, selectedAnime, episodes, currentEpisode, streamData, activeSourceIndex, roomState };
  }, [view, selectedAnime, episodes, currentEpisode, streamData, activeSourceIndex, roomState]);

  // Keep roomRef in sync so callbacks don't need room in their deps
  useEffect(() => { roomRef.current = room; }, [room]);

  // Keep isSyncedHostRef in sync so syncCurrentState can read it without deps
  useEffect(() => { isSyncedHostRef.current = isSyncedHost; }, [isSyncedHost]);
  // Keep isHostRef in sync (full isHost: Colyseus + presence)
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);

  // Función de sincronización movida fuera del useEffect para evitar condiciones de carrera
  const syncCurrentState = useCallback(() => {
    const s = stateRef.current;
    if (!syncChannelRef.current) return;
    syncChannelRef.current.send({
      type: 'broadcast',
      event: 'anime_state',
      payload: {
        senderId: profile?.id || null,
        senderUsername: profile?.username || null,
        senderAvatar: profile?.avatar_url || null,
        isHostBroadcast: isHostRef.current,
        view: s.view,
        selectedAnime: s.selectedAnime || null,
        episodes: s.episodes,
        currentEpisode: s.currentEpisode,
        streamData: s.streamData,
        activeSourceIndex: s.activeSourceIndex,
        colyseusRoomId: colyseusRoomIdRef.current || null,
        roomState: s.roomState?.roomId
          ? { roomId: s.roomState.roomId }
          : s.currentEpisode && s.selectedAnime
            ? { roomId: `anime-${s.selectedAnime.id?.slice(0, 8)}-${String(s.currentEpisode.number).padStart(3, '0')}` }
            : null,
      },
    }).then(r => console.log('[syncCurrentState] send:', r)).catch(err => console.error('[syncCurrentState] error:', err));
  }, [profile?.id, profile?.username, profile?.avatar_url]);

  // runCountdown needs updatePlayback - declared after updatePlayback is available
  const runCountdown = useCallback((currentTime) => {
    setCountdown(3);
    setTimeout(() => setCountdown(2), 1000);
    setTimeout(() => setCountdown(1), 2000);
    setTimeout(() => { setCountdown(null); updatePlayback({ playing: true, currentTime }); }, 3000);
  }, [updatePlayback]);
  runCountdownRef.current = runCountdown;

  const connectToWatchParty = useCallback(async ({ anime, episode, roomId, colyseusRoomId, announceActivity }) => {
    console.log('[AnimeSpace] connectToWatchParty called:', { anime: anime?.title, episode: episode?.number, roomId, colyseusRoomId, announceActivity });

    if (roomRef.current?.connection?.isOpen) {
      console.log('[AnimeSpace] Already in room, skipping connection');
      return;
    }

    if (announceActivity) {
      try {
        await liveActivitiesService.createActivity({
          type: 'anime',
          title: `${anime.title} - Ep ${episode.number}`,
          roomName: roomName || `Sala de ${profile?.username || 'Gamer'}`,
          metadata: {
            animeId: anime.id,
            animeTitle: anime.title,
            episodeId: episode.id,
            episodeNumber: episode.number,
            image: anime.image,
          },
        });
      } catch (error) {
        console.warn('[AnimeSpace] Failed to create activity:', error);
      }
    }

    try {
      let newRoom;
      if (colyseusRoomId) {
        // Viewer: unirse a la sala exacta del host por ID
        console.log('[AnimeSpace] Joining exact room by ID:', colyseusRoomId);
        newRoom = await colyseusClient.joinById(colyseusRoomId, {
          userId: profile?.id,
          username: profile?.username,
          avatar: profile?.avatar_url,
        });
      } else {
        // Host: crear o encontrar sala por instanceId
        console.log('[AnimeSpace] Creating/joining room with instanceId:', roomName);
        newRoom = await joinOrCreateRoom('live_activity', {
          instanceId: roomName,
          activityId: roomId,
          activityType: 'anime',
          animeId: anime.id,
          animeTitle: anime.title,
          episodeId: episode.id,
          episodeNumber: episode.number,
          videoId: episode.id,
          userId: profile?.id,
          username: profile?.username,
          avatar: profile?.avatar_url,
          hostId: profile?.id,
        });
      }

      console.log('[AnimeSpace] Successfully joined room:', newRoom?.roomId);
      colyseusRoomIdRef.current = newRoom.roomId;
      setRoom(newRoom);

      setTimeout(() => { syncCurrentState(); }, 500);

    } catch (error) {
      console.warn('[AnimeSpace] Colyseus unavailable, solo mode enabled:', error.message);
      if (announceActivity) {
        toast('Modo solitario: la watch party no respondió.', { icon: '📺' });
      }
    }
  }, [roomName, profile?.id, profile?.username, profile?.avatar_url, syncCurrentState]);
  connectToWatchPartyRef.current = connectToWatchParty;

  // broadcastBuffering needs isHost - declared after isHost is derived
  const broadcastBuffering = useCallback((isBuffering) => {
    if (!syncChannelRef.current || !onCloseRef.current || isHost) return; // only viewers broadcast
    syncChannelRef.current.send({
      type: 'broadcast',
      event: 'viewer_buffering',
      payload: { userId: profile?.id, username: profile?.username, isBuffering },
    }).catch(() => {});
  }, [isHost, profile?.id, profile?.username]);

  const addFloatingEmoji = useCallback((content) => {
    const id = Date.now() + Math.random();
    const x = 20 + Math.random() * 60;
    setFloatingEmojis(prev => [...prev.slice(-8), { id, content, x }]);
    setTimeout(() => setFloatingEmojis(prev => prev.filter(e => e.id !== id)), 2500);
  }, []);

  // Mantener ref de callbacks estables para el canal Supabase (evita que el canal se recree)
  useEffect(() => {
    channelCallbacksRef.current = { syncCurrentState, addGifOverlay, addFloatingEmoji };
  }, [syncCurrentState, addGifOverlay, addFloatingEmoji]);

  // Cuando el usuario se convierte en host (lobby), anunciarse a los viewers que esperan
  useEffect(() => {
    if (!isSyncedHost || !onCloseRef.current || !syncChannelRef.current) return;
    syncCurrentState();
  }, [isSyncedHost, syncCurrentState]);

  useEffect(() => {
    if (!roomName || !onCloseRef.current) return undefined;

    const channelName = `anime-sync-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`;
    const channel = supabase.channel(channelName);
    syncChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const allPresence = Object.values(state).flat();
        console.log('[Presence sync]', { count: allPresence.length, users: allPresence.map(p => `${p.username}(${p.joinedAt})`), myId: profile?.id, alreadyDetermined: presenceHostDeterminedRef.current });
        if (allPresence.length === 0) return;
        // El primero en llegar (menor joinedAt) es el host
        const sorted = [...allPresence].sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
        setPresenceParticipants(sorted);
        console.log('[Presence sorted]', sorted.map(p => `${p.username}(joinedAt=${p.joinedAt})`), '→ host sería:', sorted[0]?.username);
        // Si ya se determinó el host, no volver a evaluar (evita flickering por heartbeats)
        if (presenceHostDeterminedRef.current) { console.log('[Presence] host ya determinado, skip'); return; }
        // Debounce 1.5s: esperar a que todas las presencias propaguen antes de decidir host
        // (el primer sync de un usuario nuevo solo se ve a sí mismo — race condition)
        if (presenceHostTimerRef.current) clearTimeout(presenceHostTimerRef.current);
        presenceHostTimerRef.current = setTimeout(() => {
          if (presenceHostDeterminedRef.current) return;
          presenceHostDeterminedRef.current = true;
          const freshAll = Object.values(channel.presenceState()).flat();
          const freshSorted = freshAll.length
            ? [...freshAll].sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0))
            : sorted;
          const hostPresence = freshSorted[0];
          console.log('[Presence timer fired] freshUsers:', freshSorted.map(p => `${p.username}(${p.joinedAt})`), '→ host:', hostPresence?.username, 'yo:', profile?.username, 'soyHost:', hostPresence?.userId === profile?.id);
          if (!hostPresence?.userId) { setPresenceReady(true); return; }
          if (hostPresence.userId === profile?.id) {
            setPresenceIsHost(true);
            setRemoteHostInfo(null);
          } else {
            setPresenceIsHost(false);
            setRemoteHostInfo({ username: hostPresence.username, avatar: hostPresence.avatar || null, userId: hostPresence.userId });
          }
          setPresenceReady(true);
        }, 1500);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences?.forEach(p => {
          if (p.userId && p.userId !== profile?.id) {
            toast(`${p.username || 'Alguien'} se unió 👋`, { duration: 3000 });
          }
        });
      })
      .on('broadcast', { event: 'anime_state' }, async ({ payload }) => {
        console.log('[anime_state received]', { senderId: payload?.senderId, view: payload?.view, hasAnime: !!payload?.selectedAnime, hasEpisode: !!payload?.currentEpisode });
        if (!payload || payload.senderId === profile?.id) return;

        // Capturar info del host aunque no haya anime seleccionado aún
        if (payload.isHostBroadcast && payload.senderUsername) {
          setRemoteHostInfo({ username: payload.senderUsername, avatar: payload.senderAvatar || null, userId: payload.senderId });
        }

        if (!payload.selectedAnime) return; // solo actualizar UI si hay anime

        applyingRemoteStateRef.current = true;

        // Actualizar UI inmediatamente (no esperar a Colyseus)
        setSelectedAnime(payload.selectedAnime || null);
        setEpisodes(payload.episodes || []);
        setCurrentEpisode(payload.currentEpisode || null);
        setStreamData(payload.streamData || null);
        setActiveSourceIndex(payload.activeSourceIndex || 0);
        setView(payload.view || 'search');
        if (payload.currentEpisode) setMobilePanel('chat');

        // Unirse a sala Colyseus en segundo plano
        if (payload.currentEpisode && payload.selectedAnime && payload.roomState?.roomId) {
          try {
            if (!roomRef.current?.connection?.isOpen) {
              await connectToWatchPartyRef.current({
                anime: payload.selectedAnime,
                episode: payload.currentEpisode,
                roomId: payload.roomState.roomId,
                colyseusRoomId: payload.colyseusRoomId || null,
                announceActivity: false,
              });
            }
          } catch (error) {
            console.warn('[AnimeSpace] Failed to join synced room:', error);
          }
        }

        window.setTimeout(() => {
          applyingRemoteStateRef.current = false;
        }, 0);
      })
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
        if (payload.type === "gif" && payload.userId !== profile?.id) {
          channelCallbacksRef.current.addGifOverlay?.(payload.gifUrl);
        }
        // Solo procesar via Supabase si no estamos en Colyseus (evita duplicados)
        if (payload.userId !== profile?.id && !roomRef.current?.connection?.isOpen) {
          setChatMessages(prev => [...prev.slice(-50), payload]);
        }
      })
      .on('broadcast', { event: 'anime_sync_req' }, ({ payload }) => {
        if (payload?.senderId === profile?.id) return;
        if (!isHostRef.current) return; // solo el host responde con su estado
        channelCallbacksRef.current.syncCurrentState?.();
      })
      .on('broadcast', { event: 'viewer_buffering' }, ({ payload }) => {
        if (!payload?.userId) return;
        setBufferingUsers(prev => {
          const next = { ...prev };
          if (payload.isBuffering) {
            next[payload.userId] = payload.username || 'Alguien';
          } else {
            delete next[payload.userId];
          }
          return next;
        });
        if (payload.isBuffering) {
          setTimeout(() => setBufferingUsers(prev => { const n = {...prev}; delete n[payload.userId]; return n; }), 10000);
        }
      })
      .on('broadcast', { event: 'play_countdown' }, ({ payload }) => {
        if (payload?.hostId === profile?.id) return;
        runCountdownRef.current?.(payload?.currentTime ?? 0);
      })
      .on('broadcast', { event: 'emoji_reaction' }, ({ payload }) => {
        if (payload?.userId !== profile?.id && payload?.content) {
          channelCallbacksRef.current.addFloatingEmoji?.(payload.content);
        }
      })
      .subscribe(async (status) => {
        console.log('[Presence subscribe] status:', status, 'channel:', channelName, 'userId:', profile?.id, 'username:', profile?.username);
        setDebugInfo(prev => ({ ...prev, channel: channelName, subscribeStatus: status }));
        if (status === 'SUBSCRIBED') {
          if (!joinedAtRef.current) joinedAtRef.current = Date.now();
          const trackPayload = {
            userId: profile?.id,
            username: profile?.username || 'Anon',
            avatar: profile?.avatar_url || null,
            joinedAt: joinedAtRef.current,
          };
          console.log('[Presence track]', trackPayload);
          const trackResult = await channel.track(trackPayload).catch((err) => { console.error('[Presence track ERROR]', err); return null; });
          console.log('[Presence track result]', trackResult);
          setDebugInfo(prev => ({ ...prev, trackOk: trackResult !== null }));
          heartbeatRef.current = setInterval(() => {
            channel.track({
              userId: profile?.id,
              username: profile?.username || 'Anon',
              avatar: profile?.avatar_url || null,
              joinedAt: joinedAtRef.current,
            }).catch(() => {});
          }, 30000);
          channel.send({
            type: 'broadcast',
            event: 'anime_sync_req',
            payload: { senderId: profile?.id || null },
          }).then(r => console.log('[anime_sync_req] send:', r)).catch(err => console.error('[anime_sync_req] error:', err));
        }
      });

    return () => {
      clearInterval(heartbeatRef.current);
      clearTimeout(presenceHostTimerRef.current);
      presenceHostDeterminedRef.current = false;
      syncChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [roomName, profile?.id, profile?.username, profile?.avatar_url]);

  useEffect(() => {
    return () => {
      if (room?.connection?.isOpen) {
        room.leave(true).catch(() => {});
      }
    };
  }, [room]);

  const resetWatchParty = () => {
    if (room?.connection?.isOpen) {
      leavingRoomRef.current = true;
      room.leave(true).catch(() => {});
    }
    roomRef.current = null; // limpiar ref inmediatamente para que connectToWatchParty no lo vea
    clearRoomState();
    setChatMessages([]);
  };

  const broadcastAnimeState = useCallback((payload, force = false) => {
    if (!syncChannelRef.current) { console.warn('[broadcastAnimeState] skip: no channel'); return; }
    if (applyingRemoteStateRef.current) { console.warn('[broadcastAnimeState] skip: applyingRemoteState'); return; }
    if (!onCloseRef.current) return;

    const now = Date.now();
    if (!force && now - lastBroadcastRef.current < 500) { console.warn('[broadcastAnimeState] skip: throttled'); return; }
    lastBroadcastRef.current = now;

    syncChannelRef.current.send({
      type: 'broadcast',
      event: 'anime_state',
      payload: {
        senderId: profile?.id || null,
        ...payload,
      },
    }).then(r => console.log('[broadcastAnimeState] send:', r, 'force:', force)).catch(err => console.error('[broadcastAnimeState] error:', err));
  }, [profile?.id]);

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopiedLink(true);
      toast.success('Enlace copiado');
      setTimeout(() => setCopiedLink(false), 2000);
    }).catch(() => toast.error('No se pudo copiar'));
  };

  useEffect(() => {
    if (!room) return;

    const chatHandler = (message) => {
      setChatMessages((prev) => [...prev.slice(-49), message]);
    };

    // Colyseus 0.16: onMessage returns an unsubscribe function
    const unsubChat = room.onMessage('chat', chatHandler);
    room.onMessage('user_joined', () => {});
    room.onMessage('user_left', () => {});
    room.onMessage('host_changed', ({ newHostId, newHostUsername }) => {
      console.log(`[AnimeSpace] Host changed to: ${newHostUsername}`);
      if (newHostId === profile?.id) {
        setPresenceIsHost(true);
        setRemoteHostInfo(null);
        toast.success('Ahora eres el host 👑', { duration: 4000 });
      } else {
        setPresenceIsHost(false);
        setRemoteHostInfo(prev => ({ ...(prev || {}), userId: newHostId, username: newHostUsername }));
        toast(`${newHostUsername} ahora es el host`, { icon: '👑' });
      }
    });

    // Colyseus 0.16: onStateChange returns an EventEmitter { clear(), remove() }
    const stateEmitter = room.onStateChange((state) => {
      setRoomState(state.toJSON());
      const nextParticipants = [];
      state.participants.forEach((p) => nextParticipants.push(p.toJSON ? p.toJSON() : { ...p }));
      setParticipants(nextParticipants);
    });

    room.onLeave(() => {
      const intentionalLeave = leavingRoomRef.current;
      leavingRoomRef.current = false;
      clearRoomState();
      if (!intentionalLeave) {
        toast.error('La sala de AnimeSpace se cerró.');
      }
    });

    room.onError((code, message) => {
      console.error('[AnimeSpace] Room socket error:', code, message);
      leavingRoomRef.current = false;
      clearRoomState();
    });

    return () => {
      if (typeof unsubChat === 'function') unsubChat();
      if (typeof stateEmitter?.clear === 'function') stateEmitter.clear();
    };
  }, [room, clearRoomState, profile?.id]);

  const handleAnimeSelect = async (anime) => {
    if (loading) return;
    if (onClose && !isHost) {
      toast.error('Solo el host puede elegir el anime');
      return;
    }

    animeSelectAbortRef.current?.abort();
    const controller = new AbortController();
    animeSelectAbortRef.current = controller;

    setLoading(true);
    setSelectedAnime(anime);
    setCurrentEpisode(null);
    setStreamData(null);
    setActiveSourceIndex(0);
    setMobilePanel('info');

    try {
      const info = await animeService.getAnimeInfo(anime.id, anime.provider);
      if (controller.signal.aborted) return;
      const hydratedAnime = { ...anime, ...info };
      const nextEpisodes = info.episodes || [];
      setSelectedAnime(hydratedAnime);
      setEpisodes(nextEpisodes);
      setView('episodes');
      broadcastAnimeState({
        view: 'episodes',
        selectedAnime: hydratedAnime,
        episodes: nextEpisodes,
        currentEpisode: null,
        streamData: null,
        activeSourceIndex: 0,
        roomState: null,
      }, true);
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error('[AnimeSpace] handleAnimeSelect error:', error);
      toast.error('No pude cargar los episodios.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const handleEpisodeSelect = async (episode) => {
    if (loading || !selectedAnime) return;
    if (onClose && !isHost) {
      toast.error('Solo el host puede elegir el episodio');
      return;
    }

    episodeSelectAbortRef.current?.abort();
    const controller = new AbortController();
    episodeSelectAbortRef.current = controller;

    setLoading(true);
    setActiveSourceIndex(0);
    setMobilePanel('info');

    try {
      const provider = episode.provider || selectedAnime.provider;
      const sources = await animeService.getEpisodeSources(episode.id, provider);

      if (controller.signal.aborted) return;

      if (sources.success === false || !sources.sources?.length) {
        toast.error(sources.message || 'No hay fuentes disponibles para este episodio.');
        return;
      }

      // Persist position: restore saved position before resetWatchParty
      const savedRaw = localStorage.getItem(`anime-pos-${episode.id}`);
      if (savedRaw) {
        try {
          const saved = JSON.parse(savedRaw);
          if (Date.now() - saved.savedAt < 7 * 24 * 3600 * 1000) {
            savedPositionRef.current = saved.currentTime;
          }
        } catch { savedPositionRef.current = null; }
      } else { savedPositionRef.current = null; }

      setCurrentEpisode(episode);
      setStreamData(sources);
      resetWatchParty();

      const roomId = `anime-${selectedAnime.id?.slice(0, 8)}-${String(episode.number).padStart(3, '0')}`;
      await connectToWatchParty({
        anime: selectedAnime,
        episode,
        roomId,
        announceActivity: true,
      });

      if (controller.signal.aborted) return;

      const playerPayload = {
        view: 'player',
        selectedAnime,
        episodes,
        currentEpisode: episode,
        streamData: sources,
        activeSourceIndex: 0,
        colyseusRoomId: colyseusRoomIdRef.current || null,
        roomState: { roomId },
      };
      broadcastAnimeState(playerPayload, true);
      // Retry tras 1.5s por si el primer broadcast se perdió
      setTimeout(() => broadcastAnimeState(playerPayload, true), 1500);

      setView('player');
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error('[AnimeSpace] handleEpisodeSelect error:', error);
      toast.error('Error al cargar el episodio.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    if (room?.connection?.isOpen) {
      try { room.send('chat', text); } catch (err) {
        console.warn('[AnimeSpace] Failed to send chat message:', err);
      }
    }

    // Broadcast via Supabase (fallback cuando Colyseus no está conectado, y stream unificado)
    if (syncChannelRef.current) {
      syncChannelRef.current.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: {
          id: Date.now(),
          userId: profile?.id,
          username: profile?.username || 'Anon',
          avatar: profile?.avatar_url,
          content: text,
          timestamp: Date.now(),
        },
      }).catch(() => {});
    }

    setChatInput('');
  };

  const handlePlay = (currentTime) => {
    if (!isHost) return;
    updatePlayback({ playing: true, currentTime });
  };

  const handlePause = (currentTime) => {
    if (isHost) {
      updatePlayback({ playing: false, currentTime });
    }
  };

  const handleSeek = (currentTime) => {
    if (isHost) {
      updatePlayback({ currentTime });
    }
  };

  const handleTimeUpdate = (currentTime) => {
    if (!isHost) return;
    const sec = Math.floor(currentTime);
    if (sec % 10 === 0 && sec !== lastSyncedSecondRef.current) {
      lastSyncedSecondRef.current = sec;
      updatePlayback({ currentTime });
    }
    if (currentEpisode?.id && sec > 0 && sec % 5 === 0) {
      localStorage.setItem(`anime-pos-${currentEpisode.id}`, JSON.stringify({ currentTime, savedAt: Date.now() }));
    }
  };

  // Sincronizar videoId cuando cambia el episodio (solo una vez por episodio)
  useEffect(() => {
    if (!isHost || !currentEpisode) return;
    if (currentEpisode.id === lastSyncedEpisodeIdRef.current) return;
    lastSyncedEpisodeIdRef.current = currentEpisode.id;
    updatePlayback({ videoId: currentEpisode.id, playing: true, currentTime: 0 });
  }, [currentEpisode?.id, currentEpisode, isHost, updatePlayback]);

  useEffect(() => {
    if (view !== 'player' || !streamData || !selectedAnime || !currentEpisode) return;

    broadcastAnimeState({
      view: 'player',
      selectedAnime,
      episodes,
      currentEpisode,
      streamData,
      activeSourceIndex,
      colyseusRoomId: colyseusRoomIdRef.current || null,
      roomState: roomState?.roomId ? { roomId: roomState.roomId } : null,
    });
  }, [activeSourceIndex, broadcastAnimeState, currentEpisode, episodes, roomState?.roomId, selectedAnime, streamData, view]);

  // Heartbeat: reenviar estado cada 8s mientras el host está en player (viewers que se unan tarde o reconecten se sincronizan)
  useEffect(() => {
    if (!onCloseRef.current || !isHost || view !== 'player' || !selectedAnime || !currentEpisode) return;
    const timer = setInterval(() => {
      channelCallbacksRef.current.syncCurrentState?.();
    }, 8000);
    return () => clearInterval(timer);
  }, [isHost, view, selectedAnime, currentEpisode]);

  const currentSource = streamData?.sources?.[activeSourceIndex] || null;
  // Presence es la fuente principal (incluye a todos), Colyseus enriquece con info adicional
  const visibleParticipants = presenceParticipants.length
    ? presenceParticipants.map((p, i) => {
        const cp = participants.find(c => c.userId === p.userId);
        return cp || { username: p.username, avatar: p.avatar, userId: p.userId, isHost: i === 0 };
      })
    : participants.length
      ? participants
      : [{ username: profile?.username, avatar: profile?.avatar_url, isHost: true }];
  const mobileTabs = [
    { id: 'info', label: 'Info', icon: Tv },
    { id: 'sources', label: 'Fuentes', icon: Radio },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
  ];

  // sendGif function - placeholder for future implementation
  // const sendGif = (gifUrl) => { ... };


  const infoPanel = (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] p-4 sm:rounded-[28px] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200">
            {streamData?.provider === 'animeflv' ? 'AnimeFLV Español' : 'Fuente alterna'}
          </div>
          <h1 className="text-xl font-black leading-tight sm:text-3xl">
            {selectedAnime?.title} <span className="text-white/45">EP {currentEpisode?.number}</span>
          </h1>
          <p className="text-sm leading-6 text-white/65 sm:max-w-3xl">
            {selectedAnime?.description || 'Sin descripción disponible.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:w-[220px]">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Fuentes</div>
            <div className="mt-1 text-xl font-black text-white">{streamData?.sources?.length || 0}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Viendo</div>
            <div className="mt-1 text-xl font-black text-white">{visibleParticipants.length}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const sourcesPanel = (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] p-4 sm:rounded-[28px] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radio size={16} className="text-cyan-300" />
          <h2 className="text-sm font-black uppercase tracking-[0.22em] text-white/90">Fuentes disponibles</h2>
        </div>
        {!isHost && (
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 bg-white/5 px-2 py-1 rounded-full border border-white/10">
            Solo host
          </div>
        )}
      </div>
      <div className="mobile-scroll-x flex gap-3 overflow-x-auto pb-1">
        {(streamData?.sources || []).map((source, index) => (
          <button
            key={`${source.server || source.quality}-${index}`}
            onClick={() => {
              if (!isHost) {
                toast.error('Solo el host puede cambiar la fuente de video');
                return;
              }
              setActiveSourceIndex(index);
            }}
            disabled={!isHost}
            className={`max-w-[180px] min-w-[140px] shrink-0 rounded-2xl border px-3 py-3 text-left transition sm:min-w-[180px] sm:px-4 ${
              activeSourceIndex === index
                ? 'border-cyan-300/60 bg-cyan-400 text-slate-950'
                : isHost
                  ? 'border-white/10 bg-black/20 text-white hover:bg-white/[0.06] cursor-pointer'
                  : 'border-white/5 bg-black/10 text-white/50 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">{source.server || 'source'}</div>
            <div className="mt-1 text-sm font-bold">{source.quality || 'Reproductor'}</div>
            <div className="mt-2 text-xs opacity-80">{source.isDub ? 'Latino' : 'Subtitulado'}</div>
          </button>
        ))}
      </div>
    </div>
  );

  const chatPanel = (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] p-4 sm:rounded-[28px]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-cyan-300" />
          <h2 className="text-sm font-black uppercase tracking-[0.22em] text-white/90">
            Sala ({participants.length || 1})
          </h2>
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
          {room ? 'Live' : 'Solo'}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {visibleParticipants.map((participant, index) => {
          const isParticipantHost = participant.isHost || participant.userId === playbackState.hostId;
          return (
            <div key={`${participant.username || 'user'}-${index}`} className="flex min-w-0 max-w-full items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2">
              <img
                src={participant.avatar || '/default-avatar.png'}
                alt={participant.username || 'participant'}
                className="h-8 w-8 rounded-full object-cover"
              />
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-white flex items-center gap-1">
                  {participant.username || 'Invitado'}
                  {isParticipantHost && <Crown size={10} className="text-yellow-400" />}
                </div>
                <div className={`text-[10px] uppercase tracking-[0.18em] ${isParticipantHost ? 'text-yellow-500 font-black' : 'text-white/45'}`}>
                  {isParticipantHost ? 'Host' : 'Viewer'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <div className="max-h-[220px] space-y-3 overflow-y-auto pr-1 sm:max-h-[240px]">
          {chatMessages.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-6 text-center text-sm text-white/45">
              El chat aparecerá aquí cuando la sala esté activa.
            </div>
          )}

          {chatMessages.map((msg, index) => (
            <div key={`${msg.username}-${index}`} className="flex gap-3">
              <img
                src={msg.avatar || '/default-avatar.png'}
                alt={msg.username}
                className="h-8 w-8 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1 rounded-2xl bg-black/20 px-3 py-2 border border-white/5">
                <div className="truncate text-[11px] font-black uppercase tracking-[0.16em] text-cyan-300">{msg.username}</div>
                {msg.type === "gif" && /^https:\/\/(media\d*\.giphy\.com|c\.tenor\.com|tenor\.com)/.test(msg.gifUrl) ? (
                    <img src={msg.gifUrl} className="max-w-full rounded-xl border border-white/10 shadow-lg mt-1" alt="reaction gif" />
                ) : (
                    <div className="mt-1 break-words text-sm text-white/80">{msg.message || msg.content}</div>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="flex items-end gap-2 bg-black/40 p-2 rounded-2xl border border-white/5">
          <button
            type="button"
            onClick={() => {
              // Implementar picker de GIFs si es necesario
              console.log('GIF picker clicked');
            }}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 transition"
          >
            😀
          </button>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && chatInput.trim()) {
                    handleSendMessage(e);
                }
            }}
            placeholder="Escribe al grupo..."
            className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-cyan-400/40 focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 transition hover:bg-cyan-300"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-full overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_28%),linear-gradient(180deg,#04040a_0%,#070711_45%,#030308_100%)] text-white">
      {onClose && (
        <div className="fixed bottom-2 left-2 z-[9999] rounded-xl bg-black/90 p-2 text-[9px] font-mono text-white/80 border border-white/10 max-w-[220px] leading-4">
          <div>ch: {debugInfo.channel.slice(-20)}</div>
          <div>sub: {debugInfo.subscribeStatus}</div>
          <div>track: {debugInfo.trackOk === null ? '...' : debugInfo.trackOk ? 'ok' : 'FAIL'}</div>
          <div>presence: {presenceParticipants.length} users</div>
          <div>isHost: {String(isHost)} | pHost: {String(presenceIsHost)}</div>
          <div>ready: {String(presenceReady)}</div>
          <div>me: {profile?.username?.slice(0,12)}</div>
          <div>users: {presenceParticipants.map(p => p.username).join(', ')}</div>
        </div>
      )}
      {!onClose && (
        <header className="sticky top-0 z-40 border-b border-white/5 bg-[#030308]/80 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              {view !== 'search' && (
                <button
                  onClick={() => setView(view === 'player' ? 'episodes' : 'search')}
                  className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] p-2 transition hover:bg-white/[0.08]"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 shadow-[0_10px_30px_rgba(34,211,238,0.28)] sm:h-11 sm:w-11">
                  <Tv size={20} />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-300 sm:text-[10px] sm:tracking-[0.3em]">Mobile First</div>
                  <div className="truncate text-base font-black uppercase tracking-[0.14em] sm:text-lg sm:tracking-[0.18em]">AnimeSpace</div>
                </div>
              </div>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-rose-200"
              >
                Cerrar
              </button>
            )}
          </div>
        </header>
      )}

      {onClose && (
        <div className="fixed right-3 top-3 z-[60] flex items-center gap-2 sm:right-4 sm:top-4">
          <button
            onClick={handleShareLink}
            className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/60 backdrop-blur-md hover:bg-white/10 transition flex items-center gap-1.5"
          >
            <Share2 size={11} />
            {copiedLink ? 'Copiado ✓' : 'Compartir'}
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-rose-200 backdrop-blur-md sm:px-4 sm:text-[11px] sm:tracking-[0.22em]"
          >
            Cerrar
          </button>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 py-4 sm:gap-6 sm:py-6">
        {view === 'search' && !onClose && <AnimeSearch onSelect={handleAnimeSelect} />}

      {view === 'search' && onClose && !presenceReady && (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />
        </div>
      )}

      {view === 'search' && onClose && presenceReady && isHost && (
        <div className="flex flex-col gap-4 px-3 sm:px-6">
          <div className="flex items-center gap-3 rounded-[20px] border border-yellow-400/20 bg-yellow-500/10 px-4 py-3">
            <Crown size={16} className="shrink-0 text-yellow-400" />
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">Eres el host</div>
              <div className="mt-0.5 text-[11px] text-white/60">Selecciona un anime para comenzar la watch party</div>
            </div>
          </div>
          <AnimeSearch onSelect={handleAnimeSelect} />
        </div>
      )}

      {view === 'search' && onClose && presenceReady && !isHost && (
        <div className="flex flex-col items-center justify-center gap-6 px-4 py-16 text-center sm:px-6 sm:py-24">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-500/10">
            <Tv size={36} className="text-cyan-300" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black uppercase tracking-[0.14em] text-white">Esperando al host...</h2>
            <p className="max-w-xs text-sm leading-6 text-white/55">
              El host aún no ha seleccionado un anime. El video comenzará automáticamente cuando lo haga.
            </p>
          </div>
          {hostParticipant && (
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3">
              <img
                src={hostParticipant.avatar || '/default-avatar.png'}
                alt={hostParticipant.username}
                className="h-9 w-9 rounded-full object-cover"
              />
              <div className="text-left">
                <div className="flex items-center gap-1.5 text-sm font-black text-white">
                  <Crown size={12} className="text-yellow-400" />
                  {hostParticipant.username}
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-yellow-500 font-black">Host</div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400 [animation-delay:0ms]" />
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400 [animation-delay:150ms]" />
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400 [animation-delay:300ms]" />
          </div>
        </div>
      )}

        {view === 'episodes' && selectedAnime && onClose && !isHost && (
          <div className="mx-3 mb-2 flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 sm:mx-6">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-500/10">
              <Crown size={14} className="text-cyan-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">
                Esperando al host para elegir episodio
              </div>
              {hostParticipant && (
                <div className="mt-0.5 flex items-center gap-1.5">
                  <img src={hostParticipant.avatar || '/default-avatar.png'} alt="" className="h-5 w-5 rounded-full object-cover" />
                  <span className="text-xs font-bold text-yellow-300">{hostParticipant.username}</span>
                  <Crown size={10} className="text-yellow-400" />
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'episodes' && selectedAnime && (
          <AnimeEpisodeList
            anime={selectedAnime}
            episodes={episodes}
            onSelect={handleEpisodeSelect}
            currentEpisodeId={currentEpisode?.id}
            isHost={!onClose || isHost}
          />
        )}

        {view === 'player' && streamData && (
          <section className="flex flex-col gap-4 px-3 pb-8 sm:px-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
              <div className="min-w-0 space-y-4">
                {isHost && Object.keys(bufferingUsers).length > 0 && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 mb-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400 shrink-0" />
                    <span>{Object.values(bufferingUsers).join(', ')} {Object.keys(bufferingUsers).length > 1 ? 'están' : 'está'} cargando...</span>
                  </div>
                )}
                <AnimePlayer
                  source={currentSource}
                  subtitles={streamData.subtitles}
                  isHost={isHost}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onSeek={handleSeek}
                  onTimeUpdate={handleTimeUpdate}
                  externalState={playbackState}
                  reactions={reactions}
                  onReaction={(type, content) => {
                    if (room?.connection?.isOpen) {
                      try { room.send("reaction", { type, content, videoTimestamp: playbackState.currentTime }); } catch (err) {
                        console.warn('[AnimeSpace] Failed to send reaction:', err);
                      }
                    }
                    if (syncChannelRef.current) {
                      syncChannelRef.current.send({
                        type: 'broadcast', event: 'emoji_reaction',
                        payload: { type, content, userId: profile?.id },
                      }).catch(() => {});
                    }
                    addFloatingEmoji(content);
                  }}
                  gifOverlays={gifOverlays}
                  isStorming={isStorming}
                  countdown={countdown}
                  floatingEmojis={floatingEmojis}
                  onBuffering={broadcastBuffering}
                  initialTime={savedPositionRef.current}
                />

                {/* Shared Overlay (can be moved here if we want it to stay above player controls) */}
                {/* <ReactionOverlay gifOverlays={gifOverlays} isStorming={isStorming} /> */}


                <div className="lg:hidden">
                  <div className="sticky top-[64px] z-20 overflow-hidden rounded-[24px] border border-white/10 bg-[#080810]/92 p-1 backdrop-blur-xl">
                    <div className="grid grid-cols-3 gap-1">
                      {mobileTabs.map(({ id, label, icon }) => (
                        <button
                          key={id}
                          onClick={() => setMobilePanel(id)}
                          className={`flex items-center justify-center gap-1.5 rounded-[20px] px-3 py-3 text-[11px] font-black uppercase tracking-[0.18em] transition ${
                            mobilePanel === id
                              ? 'bg-cyan-400 text-slate-950 shadow-[0_8px_24px_rgba(34,211,238,0.28)]'
                              : 'bg-transparent text-white/55'
                          }`}
                        >
                          {React.createElement(icon, { size: 13 })}
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    {mobilePanel === 'info' && infoPanel}
                    {mobilePanel === 'sources' && sourcesPanel}
                    {mobilePanel === 'chat' && chatPanel}
                  </div>
                </div>

                <div className="hidden lg:block">{infoPanel}</div>
                <div className="hidden lg:block">{sourcesPanel}</div>
              </div>

              <aside className="hidden lg:flex lg:flex-col lg:gap-4">
                {chatPanel}
              </aside>
            </div>
          </section>
        )}
      </main>

      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#030308]/65 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-400" />
            <p className="text-xs font-black uppercase tracking-[0.26em] text-cyan-200">
              {!onClose || isHost
                ? 'Cargando...'
                : hostParticipant
                  ? `Conectando con @${hostParticipant.username}...`
                  : 'Conectando...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimeSpacePage;
