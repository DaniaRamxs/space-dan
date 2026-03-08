import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import { BaseGameState, Player as BasePlayer } from "./BaseGameState.mjs";

export class PokerCard extends Schema { }
type("string")(PokerCard.prototype, "v");
type("string")(PokerCard.prototype, "s");

export class PokerPlayer extends BasePlayer {
    constructor() {
        super();
        this.stack = 500;
        this.bet = 0;
        this.folded = false;
        this.cards = new ArraySchema();
    }
}
type("number")(PokerPlayer.prototype, "seatIdx");
type("number")(PokerPlayer.prototype, "stack");
type("number")(PokerPlayer.prototype, "bet");
type("boolean")(PokerPlayer.prototype, "folded");
type([PokerCard])(PokerPlayer.prototype, "cards");

export class PokerState extends BaseGameState {
    constructor() {
        super();
        this.seats = new ArraySchema();
        for (let i = 0; i < 8; i++) this.seats.push("");
        this.pot = 0;
        this.communityCards = new ArraySchema();
        this.currentTurnIdx = -1;
        this.lastAction = "";
        this.bettingRound = 0;
        this.winnerMessage = "";
    }
}
type(["string"])(PokerState.prototype, "seats");
type("number")(PokerState.prototype, "pot");
type([PokerCard])(PokerState.prototype, "communityCards");
type("number")(PokerState.prototype, "currentTurnIdx");
type("string")(PokerState.prototype, "lastAction");
type("number")(PokerState.prototype, "bettingRound");
type("string")(PokerState.prototype, "winnerMessage");
