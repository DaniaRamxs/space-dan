import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import { BaseGameState, Player } from "./BaseGameState.mjs";

export class TetrisPlayer extends Player {
    constructor() {
        super();
        this.slot = 0;
    }
}
type("number")(TetrisPlayer.prototype, "slot");

export class TetrisDuelState extends BaseGameState {
    constructor() {
        super();
        this.p1 = "";
        this.p2 = "";

        this.board1 = new ArraySchema();
        this.board2 = new ArraySchema();

        for (let i = 0; i < 200; i++) {
            this.board1.push("0");
            this.board2.push("0");
        }

        this.p1Piece = new MapSchema();
        this.p2Piece = new MapSchema();
    }
}
type("string")(TetrisDuelState.prototype, "p1");
type("string")(TetrisDuelState.prototype, "p2");
type(["string"])(TetrisDuelState.prototype, "board1");
type(["string"])(TetrisDuelState.prototype, "board2");
type({ map: "number" })(TetrisDuelState.prototype, "p1Piece");
type({ map: "number" })(TetrisDuelState.prototype, "p2Piece");

// Note: BaseGameState already defines phase, players, countdown, winner, etc.
