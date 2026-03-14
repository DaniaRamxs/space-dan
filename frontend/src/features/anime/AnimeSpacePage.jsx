import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Radio, Users, MessageSquare, ChevronLeft, Tv, Send, Crown } from 'lucide-react';
import YouTubeSearchModal from '@/components/Social/YouTubeSearchModal';
import GifPickerModal from '@/components/reactions/GifPickerModal';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLiveActivity } from '@/hooks/useLiveActivity';
import { usePlaybackSync } from '@/hooks/usePlaybackSync';
import { useReactionEngine } from '@/hooks/useReactionEngine';
import { animeService } from './animeService';
import { liveActivitiesService } from '@/services/liveActivitiesService';
import { supabase } from '@/supabaseClient';
import { joinOrCreateRoom } from '@/services/colyseusClient';
import AnimeEpisodeList from './AnimeEpisodeList';
import AnimePlayer from './AnimePlayer';
import AnimeSearch from './AnimeSearch';

const AnimeSpacePage = ({ onClose, roomName }) => {
  // ── 1. Context ───────────────────────────────────────────────────────────
  const { profile } = useAuthContext();

  // ── 2. All state (declared first so service hooks can depend on them) ────
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
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

  // ── 3. All refs (declared before any hook that references them) ───────────
  const chatEndRef = useRef(null);
  const leavingRoomRef = useRef(false);
  const syncChannelRef = useRef(null);
  const applyingRemoteStateRef = useRef(false);

  // ── 4. Service hooks (depend on state/refs above) ─────────────────────────
  const { 
    playbackState, 
    isHost: isSyncedHost, 
    reactions,
    updatePlayback 
  } = usePlaybackSync({
    roomName: roomName || 'general',
    colyseusRoom: room
  });

  const { gifOverlays, isStorming, sendReaction: engineSendReaction, addGifOverlay } = useReactionEngine({
    room,
    getVideoTimestamp: () => playbackState?.currentTime ?? 0
  });

  // ── 5. Derived values (useMemo after all hooks) ───────────────────────────
  const hostParticipant = useMemo(() => {
    if (!playbackState?.hostId) return null;
    return participants.find(p => p.isHost || p.userId === playbackState.hostId) ?? null;
  }, [participants, playbackState?.hostId]);

  const isHost = isSyncedHost || (playbackState?.hostId === profile?.id);

  const clearRoomState = () => {
    setRoom(null);
    setRoomState(null);
    setParticipants([]);
  };

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

  useEffect(() => {
    if (!roomName || !onClose) return undefined;

    const channelName = `anime-sync-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`;
    const channel = supabase.channel(channelName);
    syncChannelRef.current = channel;

    const syncCurrentState = () => {
      const s = stateRef.current;
      if (!s.selectedAnime) return;
      channel.send({
        type: 'broadcast',
        event: 'anime_state',
        payload: {
          senderId: profile?.id || null,
          view: s.view,
          selectedAnime: s.selectedAnime,
          episodes: s.episodes,
          currentEpisode: s.currentEpisode,
          streamData: s.streamData,
          activeSourceIndex: s.activeSourceIndex,
          roomState: s.roomState?.roomId
            ? { roomId: s.roomState.roomId }
            : s.currentEpisode && s.selectedAnime
              ? { roomId: `anime-${s.selectedAnime.id?.slice(0, 8)}-${String(s.currentEpisode.number).padStart(3, '0')}` }
              : null,
        },
      }).catch(() => {});
    };

    channel
      .on('broadcast', { event: 'anime_state' }, async ({ payload }) => {
        if (!payload || payload.senderId === profile?.id) return;

        applyingRemoteStateRef.current = true;
        setSelectedAnime(payload.selectedAnime || null);
        setEpisodes(payload.episodes || []);
        setCurrentEpisode(payload.currentEpisode || null);
        setStreamData(payload.streamData || null);
        setActiveSourceIndex(payload.activeSourceIndex || 0);
        // setView(payload.view || 'search'); // Removed as per new state
        // setMobilePanel(payload.currentEpisode ? 'chat' : 'info'); // Removed as per new state

        if (payload.currentEpisode && payload.selectedAnime && payload.roomState?.roomId) {
          try {
            await connectToWatchParty({
              anime: payload.selectedAnime,
              episode: payload.currentEpisode,
              roomId: payload.roomState.roomId,
              announceActivity: false,
            });
          } catch (error) {
            console.warn('[AnimeSpace] Failed to join synced room:', error);
          }
        }

        setView(payload.view || 'search');
        if (payload.currentEpisode) setMobilePanel('chat');

        window.setTimeout(() => {
          applyingRemoteStateRef.current = false;
        }, 0);
      })
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
        // GIFs from others: show via central engine
        if (payload.type === "gif" && payload.userId !== profile?.id) {
            addGifOverlay(payload.gifUrl);
        }

        if (payload.userId !== profile?.id) {
            setChatMessages(prev => [...prev.slice(-50), payload]);
        }
      })
      .on('broadcast', { event: 'anime_sync_req' }, ({ payload }) => {
        if (payload?.senderId === profile?.id) return;
        syncCurrentState();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'anime_sync_req',
            payload: { senderId: profile?.id || null },
          }).catch(() => {});
        }
      });

    return () => {
      syncChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [roomName, onClose, profile?.id]);

  useEffect(() => {
    return () => {
      if (room) {
        room.leave(true);
      }
    };
  }, [room]);

  const resetWatchParty = () => {
    if (room) {
      leavingRoomRef.current = true;
      room.leave(true).catch(() => {});
    }
    clearRoomState();
    setChatMessages([]);
  };

  const broadcastAnimeState = (payload) => {
    if (!syncChannelRef.current || applyingRemoteStateRef.current || !onClose) return;

    syncChannelRef.current.send({
      type: 'broadcast',
      event: 'anime_state',
      payload: {
        senderId: profile?.id || null,
        ...payload,
      },
    }).catch(() => {});
  };

  const connectToWatchParty = async ({ anime, episode, roomId, announceActivity }) => {
    let activityId = null;

    if (announceActivity) {
      try {
        const supabaseActivity = await liveActivitiesService.createActivity({
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
        activityId = supabaseActivity?.id || null;
      } catch (error) {
        console.warn('[AnimeSpace] Failed to create activity:', error);
      }
    }

    try {
      const newRoom = await joinOrCreateRoom('live_activity', {
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

      setRoom(newRoom);
    } catch (error) {
      console.warn('[AnimeSpace] Colyseus unavailable, solo mode enabled:', error.message);
      if (announceActivity) {
        toast('Modo solitario: la watch party no respondiÃ³.', { icon: 'ðŸ“º' });
      }
    }
  };

  useEffect(() => {
    if (!room) return;

    const chatHandler = (message) => {
      setChatMessages((prev) => [...prev, message]);
    };

    // Colyseus 0.16: onMessage returns an unsubscribe function
    const unsubChat = room.onMessage('chat', chatHandler);

    // Colyseus 0.16: onStateChange returns an EventEmitter { clear(), remove() }
    const stateEmitter = room.onStateChange((state) => {
      setRoomState(state.toJSON());
      const nextParticipants = [];
      state.participants.forEach((participant) => nextParticipants.push(participant));
      setParticipants(nextParticipants);
    });

    room.onLeave((code) => {
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
  }, [room]);

  const handleAnimeSelect = async (anime) => {
    if (loading) return;

    setLoading(true);
    setSelectedAnime(anime);
    setCurrentEpisode(null);
    setStreamData(null);
    setActiveSourceIndex(0);
    setMobilePanel('info');

    try {
      const info = await animeService.getAnimeInfo(anime.id, anime.provider);
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
      });
    } catch (error) {
      console.error('[AnimeSpace] handleAnimeSelect error:', error);
      toast.error('No pude cargar los episodios.');
    } finally {
      setLoading(false);
    }
  };

  const handleEpisodeSelect = async (episode) => {
    if (loading || !selectedAnime) return;

    setLoading(true);
    setCurrentEpisode(episode);
    setActiveSourceIndex(0);
    setMobilePanel('info');

    try {
      const provider = episode.provider || selectedAnime.provider;
      const sources = await animeService.getEpisodeSources(episode.id, provider);

      if (sources.success === false || !sources.sources?.length) {
        toast.error(sources.message || 'No hay fuentes disponibles para este episodio.');
        return;
      }

      setStreamData(sources);
      resetWatchParty();

      const roomId = `anime-${selectedAnime.id?.slice(0, 8)}-${String(episode.number).padStart(3, '0')}`;
      await connectToWatchParty({
        anime: selectedAnime,
        episode,
        roomId,
        announceActivity: true,
      });

      broadcastAnimeState({
        view: 'player',
        selectedAnime,
        episodes,
        currentEpisode: episode,
        streamData: sources,
        activeSourceIndex: 0,
        roomState: { roomId },
      });

      setView('player');
    } catch (error) {
      console.error('[AnimeSpace] handleEpisodeSelect error:', error);
      toast.error('Error al cargar el episodio.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    if (!room) {
      toast.error('La sala no está conectada.');
      return;
    }

    room.send('chat', text);
    
    // Broadcast via Supabase for unified stream
    if (syncChannelRef.current) {
        syncChannelRef.current.send({
            type: 'broadcast',
            event: 'chat_message',
            payload: {
                id: Date.now(),
                userId: profile?.id,
                username: profile?.username || "Anon",
                avatar: profile?.avatar_url,
                content: text,
                timestamp: Date.now()
            }
        });
    }

    setChatInput('');
  };

  const handlePlay = (currentTime) => {
    if (isHost) {
      updatePlayback({ playing: true, currentTime });
    }
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
    // Solo el host sincroniza periódicamente para mantener a todos juntos
    if (isHost && Math.floor(currentTime) % 10 === 0) {
      updatePlayback({ currentTime });
    }
  };

  // Sincronizar videoId cuando cambia el episodio
  useEffect(() => {
    if (isHost && currentEpisode) {
      updatePlayback({ 
          videoId: currentEpisode.id, 
          playing: true, 
          currentTime: 0 
      });
    }
  }, [currentEpisode?.id, isHost]);

  useEffect(() => {
    if (view !== 'player' || !streamData || !selectedAnime || !currentEpisode) return;

    broadcastAnimeState({
      view: 'player',
      selectedAnime,
      episodes,
      currentEpisode,
      streamData,
      activeSourceIndex,
      roomState: roomState?.roomId ? { roomId: roomState.roomId } : null,
    });
  }, [activeSourceIndex]);

  const currentSource = streamData?.sources?.[activeSourceIndex] || null;
  const visibleParticipants = participants.length
    ? participants
    : [{ username: profile?.username, avatar: profile?.avatar_url, isHost: true }];
  const mobileTabs = [
    { id: 'info', label: 'Info', icon: Tv },
    { id: 'sources', label: 'Fuentes', icon: Radio },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
  ];

  const sendGif = (gifUrl) => {
    if (!syncChannelRef.current) return;
    const message = {
        id: Date.now(),
        userId: profile?.id,
        username: profile?.username || "Anon",
        avatar: profile?.avatar_url,
        type: "gif",
        gifUrl,
        timestamp: Date.now()
    };
    setChatMessages(prev => [...prev.slice(-50), message]);

    // Central engine: sends to Colyseus + Supabase broadcast + shows locally
    engineSendReaction({
        type: 'gif',
        gifUrl,
        supabaseChannel: syncChannelRef.current,
        supabaseMeta: {
            id: message.id,
            userId: profile?.id,
            username: profile?.username || 'Anon',
            avatar: profile?.avatar_url,
            timestamp: message.timestamp
        }
    });
  };


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
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Sala</div>
            <div className="mt-1 text-xl font-black text-white">{participants.length || 1}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const sourcesPanel = (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] p-4 sm:rounded-[28px] sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Radio size={16} className="text-cyan-300" />
        <h2 className="text-sm font-black uppercase tracking-[0.22em] text-white/90">Fuentes disponibles</h2>
      </div>
      <div className="mobile-scroll-x flex gap-3 overflow-x-auto pb-1">
        {(streamData?.sources || []).map((source, index) => (
          <button
            key={`${source.server || source.quality}-${index}`}
            onClick={() => setActiveSourceIndex(index)}
            className={`max-w-[180px] min-w-[140px] shrink-0 rounded-2xl border px-3 py-3 text-left transition sm:min-w-[180px] sm:px-4 ${
              activeSourceIndex === index
                ? 'border-cyan-300/60 bg-cyan-400 text-slate-950'
                : 'border-white/10 bg-black/20 text-white hover:bg-white/[0.06]'
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
                {msg.type === "gif" ? (
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
            onClick={() => setGifPickerOpen(true)}
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
        <div className="fixed right-3 top-3 z-[60] sm:right-4 sm:top-4">
          <button
            onClick={onClose}
            className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-rose-200 backdrop-blur-md sm:px-4 sm:text-[11px] sm:tracking-[0.22em]"
          >
            Cerrar
          </button>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 py-4 sm:gap-6 sm:py-6">
        {view === 'search' && <AnimeSearch onSelect={handleAnimeSelect} />}

        {view === 'episodes' && selectedAnime && (
          <AnimeEpisodeList
            anime={selectedAnime}
            episodes={episodes}
            onSelect={handleEpisodeSelect}
            currentEpisodeId={currentEpisode?.id}
          />
        )}

        {view === 'player' && streamData && (
          <section className="flex flex-col gap-4 px-3 pb-8 sm:px-6">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-4">
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
                    if (room) {
                      const time = playbackState.currentTime;
                      room.send("reaction", { type, content, videoTimestamp: time });
                    }
                  }}
                  gifOverlays={gifOverlays}
                  isStorming={isStorming}
                />

                {/* Shared Overlay (can be moved here if we want it to stay above player controls) */}
                {/* <ReactionOverlay gifOverlays={gifOverlays} isStorming={isStorming} /> */}


                <div className="xl:hidden">
                  <div className="sticky top-[64px] z-20 overflow-hidden rounded-[24px] border border-white/10 bg-[#080810]/92 p-1 backdrop-blur-xl">
                    <div className="grid grid-cols-3 gap-1">
                      {mobileTabs.map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          onClick={() => setMobilePanel(id)}
                          className={`flex items-center justify-center gap-2 rounded-[20px] px-3 py-3 text-[11px] font-black uppercase tracking-[0.18em] transition ${
                            mobilePanel === id
                              ? 'bg-cyan-400 text-slate-950 shadow-[0_8px_24px_rgba(34,211,238,0.28)]'
                              : 'bg-transparent text-white/55'
                          }`}
                        >
                          <Icon size={14} />
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

                <div className="hidden xl:block">{infoPanel}</div>
                <div className="hidden xl:block">{sourcesPanel}</div>
              </div>

              <aside className="hidden xl:flex xl:flex-col xl:gap-4">
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
              {hostParticipant ? `Conectando con @${hostParticipant.username}...` : 'Cargando AnimeSpace'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimeSpacePage;
