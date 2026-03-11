import { Schema, MapSchema, type } from "@colyseus/schema";
import { BaseGameState, Player } from "./BaseGameState.mjs";

export class Piece extends Schema {
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
        this.isLocked = false;
        this.heldBy = "";
        this.lastGrabTime = 0; // Track last grab time for conflict resolution
    }
}
type("string")(Piece.prototype, "id");
type("number")(Piece.prototype, "x");
type("number")(Piece.prototype, "y");
type("number")(Piece.prototype, "rotation");
type("number")(Piece.prototype, "targetX");
type("number")(Piece.prototype, "targetY");
type("number")(Piece.prototype, "width");
type("number")(Piece.prototype, "height");
type("boolean")(Piece.prototype, "isLocked");
type("string")(Piece.prototype, "heldBy");
type("number")(Piece.prototype, "lastGrabTime");

export class PuzzleState extends BaseGameState {
    constructor() {
        super();
        this.imageUri = "";
        this.rows = 0;
        this.cols = 0;
        this.pieces = new MapSchema();
        this.progress = 0;
        this.isCompleted = false;
        this.startTime = 0;
        this.completeTime = 0;
    }
}
type("string")(PuzzleState.prototype, "imageUri");
type("number")(PuzzleState.prototype, "rows");
type("number")(PuzzleState.prototype, "cols");
type({ map: Piece })(PuzzleState.prototype, "pieces");
type("number")(PuzzleState.prototype, "progress");
type("boolean")(PuzzleState.prototype, "isCompleted");
type("number")(PuzzleState.prototype, "startTime");
type("number")(PuzzleState.prototype, "completeTime");
