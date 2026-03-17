/**
 * SpaceSession State Schema
 * Central state for a Space: participants, active activity, voice.
 * Activities and voice are fully decoupled — voice is just a flag.
 */

import { Schema, MapSchema, type } from "@colyseus/schema";

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
