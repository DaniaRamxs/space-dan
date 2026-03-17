/**
 * SpaceSessionRoom  v2
 *
 * Added on top of v1:
 *   1. GET_PREVIEW   — lightweight snapshot for the /spaces hub
 *   2. Auto-start    — starts chill music after 5s idle, remembers user preference
 *   3. Presence      — CURSOR_MOVE, USER_STATE, REACTION broadcasts
 */

import { Room } from "colyseus";
import { SpaceSessionState, SpaceParticipant, OverlayElement } from "../schema/SpaceSessionState.mjs";
import { registerSpace, unregisterSpace } from "../spacesRegistry.mjs";

const IS_PROD = process.env.NODE_ENV === "production";
const log = (...args) => { if (!IS_PROD) console.log(...args); };

// ── Overlay rate-limit config ──────────────────────────────────────────────────
const OVERLAY_THROTTLE_MS  = 50;    // minimum ms between updates per client
const OVERLAY_MAX_PER_MIN  = 120;   // max overlay updates per client per minute
const OVERLAY_DRAG_THROTTLE = 100;  // ghost cursor broadcast throttle
const MAX_OVERLAYS         = 50;    // mirror frontend constant

// ── Chill track list for auto-start ──────────────────────────────────────────
const CHILL_TRACKS = [
  { title: "Lofi Chill Beats",      thumbnail: null },
  { title: "Space Ambience Mix",    thumbnail: null },
  { title: "Lo-fi Hip Hop Radio",   thumbnail: null },
  { title: "Synthwave Dreams",      thumbnail: null },
  { title: "Café Jazz Session",     thumbnail: null },
];

function randomChillTrack() {
  return CHILL_TRACKS[Math.floor(Math.random() * CHILL_TRACKS.length)];
}

// ── Cursor throttle (ms between broadcasts per client) ───────────────────────
const CURSOR_THROTTLE_MS = 50;

export class SpaceSessionRoom extends Room {
  maxClients = 30;

