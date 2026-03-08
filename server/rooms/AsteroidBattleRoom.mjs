import GameRoom from "./GameRoom.mjs";
import { AsteroidBattleState, AsteroidPlayer, Asteroid, Bullet } from "../schema/AsteroidBattleState.mjs";

const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 700;
const PLAYER_SPEED = 6.5;
const BULLET_SPEED = 12;
const ASTEROID_SPAWN_INTERVAL = 2000;
const MAX_ASTEROIDS = 18;
const INITIAL_LIVES = 3;

export class AsteroidBattleRoom extends GameRoom {
    maxPlayers = 4;

    createPlayer() { return new AsteroidPlayer(); }

    initializeGame(options) {
        this.setState(new AsteroidBattleState());

        this.onMessage("join_game", (client, options) => {
            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            player.color = options.color || "#0ea5e9";
            player.x = Math.random() * WORLD_WIDTH;
            player.y = Math.random() * WORLD_HEIGHT;
            player.hp = 100;
            player.lives = INITIAL_LIVES;
            player.score = 0;

            if (this.state.phase === "waiting" && this.state.players.size >= 2) {
                this.startCountdown();
            }
        });

        this.onMessage("input", (client, message) => {
            if (this.state.phase !== "playing") return;
            const player = this.state.players.get(client.sessionId);
            if (!player || player.hp <= 0 || player.lives <= 0) return;

            const { keys, rotation } = message;
            player.rotation = rotation;

            let dx = 0, dy = 0;
            if (keys.w) dy -= 1;
            if (keys.s) dy += 1;
            if (keys.a) dx -= 1;
            if (keys.d) dx += 1;

            if (dx !== 0 || dy !== 0) {
                const mag = Math.sqrt(dx * dx + dy * dy);
                player.x += (dx / mag) * PLAYER_SPEED;
                player.y += (dy / mag) * PLAYER_SPEED;
            }

            player.x = (player.x + WORLD_WIDTH) % WORLD_WIDTH;
            player.y = (player.y + WORLD_HEIGHT) % WORLD_HEIGHT;
        });

        this.onMessage("shoot", (client) => {
            if (this.state.phase !== "playing") return;
            const player = this.state.players.get(client.sessionId);
            if (!player || player.hp <= 0 || player.lives <= 0) return;

            const bullet = new Bullet();
            bullet.id = `b_${client.sessionId}_${Date.now()}`;
            bullet.userId = client.sessionId;
            bullet.x = player.x;
            bullet.y = player.y;
            bullet.vx = Math.cos(player.rotation) * BULLET_SPEED;
            bullet.vy = Math.sin(player.rotation) * BULLET_SPEED;
            this.state.bullets.push(bullet);
        });

        this.setSimulationInterval((dt) => this.update(dt), 16);

        this.clock.setInterval(() => {
            if (this.state.phase === "playing") {
                this.state.timeLeft--;
                if (this.state.timeLeft <= 0) this.endGame(this.getHighestScorer());
            }
        }, 1000);

        this.clock.setInterval(() => {
            if (this.state.phase === "playing") this.spawnAsteroid();
        }, ASTEROID_SPAWN_INTERVAL);
    }

    getHighestScorer() {
        let top = null;
        this.state.players.forEach(p => {
            if (!top || p.score > top.score) top = p;
        });
        return top ? top.userId : "None";
    }

    onResetGame() {
        this.state.asteroids.clear();
        this.state.bullets.clear();
        this.state.timeLeft = 300;
        this.state.players.forEach(p => {
            p.hp = 100;
            p.lives = INITIAL_LIVES;
            p.score = 0;
            p.x = Math.random() * WORLD_WIDTH;
            p.y = Math.random() * WORLD_HEIGHT;
        });
    }

