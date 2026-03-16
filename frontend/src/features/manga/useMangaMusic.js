import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { MANGA_TRACKS } from './mangaTracks';

const DEFAULT_VOLUME = 0.35;

export function useMangaMusic({ isHost, myUsername, broadcast }) {
  const [currentTrack,    setCurrentTrack]    = useState(null);
  const [isPlaying,       setIsPlaying]       = useState(false);
  const [volume,          setVolumeState]     = useState(DEFAULT_VOLUME);
  const [loop,            setLoop]            = useState(true);
  const [votes,           setVotes]           = useState({}); // { [trackId]: string[] }
  const [myVote,          setMyVote]          = useState(null);
  const [customTracks,    setCustomTracks]    = useState([]);
  const [atmosphere,      setAtmosphere]      = useState(null); // category filter
  const [expanded,        setExpanded]        = useState(false);
  const [userInteracted,  setUserInteracted]  = useState(false);
  const [addingUrl,       setAddingUrl]       = useState(false);
  const [urlInput,        setUrlInput]        = useState('');

  const isHostRef = useRef(isHost);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);

  // Tracks with URLs only (base + custom)
  const allTracks = useMemo(
    () => [...MANGA_TRACKS, ...customTracks].filter(t => t.url),
    [customTracks]
  );

  const filteredTracks = useMemo(
    () => atmosphere ? allTracks.filter(t => t.category === atmosphere) : allTracks,
    [allTracks, atmosphere]
  );

  // Ranked by vote count descending
  const rankedTracks = useMemo(
    () => [...filteredTracks].sort((a, b) => (votes[b.id]?.length ?? 0) - (votes[a.id]?.length ?? 0)),
    [filteredTracks, votes]
  );

  // ── Host actions ──────────────────────────────────────────────────────────────

  const playTrack = useCallback((track) => {
    if (!isHostRef.current || !track?.url) return;
    setCurrentTrack(track);
    setIsPlaying(true);
    setVotes({});
    setMyVote(null);
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
  }, [loop, rankedTracks, currentTrack, playTrack]);

  // ── Voting (all users) ────────────────────────────────────────────────────────

  const handleVote = useCallback((trackId) => {
    const prev = myVote;
    const newVote = prev === trackId ? null : trackId; // toggle
    setMyVote(newVote);
    setVotes(v => {
      const updated = { ...v };
      if (prev) updated[prev] = (updated[prev] || []).filter(u => u !== myUsername);
      if (newVote) updated[newVote] = [...new Set([...(updated[newVote] || []), myUsername])];
      return updated;
    });
    broadcast('manga_sync', {
      type: 'music_vote',
      trackId: newVote,
      prevTrackId: prev,
      username: myUsername,
    });
  }, [myVote, myUsername, broadcast]);

  // ── Add custom URL ────────────────────────────────────────────────────────────

  const handleAddUrl = useCallback(() => {
    const url = urlInput.trim();
    if (!url) return;
    const isYt = url.includes('youtube.com') || url.includes('youtu.be');
    const track = {
      id: `custom-${Date.now()}`,
      title: isYt ? 'YouTube Track' : 'Custom Track',
      category: atmosphere || 'lofi',
      url,
      custom: true,
    };
    setCustomTracks(prev => [...prev, track]);
    setUrlInput('');
    setAddingUrl(false);
    broadcast('manga_sync', { type: 'music_add', track });
    if (isHostRef.current) playTrack(track);
  }, [urlInput, atmosphere, broadcast, playTrack]);

  // ── Receive sync events from MangaPartyPage broadcast handler ────────────────

  const onMusicEvent = useCallback((payload) => {
    switch (payload.type) {
      case 'music_change':
        setCurrentTrack(payload.track);
        setIsPlaying(true);
        setVotes({});
        setMyVote(null);
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
        if (username === myUsername) break; // own vote applied locally
        setVotes(v => {
          const updated = { ...v };
          if (prevTrackId) updated[prevTrackId] = (updated[prevTrackId] || []).filter(u => u !== username);
          if (trackId) updated[trackId] = [...new Set([...(updated[trackId] || []), username])];
          return updated;
        });
        break;
      }
      case 'music_add':
        setCustomTracks(prev =>
          prev.some(t => t.id === payload.track?.id) ? prev : [...prev, payload.track]
        );
        break;
      default:
        break;
    }
  }, [myUsername]);

  return {
    currentTrack, isPlaying, volume, loop, votes, myVote,
    atmosphere, expanded, userInteracted, addingUrl, urlInput,
    rankedTracks, allTracks, filteredTracks,
    setLoop, setAtmosphere, setExpanded, setUserInteracted, setAddingUrl, setUrlInput,
    playTrack, handleTogglePlay, handleVolumeChange, handleSkip,
    handleTrackEnded, handleVote, handleAddUrl,
    onMusicEvent,
  };
}
