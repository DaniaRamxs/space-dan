import { Schema, defineTypes, MapSchema } from "@colyseus/schema";

export class AnimeParticipant extends Schema {
    userId = "";
    username = "";
    avatar = "";
    isHost = false;
}

defineTypes(AnimeParticipant, {
    userId: "string",
    username: "string",
    avatar: "string",
    isHost: "boolean"
});

export class AnimeState extends Schema {
    animeId = "";
    animeTitle = "";
    episodeId = "";
    episodeNumber = 1;
    
    isPlaying = false;
    currentTime = 0;
    duration = 0;
    lastSyncTime = 0; // Server timestamp when last playing state change occurred

    participants = new MapSchema();
    hostId = "";
}

defineTypes(AnimeState, {
    animeId: "string",
    animeTitle: "string",
    episodeId: "string",
    episodeNumber: "number",
    isPlaying: "boolean",
    currentTime: "number",
    duration: "number",
    lastSyncTime: "number",
    participants: { map: AnimeParticipant },
    hostId: "string"
});
