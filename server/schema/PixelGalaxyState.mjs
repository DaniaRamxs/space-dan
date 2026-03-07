import { Schema, defineTypes, MapSchema } from "@colyseus/schema";

// ─── PixelEntry ───────────────────────────────────────────────────────────────
export class PixelEntry extends Schema {
    constructor(x, y, color, userId) {
        super();
        this.x      = x;
        this.y      = y;
        this.color  = color;
        this.userId = userId;
    }
}
defineTypes(PixelEntry, {
    x:      "number",
    y:      "number",
    color:  "string",
    userId: "string"
});

// ─── PixelPlayer ──────────────────────────────────────────────────────────────
export class PixelPlayer extends Schema {
    constructor(id, name, avatar) {
        super();
        this.id            = id;
        this.name          = name;
        this.avatar        = avatar;
        this.contributions = 0;
    }
}
defineTypes(PixelPlayer, {
    id:            "string",
    name:          "string",
    avatar:        "string",
    contributions: "number"
});

// ─── PixelGalaxyState ─────────────────────────────────────────────────────────
export class PixelGalaxyState extends Schema {
    constructor() {
        super();
        this.pixels      = new MapSchema(); // key: "x_y" → PixelEntry
        this.players     = new MapSchema(); // key: sessionId → PixelPlayer
        this.totalPixels = 0;
    }
}
defineTypes(PixelGalaxyState, {
    pixels:      { map: PixelEntry },
    players:     { map: PixelPlayer },
    totalPixels: "number"
});