  onCreate(options) {
    const state = new SpaceSessionState();
    state.spaceId      = options.spaceId   || this.roomId;
    state.spaceName    = options.spaceName || "Space";
    state.hostId       = options.hostId    || "";
    state.voice.livekitRoom = options.spaceId || this.roomId;
    state.isPublic     = options.isPublic !== false;
    state.bgType       = "stars";
    state.bgValue      = "";
    this.setState(state);

    this.autoDispose = true;
    this.setPatchRate(100);

    // Per-user activity preference (room-scoped, not persisted across sessions)
    this._userPreferences = new Map(); // userId → "type:id"
    // Last cursor broadcast time per client (for throttle)
    this._cursorLastSent  = new Map(); // sessionId → timestamp
    // Overlay rate-limit tracking: sessionId → { lastMs, count, windowStart }
    this._overlayRateLimits = new Map();
    // Overlay drag ghost throttle: sessionId → lastMs
    this._overlayDragLast  = new Map();
    // Auto-start timer
    this._autoStartTimer  = null;
    this._disposeTimer    = null;

    log(`[SpaceSession] Room created: ${this.roomId} (space: ${state.spaceId})`);

    // ── Activity ──────────────────────────────────────────────────────────────

    this.onMessage("set_activity", (client, data) => {
      if (!this._isHost(client)) return;

      // Remember host preference
      const p = this._getParticipant(client);
      if (p) this._userPreferences.set(p.userId, `${data.type}:${data.id}`);

      this.state.activity.type      = data.type      || "";
      this.state.activity.id        = data.id        || "";
      this.state.activity.payload   = typeof data.payload === "string"
        ? data.payload
        : JSON.stringify(data.payload ?? {});
      this.state.activity.hostId    = this.state.hostId;
      this.state.activity.startedAt = Date.now();

      this._cancelAutoStart();
      this._publishPreview();
      log(`[SpaceSession] Activity set: ${data.type}:${data.id}`);
    });

    this.onMessage("update_activity_payload", (client, payload) => {
      const str = typeof payload === "string" ? payload : JSON.stringify(payload ?? {});
      this.state.activity.payload = str;
      // Don't re-publish on every payload tick — too noisy
    });

    this.onMessage("stop_activity", (client) => {
      if (!this._isHost(client)) return;
      this._clearActivity();
      this._scheduleAutoStart(); // re-arm after activity stops
      this._publishPreview();
      log(`[SpaceSession] Activity stopped`);
    });

    // ── Lightweight preview snapshot for /spaces hub ──────────────────────────

    this.onMessage("GET_PREVIEW", (client) => {
      const payload = this._buildPreview();
      client.send("PREVIEW", payload);
    });

    // ── Voice ─────────────────────────────────────────────────────────────────

    this.onMessage("toggle_voice", (client, { active }) => {
      if (!this._isHost(client)) return;
      this.state.voice.active = !!active;
      this._publishPreview();
    });

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
      const old = this._getParticipant(client);
      if (old) old.isHost = false;
      newHost.isHost = true;
      this.state.hostId = targetUserId;
      this.broadcast("host_changed", {
        newHostId: targetUserId,
        newHostUsername: newHost.username,
        prevHostId: client.userData?.userId,
      });
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

    // ── Presence: cursors ────────────────────────────────────────────────────
    // x,y are percentages (0–100) relative to the space area — screen-size agnostic

    this.onMessage("CURSOR_MOVE", (client, { x, y }) => {
      const now = Date.now();
      const last = this._cursorLastSent.get(client.sessionId) || 0;
      if (now - last < CURSOR_THROTTLE_MS) return;
      this._cursorLastSent.set(client.sessionId, now);

      const p = this._getParticipant(client);
      if (!p) return;

      this.broadcast("CURSOR_UPDATE", {
        sessionId: client.sessionId,
        userId:    p.userId,
        username:  p.username,
        avatar:    p.avatar,
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      }, { except: client });
    });

    // ── Presence: soft status ("escribiendo", "viendo", etc.) ───────────────

    this.onMessage("USER_STATE", (client, statusText) => {
      const p = this._getParticipant(client);
      if (!p) return;
      // Store in userData (transient, not schema — avoids patch overhead)
      client.userData.statusText = String(statusText || "").slice(0, 40);
      this.broadcast("USER_STATE_UPDATE", {
        sessionId: client.sessionId,
        userId:    p.userId,
        status:    client.userData.statusText,
      }, { except: client });
    });

    // ── Presence: emoji reactions ────────────────────────────────────────────

    this.onMessage("REACTION", (client, emoji) => {
      const p = this._getParticipant(client);
      if (!p || !emoji) return;
      this.broadcast("REACTION_POP", {
        userId:    p.userId,
        username:  p.username,
        avatar:    p.avatar,
        emoji:     String(emoji).slice(0, 4),
        timestamp: Date.now(),
      });
    });

    // ── Overlay engine ────────────────────────────────────────────────────────

    this.onMessage("overlay:add", (client, data) => {
      if (!this._checkOverlayRate(client)) return;
      if (this.state.overlays.size >= MAX_OVERLAYS) {
        client.send("overlay:error", { code: "LIMIT_REACHED", max: MAX_OVERLAYS });
        return;
      }

      const p = this._getParticipant(client);
      if (!p) return;

      const id = data.id || `${client.sessionId}-${Date.now()}`;
      // Validate + clamp position
      const x = typeof data.x === "number" ? Math.max(-2000, Math.min(10000, data.x)) : 0;
      const y = typeof data.y === "number" ? Math.max(-2000, Math.min(10000, data.y)) : 0;

      const el = this._makeOverlayElement(id, data, p.userId, x, y);
      if (!el) return;

      this.state.overlays.set(id, el);
      log(`[SpaceSession] overlay:add ${id} by ${p.username}`);
    });

    this.onMessage("overlay:update", (client, { id, patch }) => {
      if (!id || !patch) return;
      if (!this._checkOverlayRate(client)) return;

      const el = this.state.overlays.get(id);
      if (!el) return;

      const p = this._getParticipant(client);
      if (!p) return;

      // Only creator or host can update
      if (el.createdBy !== p.userId && !p.isHost) return;

      // Apply patch — only allow safe fields
      if (typeof patch.x        === "number") el.x        = Math.max(-2000, Math.min(10000, patch.x));
      if (typeof patch.y        === "number") el.y        = Math.max(-2000, Math.min(10000, patch.y));
      if (typeof patch.scale    === "number") el.scale    = Math.max(0.1, Math.min(10, patch.scale));
      if (typeof patch.rotation === "number") el.rotation = patch.rotation;
      if (typeof patch.zIndex   === "number") el.zIndex   = patch.zIndex;
      if (typeof patch.isPersistent === "boolean") el.isPersistent = patch.isPersistent;
      el.updatedAt = Date.now();
    });

    this.onMessage("overlay:remove", (client, { id }) => {
      if (!id) return;
      const el = this.state.overlays.get(id);
      if (!el) return;

      const p = this._getParticipant(client);
      if (!p) return;

      // Only creator or host can remove
      if (el.createdBy !== p.userId && !p.isHost) return;

      this.state.overlays.delete(id);
      log(`[SpaceSession] overlay:remove ${id}`);
    });

    this.onMessage("overlay:clear", (client) => {
      // Host-only: clear all non-persistent overlays
      if (!this._isHost(client)) return;
      const toDelete = [];
      this.state.overlays.forEach((el, id) => {
        if (!el.isPersistent) toDelete.push(id);
      });
      toDelete.forEach(id => this.state.overlays.delete(id));
      log(`[SpaceSession] overlay:clear — removed ${toDelete.length} elements`);
    });

    this.onMessage("overlay:dragging", (client, { id, x, y }) => {
      // Ghost cursor: throttled broadcast, no schema change
      const now = Date.now();
      const last = this._overlayDragLast.get(client.sessionId) || 0;
      if (now - last < OVERLAY_DRAG_THROTTLE) return;
      this._overlayDragLast.set(client.sessionId, now);

      const p = this._getParticipant(client);
      if (!p) return;

      this.broadcast("overlay:ghost", {
        id,
        userId:   p.userId,
        username: p.username,
        x: typeof x === "number" ? x : 0,
        y: typeof y === "number" ? y : 0,
      }, { except: client });
    });

    // ── Background sync ───────────────────────────────────────────────────────

    this.onMessage("SET_BACKGROUND", (client, { type, value }) => {
      if (!this._isHost(client)) return;
      this.state.bgType  = ["stars", "image", "gif"].includes(type) ? type : "stars";
      this.state.bgValue = String(value || "").slice(0, 500);
      // Broadcast so all clients update immediately (schema patch also propagates)
      this.broadcast("BACKGROUND_UPDATE", {
        type:  this.state.bgType,
        value: this.state.bgValue,
      });
    });
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

    const isFirst = this.state.participants.size === 0;
    if (isFirst && !this.state.hostId) this.state.hostId = userId;
    p.isHost = userId === this.state.hostId;

    client.userData = { userId, username, sessionId: client.sessionId, statusText: "" };
    this.state.participants.set(client.sessionId, p);

    if (this._disposeTimer) { clearTimeout(this._disposeTimer); this._disposeTimer = null; }

    // Restore host's last-known preference as auto-start seed
    if (p.isHost && this._userPreferences.has(userId)) {
      const pref = this._userPreferences.get(userId);
      const [prefType, prefId] = pref.split(":");
      if (prefType && prefId && !this.state.activity.type) {
        // Don't auto-launch — just seed the timer with the preference
        this._preferredActivity = { type: prefType, id: prefId };
      }
    }

    // Arm auto-start for first participant if no activity yet
    if (isFirst && !this.state.activity.type) {
      this._scheduleAutoStart();
    }

    this._publishPreview();
    log(`[SpaceSession] ${username} joined (host: ${p.isHost})`);
    this.broadcast("user_joined", { userId, username, avatar }, { except: client });
  }

