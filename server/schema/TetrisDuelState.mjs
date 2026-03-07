import { Schema, defineTypes, MapSchema, ArraySchema } from "@colyseus/schema";

export class TetrisPlayer extends Schema {
    constructor(id, name, avatar, slot) {
        super();
        this.id = id;
        this.name = name;
        this.avatar = avatar;
        this.slot = slot;
    }
}
defineTypes(TetrisPlayer, {
    id: "string",
    name: "string",
    avatar: "string",
    slot: "number"
});

export class TetrisDuelState extends Schema {
    constructor() {
        super();
        this.gameState = "lobby"; // lobby, playing, finished
        this.players = new MapSchema();
        this.p1 = "";
        this.p2 = "";

        this.board1 = new ArraySchema(); // Flat array for efficiency
        this.board2 = new ArraySchema();

        // Initialize boards
        for (let i = 0; i < 200; i++) {
            this.board1.push("0");
            this.board2.push("0");
        }

        this.winner = "";
        this.countdown = -1;

        // Piece Info (x, y, type, rotation)
        this.p1Piece = new MapSchema();
        this.p2Piece = new MapSchema();
    }
}
defineTypes(TetrisDuelState, {
    gameState: "string",
    players: { map: TetrisPlayer },
    p1: "string",
    p2: "string",
    board1: ["string"],
    board2: ["string"],
    winner: "string",
    countdown: "number",
    p1Piece: { map: "number" }, // x, y, typeIndex, rotation
    p2Piece: { map: "number" }
});
