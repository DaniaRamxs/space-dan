import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import { BaseGameState, Player as BasePlayer } from "./BaseGameState.mjs";

export class Card extends Schema {
    @type("string") suit;
    @type("string") rank;
    @type("number") value;
    @type("boolean") isHidden = false;
}

export class Player extends BasePlayer {
    @type([Card]) cards = new ArraySchema();
    // score and status are in BasePlayer/subclass, but let's specialize
    @type("number") score = 0;
    @type("number") bet = 0;
    @type("string") status = "waiting"; // waiting, betting, playing, bust, stay, win, lose, draw
    @type("number") roundWins = 0;
    @type("string") dbId; // This is the userId from base
}

export class BlackjackState extends BaseGameState {
    @type(Player) dealer = new Player();
    @type("string") currentTurn = "";
    @type("number") roundsPlayed = 0;
    @type("number") maxRounds = 10;
    @type("number") pot = 0;

    constructor() {
        super();
        this.dealer.username = "Dealer";
        this.dealer.avatar = "/dealer-avatar.png";
        this.dealer.userId = "dealer";
    }
}
