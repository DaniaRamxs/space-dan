import { Schema, defineTypes, ArraySchema, MapSchema } from "@colyseus/schema";

// ─── ChessPlayer ──────────────────────────────────────────────────────────────
export class ChessPlayer extends Schema {
    constructor(id, name, avatar, color) {
        super();
        this.id      = id;
        this.name    = name;
        this.avatar  = avatar;
        this.color   = color;   // "white" | "black" | "spectator"
        this.timeLeft = 0;      // seconds (only used when clockMode != "none")
    }
}
defineTypes(ChessPlayer, {
    id:       "string",
    name:     "string",
    avatar:   "string",
    color:    "string",
    timeLeft: "number"
});

// ─── ChessState ───────────────────────────────────────────────────────────────
export class ChessState extends Schema {
    constructor() {
        super();
        this.gameState   = "waiting";  // waiting | playing | finished
        this.fen         = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        this.turn        = "w";        // "w" | "b"
        this.white       = "";         // sessionId of white player
        this.black       = "";         // sessionId of black player
        this.players     = new MapSchema();
        this.lastFrom    = "";
        this.lastTo      = "";
        this.winner      = "";         // "" | "white" | "black" | "draw"
        this.endReason   = "";         // checkmate | stalemate | resign | timeout | abandoned | repetition | insufficient_material | fifty_moves
        this.whiteTime   = 0;          // seconds
        this.blackTime   = 0;          // seconds
        this.clockMode   = "none";     // "none" | "1" | "3" | "5" | "10"
        this.moveCount   = 0;
        this.inCheck     = false;
        this.moveHistory = new ArraySchema(); // SAN notation per move
    }
}
defineTypes(ChessState, {
    gameState:   "string",
    fen:         "string",
    turn:        "string",
    white:       "string",
    black:       "string",
    players:     { map: ChessPlayer },
    lastFrom:    "string",
    lastTo:      "string",
    winner:      "string",
    endReason:   "string",
    whiteTime:   "number",
    blackTime:   "number",
    clockMode:   "string",
    moveCount:   "number",
    inCheck:     "boolean",
    moveHistory: ["string"]
});
