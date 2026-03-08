import { Schema, defineTypes, ArraySchema, MapSchema } from "@colyseus/schema";

export class Piece extends Schema {
    constructor(id, color, index) {
        super();
        this.id = id;
        this.color = color;
        this.index = index;
        this.position = -1; // -1 = Base
        this.status = "base"; // base, path, home, finished
    }
}

defineTypes(Piece, {
    id: "string",
    color: "string",
    index: "number",
    position: "number",
    status: "string"
});

export class Player extends Schema {
    constructor(id, name, avatar, color) {
        super();
        this.id = id;
        this.name = name;
        this.avatar = avatar;
        this.color = color;
        this.pieces = new ArraySchema();
        for (let i = 0; i < 4; i++) {
            this.pieces.push(new Piece(`${color}_${i}`, color, i));
        }
    }
}

defineTypes(Player, {
    id: "string",
    name: "string",
    avatar: "string",
    color: "string",
    pieces: [Piece]
});

export class LudoState extends Schema {
    constructor() {
        super();
        this.players = new MapSchema();
        this.currentTurn = ""; // sessionId
        this.diceValue = 0;
        this.gameState = "waiting"; // waiting, playing, finished
        this.winners = new ArraySchema();
        this.lastRollWasSix = false;
        this.waitingForMove = false;
        this.turnOrder = new ArraySchema(); // sessionId list
    }
}

defineTypes(LudoState, {
    players: { map: Player },
    currentTurn: "string",
    diceValue: "number",
    gameState: "string",
    winners: ["string"],
    lastRollWasSix: "boolean",
    waitingForMove: "boolean",
    turnOrder: ["string"]
});
