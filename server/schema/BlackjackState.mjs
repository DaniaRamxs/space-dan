import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import { BaseGameState, Player as BasePlayer } from "./BaseGameState.mjs";

export class Card extends Schema {
    constructor() {
        super();
        this.isHidden = false;
    }
}
type("string")(Card.prototype, "suit");
type("string")(Card.prototype, "rank");
type("number")(Card.prototype, "value");
type("boolean")(Card.prototype, "isHidden");

export class Player extends BasePlayer {
    constructor() {
        super();
        this.cards = new ArraySchema();
        this.score = 0;
        this.bet = 0;
        this.status = "waiting";
        this.roundWins = 0;
    }
}
type([Card])(Player.prototype, "cards");
type("number")(Player.prototype, "bet");
type("string")(Player.prototype, "status");
type("number")(Player.prototype, "roundWins");
type("string")(Player.prototype, "dbId");

export class BlackjackState extends BaseGameState {
    constructor() {
        super();
        this.dealer = new Player();
        this.dealer.username = "Dealer";
        this.dealer.avatar = "/dealer-avatar.png";
        this.dealer.userId = "dealer";
        this.currentTurn = "";
        this.roundsPlayed = 0;
        this.maxRounds = 10;
        this.pot = 0;
    }
}
type(Player)(BlackjackState.prototype, "dealer");
type("string")(BlackjackState.prototype, "currentTurn");
type("number")(BlackjackState.prototype, "roundsPlayed");
type("number")(BlackjackState.prototype, "maxRounds");
type("number")(BlackjackState.prototype, "pot");
