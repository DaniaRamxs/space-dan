import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import { BaseGameState, Player as BasePlayer } from "./BaseGameState.mjs";

export class Bullet extends Schema { }
type("string")(Bullet.prototype, "id");
type("string")(Bullet.prototype, "userId");
type("number")(Bullet.prototype, "x");
type("number")(Bullet.prototype, "y");
type("number")(Bullet.prototype, "vx");
type("number")(Bullet.prototype, "vy");

export class Asteroid extends Schema { }
type("string")(Asteroid.prototype, "id");
type("number")(Asteroid.prototype, "x");
type("number")(Asteroid.prototype, "y");
type("number")(Asteroid.prototype, "vx");
type("number")(Asteroid.prototype, "vy");
type("number")(Asteroid.prototype, "size");
type("number")(Asteroid.prototype, "hp");

export class AsteroidPlayer extends BasePlayer {
    constructor() {
        super();
        this.hp = 100;
        this.lives = 3;
        this.x = 0;
        this.y = 0;
        this.rotation = 0;
    }
}
type("number")(AsteroidPlayer.prototype, "hp");
type("number")(AsteroidPlayer.prototype, "lives");
type("number")(AsteroidPlayer.prototype, "x");
type("number")(AsteroidPlayer.prototype, "y");
type("number")(AsteroidPlayer.prototype, "rotation");

export class AsteroidBattleState extends BaseGameState {
    constructor() {
        super();
        this.timeLeft = 300;
        this.asteroids = new MapSchema();
        this.bullets = new ArraySchema();
    }
}
type("number")(AsteroidBattleState.prototype, "timeLeft");
type({ map: Asteroid })(AsteroidBattleState.prototype, "asteroids");
type([Bullet])(AsteroidBattleState.prototype, "bullets");
