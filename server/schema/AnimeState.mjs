import { Schema, type, MapSchema } from "@colyseus/schema";

export class AnimeParticipant extends Schema {
    @type("string") userId = "";
    @type("string") username = "";
    @type("string") avatar = "";
    @type("boolean") isHost = false;
}

export class AnimeState extends Schema {
    @type("string") animeId = "";
    @type("string") animeTitle = "";
    @type("string") episodeId = "";
    @type("number") episodeNumber = 1;
    
    @type("boolean") isPlaying = false;
    @type("number") currentTime = 0;
    @type("number") duration = 0;
    @type("number") lastSyncTime = 0; // Server timestamp when last playing state change occurred

    @type({ map: AnimeParticipant }) participants = new MapSchema();
    @type("string") hostId = "";
}
