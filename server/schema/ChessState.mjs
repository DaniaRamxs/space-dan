import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import { BaseGameState, Player as BasePlayer } from "./BaseGameState.mjs";

export class ChessPlayer extends BasePlayer { }
type("number")(ChessPlayer.prototype, "timeLeft");

export class ChessState extends BaseGameState {
    constructor() {
        super();
        this.fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        this.turn = "w";
        this.whiteSid = "";
        this.blackSid = "";
        this.lastFrom = "";
        this.lastTo = "";
        this.endReason = "";
        this.whiteTime = 0;
        this.blackTime = 0;
        this.clockMode = "none";
        this.moveCount = 0;
        this.inCheck = false;
        this.moveHistory = new ArraySchema();
    }
}
type("string")(ChessState.prototype, "fen");
type("string")(ChessState.prototype, "turn");
type("string")(ChessState.prototype, "whiteSid");
type("string")(ChessState.prototype, "blackSid");
type("string")(ChessState.prototype, "lastFrom");
type("string")(ChessState.prototype, "lastTo");
type("string")(ChessState.prototype, "endReason");
type("number")(ChessState.prototype, "whiteTime");
type("number")(ChessState.prototype, "blackTime");
type("string")(ChessState.prototype, "clockMode");
type("number")(ChessState.prototype, "moveCount");
type("boolean")(ChessState.prototype, "inCheck");
type(["string"])(ChessState.prototype, "moveHistory");
