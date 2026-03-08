import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import { BaseGameState, Player as BasePlayer } from "./BaseGameState.mjs";

export class Coordinate extends Schema {
    @type("number") x;
    @type("number") y;
}

export class SnakePlayer extends BasePlayer {
    @type([Coordinate]) segments = new ArraySchema();
    @type("string") direction = "right";
    @type("boolean") isDead = false;
    @type("number") speed = 1;
}

export class SnakeState extends BaseGameState {
    @type({ map: SnakePlayer }) players = new MapSchema();
    @type(Coordinate) apple = new Coordinate();

    @type("number") width = 40;
    @type("number") height = 40;

    constructor() {
        super();
        this.apple.x = 20;
        this.apple.y = 20;
    }
}
