/**
 * Live Activity Room
 * Generic Colyseus room for all live activities (voice, watch, music, etc.)
 */

import { Room } from "colyseus";
import { LiveActivityState, ActivityParticipant } from "../schema/LiveActivityState.mjs";
import { supabase } from "../supabaseClient.mjs";

const IS_PROD = process.env.NODE_ENV === "production";
const log = (...args) => { if (!IS_PROD) console.log(...args); };

export class LiveActivityRoom extends Room {
  maxClients = 50;

  async onCreate(options) {
    this.setState(new LiveActivityState());

    this.state.activityId = options.activityId || "";
    this.state.activityType = options.activityType || "voice";
    this.state.title = options.title || "Live Activity";
    this.state.hostId = options.hostId || "";

    this.autoDispose = true;
    this.setPatchRate(250); // 4 updates/sec for live activities

    log(`[LiveActivity] Room created: ${this.roomId} (${this.state.activityType})`);

    // Message handlers
    this.setupMessageHandlers();

    // Auto-dispose after 5 minutes of inactivity
    this.setSimulationInterval(() => {
      if (this.clients.length === 0) {
        this.disconnect();
      }
    }, 300000);
  }

  setupMessageHandlers() {
    // Toggle mute
    this.onMessage("toggle_mute", (client) => {
      const participant = this.state.participants.get(client.sessionId);
      if (participant) {
        participant.isMuted = !participant.isMuted;
      }
    });

    // Toggle speaking indicator
    this.onMessage("speaking", (client, { isSpeaking }) => {
      const participant = this.state.participants.get(client.sessionId);
      if (participant) {
        participant.isSpeaking = isSpeaking;
      }
    });

    // Update activity metadata (host only)
    this.onMessage("update_metadata", (client, metadata) => {
      const participant = this.state.participants.get(client.sessionId);
      if (participant?.isHost) {
        this.state.metadata = JSON.stringify(metadata);
        this.broadcast("metadata_updated", metadata, { except: client });
      }
    });

    // Pause/resume activity (host only)
    this.onMessage("set_status", (client, { status }) => {
      const participant = this.state.participants.get(client.sessionId);
      if (participant?.isHost && ["active", "paused", "ended"].includes(status)) {
        this.state.status = status;
        this.broadcast("status_changed", { status });
      }
    });

    // Chat message
    this.onMessage("chat", (client, message) => {
      const participant = this.state.participants.get(client.sessionId);
      if (participant) {
        this.broadcast("chat", {
          userId: participant.userId,
          username: participant.username,
          avatar: participant.avatar,
          message,
          timestamp: Date.now()
        });
      }
    });
  }

  async onJoin(client, options) {
    const userId = options.userId || client.sessionId;
    const username = options.username || "Anonymous";
    const avatar = options.avatar || "/default-avatar.png";
    const isSpectator = options.isSpectator || false;

    const participant = new ActivityParticipant();
    participant.userId = userId;
    participant.username = username;
    participant.avatar = avatar;
    participant.isHost = userId === this.state.hostId;
    participant.isSpectator = isSpectator;

    this.state.participants.set(client.sessionId, participant);

    // Update counts
    if (isSpectator) {
      this.state.spectatorCount++;
    } else {
      this.state.participantCount++;
    }

    // Update database
    if (supabase && this.state.activityId) {
      if (isSpectator) {
        await supabase.rpc('increment_activity_spectators', { 
          activity_id: this.state.activityId 
        }).catch(err => log('[LiveActivity] DB update error:', err));
      } else {
        await supabase.rpc('increment_activity_participants', { 
          activity_id: this.state.activityId 
        }).catch(err => log('[LiveActivity] DB update error:', err));
      }
    }

    log(`[LiveActivity] ${username} joined (${isSpectator ? 'spectator' : 'participant'})`);

    // Notify others
    this.broadcast("user_joined", {
      userId,
      username,
      avatar,
      isSpectator
    }, { except: client });
  }

  async onLeave(client, consented) {
    const participant = this.state.participants.get(client.sessionId);
    if (!participant) return;

    // Update counts
    if (participant.isSpectator) {
      this.state.spectatorCount = Math.max(0, this.state.spectatorCount - 1);
    } else {
      this.state.participantCount = Math.max(0, this.state.participantCount - 1);
    }

    // Update database
    if (supabase && this.state.activityId) {
      if (participant.isSpectator) {
        await supabase.rpc('decrement_activity_spectators', { 
          activity_id: this.state.activityId 
        }).catch(err => log('[LiveActivity] DB update error:', err));
      } else {
        await supabase.rpc('decrement_activity_participants', { 
          activity_id: this.state.activityId 
        }).catch(err => log('[LiveActivity] DB update error:', err));
      }
    }

    this.state.participants.delete(client.sessionId);

    log(`[LiveActivity] ${participant.username} left`);

    // Notify others
    this.broadcast("user_left", {
      userId: participant.userId,
      username: participant.username
    });

    // If host left and there are still participants, assign new host
    if (participant.isHost && this.state.participants.size > 0) {
      const newHostSession = Array.from(this.state.participants.keys())[0];
      const newHost = this.state.participants.get(newHostSession);
      if (newHost) {
        newHost.isHost = true;
        this.state.hostId = newHost.userId;
        this.broadcast("host_changed", { 
          newHostId: newHost.userId,
          newHostUsername: newHost.username
        });
      }
    }

    // Auto-dispose if empty
    if (this.state.participants.size === 0) {
      this.disconnect();
    }
  }

  onDispose() {
    log(`[LiveActivity] Room disposed: ${this.roomId}`);
  }
}
