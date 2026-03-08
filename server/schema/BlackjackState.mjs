import { Schema, defineTypes, ArraySchema, MapSchema } from "@colyseus/schema";

export class Card extends Schema { }
defineTypes(Card, {
    suit: "string",
    rank: "string",
    value: "number",
    isHidden: "boolean"
});

export class Player extends Schema {
    constructor(id, name, avatar) {
        super();
        this.id = id;
        this.name = name;
        this.avatar = avatar;
        this.cards = new ArraySchema();
        this.score = 0;
        this.bet = 0;
        this.status = "waiting";
        this.roundWins = 0;
    }
}
defineTypes(Player, {
    id: "string",
    name: "string",
    avatar: "string",
    cards: [Card],
    score: "number",
    bet: "number",
    status: "string",
    roundWins: "number",
    dbId: "string"
});

export class BlackjackState extends Schema {
    constructor() {
        super();
        this.gameState = "waiting";
        this.dealer = new Player("dealer", "Dealer", "/dealer-avatar.png");
        this.players = new MapSchema();
        this.currentTurn = "";
        this.roundsPlayed = 0;
        this.maxRounds = 10;
        this.pot = 0;
    }
}
defineTypes(BlackjackState, {
    gameState: "string",
    dealer: Player,
    players: { map: Player },
    currentTurn: "string",
    roundsPlayed: "number",
    maxRounds: "number",
    pot: "number"
});
