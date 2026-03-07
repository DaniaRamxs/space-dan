import { Schema, defineTypes, MapSchema, ArraySchema } from "@colyseus/schema";

export class Bullet extends Schema { }
defineTypes(Bullet, {
    id: "string",
    userId: "string",
    x: "number",
    y: "number",
    vx: "number",
    vy: "number"
});

export class Asteroid extends Schema { }
defineTypes(Asteroid, {
    id: "string",
    x: "number",
    y: "number",
    vx: "number",
    vy: "number",
    size: "number",
    hp: "number"
});

export class Player extends Schema { }
defineTypes(Player, {
    id: "string",
    name: "string",
    x: "number",
    y: "number",
    rotation: "number",
    hp: "number",
    score: "number",
    color: "string",
    lives: "number"
});

export class AsteroidBattleState extends Schema {
    constructor() {
        super();
        this.players = new MapSchema();
        this.asteroids = new MapSchema();
        this.bullets = new ArraySchema();
        this.timeLeft = 300; // 5 minutes default
        this.gameStatus = "lobby"; // lobby, playing, finished
    }
}
defineTypes(AsteroidBattleState, {
    players: { map: Player },
    asteroids: { map: Asteroid },
    bullets: [Bullet],
    timeLeft: "number",
    gameStatus: "string"
});
