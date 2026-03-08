import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import { BaseGameState, Player as BasePlayer } from "./BaseGameState.mjs";

export class TetrisPlayer extends BasePlayer {
    @type(["number"]) board = new ArraySchema(); // 1D array representing 10x20 board (rows*10 + col)
    @type("number") score = 0;
    @type("number") linesCleared = 0;
    @type("number") level = 1;
    @type("string") currentPieceType = "";
    @type("string") nextPieceType = "";
    @type("number") garbageLinesQueue = 0; // Lines to be added on next move
}

export class TetrisState extends BaseGameState {
    @type({ map: TetrisPlayer }) players = new MapSchema();

    // Global duel config
    @type("number") boardWidth = 10;
    @type("number") boardHeight = 20;

    constructor() {
        super();
    }
}
