import GameRoom from "./GameRoom.mjs";
import { AsteroidBattleState, AsteroidPlayer, Asteroid, Bullet } from "../schema/AsteroidBattleState.mjs";

const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 700;

const PLAYER_SPEED = 6;
const BULLET_SPEED = 12;

const MAX_ASTEROIDS = 18;
const ASTEROID_SPAWN_INTERVAL = 2000;

export class AsteroidBattleRoom extends GameRoom {

    maxPlayers = 4;

    createPlayer() {
        return new AsteroidPlayer();
    }

    initializeGame() {

        this.setState(new AsteroidBattleState());

        /* =========================
           JOIN GAME
        ========================= */

        this.onMessage("join_game", (client, data) => {

            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            player.x = Math.random() * WORLD_WIDTH;
            player.y = Math.random() * WORLD_HEIGHT;

            player.hp = 100;
            player.lives = 3;
            player.score = 0;

            player.input = { w: false, a: false, s: false, d: false };

            if (this.state.phase === "waiting" && this.state.players.size >= 1) {
                this.setPhase("playing");
            }

        });

        /* =========================
           INPUT
        ========================= */

        this.onMessage("input", (client, data) => {

            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            player.input = data;

        });

        /* =========================
           SHOOT
        ========================= */

        this.onMessage("shoot", (client) => {

            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            const bullet = new Bullet();

            bullet.id = "b_" + Date.now();
            bullet.userId = client.sessionId;

            bullet.x = player.x;
            bullet.y = player.y;

            bullet.vx = Math.cos(player.rotation) * BULLET_SPEED;
            bullet.vy = Math.sin(player.rotation) * BULLET_SPEED;

            this.state.bullets.push(bullet);

        });

        /* =========================
           GAME LOOP
        ========================= */

        this.setSimulationInterval(() => this.update(), 1000 / 60);

        this.clock.setInterval(() => {
            if (this.state.phase === "playing") {
                this.spawnAsteroid();
            }
        }, ASTEROID_SPAWN_INTERVAL);

    }

    /* =========================
       GAME UPDATE
    ========================= */

    update() {

        if (this.state.phase !== "playing") return;

        /* PLAYER MOVEMENT */

        this.state.players.forEach(player => {

            const k = player.input;
            if (!k) return;

            let dx = 0;
            let dy = 0;

            if (k.w) dy -= 1;
            if (k.s) dy += 1;
            if (k.a) dx -= 1;
            if (k.d) dx += 1;

            if (dx !== 0 || dy !== 0) {

                const mag = Math.sqrt(dx * dx + dy * dy);

                player.x += (dx / mag) * PLAYER_SPEED;
                player.y += (dy / mag) * PLAYER_SPEED;

            }

            player.x = (player.x + WORLD_WIDTH) % WORLD_WIDTH;
            player.y = (player.y + WORLD_HEIGHT) % WORLD_HEIGHT;

        });

        /* BULLETS */

        for (let i = this.state.bullets.length - 1; i >= 0; i--) {

            const b = this.state.bullets[i];

            b.x += b.vx;
            b.y += b.vy;

            if (
                b.x < -50 ||
                b.x > WORLD_WIDTH + 50 ||
                b.y < -50 ||
                b.y > WORLD_HEIGHT + 50
            ) {
                this.state.bullets.splice(i, 1);
            }

        }

        /* ASTEROIDS */

        this.state.asteroids.forEach(ast => {

            ast.x += ast.vx;
            ast.y += ast.vy;

            ast.x = (ast.x + WORLD_WIDTH) % WORLD_WIDTH;
            ast.y = (ast.y + WORLD_HEIGHT) % WORLD_HEIGHT;

        });

    }

    /* =========================
       SPAWN ASTEROID
    ========================= */

    spawnAsteroid() {

        if (this.state.asteroids.size >= MAX_ASTEROIDS) return;

        const id = "ast_" + Date.now() + "_" + Math.random();

        const asteroid = new Asteroid();

        asteroid.id = id;

        asteroid.x = Math.random() * WORLD_WIDTH;
        asteroid.y = Math.random() * WORLD_HEIGHT;

        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;

        asteroid.vx = Math.cos(angle) * speed;
        asteroid.vy = Math.sin(angle) * speed;

        asteroid.size = 3;
        asteroid.hp = 60;

        this.state.asteroids.set(id, asteroid);

    }

}