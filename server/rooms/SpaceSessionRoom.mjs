/**
 * SpaceSessionRoom
 *
 * Central Colyseus room for a Space. Manages:
 *   - participants (join / leave / host transfer)
 *   - active activity (type, id, payload) — fully decoupled from voice
 *   - voice state (on/off toggle) — just a flag; LiveKit handles the media
 *
 * Design principle: voice and activities are independent. Either can exist
 * without the other. Activities communicate their live state via the payload
 * field (JSON string), keeping the schema generic.
 */

import { Room } from "colyseus";
import { SpaceSessionState, SpaceParticipant } from "../schema/SpaceSessionState.mjs";

const IS_PROD = process.env.NODE_ENV === "production";
const log = (...args) => { if (!IS_PROD) console.log(...args); };

export class SpaceSessionRoom extends Room {
  maxClients = 30;

  onCreate(options) {
    const state = new SpaceSessionState();
    state.spaceId      = options.spaceId   || this.roomId;
    state.spaceName    = options.spaceName || "Space";
    state.hostId       = options.hostId    || "";
    state.voice.livekitRoom = options.spaceId || this.roomId;
    this.setState(state);

    this.autoDispose = true;
    this.setPatchRate(100); // 10 updates/sec — enough for activity payload sync

    log(`[SpaceSession] Room created: ${this.roomId} (space: ${state.spaceId})`);

    // ── Activity ──────────────────────────────────────────────────────────────

    /** Host sets or changes the active activity */
    this.onMessage("set_activity", (client, data) => {
      if (!this._isHost(client)) return;
      this.state.activity.type      = data.type      || "";
      this.state.activity.id        = data.id        || "";
      this.state.activity.payload   = typeof data.payload === "string"
        ? data.payload
        : JSON.stringify(data.payload ?? {});
      this.state.activity.hostId    = this.state.hostId;
      this.state.activity.startedAt = Date.now();
      log(`[SpaceSession] Activity set: ${data.type}:${data.id} by ${client.userData?.username}`);
    });

    /** Any participant can push incremental payload updates (position, canvas, etc.) */
    this.onMessage("update_activity_payload", (client, payload) => {
      const str = typeof payload === "string" ? payload : JSON.stringify(payload ?? {});
      this.state.activity.payload = str;
    });

    /** Host clears the activity (back to lobby) */
    this.onMessage("stop_activity", (client) => {
      if (!this._isHost(client)) return;
      this.state.activity.type      = "";
      this.state.activity.id        = "";
      this.state.activity.payload   = "{}";
      this.state.activity.hostId    = "";
      this.state.activity.startedAt = 0;
      log(`[SpaceSession] Activity stopped`);
    });

    // ── Voice ─────────────────────────────────────────────────────────────────

    /** Host toggles global voice on/off */
    this.onMessage("toggle_voice", (client, { active }) => {
      if (!this._isHost(client)) return;
      this.state.voice.active = !!active;
      log(`[SpaceSession] Voice ${active ? "enabled" : "disabled"}`);
    });

    /** Each client reports their own mic status */
    this.onMessage("voice_status", (client, { voiceOn }) => {
      const p = this.state.participants.get(client.sessionId);
      if (p) p.voiceOn = !!voiceOn;
    });

    // ── Host management ───────────────────────────────────────────────────────

    this.onMessage("transfer_host", (client, { targetUserId }) => {
      if (!this._isHost(client)) return;
      if (!targetUserId || targetUserId === client.userData?.userId) return;

      let newHost = null;
      this.state.participants.forEach((p) => {
        if (p.userId === targetUserId) newHost = p;
      });
      if (!newHost) return;

      // Demote old host
      const old = this._getParticipant(client);
      if (old) old.isHost = false;

      // Promote new host
      newHost.isHost = true;
      this.state.hostId = targetUserId;

      this.broadcast("host_changed", {
        newHostId:       targetUserId,
        newHostUsername: newHost.username,
        prevHostId:      client.userData?.userId,
      });
      log(`[SpaceSession] Host transferred → ${newHost.username}`);
    });

    // ── Chat ─────────────────────────────────────────────────────────────────

    this.onMessage("chat", (client, message) => {
      const p = this._getParticipant(client);
      if (!p || !message) return;
      this.broadcast("chat", {
        id:        Date.now(),
        userId:    p.userId,
        username:  p.username,
        avatar:    p.avatar,
        content:   String(message).slice(0, 500),
        timestamp: Date.now(),
      });
    });

    // Auto-dispose after 10 min of being empty
    this._disposeTimer = null;
  }

  onJoin(client, options) {
    const userId   = options.userId   || client.sessionId;
    const username = options.username || "Anon";
    const avatar   = options.avatar   || "";

    const p = new SpaceParticipant();
    p.userId   = userId;
    p.username = username;
    p.avatar   = avatar;
    p.joinedAt = Date.now();

    // First participant or matching hostId becomes host
    const isFirst = this.state.participants.size === 0;
    if (isFirst && !this.state.hostId) this.state.hostId = userId;
    p.isHost = userId === this.state.hostId;

    client.userData = { userId, username, sessionId: client.sessionId };
    this.state.participants.set(client.sessionId, p);

    if (this._disposeTimer) {
      clearTimeout(this._disposeTimer);
      this._disposeTimer = null;
    }

    log(`[SpaceSession] ${username} joined (host: ${p.isHost})`);
    this.broadcast("user_joined", { userId, username, avatar }, { except: client });
  }

  onLeave(client, consented) {
    const p = this._getParticipant(client);
    if (!p) return;

    const wasHost = p.userId === this.state.hostId;
    this.state.participants.delete(client.sessionId);

    log(`[SpaceSession] ${p.username} left`);
    this.broadcast("user_left", { userId: p.userId, username: p.username });

    // Reassign host if needed
    if (wasHost && this.state.participants.size > 0) {
      const nextEntry = this.state.participants.entries().next();
      if (!nextEntry.done) {
        const [nextKey, nextP] = nextEntry.value;
        nextP.isHost = true;
        this.state.hostId = nextP.userId;
        this.broadcast("host_changed", {
          newHostId:       nextP.userId,
          newHostUsername: nextP.username,
        });
        log(`[SpaceSession] Auto-assigned new host: ${nextP.username}`);
      }
    }

    // Schedule dispose if empty
    if (this.state.participants.size === 0) {
      this._disposeTimer = setTimeout(() => {
        this.disconnect();
      }, 10 * 60 * 1000); // 10 min grace period
    }
  }

  onDispose() {
    if (this._disposeTimer) clearTimeout(this._disposeTimer);
    log(`[SpaceSession] Room disposed: ${this.roomId}`);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _getParticipant(client) {
    return this.state.participants.get(client.sessionId) || null;
  }

  _isHost(client) {
    const p = this._getParticipant(client);
    return p?.isHost === true || p?.userId === this.state.hostId;
  }
}
