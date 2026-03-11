import { Schema, MapSchema, type } from "@colyseus/schema";
import { BaseGameState, Player as BasePlayer } from "./BaseGameState.mjs";

export class PixelEntry extends Schema { }
type("number")(PixelEntry.prototype, "x");
type("number")(PixelEntry.prototype, "y");
type("string")(PixelEntry.prototype, "color");
type("string")(PixelEntry.prototype, "userId");
type("string")(PixelEntry.prototype, "username");

export class PixelPlayer extends BasePlayer {
    constructor() {
        super();
        this.contributions = 0;
    }
}
type("number")(PixelPlayer.prototype, "contributions");

export class LeaderboardEntry extends Schema { }
type("string")(LeaderboardEntry.prototype, "username");
type("string")(LeaderboardEntry.prototype, "avatar");
type("number")(LeaderboardEntry.prototype, "count");

export class PixelGalaxyState extends BaseGameState {
    constructor() {
        super();
        this.pixels = new MapSchema();
        this.leaderboard = new MapSchema();
        this.totalPixels = 0;
        this.phase = "playing"; // Continuous game
    }
}
type({ map: PixelEntry })(PixelGalaxyState.prototype, "pixels");
type({ map: LeaderboardEntry })(PixelGalaxyState.prototype, "leaderboard");
type("number")(PixelGalaxyState.prototype, "totalPixels");
