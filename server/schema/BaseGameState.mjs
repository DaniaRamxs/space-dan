import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
    @type("string") userId;
    @type("string") sessionId;
    @type("string") username;
    @type("string") avatar;
    @type("boolean") isConnected = true;
    @type("boolean") isReady = false;
    @type("number") score = 0;
}

export class BaseGameState extends Schema {
    @type("string") phase = "waiting"; // waiting, countdown, playing, finished, rematch
    @type({ map: Player }) players = new MapSchema();
    @type("number") countdown = 0;
    @type("string") winner = "";
    @type({ map: "boolean" }) rematchVotes = new MapSchema();
    @type("string") gameData = ""; // JSON string for specific game storage if needed
}
