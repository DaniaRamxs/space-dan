/**
 * SpaceSession State Schema
 * Central state for a Space: participants, active activity, voice.
 * Activities and voice are fully decoupled — voice is just a flag.
 */

import { Schema, MapSchema, type } from "@colyseus/schema";

// ─── OverlayElement ──────────────────────────────────────────────────────────
// Persistent visual elements layered on top of the space (gifs, stickers, etc.)

export class OverlayElement extends Schema {
  constructor() {
    super();
    this.id          = "";
    this.type        = "";   // "gif" | "sticker" | "drawing" | "text"
    this.src         = "";   // URL or base64 dataURL
    this.text        = "";   // only for type="text"
    this.x           = 0;   // px from container top-left
    this.y           = 0;
    this.scale       = 1;
    this.rotation    = 0;   // degrees
    this.zIndex      = 0;
    this.isPersistent = false;
    this.createdBy   = "";
    this.createdAt   = 0;
    this.updatedAt   = 0;
    this.width       = 0;   // for drawings
    this.height      = 0;
  }
}

type("string")(OverlayElement.prototype,  "id");
type("string")(OverlayElement.prototype,  "type");
type("string")(OverlayElement.prototype,  "src");
type("string")(OverlayElement.prototype,  "text");
type("number")(OverlayElement.prototype,  "x");
type("number")(OverlayElement.prototype,  "y");
type("number")(OverlayElement.prototype,  "scale");
type("number")(OverlayElement.prototype,  "rotation");
type("number")(OverlayElement.prototype,  "zIndex");
type("boolean")(OverlayElement.prototype, "isPersistent");
type("string")(OverlayElement.prototype,  "createdBy");
type("number")(OverlayElement.prototype,  "createdAt");
type("number")(OverlayElement.prototype,  "updatedAt");
type("number")(OverlayElement.prototype,  "width");
type("number")(OverlayElement.prototype,  "height");

// ─── Participant ─────────────────────────────────────────────────────────────

export class SpaceParticipant extends Schema {
  constructor() {
    super();
    this.userId    = "";
    this.username  = "";
    this.avatar    = "";
    this.isHost    = false;
    this.voiceOn   = false; // has mic enabled in LiveKit
    this.isOnline  = true;
    this.joinedAt  = 0;
  }
}

type("string")(SpaceParticipant.prototype,  "userId");
type("string")(SpaceParticipant.prototype,  "username");
type("string")(SpaceParticipant.prototype,  "avatar");
type("boolean")(SpaceParticipant.prototype, "isHost");
type("boolean")(SpaceParticipant.prototype, "voiceOn");
type("boolean")(SpaceParticipant.prototype, "isOnline");
type("number")(SpaceParticipant.prototype,  "joinedAt");

// ─── ActivitySlot ────────────────────────────────────────────────────────────
// Represents whichever activity is currently active in the space.
// payload is a JSON string so it can hold any activity-specific state
// without touching the schema when activities evolve.

export class SpaceActivity extends Schema {
  constructor() {
    super();
    this.type      = "";   // "anime" | "manga" | "music" | "game" | ""
    this.id        = "";   // "astro-party" | "manga-party" | "connect4" | ...
    this.payload   = "{}"; // JSON: episode, track, canvas state, etc.
    this.hostId    = "";
    this.startedAt = 0;
  }
}

type("string")(SpaceActivity.prototype, "type");
type("string")(SpaceActivity.prototype, "id");
type("string")(SpaceActivity.prototype, "payload");
type("string")(SpaceActivity.prototype, "hostId");
type("number")(SpaceActivity.prototype, "startedAt");

// ─── VoiceSlot ───────────────────────────────────────────────────────────────
// Just tracks whether voice is enabled and which LiveKit room to join.
// The actual voice connection lives entirely on the client (LiveKit SDK).

export class SpaceVoice extends Schema {
  constructor() {
    super();
    this.active      = false;
    this.livekitRoom = ""; // same as spaceId by convention
  }
}

type("boolean")(SpaceVoice.prototype, "active");
type("string")(SpaceVoice.prototype,  "livekitRoom");

// ─── Root State ──────────────────────────────────────────────────────────────

export class SpaceSessionState extends Schema {
  constructor() {
    super();
    this.spaceId      = "";
    this.spaceName    = "";
    this.hostId       = "";
    this.participants = new MapSchema();
    this.activity     = new SpaceActivity();
    this.voice        = new SpaceVoice();
    this.createdAt    = Date.now();
    this.isPublic     = true;
    this.bgType       = "stars";
    this.bgValue      = "";
    this.overlays     = new MapSchema(); // id → OverlayElement
  }
}

type("string")(SpaceSessionState.prototype, "spaceId");
type("string")(SpaceSessionState.prototype, "spaceName");
type("string")(SpaceSessionState.prototype, "hostId");
type({ map: SpaceParticipant })(SpaceSessionState.prototype, "participants");
type(SpaceActivity)(SpaceSessionState.prototype, "activity");
type(SpaceVoice)(SpaceSessionState.prototype, "voice");
type("number")(SpaceSessionState.prototype, "createdAt");
type("boolean")(SpaceSessionState.prototype, "isPublic");
type("string")(SpaceSessionState.prototype, "bgType");
type("string")(SpaceSessionState.prototype, "bgValue");
type({ map: OverlayElement })(SpaceSessionState.prototype, "overlays");
