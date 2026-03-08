import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
    constructor() {
        super();
        this.isConnected = true;
        this.isReady = false;
        this.score = 0;
        this.color = "#ffffff";
        this.nx = 0;
        this.ny = 0;
    }
}
type("string")(Player.prototype, "userId");
type("string")(Player.prototype, "sessionId");
type("string")(Player.prototype, "username");
type("string")(Player.prototype, "avatar");
type("boolean")(Player.prototype, "isConnected");
type("boolean")(Player.prototype, "isReady");
type("number")(Player.prototype, "score");
type("string")(Player.prototype, "color");
type("number")(Player.prototype, "nx");
type("number")(Player.prototype, "ny");

export class BaseGameState extends Schema {
    constructor() {
        super();
        this.phase = "waiting";
        this.players = new MapSchema();
        this.rematchVotes = new MapSchema();
        this.countdown = 0;
        this.winner = "";
        this.gameData = "";
    }
}
type("string")(BaseGameState.prototype, "phase");
type({ map: Player })(BaseGameState.prototype, "players");
type("number")(BaseGameState.prototype, "countdown");
type("string")(BaseGameState.prototype, "winner");
type({ map: "boolean" })(BaseGameState.prototype, "rematchVotes");
type("string")(BaseGameState.prototype, "gameData");
