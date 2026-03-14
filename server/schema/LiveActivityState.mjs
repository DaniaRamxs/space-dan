/**
 * Live Activity State Schema
 * Generic schema for all live activities (voice, watch, music, etc.)
 */

import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

export class Reaction extends Schema {
  constructor() {
    super();
    this.type = "emoji"; // emoji, gif
    this.content = "";
    this.timestamp = 0;
    this.userId = "";
    this.username = "";
  }
}

type("string")(Reaction.prototype, "type");
type("string")(Reaction.prototype, "content");
type("number")(Reaction.prototype, "timestamp");
type("string")(Reaction.prototype, "userId");
type("string")(Reaction.prototype, "username");

export class ActivityParticipant extends Schema {
  constructor() {
    super();
    this.isHost = false;
    this.isSpeaking = false;
    this.isMuted = false;
    this.isSpectator = false;
  }
}

type("string")(ActivityParticipant.prototype, "userId");
type("string")(ActivityParticipant.prototype, "username");
type("string")(ActivityParticipant.prototype, "avatar");
type("boolean")(ActivityParticipant.prototype, "isHost");
type("boolean")(ActivityParticipant.prototype, "isSpeaking");
type("boolean")(ActivityParticipant.prototype, "isMuted");
type("boolean")(ActivityParticipant.prototype, "isSpectator");

export class LiveActivityState extends Schema {
  constructor() {
    super();
    this.activityId = "";
    this.activityType = "voice"; // voice, watch, music, game
    this.title = "";
    this.status = "active"; // active, paused, ended
    this.participants = new MapSchema();
    this.metadata = "{}"; // JSON string for activity-specific data
    this.hostId = "";

    // Playback Sync Snapshot
    this.videoId = "";
    this.playing = false;
    this.currentTime = 0;
    this.duration = 0;
    this.lastUpdate = 0;
    this.instanceId = "";

    this.participantCount = 0;
    this.spectatorCount = 0;
    this.reactions = new ArraySchema();
  }
}

type("string")(LiveActivityState.prototype, "activityId");
type("string")(LiveActivityState.prototype, "activityType");
type("string")(LiveActivityState.prototype, "title");
type("string")(LiveActivityState.prototype, "status");
type({ map: ActivityParticipant })(LiveActivityState.prototype, "participants");
type({ array: Reaction })(LiveActivityState.prototype, "reactions");
type("string")(LiveActivityState.prototype, "metadata");
type("string")(LiveActivityState.prototype, "hostId");

type("string")(LiveActivityState.prototype, "videoId");
type("boolean")(LiveActivityState.prototype, "playing");
type("number")(LiveActivityState.prototype, "currentTime");
type("number")(LiveActivityState.prototype, "duration");
type("number")(LiveActivityState.prototype, "lastUpdate");
type("string")(LiveActivityState.prototype, "instanceId");

type("number")(LiveActivityState.prototype, "participantCount");
type("number")(LiveActivityState.prototype, "spectatorCount");
