import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import { BaseGameState, Player as BasePlayer } from "./BaseGameState.mjs";

export class Piece extends Schema {
    constructor() {
        super();
        this.position = -1;
        this.status = "base";
    }
}
type("string")(Piece.prototype, "id");
type("string")(Piece.prototype, "color");
type("number")(Piece.prototype, "index");
type("number")(Piece.prototype, "position");
type("string")(Piece.prototype, "status");

export class Player extends BasePlayer {
    constructor() {
        super();
        this.pieces = new ArraySchema();
        this.isParticipating = false;
    }

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
type([Piece])(Player.prototype, "pieces");

export class LudoState extends BaseGameState {
    constructor() {
        super();
        this.currentTurn = "";
        this.diceValue = 0;
        this.winners = new ArraySchema();
        this.lastRollWasSix = false;
        this.waitingForMove = false;
        this.isRolling = false;
        this.turnOrder = new ArraySchema();
    }
}
type("string")(LudoState.prototype, "currentTurn");
type("number")(LudoState.prototype, "diceValue");
type(["string"])(LudoState.prototype, "winners");
type("boolean")(LudoState.prototype, "lastRollWasSix");
type("boolean")(LudoState.prototype, "waitingForMove");
type("boolean")(LudoState.prototype, "isRolling");
type(["string"])(LudoState.prototype, "turnOrder");
