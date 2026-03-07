import { Schema, defineTypes, ArraySchema, MapSchema } from "@colyseus/schema";

export class Point extends Schema { }
defineTypes(Point, {
    x: "number",
    y: "number"
});

export class SnakePlayer extends Schema {
    constructor(id, name, avatar, slot) {
        super();
        this.id = id;
        this.name = name;
        this.avatar = avatar;
        this.slot = slot; // 1 or 2
    }
}
defineTypes(SnakePlayer, {
    id: "string",
    name: "string",
    avatar: "string",
    slot: "number"
});

export class SnakeDuelState extends Schema {
    constructor() {
        super();
        this.gameState = "lobby"; // lobby, playing, finished
        this.players = new MapSchema();
        this.p1 = ""; // sessionId
        this.p2 = ""; // sessionId

        this.snake1 = new ArraySchema();
        this.snake2 = new ArraySchema();

        this.direction1 = "RIGHT";
        this.direction2 = "LEFT";

        this.winner = ""; // sessionId or "draw"
        this.countdown = -1;
    }
}
defineTypes(SnakeDuelState, {
    gameState: "string",
    players: { map: SnakePlayer },
    p1: "string",
    p2: "string",
    snake1: [Point],
    snake2: [Point],
    direction1: "string",
    direction2: "string",
    winner: "string",
    countdown: "number",
    food: Point
});
