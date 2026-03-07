import { Room } from "colyseus";
import { AsteroidBattleState, Player, Asteroid, Bullet } from "../schema/AsteroidBattleState.mjs";

const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 700;
const PLAYER_SPEED = 6.5; // Significantly increased speed
const BULLET_SPEED = 12; // Also faster bullets to match
const ASTEROID_SPAWN_INTERVAL = 2000; // slightly faster spawn
const MAX_ASTEROIDS = 18;
const INITIAL_LIVES = 3;

export class AsteroidBattleRoom extends Room {
    onCreate(options) {
        this.setState(new AsteroidBattleState());
        this.maxClients = 20;

        // Message handlers
        this.onMessage("join_game", (client, options) => {
            if (this.state.players.size >= 4) return;
            if (this.state.players.has(client.sessionId)) return;

            const player = new Player().assign({
                id: client.sessionId,
                name: options.name || "Pilot",
                x: Math.random() * WORLD_WIDTH,
                y: Math.random() * WORLD_HEIGHT,
                rotation: 0,
                hp: 100,
                score: 0,
                color: options.color || "#0ea5e9",
                lives: INITIAL_LIVES
            });
            this.state.players.set(client.sessionId, player);

            // Auto start game if it was lobby
            if (this.state.gameStatus === "lobby") {
                this.state.gameStatus = "playing";
                this.state.timeLeft = 300; // 5 minutes
            }
        });

        this.onMessage("input", (client, message) => {
            if (this.state.gameStatus !== "playing") return;
            const player = this.state.players.get(client.sessionId);
            if (!player || player.hp <= 0 || player.lives <= 0) return;

            const { keys, rotation } = message;
            player.rotation = rotation;

            let dx = 0;
            let dy = 0;
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
            if (this.state.gameStatus !== "playing") return;
            const player = this.state.players.get(client.sessionId);
            if (!player || player.hp <= 0 || player.lives <= 0) return;

            const bulletId = `b_${client.sessionId}_${Date.now()}`;
            const vx = Math.cos(player.rotation) * BULLET_SPEED;
            const vy = Math.sin(player.rotation) * BULLET_SPEED;

            const bullet = new Bullet().assign({
                id: bulletId,
                userId: client.sessionId,
                x: player.x,
                y: player.y,
                vx,
                vy
            });
            this.state.bullets.push(bullet);
        });

        // Simulation Loop
        this.setSimulationInterval((deltaTime) => this.update(deltaTime), 16);

        // Timer Interval
        this.clock.setInterval(() => {
            if (this.state.gameStatus === "playing") {
                this.state.timeLeft--;
                if (this.state.timeLeft <= 0) {
                    this.state.gameStatus = "finished";
                }
            }
        }, 1000);

        // Spawn Interval
        this.clock.setInterval(() => {
            if (this.state.gameStatus === "playing") {
                this.spawnAsteroid();
            }
        }, ASTEROID_SPAWN_INTERVAL);
    }

    onJoin(client, options) {
        console.log(`[AsteroidBattle] Client connected: ${client.sessionId}`);
    }

    onLeave(client) {
        this.state.players.delete(client.sessionId);
        if (this.state.players.size === 0) {
            this.state.gameStatus = "lobby";
            this.state.timeLeft = 300;
        }
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

        const asteroid = new Asteroid().assign({
            id, x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 3,
            hp: 60
        });
        this.state.asteroids.set(id, asteroid);
    }

    update(deltaTime) {
        if (this.state.gameStatus !== "playing") return;

        // 1. Asteroids
        this.state.asteroids.forEach((ast) => {
            ast.x += ast.vx;
            ast.y += ast.vy;
            ast.x = (ast.x + WORLD_WIDTH) % WORLD_WIDTH;
            ast.y = (ast.y + WORLD_HEIGHT) % WORLD_HEIGHT;
        });

        // 2. Bullets
        for (let i = this.state.bullets.length - 1; i >= 0; i--) {
            const b = this.state.bullets[i];
            b.x += b.vx;
            b.y += b.vy;

            if (b.x < -50 || b.x > WORLD_WIDTH + 50 || b.y < -50 || b.y > WORLD_HEIGHT + 50) {
                this.state.bullets.splice(i, 1);
                continue;
            }

            let hit = false;
            this.state.asteroids.forEach((ast, astId) => {
                if (hit) return;
                const radius = ast.size * 20;
                const distSq = (b.x - ast.x) ** 2 + (b.y - ast.y) ** 2;
                if (distSq < radius * radius) {
                    ast.hp -= 20;
                    this.state.bullets.splice(i, 1);
                    hit = true;
                    if (ast.hp <= 0) {
                        const shooter = this.state.players.get(b.userId);
                        if (shooter) shooter.score += ast.size * 50;
                        this.destroyAsteroid(astId);
                    }
                }
            });

            if (!hit) {
                this.state.players.forEach((p, sid) => {
                    if (hit || sid === b.userId || p.hp <= 0 || p.lives <= 0) return;
                    const distSq = (b.x - p.x) ** 2 + (b.y - p.y) ** 2;
                    if (distSq < 400) {
                        p.hp -= 20; // more damage for faster pace
                        this.state.bullets.splice(i, 1);
                        hit = true;
                        if (p.hp <= 0) {
                            const shooter = this.state.players.get(b.userId);
                            if (shooter) shooter.score += 500;
                            this.handlePlayerDeath(sid);
                        }
                    }
                });
            }
        }

        // 3. Player vs Asteroid
        this.state.players.forEach((p, sid) => {
            if (p.hp <= 0 || p.lives <= 0) return;
            this.state.asteroids.forEach((ast) => {
                const radius = ast.size * 20 + 15;
                const distSq = (p.x - ast.x) ** 2 + (p.y - ast.y) ** 2;
                if (distSq < radius * radius) {
                    p.hp -= 1.5; // continuous collision damage
                    if (p.hp <= 0) this.handlePlayerDeath(sid);
                }
            });
        });
    }

    handlePlayerDeath(sid) {
        const p = this.state.players.get(sid);
        if (p && p.lives > 0) {
            p.lives--;
            p.hp = 0;
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
                const angle = Math.random() * Math.PI * 2;
                const speed = 1.5 + Math.random() * 2;
                const sub = new Asteroid().assign({
                    id: sid, x: ast.x, y: ast.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: ast.size - 1,
                    hp: 20
                });
                this.state.asteroids.set(sid, sub);
            }
        }
        this.state.asteroids.delete(id);
    }
}