  onLeave(client, consented) {
    const p = this._getParticipant(client);
    if (!p) return;

    const wasHost = p.userId === this.state.hostId;
    this.state.participants.delete(client.sessionId);
    this._cursorLastSent.delete(client.sessionId);
    this._overlayRateLimits.delete(client.sessionId);
    this._overlayDragLast.delete(client.sessionId);

    // Tell others cursor is gone
    this.broadcast("CURSOR_GONE", { sessionId: client.sessionId });

    log(`[SpaceSession] ${p.username} left`);
    this.broadcast("user_left", { userId: p.userId, username: p.username });

    if (wasHost && this.state.participants.size > 0) {
      const nextEntry = this.state.participants.entries().next();
      if (!nextEntry.done) {
        const [, nextP] = nextEntry.value;
        nextP.isHost = true;
        this.state.hostId = nextP.userId;
        this.broadcast("host_changed", {
          newHostId: nextP.userId,
          newHostUsername: nextP.username,
        });
      }
    }

    if (this.state.participants.size === 0) {
      this._cancelAutoStart();
      this._disposeTimer = setTimeout(() => this.disconnect(), 10 * 60 * 1000);
    }

    this._publishPreview();
  }

  onDispose() {
    this._cancelAutoStart();
    if (this._disposeTimer) clearTimeout(this._disposeTimer);
    unregisterSpace(this.state.spaceId);
    log(`[SpaceSession] Room disposed: ${this.roomId}`);
  }

  // ── Auto-start ─────────────────────────────────────────────────────────────

  _scheduleAutoStart() {
    this._cancelAutoStart();
    this._autoStartTimer = setTimeout(() => {
      if (this.state.activity.type) return; // activity was set manually
      if (this.state.participants.size === 0) return;
      this._startDefaultActivity();
    }, 5000);
  }

