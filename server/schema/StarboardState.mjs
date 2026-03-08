import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import { BaseGameState, Player as BasePlayer } from "./BaseGameState.mjs";

export class StarboardObject extends Schema {
    constructor() {
        super();
        this.points = new ArraySchema();
    }

    assign(data) {
        Object.keys(data).forEach(key => {
            if (key === 'points' && Array.isArray(data[key])) {
                this.points = new ArraySchema(...data[key]);
            } else if (data[key] !== undefined) {
                this[key] = data[key];
            }
        });
    }
}
type("string")(StarboardObject.prototype, "id");
type("string")(StarboardObject.prototype, "tool");
type("string")(StarboardObject.prototype, "layerId");
type("string")(StarboardObject.prototype, "userId");
type("number")(StarboardObject.prototype, "x");
type("number")(StarboardObject.prototype, "y");
type("number")(StarboardObject.prototype, "width");
type("number")(StarboardObject.prototype, "height");
type("string")(StarboardObject.prototype, "stroke");
type("number")(StarboardObject.prototype, "strokeWidth");
type("string")(StarboardObject.prototype, "fill");
type(["number"])(StarboardObject.prototype, "points");
type("string")(StarboardObject.prototype, "text");
type("string")(StarboardObject.prototype, "src");
type("number")(StarboardObject.prototype, "tension");
type("string")(StarboardObject.prototype, "lineCap");
type("string")(StarboardObject.prototype, "lineJoin");
type("string")(StarboardObject.prototype, "globalCompositeOperation");
type("number")(StarboardObject.prototype, "fontSize");
type("string")(StarboardObject.prototype, "fontStyle");

export class StarboardPlayer extends BasePlayer { }

export class StarboardState extends BaseGameState {
    constructor() {
        super();
        this.objects = new MapSchema();
        this.phase = "playing";
    }
}
type({ map: StarboardObject })(StarboardState.prototype, "objects");
