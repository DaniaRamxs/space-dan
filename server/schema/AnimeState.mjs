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
    videoId = ""; // episodeId or similar unique video identifier
    
    playing = false;
    currentTime = 0;
    duration = 0;
    lastUpdate = 0; // Timestamp of the last authoritative change

    participants = new MapSchema();
    hostId = "";
}

defineTypes(AnimeState, {
    animeId: "string",
    animeTitle: "string",
    videoId: "string",
    playing: "boolean",
    currentTime: "number",
    duration: "number",
    lastUpdate: "number",
    participants: { map: AnimeParticipant },
    hostId: "string"
});