  _cancelAutoStart() {
    if (this._autoStartTimer) { clearTimeout(this._autoStartTimer); this._autoStartTimer = null; }
  }

  _startDefaultActivity() {
    // Use remembered preference, or fall back to music
    const pref = this._preferredActivity;
    const track = randomChillTrack();

    if (pref) {
      this.state.activity.type      = pref.type;
      this.state.activity.id        = pref.id;
      this.state.activity.payload   = "{}";
      this.state.activity.hostId    = this.state.hostId;
      this.state.activity.startedAt = Date.now();
      log(`[SpaceSession] Auto-start with preference: ${pref.type}:${pref.id}`);
    } else {
      // Default: signal "music" lobby — activity components decide what to play
      this.state.activity.type      = "music";
      this.state.activity.id        = "chill";
      this.state.activity.payload   = JSON.stringify({ autoStart: true, track: track.title });
      this.state.activity.hostId    = this.state.hostId;
      this.state.activity.startedAt = Date.now();
      log(`[SpaceSession] Auto-start default: music/chill "${track.title}"`);
    }

    this._publishPreview();
    this.broadcast("activity_auto_started", {
      type:    this.state.activity.type,
      id:      this.state.activity.id,
      payload: this.state.activity.payload,
    });
  }

  // ── Preview / Registry ─────────────────────────────────────────────────────

  _buildPreview() {
    const hostSession = Array.from(this.state.participants.entries())
      .find(([, p]) => p.userId === this.state.hostId);
    const host = hostSession?.[1];

    let previewPayload = {};
    try { previewPayload = JSON.parse(this.state.activity.payload || "{}"); } catch { /* ok */ }

    return {
      spaceId:      this.state.spaceId,
      spaceName:    this.state.spaceName,
      hostId:       this.state.hostId,
      hostUsername: host?.username || "",
      hostAvatar:   host?.avatar   || "",
      isPublic:     this.state.isPublic,
      activity: {
        type:  this.state.activity.type  || "",
        id:    this.state.activity.id    || "",
      },
      users:  this.state.participants.size,
      preview: {
        thumbnail:  previewPayload.thumbnail || null,
        track:      previewPayload.track     || null,
        timestamp:  previewPayload.currentTime || 0,
      },
    };
  }

  _publishPreview() {
    registerSpace(this.state.spaceId, this._buildPreview());
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _clearActivity() {
    this.state.activity.type      = "";
    this.state.activity.id        = "";
    this.state.activity.payload   = "{}";
    this.state.activity.hostId    = "";
    this.state.activity.startedAt = 0;
  }

  _makeOverlayElement(id, data, createdBy, x, y) {
    const VALID_TYPES = ["gif", "sticker", "drawing", "text"];
    if (!VALID_TYPES.includes(data.type)) return null;

    const el = new OverlayElement();
    el.id           = String(id).slice(0, 64);
    el.type         = data.type;
    el.src          = typeof data.src  === "string" ? data.src.slice(0, 2048)  : "";
    el.text         = typeof data.text === "string" ? data.text.slice(0, 500)  : "";
    el.x            = x;
    el.y            = y;
    el.scale        = typeof data.scale    === "number" ? Math.max(0.1, Math.min(10, data.scale))  : 1;
    el.rotation     = typeof data.rotation === "number" ? data.rotation : 0;
    el.zIndex       = typeof data.zIndex   === "number" ? data.zIndex   : 1;
    el.isPersistent = false;
    el.createdBy    = String(createdBy).slice(0, 64);
    el.createdAt    = Date.now();
    el.updatedAt    = el.createdAt;
    el.width        = typeof data.width  === "number" ? data.width  : 0;
    el.height       = typeof data.height === "number" ? data.height : 0;
    return el;
  }

  _checkOverlayRate(client) {
    const now = Date.now();
    const sid = client.sessionId;
    let rec = this._overlayRateLimits.get(sid);

    if (!rec) {
      rec = { lastMs: 0, count: 0, windowStart: now };
      this._overlayRateLimits.set(sid, rec);
    }

    // Throttle: minimum interval between calls
    if (now - rec.lastMs < OVERLAY_THROTTLE_MS) return false;

    // Sliding window: reset count each minute
    if (now - rec.windowStart >= 60_000) {
      rec.count = 0;
      rec.windowStart = now;
    }

    if (rec.count >= OVERLAY_MAX_PER_MIN) return false;

    rec.lastMs = now;
    rec.count++;
    return true;
  }

  _getParticipant(client) {
    return this.state.participants.get(client.sessionId) || null;
  }

  _isHost(client) {
    const p = this._getParticipant(client);
    return p?.isHost === true || p?.userId === this.state.hostId;
  }
}
