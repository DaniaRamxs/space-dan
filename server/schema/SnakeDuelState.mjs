import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import { BaseGameState, Player } from "./BaseGameState.mjs";

export class Point extends Schema { }
type("number")(Point.prototype, "x");
type("number")(Point.prototype, "y");

export class SnakePlayer extends Player {
    constructor() {
        super();
        this.segments = new ArraySchema();
        this.slot = 0; // 1 or 2
    }
}
type([Point])(SnakePlayer.prototype, "segments");
type("number")(SnakePlayer.prototype, "slot");

export class SnakeDuelState extends BaseGameState {
    constructor() {
        super();
        this.p1 = ""; // sessionId
        this.p2 = ""; // sessionId

        this.direction1 = "RIGHT";
        this.direction2 = "LEFT";

        this.apple = new Point();
    }
}
type("string")(SnakeDuelState.prototype, "p1");
type("string")(SnakeDuelState.prototype, "p2");
type("string")(SnakeDuelState.prototype, "direction1");
type("string")(SnakeDuelState.prototype, "direction2");
type(Point)(SnakeDuelState.prototype, "apple");

// Note: BaseGameState already defines phase, players, countdown, winner, etc.
