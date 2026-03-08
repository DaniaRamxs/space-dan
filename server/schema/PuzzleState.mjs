import { Schema, defineTypes, MapSchema } from "@colyseus/schema";

export class Piece extends Schema {
    constructor(id, targetX, targetY, width, height) {
        super();
        this.id = id;
        this.targetX = targetX;
        this.targetY = targetY;
        this.width = width;
        this.height = height;
        this.x = Math.random() * 500; // Initial random position
        this.y = Math.random() * 400;
        this.rotation = Math.floor(Math.random() * 4) * 90; // 0, 90, 180, 270
        this.isLocked = false;
        this.heldBy = "";
    }
}

defineTypes(Piece, {
    id: "string",
    x: "number",
    y: "number",
    rotation: "number",
    targetX: "number",
    targetY: "number",
    width: "number",
    height: "number",
    isLocked: "boolean",
    heldBy: "string"
});

export class Player extends Schema {
    constructor(id, name, avatar) {
        super();
        this.id = id;
        this.name = name;
        this.avatar = avatar;
    }
}

defineTypes(Player, {
    id: "string",
    name: "string",
    avatar: "string"
});

export class PuzzleState extends Schema {
    constructor() {
        super();
        this.imageUri = "";
        this.rows = 0;
        this.cols = 0;
        this.pieces = new MapSchema();
        this.players = new MapSchema();
        this.progress = 0;
        this.isCompleted = false;
        this.startTime = 0;
        this.completeTime = 0;
        this.hostId = "";
    }
}

defineTypes(PuzzleState, {
    imageUri: "string",
    rows: "number",
    cols: "number",
    pieces: { map: Piece },
    players: { map: Player },
    progress: "number",
    isCompleted: "boolean",
    startTime: "number",
    completeTime: "number",
    hostId: "string"
});
