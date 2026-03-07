import { Schema, defineTypes, MapSchema, ArraySchema } from "@colyseus/schema";

export class PokerCard extends Schema {
    constructor(v = "", s = "") {
        super();
        this.v = v;
        this.s = s;
    }
}
defineTypes(PokerCard, {
    v: "string",
    s: "string"
});

export class PokerPlayer extends Schema {
    constructor(id, identity, name, avatar, seatIdx) {
        super();
        this.id = id;
        this.identity = identity;
        this.name = name;
        this.avatar = avatar;
        this.seatIdx = seatIdx;
        this.stack = 500;
        this.bet = 0;
        this.folded = false;
        this.cards = new ArraySchema();
    }
}
defineTypes(PokerPlayer, {
    id: "string",
    identity: "string",
    name: "string",
    avatar: "string",
    seatIdx: "number",
    stack: "number",
    bet: "number",
    folded: "boolean",
    cards: [PokerCard]
});

export class PokerState extends Schema {
    constructor() {
        super();
        this.gameState = "lobby"; // lobby, betting, showdown
        this.players = new MapSchema();
        this.seats = new ArraySchema(); // Array of sessionId strings or empty strings
        for (let i = 0; i < 8; i++) this.seats.push("");

        this.pot = 0;
        this.communityCards = new ArraySchema();
        this.currentTurn = -1; // seatIndex
        this.lastAction = "";
        this.bettingRound = 0; // 0=preflop, 1=flop, 2=turn, 3=river
        this.winnerMessage = "";
    }
}
defineTypes(PokerState, {
    gameState: "string",
    players: { map: PokerPlayer },
    seats: ["string"],
    pot: "number",
    communityCards: [PokerCard],
    currentTurn: "number",
    lastAction: "string",
    bettingRound: "number",
    winnerMessage: "string"
});
