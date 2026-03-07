import { Schema, defineTypes, ArraySchema, MapSchema } from "@colyseus/schema";

export class Connect4Player extends Schema {
    constructor(id, name, avatar, slot) {
        super();
        this.id = id;
        this.name = name;
        this.avatar = avatar;
        this.slot = slot; // 1 or 2
    }
}
defineTypes(Connect4Player, {
    id: "string",
    name: "string",
    avatar: "string",
    slot: "number"
});

export class Connect4State extends Schema {
    constructor() {
        super();
        this.gameState = "lobby"; // lobby, playing, finished
        this.board = new ArraySchema();
        // Initialize 7 columns * 6 rows = 42 cells as a flat array
        for (let i = 0; i < 42; i++) {
            this.board.push(0);
        }
        this.players = new MapSchema();
        this.currentTurn = ""; // sessionId of the player whose turn it is
        this.p1 = ""; // sessionId of player 1
        this.p2 = ""; // sessionId of player 2
        this.winner = 0; // 0: none, 1: p1, 2: p2, 3: draw
    }
}
defineTypes(Connect4State, {
    gameState: "string",
    board: ["number"],
    players: { map: Connect4Player },
    currentTurn: "string",
    p1: "string",
    p2: "string",
    winner: "number"
});
