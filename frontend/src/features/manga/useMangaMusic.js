// useMangaMusic — ambient music state + realtime sync for Manga Party
//
// Manages:
//   • URL-based tracks   — played via ReactPlayer (YouTube / MP3)
//   • Generated tracks   — played via Web Audio API (rain, forest, city)
//   • Voting queue       — users upvote next track
//   • Realtime sync      — host broadcasts; guests receive via onMusicEvent()
//
// Exports:
//   parseYoutubeUrl(url)  — extracts video ID from any YouTube URL format
//   normalizeYoutubeUrl(url) — returns canonical watch?v= form
//   isYoutubeUrl(url)     — quick YouTube domain check
//   useMangaMusic({ isHost, myUsername, broadcast })

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { MANGA_TRACKS } from './mangaTracks';
import { AMBIENT_GENERATORS } from './WebAudioAmbience';

const DEFAULT_VOLUME = 0.35;

// ── YouTube URL utilities ─────────────────────────────────────────────────────

/**
 * Extracts a YouTube video ID from any common URL format:
 *   youtube.com/watch?v=ID   youtu.be/ID   /embed/ID   /shorts/ID   /live/ID
 * Returns the ID string or null.
 */
export function parseYoutubeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const patterns = [
    /[?&]v=([^&#/\s]+)/,        // watch?v=ID
    /youtu\.be\/([^?&#/\s]+)/,  // youtu.be/ID
    /\/embed\/([^?&#/\s]+)/,    // /embed/ID
    /\/shorts\/([^?&#/\s]+)/,   // /shorts/ID
    /\/live\/([^?&#/\s]+)/,     // /live/ID
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

/** Returns the canonical https://www.youtube.com/watch?v=ID form. */
export function normalizeYoutubeUrl(url) {
  const id = parseYoutubeUrl(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : url;
}

/** True if the URL looks like a YouTube link. */
export function isYoutubeUrl(url) {
  return !!(url && (url.includes('youtube.com') || url.includes('youtu.be')));
}

// ── useMangaMusic ─────────────────────────────────────────────────────────────

export function useMangaMusic({ isHost, myUsername, broadcast }) {
  const [currentTrack,   setCurrentTrack]   = useState(null);
  const [isPlaying,      setIsPlaying]      = useState(false);
  const [volume,         setVolumeState]    = useState(DEFAULT_VOLUME);
  const [loop,           setLoop]           = useState(true);
  const [votes,          setVotes]          = useState({});
  const [myVote,         setMyVote]         = useState(null);
  const [customTracks,   setCustomTracks]   = useState([]);
  const [atmosphere,     setAtmosphere]     = useState(null);
  const [expanded,       setExpanded]       = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [addingUrl,      setAddingUrl]      = useState(false);
  const [urlInput,       setUrlInput]       = useState('');
  const [playerError,    setPlayerError]    = useState(null); // null | string

  const isHostRef    = useRef(isHost);
  const volumeRef    = useRef(volume);
  const audioCtxRef  = useRef(null);    // shared AudioContext
  const generatorRef = useRef(null);    // active Web Audio generator

  useEffect(() => { isHostRef.current = isHost; },  [isHost]);
  useEffect(() => { volumeRef.current = volume; },  [volume]);

  // ── AudioContext (lazy, only after user interaction) ──────────────────────

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  // ── Generator lifecycle ───────────────────────────────────────────────────

  const stopGenerator = useCallback(() => {
    if (generatorRef.current) {
      generatorRef.current.stop();
      generatorRef.current = null;
    }
  }, []);

  const startGenerator = useCallback((track) => {
    stopGenerator();
    if (!track?.generated) return;
    const factory = AMBIENT_GENERATORS[track.category];
    if (!factory) return;
    const ctx = getAudioCtx();
    generatorRef.current = factory(ctx, volumeRef.current);
  }, [getAudioCtx, stopGenerator]);

  // Start/stop generator when play state or track changes
  useEffect(() => {
    if (!currentTrack?.generated) return;
    if (isPlaying && userInteracted) {
      startGenerator(currentTrack);
    } else {
      stopGenerator();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, userInteracted, currentTrack?.id]);

  // Live volume sync to Web Audio generator
  useEffect(() => {
    generatorRef.current?.setVolume(volume);
  }, [volume]);

  // Cleanup on unmount
  useEffect(() => () => {
    stopGenerator();
    audioCtxRef.current?.close();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Track lists ───────────────────────────────────────────────────────────

  // Include generated (Web Audio) tracks even though they have no URL
  const allTracks = useMemo(
    () => [...MANGA_TRACKS, ...customTracks].filter(t => t.url || t.generated),
    [customTracks],
  );

  const filteredTracks = useMemo(
    () => atmosphere ? allTracks.filter(t => t.category === atmosphere) : allTracks,
    [allTracks, atmosphere],
  );

  // Ranked by vote count descending
  const rankedTracks = useMemo(
    () => [...filteredTracks].sort(
      (a, b) => (votes[b.id]?.length ?? 0) - (votes[a.id]?.length ?? 0),
    ),
    [filteredTracks, votes],
  );

  // ── Host actions ──────────────────────────────────────────────────────────

  const playTrack = useCallback((track) => {
    if (!isHostRef.current) return;
    if (!track?.url && !track?.generated) return;
    setCurrentTrack(track);
    setIsPlaying(true);
    setVotes({});
    setMyVote(null);
    setPlayerError(null);
    broadcast('manga_sync', { type: 'music_change', track });
  }, [broadcast]);

  const handleTogglePlay = useCallback(() => {
    if (!isHostRef.current) return;
    setIsPlaying(prev => {
      const next = !prev;
      broadcast('manga_sync', { type: next ? 'music_resume' : 'music_pause' });
      return next;
    });
  }, [broadcast]);

  const handleVolumeChange = useCallback((v) => {
    setVolumeState(v);
    if (isHostRef.current) {
      broadcast('manga_sync', { type: 'music_volume', volume: v });
    }
  }, [broadcast]);

  const handleSkip = useCallback(() => {
    if (!isHostRef.current) return;
    const next = rankedTracks.find(t => t.id !== currentTrack?.id);
    if (next) playTrack(next);
  }, [rankedTracks, currentTrack, playTrack]);

  const handleTrackEnded = useCallback(() => {
    if (!isHostRef.current || loop) return;
    const next = rankedTracks.find(t => t.id !== currentTrack?.id);
    if (next) playTrack(next);
    else setIsPlaying(false);
  }, [loop, rankedTracks, currentTrack, playTrack]);

  const handlePlayerError = useCallback((err) => {
    console.warn('[MangaMusic] ReactPlayer error:', err);
    setPlayerError('No se pudo reproducir. ¿El video está disponible o tiene restricciones?');
    setIsPlaying(false);
  }, []);

  const handlePlayerReady = useCallback(() => {
    setPlayerError(null);
  }, []);

  // ── Voting ────────────────────────────────────────────────────────────────

  const handleVote = useCallback((trackId) => {
    const prev    = myVote;
    const newVote = prev === trackId ? null : trackId; // toggle
    setMyVote(newVote);
    setVotes(v => {
      const u = { ...v };
      if (prev)    u[prev]    = (u[prev]    || []).filter(n => n !== myUsername);
      if (newVote) u[newVote] = [...new Set([...(u[newVote] || []), myUsername])];
      return u;
    });
    broadcast('manga_sync', { type: 'music_vote', trackId: newVote, prevTrackId: prev, username: myUsername });
  }, [myVote, myUsername, broadcast]);

  // ── Add custom URL ────────────────────────────────────────────────────────

  const handleAddUrl = useCallback(() => {
    const raw = urlInput.trim();
    if (!raw) return;

    const ytId  = parseYoutubeUrl(raw);
    const isYt  = !!ytId || isYoutubeUrl(raw);
    const finalUrl = isYt && ytId ? normalizeYoutubeUrl(raw) : raw;

    // Auto-title: "YouTube · <ID>" or "Custom Track"
    const title = isYt
      ? `YouTube · ${ytId ?? raw.slice(-12)}`
      : 'Custom Track';

    const track = {
      id:       `custom-${Date.now()}`,
      title,
      category: atmosphere || 'lofi',
      url:      finalUrl,
      generated: false,
      custom:   true,
    };

    setCustomTracks(prev => [...prev, track]);
    setUrlInput('');
    setAddingUrl(false);
    setPlayerError(null);
    broadcast('manga_sync', { type: 'music_add', track });
    if (isHostRef.current) playTrack(track);
  }, [urlInput, atmosphere, broadcast, playTrack]);

  // ── Receive sync events ───────────────────────────────────────────────────

  const onMusicEvent = useCallback((payload) => {
    switch (payload.type) {
      case 'music_change':
        setCurrentTrack(payload.track);
        setIsPlaying(true);
        setVotes({});
        setMyVote(null);
        setPlayerError(null);
        break;
      case 'music_pause':
        setIsPlaying(false);
        break;
      case 'music_resume':
        setIsPlaying(true);
        break;
      case 'music_volume':
        setVolumeState(payload.volume);
        break;
      case 'music_vote': {
        const { trackId, prevTrackId, username } = payload;
        if (username === myUsername) break; // own vote applied locally already
        setVotes(v => {
          const u = { ...v };
          if (prevTrackId) u[prevTrackId] = (u[prevTrackId] || []).filter(n => n !== username);
          if (trackId)     u[trackId]     = [...new Set([...(u[trackId] || []), username])];
          return u;
        });
        break;
      }
      case 'music_add':
        setCustomTracks(prev =>
          prev.some(t => t.id === payload.track?.id) ? prev : [...prev, payload.track],
        );
        break;
      default:
        break;
    }
  }, [myUsername]);

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    // state
    currentTrack, isPlaying, volume, loop, votes, myVote,
    atmosphere, expanded, userInteracted, addingUrl, urlInput, playerError,
    rankedTracks, allTracks, filteredTracks,
    // setters
    setLoop, setAtmosphere, setExpanded, setUserInteracted, setAddingUrl, setUrlInput,
    // callbacks
    playTrack, handleTogglePlay, handleVolumeChange, handleSkip,
    handleTrackEnded, handleVote, handleAddUrl,
    handlePlayerError, handlePlayerReady,
    onMusicEvent,
  };
}
