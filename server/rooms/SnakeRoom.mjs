import GameRoom from "./GameRoom.mjs";
import { SnakeState, SnakePlayer, Coordinate } from "../schema/SnakeState.mjs";

export class SnakeRoom extends GameRoom {
    maxPlayers = 2;

    createPlayer() { return new SnakePlayer(); }

    initializeGame(options) {
        this.setState(new SnakeState());

        // Authoritative movement loop
        this.setSimulationInterval(() => {
            if (this.state.phase === "playing") {
                this.updateSnakeLogic();
            }
        }, 150); // Tick speed (lower = faster)

        this.onMessage("direction", (client, dir) => {
            const player = this.state.players.get(client.sessionId);
            if (!player || player.isDead) return;

            // Prevent 180 degree turns
            const opposites = { left: "right", right: "left", up: "down", down: "up" };
            if (opposites[dir] !== player.direction) {
                player.direction = dir;
            }
        });
    }

    onResetGame() {
        this.spawnPlayers();
        this.spawnApple();
    }

    spawnPlayers() {
        let i = 0;
        this.state.players.forEach(p => {
            p.segments.clear();
            p.isDead = false;
            // Spawn P1 on left, P2 on right
            const startX = i === 0 ? 5 : this.state.width - 5;
            const startY = Math.floor(this.state.height / 2);
            p.direction = i === 0 ? "right" : "left";

            for (let j = 0; j < 5; j++) {
                const seg = new Coordinate();
                seg.x = i === 0 ? startX - j : startX + j;
                seg.y = startY;
                p.segments.push(seg);
            }
            i++;
        });
    }

    spawnApple() {
        this.state.apple.x = Math.floor(Math.random() * this.state.width);
        this.state.apple.y = Math.floor(Math.random() * this.state.height);
    }

    updateSnakeLogic() {
        const alivePlayers = [];

        this.state.players.forEach((p, sid) => {
            if (p.isDead) return;

            const head = p.segments[0];
            const newHead = new Coordinate();
            newHead.x = head.x;
            newHead.y = head.y;

            if (p.direction === "right") newHead.x++;
            if (p.direction === "left") newHead.x--;
            if (p.direction === "up") newHead.y--;
            if (p.direction === "down") newHead.y++;

            // 1. Wall Collisions
            if (newHead.x < 0 || newHead.x >= this.state.width || newHead.y < 0 || newHead.y >= this.state.height) {
                p.isDead = true;
                return;
            }

            // 2. Self & Other Collisions
            this.state.players.forEach(other => {
                other.segments.forEach(seg => {
                    if (seg.x === newHead.x && seg.y === newHead.y) {
                        p.isDead = true;
                    }
                });
            });

            if (p.isDead) return;

            // Move
            p.segments.unshift(newHead);

            // 3. Apple check
            if (newHead.x === this.state.apple.x && newHead.y === this.state.apple.y) {
                p.score += 10;
                this.spawnApple();
            } else {
                p.segments.pop();
            }

            alivePlayers.push(p);
        });

        // Check winner
        if (alivePlayers.length === 1 && this.state.players.size > 1) {
            this.endGame(alivePlayers[0].userId);
        } else if (alivePlayers.length === 0) {
            this.endGame("draw");
        }
    }
}
