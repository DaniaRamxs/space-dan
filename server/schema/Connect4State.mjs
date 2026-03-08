import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import { BaseGameState, Player as BasePlayer } from "./BaseGameState.mjs";

export class Connect4Player extends BasePlayer {
    @type("number") colorIndex; // 1 (Red), 2 (Yellow)
}

export class Connect4State extends BaseGameState {
    @type(["number"]) board = new ArraySchema(); // 42 slots (7x6)
    @type({ map: Connect4Player }) players = new MapSchema();
    @type("string") currentTurnSid = "";

    constructor() {
        super();
        for (let i = 0; i < 42; i++) this.board.push(0);
    }
}
