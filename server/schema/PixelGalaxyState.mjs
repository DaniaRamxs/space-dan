import { Schema, MapSchema, type } from "@colyseus/schema";
import { BaseGameState, Player as BasePlayer } from "./BaseGameState.mjs";

export class PixelEntry extends Schema { }
type("number")(PixelEntry.prototype, "x");
type("number")(PixelEntry.prototype, "y");
type("string")(PixelEntry.prototype, "color");
type("string")(PixelEntry.prototype, "userId");

export class PixelPlayer extends BasePlayer {
    constructor() {
        super();
        this.contributions = 0;
    }
}
type("number")(PixelPlayer.prototype, "contributions");

export class PixelGalaxyState extends BaseGameState {
    constructor() {
        super();
        this.pixels = new MapSchema();
        this.totalPixels = 0;
        this.phase = "playing"; // Continuous game
    }
}
type({ map: PixelEntry })(PixelGalaxyState.prototype, "pixels");
type("number")(PixelGalaxyState.prototype, "totalPixels");
