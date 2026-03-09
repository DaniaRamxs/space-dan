import GameRoom from "./GameRoom.mjs";
import { AsteroidBattleState, AsteroidPlayer, Asteroid, Bullet } from "../schema/AsteroidBattleState.mjs";
import { supabase } from "../supabaseClient.mjs";

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

    async persistScores() {
        if (!supabase) return;

        const players = Array.from(this.state.players.values())
            .filter(p => p.isParticipating && p.score > 0);

        if (players.length === 0) return;

        try {
            const { data: season } = await supabase
                .from('seasons')
                .select('id')
                .eq('is_active', true)
                .maybeSingle();

            const scoreRows = players.map(p => ({
                user_id: p.userId,
                game_id: 'asteroid_battle',
                score: p.score,
                season_id: season?.id || null
            }));

            await supabase.from('scores').insert(scoreRows);
            console.log(`[AsteroidBattleRoom] Persisted ${scoreRows.length} scores to SQL.`);
        } catch (e) {
            console.error("[AsteroidBattleRoom] Error persisting scores:", e);
        }
    }

    initializeGame() {

        this.setState(new AsteroidBattleState());

        /* =========================
           JOIN GAME
        ========================= */

        this.onMessage("join_game", (client, data) => {

            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            player.isParticipating = true;
            player.username = data.username || player.username || "Pilot";
            player.color = data.color || player.color || "#0ea5e9";

            player.x = Math.random() * WORLD_WIDTH;
            player.y = Math.random() * WORLD_HEIGHT;

            player.hp = 100;
            player.lives = 3;
            player.score = 0;

            player.input = { keys: { w: false, a: false, s: false, d: false }, rotation: 0 };

            const participating = Array.from(this.state.players.values()).filter(p => p.isParticipating);
            if (this.state.phase === "waiting" && participating.length >= 1) {
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

        // Timer countdown
        this.clock.setInterval(() => {
            if (this.state.phase === "playing" && this.state.timeLeft > 0) {
                this.state.timeLeft--;
                if (this.state.timeLeft <= 0) {
                    this.endGameByTime();
                }
            }
        }, 1000);

    }

    endGameByTime() {
        const players = Array.from(this.state.players.values()).filter(p => p.isParticipating);
        const winner = players.sort((a, b) => b.score - a.score)[0];

        // Persist scores to SQL before finishing
        this.persistScores();

        this.endGame(winner ? winner.userId : "");
    }

    /* =========================
       GAME UPDATE
    ========================= */

    update() {

        if (this.state.phase !== "playing") return;

        // Auto-spawn if low on asteroids
        if (this.state.asteroids.size < MAX_ASTEROIDS / 2) {
            this.spawnAsteroid();
        }

        /* PLAYER MOVEMENT */

        this.state.players.forEach(player => {

            if (!player.isParticipating) return;

            const k = player.input?.keys;
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

            player.rotation = player.input.rotation || 0;

            player.x = (player.x + WORLD_WIDTH) % WORLD_WIDTH;
            player.y = (player.y + WORLD_HEIGHT) % WORLD_HEIGHT;

        });

        /* BULLETS */
        for (let i = this.state.bullets.length - 1; i >= 0; i--) {
            const b = this.state.bullets[i];
            b.x += b.vx;
            b.y += b.vy;

            // Collision with Asteroids
            let hit = false;
            for (let [astId, ast] of this.state.asteroids.entries()) {
                const dx = b.x - ast.x;
                const dy = b.y - ast.y;
                const distSq = dx * dx + dy * dy;
                const radius = ast.size * 20;

                if (distSq < radius * radius) {
                    ast.hp -= 20;
                    hit = true;

                    const player = this.state.players.get(b.userId);
                    if (player) player.score += 10;

                    if (ast.hp <= 0) {
                        this.state.asteroids.delete(astId);
                        if (player) player.score += 50;
                    }
                    break;
                }
            }

            if (hit || b.x < -50 || b.x > WORLD_WIDTH + 50 || b.y < -50 || b.y > WORLD_HEIGHT + 50) {
                this.state.bullets.splice(i, 1);
            }
        }

        /* ASTEROIDS */
        this.state.asteroids.forEach(ast => {
            ast.x += ast.vx;
            ast.y += ast.vy;

            ast.x = (ast.x + WORLD_WIDTH) % WORLD_WIDTH;
            ast.y = (ast.y + WORLD_HEIGHT) % WORLD_HEIGHT;

            // Collision with Players
            this.state.players.forEach(p => {
                if (!p.isParticipating || p.hp <= 0) return;
                const dx = p.x - ast.x;
                const dy = p.y - ast.y;
                const distSq = dx * dx + dy * dy;
                const radius = ast.size * 20;

                if (distSq < (radius + 15) * (radius + 15)) {
                    p.hp -= 0.5; // Damage over time while touching
                    if (p.hp <= 0) {
                        p.lives--;
                        if (p.lives > 0) {
                            p.hp = 100;
                            p.x = Math.random() * WORLD_WIDTH;
                            p.y = Math.random() * WORLD_HEIGHT;
                        }
                    }
                }
            });
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

    onPlayerRejoined(player, oldSessionId) {
        this.state.bullets.forEach(b => {
            if (b.userId === oldSessionId) b.userId = player.sessionId;
        });
        console.log(`[AsteroidBattleRoom] Updated bullet ownership for rejoining player ${player.username}`);
    }

}