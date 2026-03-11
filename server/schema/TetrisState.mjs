import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import { BaseGameState, Player as BasePlayer } from "./BaseGameState.mjs";

export class TetrisPlayer extends BasePlayer {
    constructor() {
        super();
        this.board = new ArraySchema();
        this.score = 0;
        this.linesCleared = 0;
        this.level = 1;
        this.currentPieceType = "";
        this.nextPieceType = "";
        this.garbageLinesQueue = 0;
    }
}
type(["number"])(TetrisPlayer.prototype, "board");
type("number")(TetrisPlayer.prototype, "linesCleared");
type("number")(TetrisPlayer.prototype, "level");
type("string")(TetrisPlayer.prototype, "currentPieceType");
type("string")(TetrisPlayer.prototype, "nextPieceType");
type("number")(TetrisPlayer.prototype, "garbageLinesQueue");

export class TetrisState extends BaseGameState {
    constructor() {
        super();
        this.boardWidth = 10;
        this.boardHeight = 20;
    }
}
type("number")(TetrisState.prototype, "boardWidth");
type("number")(TetrisState.prototype, "boardHeight");