    spawnAsteroid() {
        if (this.state.asteroids.size >= MAX_ASTEROIDS) return;
        const id = `ast_${Date.now()}`;
        const side = Math.floor(Math.random() * 4);
        let x, y;
        if (side === 0) { x = 0; y = Math.random() * WORLD_HEIGHT; }
        else if (side === 1) { x = WORLD_WIDTH; y = Math.random() * WORLD_HEIGHT; }
        else if (side === 2) { x = Math.random() * WORLD_WIDTH; y = 0; }
        else { x = Math.random() * WORLD_WIDTH; y = WORLD_HEIGHT; }

        const angle = Math.random() * Math.PI * 2;
        const speed = 0.8 + Math.random() * 1.8;

        const asteroid = new Asteroid();
        asteroid.id = id;
        asteroid.x = x;
        asteroid.y = y;
        asteroid.vx = Math.cos(angle) * speed;
        asteroid.vy = Math.sin(angle) * speed;
        asteroid.size = 3;
        asteroid.hp = 60;
        this.state.asteroids.set(id, asteroid);
    }

    update(dt) {
        if (this.state.phase !== "playing") return;

        this.state.asteroids.forEach(ast => {
            ast.x += ast.vx; ast.y += ast.vy;
            ast.x = (ast.x + WORLD_WIDTH) % WORLD_WIDTH;
            ast.y = (ast.y + WORLD_HEIGHT) % WORLD_HEIGHT;
        });

        for (let i = this.state.bullets.length - 1; i >= 0; i--) {
            const b = this.state.bullets[i];
            b.x += b.vx; b.y += b.vy;

            if (b.x < -50 || b.x > WORLD_WIDTH + 50 || b.y < -50 || b.y > WORLD_HEIGHT + 50) {
                this.state.bullets.splice(i, 1); continue;
            }

            let hit = false;
            this.state.asteroids.forEach((ast, id) => {
                if (hit) return;
                const radius = ast.size * 20;
                if (Math.hypot(b.x - ast.x, b.y - ast.y) < radius) {
                    ast.hp -= 20; this.state.bullets.splice(i, 1); hit = true;
                    if (ast.hp <= 0) {
                        const s = this.state.players.get(b.userId);
                        if (s) s.score += ast.size * 50;
                        this.destroyAsteroid(id);
                    }
                }
            });

            if (!hit) {
                this.state.players.forEach((p, sid) => {
                    if (hit || sid === b.userId || p.hp <= 0 || p.lives <= 0) return;
                    if (Math.hypot(b.x - p.x, b.y - p.y) < 20) {
                        p.hp -= 20; this.state.bullets.splice(i, 1); hit = true;
                        if (p.hp <= 0) {
                            const s = this.state.players.get(b.userId);
                            if (s) s.score += 500;
                            this.handlePlayerDeath(sid);
                        }
                    }
                });
            }
        }

        this.state.players.forEach((p, sid) => {
            if (p.hp <= 0 || p.lives <= 0) return;
            this.state.asteroids.forEach(ast => {
                if (Math.hypot(p.x - ast.x, p.y - ast.y) < (ast.size * 20 + 15)) {
                    p.hp -= 1.5;
                    if (p.hp <= 0) this.handlePlayerDeath(sid);
                }
            });
        });
    }

    handlePlayerDeath(sid) {
        const p = this.state.players.get(sid);
        if (p && p.lives > 0) {
            p.lives--; p.hp = 0;
            if (p.lives > 0) {
                this.clock.setTimeout(() => {
                    if (this.state.players.has(sid)) {
                        const ply = this.state.players.get(sid);
                        ply.hp = 100;
                        ply.x = Math.random() * WORLD_WIDTH;
                        ply.y = Math.random() * WORLD_HEIGHT;
                    }
                }, 3000);
            }
        }
    }

    destroyAsteroid(id) {
        const ast = this.state.asteroids.get(id);
        if (ast && ast.size > 1) {
            for (let i = 0; i < 2; i++) {
                const sid = `${id}_sub_${Date.now()}_${i}`;
                const sub = new Asteroid();
                sub.id = sid; sub.x = ast.x; sub.y = ast.y;
                const angle = Math.random() * Math.PI * 2;
                const speed = 1.5 + Math.random() * 2;
                sub.vx = Math.cos(angle) * speed;
                sub.vy = Math.sin(angle) * speed;
                sub.size = ast.size - 1; sub.hp = 20;
                this.state.asteroids.set(sid, sub);
            }
        }
        this.state.asteroids.delete(id);
    }
}
