import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import { BaseGameState, Player as BasePlayer } from "./BaseGameState.mjs";

/* ===============================
   BULLET
================================ */

export class Bullet extends Schema {
    constructor() {
        super();

        this.id = "";
        this.userId = "";

        this.x = 0;
        this.y = 0;

        this.vx = 0;
        this.vy = 0;
    }
}

type("string")(Bullet.prototype, "id");
type("string")(Bullet.prototype, "userId");

type("number")(Bullet.prototype, "x");
type("number")(Bullet.prototype, "y");

type("number")(Bullet.prototype, "vx");
type("number")(Bullet.prototype, "vy");


/* ===============================
   ASTEROID
================================ */

export class Asteroid extends Schema {
    constructor() {
        super();

        this.id = "";

        this.x = 0;
        this.y = 0;

        this.vx = 0;
        this.vy = 0;

        this.size = 1;
        this.hp = 1;
    }
}

type("string")(Asteroid.prototype, "id");

type("number")(Asteroid.prototype, "x");
type("number")(Asteroid.prototype, "y");

type("number")(Asteroid.prototype, "vx");
type("number")(Asteroid.prototype, "vy");

type("number")(Asteroid.prototype, "size");
type("number")(Asteroid.prototype, "hp");


/* ===============================
   PLAYER
================================ */

export class AsteroidPlayer extends BasePlayer {
    constructor() {
        super();

        this.hp = 100;
        this.lives = 3;

        this.x = Math.random() * 800;
        this.y = Math.random() * 600;

        this.rotation = 0;
    }
}

type("number")(AsteroidPlayer.prototype, "hp");
type("number")(AsteroidPlayer.prototype, "lives");

type("number")(AsteroidPlayer.prototype, "x");
type("number")(AsteroidPlayer.prototype, "y");

type("number")(AsteroidPlayer.prototype, "rotation");


/* ===============================
   GAME STATE
================================ */

export class AsteroidBattleState extends BaseGameState {
    constructor() {
        super();

        this.timeLeft = 300;

        // asteroides activos
        this.asteroids = new MapSchema();

        // balas activas
        this.bullets = new ArraySchema();
    }
}

type("number")(AsteroidBattleState.prototype, "timeLeft");

type({ map: Asteroid })(AsteroidBattleState.prototype, "asteroids");

type([Bullet])(AsteroidBattleState.prototype, "bullets");