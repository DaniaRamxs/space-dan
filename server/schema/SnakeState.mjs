import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import { BaseGameState, Player as BasePlayer } from "./BaseGameState.mjs";

export class Coordinate extends Schema { }
type("number")(Coordinate.prototype, "x");
type("number")(Coordinate.prototype, "y");

export class SnakePlayer extends BasePlayer {
    constructor() {
        super();
        this.segments = new ArraySchema();
        this.direction = "right";
        this.isDead = false;
        this.speed = 1;
    }
}
type([Coordinate])(SnakePlayer.prototype, "segments");
type("string")(SnakePlayer.prototype, "direction");
type("boolean")(SnakePlayer.prototype, "isDead");
type("number")(SnakePlayer.prototype, "speed");

export class SnakeState extends BaseGameState {
    constructor() {
        super();
        this.apple = new Coordinate();
        this.apple.x = 20;
        this.apple.y = 20;
        this.width = 40;
        this.height = 40;
    }
}
type(Coordinate)(SnakeState.prototype, "apple");
type("number")(SnakeState.prototype, "width");
type("number")(SnakeState.prototype, "height");
