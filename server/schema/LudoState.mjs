import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import { BaseGameState, Player as BasePlayer } from "./BaseGameState.mjs";

export class Piece extends Schema {
    @type("string") id;
    @type("string") color;
    @type("number") index;
    @type("number") position = -1; // -1 = Base
    @type("string") status = "base"; // base, path, home, finished
}

export class Player extends BasePlayer {
    @type("string") color;
    @type([Piece]) pieces = new ArraySchema();

    // Initialize pieces when color is set
    initPieces() {
        this.pieces = new ArraySchema();
        for (let i = 0; i < 4; i++) {
            const p = new Piece();
            p.id = `${this.color}_${i}`;
            p.color = this.color;
            p.index = i;
            this.pieces.push(p);
        }
    }
}

export class LudoState extends BaseGameState {
    @type("string") currentTurn = "";
    @type("number") diceValue = 0;
    @type(["string"]) winners = new ArraySchema();
    @type("boolean") lastRollWasSix = false;
    @type("boolean") waitingForMove = false;
    @type(["string"]) turnOrder = new ArraySchema();
}
