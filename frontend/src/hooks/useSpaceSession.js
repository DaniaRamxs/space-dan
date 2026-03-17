/**
 * useSpaceSession
 *
 * Central hook for a SpaceSession. Connects to SpaceSessionRoom (Colyseus),
 * exposes participants, active activity, voice state, and host controls.
 *
 * Voice and activities are FULLY independent — neither requires the other.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { joinOrCreateRoom, client as colyseusClient } from '@/services/colyseusClient';

function safeJson(str, fallback = {}) {
  try { return JSON.parse(str); } catch { return fallback; }
}

/**
 * @param {string} spaceId   - Unique space identifier (used as Colyseus filterBy key)
 * @param {object} opts
 * @param {string} [opts.spaceName]
 * @param {string} [opts.hostId]    - Pre-set host (e.g. when creating from a profile)
 */
export function useSpaceSession(spaceId, opts = {}) {
  const { profile } = useAuthContext();

  const [room,         setRoom]         = useState(null);
  const [participants, setParticipants] = useState([]);
  const [activity,     setActivity]     = useState({ type: '', id: '', payload: {}, hostId: '', startedAt: 0 });
  const [voiceState,   setVoiceState]   = useState({ active: false, livekitRoom: '' });
  const [isHost,       setIsHost]       = useState(false);
  const [status,       setStatus]       = useState('idle'); // idle | connecting | connected | error

  const roomRef    = useRef(null);
  const mountedRef = useRef(true);

  // ── Connect ────────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (roomRef.current?.connection?.isOpen) return;
    if (!spaceId || !profile?.id) return;

    setStatus('connecting');
    try {
      const newRoom = await joinOrCreateRoom('space_session', {
        spaceId,
        spaceName: opts.spaceName || spaceId,
        hostId:    opts.hostId    || profile.id,
        userId:    profile.id,
        username:  profile.username  || 'Anon',
        avatar:    profile.avatar_url || '',
      });

      if (!mountedRef.current) { newRoom.leave(true).catch(() => {}); return; }

      roomRef.current = newRoom;
      setRoom(newRoom);
      setStatus('connected');

      // ── State sync ──────────────────────────────────────────────────────────
      newRoom.onStateChange((state) => {
        if (!mountedRef.current) return;

        // Participants
        const parts = [];
        state.participants?.forEach((p) => {
          parts.push(p.toJSON ? p.toJSON() : { ...p });
        });
        setParticipants(parts);

        // Activity
        if (state.activity) {
          const a = state.activity;
          setActivity({
            type:      a.type      || '',
            id:        a.id        || '',
            payload:   safeJson(a.payload, {}),
            hostId:    a.hostId    || '',
            startedAt: a.startedAt || 0,
          });
        }

        // Voice
        if (state.voice) {
          setVoiceState({ active: state.voice.active, livekitRoom: state.voice.livekitRoom });
        }

        // isHost
        setIsHost(state.hostId === profile.id);
      });

      newRoom.onLeave(() => {
        if (!mountedRef.current) return;
        roomRef.current = null;
        setRoom(null);
        setStatus('idle');
      });

      newRoom.onError((code, msg) => {
        console.error('[SpaceSession] Room error:', code, msg);
        if (mountedRef.current) setStatus('error');
      });

    } catch (err) {
      console.error('[SpaceSession] connect error:', err);
      if (mountedRef.current) setStatus('error');
    }
  }, [spaceId, profile?.id, profile?.username, profile?.avatar_url, opts.spaceName, opts.hostId]);

  // ── Disconnect ─────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    roomRef.current?.leave(true).catch(() => {});
    roomRef.current = null;
    setRoom(null);
    setStatus('idle');
  }, []);

  // Auto-connect on mount, disconnect on unmount
  useEffect(() => {
    mountedRef.current = true;
    if (spaceId && profile?.id) connect();
    return () => {
      mountedRef.current = false;
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, profile?.id]);

  // ── Activity controls ──────────────────────────────────────────────────────

  const launchActivity = useCallback((type, id, payload = {}) => {
    roomRef.current?.send('set_activity', { type, id, payload });
  }, []);

  const stopActivity = useCallback(() => {
    roomRef.current?.send('stop_activity');
  }, []);

  const updateActivityPayload = useCallback((payload) => {
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
    roomRef.current?.send('update_activity_payload', str);
  }, []);

  // ── Voice controls ─────────────────────────────────────────────────────────

  const toggleVoice = useCallback((active) => {
    roomRef.current?.send('toggle_voice', { active });
  }, []);

  const setMyVoiceStatus = useCallback((voiceOn) => {
    roomRef.current?.send('voice_status', { voiceOn });
  }, []);

  // ── Host controls ──────────────────────────────────────────────────────────

  const transferHost = useCallback((targetUserId) => {
    roomRef.current?.send('transfer_host', { targetUserId });
  }, []);

  // ── Chat ───────────────────────────────────────────────────────────────────

  const sendChat = useCallback((text) => {
    if (!text?.trim()) return;
    roomRef.current?.send('chat', text.trim());
  }, []);

  return {
    // State
    room,
    participants,
    activity,
    voiceState,
    isHost,
    status,
    spaceId,

    // Activity
    launchActivity,
    stopActivity,
    updateActivityPayload,

    // Voice
    toggleVoice,
    setMyVoiceStatus,

    // Host
    transferHost,

    // Chat
    sendChat,

    // Connection
    connect,
    disconnect,
  };
}
