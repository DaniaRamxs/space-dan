import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import { BaseGameState, Player as BasePlayer } from "./BaseGameState.mjs";

export class Connect4Player extends BasePlayer { }
type("number")(Connect4Player.prototype, "colorIndex");

export class Connect4State extends BaseGameState {
    constructor() {
        super();
        this.board = new ArraySchema();
        for (let i = 0; i < 42; i++) this.board.push(0);
        this.currentTurnSid = "";
        this.p1 = "";
        this.p2 = "";
    }
}
type(["number"])(Connect4State.prototype, "board");
type("string")(Connect4State.prototype, "currentTurnSid");
type("string")(Connect4State.prototype, "p1");
type("string")(Connect4State.prototype, "p2");
