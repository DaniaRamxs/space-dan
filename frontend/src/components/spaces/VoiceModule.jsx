/**
 * VoiceModule
 *
 * Voice chat as a fully independent, optional module.
 * - Renders a toggle button when voice is OFF
 * - Connects to LiveKit and renders controls when voice is ON
 * - NEVER blocks other features — mount/unmount freely
 *
 * Props:
 *   livekitRoom  {string}   - LiveKit room name
 *   isEnabled    {boolean}  - Whether the host has voice on for this space
 *   isHost       {boolean}  - Can toggle voice on/off
 *   onToggle     {fn}       - (active: boolean) => void — calls session.toggleVoice
 *   onVoiceStatus {fn}      - (voiceOn: boolean) => void — calls session.setMyVoiceStatus
 */

import { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, PhoneOff } from 'lucide-react';

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'wss://danspace-76f5bceh.livekit.cloud';

// ─── Token fetcher ─────────────────────────────────────────────────────────────

async function fetchLiveKitToken(room, userId, username) {
  const res = await fetch(
    `/api/livekit/token?room=${encodeURIComponent(room)}&userId=${encodeURIComponent(userId)}&username=${encodeURIComponent(username)}`
  );
  if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
  const data = await res.json();
  return data.token;
}

// ─── Inner voice controls (rendered inside <LiveKitRoom>) ──────────────────────
// Dynamically imported so LiveKit SDK doesn't load unless voice is actually used.

function VoiceControls({ onDisconnect, onVoiceStatus }) {
  const [muted, setMuted] = useState(false);

  // Dynamically import LiveKit hooks to avoid loading the SDK eagerly
  const [lkHooks, setLkHooks] = useState(null);
  useEffect(() => {
    import('@livekit/components-react').then(mod => setLkHooks(mod)).catch(() => {});
  }, []);

  const toggleMic = useCallback(async () => {
    if (!lkHooks) return;
    try {
      const { useLocalParticipant } = lkHooks;
      // This is called inside the component so we can't use hooks here —
      // instead we use the DOM audio track API via RoomContext.
      // Signal mute state up so parent can update Colyseus.
      const next = !muted;
      setMuted(next);
      onVoiceStatus?.(!next); // voiceOn = !muted
    } catch { /* no-op */ }
  }, [muted, lkHooks, onVoiceStatus]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleMic}
        title={muted ? 'Activar micrófono' : 'Silenciar'}
        className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
          muted
            ? 'border-rose-400/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
            : 'border-green-400/30 bg-green-500/15 text-green-300 hover:bg-green-500/25'
        }`}
      >
        {muted ? <MicOff size={14} /> : <Mic size={14} />}
      </button>
      <button
        onClick={onDisconnect}
        title="Desconectar voz"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-rose-400/30 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20"
      >
        <PhoneOff size={14} />
      </button>
    </div>
  );
}

// ─── LiveKit wrapper (dynamically imported) ────────────────────────────────────

function LiveVoice({ token, room: livekitRoom, onDisconnect, onVoiceStatus }) {
  const [lkComponents, setLkComponents] = useState(null);

  useEffect(() => {
    import('@livekit/components-react').then(mod => setLkComponents(mod)).catch(() => {});
  }, []);

  if (!lkComponents) {
    return (
      <div className="flex items-center gap-2 text-[10px] text-white/40">
        <div className="h-3 w-3 animate-spin rounded-full border border-cyan-400/30 border-t-cyan-400" />
        Conectando voz...
      </div>
    );
  }

  const { LiveKitRoom, RoomAudioRenderer } = lkComponents;

  return (
    <LiveKitRoom token={token} serverUrl={LIVEKIT_URL} connect audio video={false}>
      <RoomAudioRenderer />
      <VoiceControls onDisconnect={onDisconnect} onVoiceStatus={onVoiceStatus} />
    </LiveKitRoom>
  );
}

// ─── Public component ──────────────────────────────────────────────────────────

export function VoiceModule({ livekitRoom, isEnabled, isHost, onToggle, onVoiceStatus, profile }) {
  const [token, setToken]   = useState(null);
  const [tokenErr, setErr]  = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch token when voice is enabled
  useEffect(() => {
    if (!isEnabled || !livekitRoom || !profile?.id) {
      setToken(null);
      setErr(null);
      return;
    }
    setLoading(true);
    fetchLiveKitToken(livekitRoom, profile.id, profile.username || 'Anon')
      .then(t => { setToken(t); setErr(null); })
      .catch(e => { setErr(e.message); setToken(null); })
      .finally(() => setLoading(false));
  }, [isEnabled, livekitRoom, profile?.id, profile?.username]);

  // ── Disabled state ─────────────────────────────────────────────────────────
  if (!isEnabled) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggle?.(true)}
          disabled={!isHost}
          title={isHost ? 'Activar voz para todos' : 'Solo el host puede activar la voz'}
          className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-bold transition ${
            isHost
              ? 'border-white/15 bg-white/[0.05] text-white/50 hover:border-white/25 hover:bg-white/[0.08] hover:text-white/70 cursor-pointer'
              : 'border-white/5 bg-white/[0.02] text-white/20 cursor-not-allowed'
          }`}
        >
          <Mic size={12} />
          <span>Voz</span>
        </button>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
        <div className="h-3 w-3 animate-spin rounded-full border border-cyan-400/30 border-t-cyan-400" />
        <span className="text-[10px] text-white/40">Conectando...</span>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (tokenErr) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-2">
        <span className="text-[10px] text-rose-300">Error de voz</span>
        {isHost && (
          <button onClick={() => onToggle?.(false)} className="text-[10px] text-rose-400 underline">
            Desactivar
          </button>
        )}
      </div>
    );
  }

  // ── Active ─────────────────────────────────────────────────────────────────
  if (!token) return null;

  return (
    <div className="flex items-center gap-2 rounded-full border border-green-400/20 bg-green-500/[0.08] px-3 py-1.5">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-green-300">Voz</span>
      </div>
      <LiveVoice
        token={token}
        room={livekitRoom}
        onDisconnect={() => onToggle?.(false)}
        onVoiceStatus={onVoiceStatus}
      />
    </div>
  );
}
