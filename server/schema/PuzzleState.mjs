import { Schema, MapSchema, type } from "@colyseus/schema";
import { BaseGameState, Player as BasePlayer } from "./BaseGameState.mjs";

export class Piece extends Schema {
    @type("string") id;
    @type("number") x;
    @type("number") y;
    @type("number") rotation;
    @type("number") targetX;
    @type("number") targetY;
    @type("number") width;
    @type("number") height;
    @type("boolean") isLocked = false;
    @type("string") heldBy = "";

    constructor(id, targetX, targetY, width, height) {
        super();
        this.id = id;
        this.targetX = targetX;
        this.targetY = targetY;
        this.width = width;
        this.height = height;
        this.x = Math.random() * 500;
        this.y = Math.random() * 400;
        this.rotation = Math.floor(Math.random() * 4) * 90;
    }
}

export class Player extends BasePlayer {
    // inherits userId, username, avatar
}

export class PuzzleState extends BaseGameState {
    @type("string") imageUri = "";
    @type("number") rows = 0;
    @type("number") cols = 0;
    @type({ map: Piece }) pieces = new MapSchema();
    // players inherited from BaseGameState
    @type("number") progress = 0;
    @type("boolean") isCompleted = false;
    @type("number") startTime = 0;
    @type("number") completeTime = 0;
    @type("string") hostId = "";
}
