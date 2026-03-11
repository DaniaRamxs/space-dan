import GameRoom from "./GameRoom.mjs";
import { SnakeDuelState, SnakePlayer, Point } from "../schema/SnakeDuelState.mjs";

const GRID_SIZE = 40;
const INITIAL_SPEED = 150;
const DIRECTIONS = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 }
};

export class SnakeDuelRoom extends GameRoom {
    static patchRateMs = 150; // match tick rate — no need to sync faster
    maxPlayers = 20;

    createPlayer(client, options) {
        return new SnakePlayer();
    }

    initializeGame(options) {
        this.setState(new SnakeDuelState());
        this.tickCount = 0;

        this.onMessage("join_slot", (client, message) => {
            const { slot, name, avatar } = message;
            if (this.state.phase !== "waiting" && this.state.phase !== "lobby") return;
            if (this.state.p1 === client.sessionId || this.state.p2 === client.sessionId) return;

            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            if (slot === 1 && !this.state.p1) {
                this.state.p1 = client.sessionId;
                player.slot = 1;
                player.username = name;
                player.avatar = avatar;
            } else if (slot === 2 && !this.state.p2) {
                this.state.p2 = client.sessionId;
                player.slot = 2;
                player.username = name;
                player.avatar = avatar;
            }

            if (this.state.p1 && this.state.p2) {
                this.startCountdown();
            }
        });

        this.onMessage("leave_slot", (client) => {
            if (this.state.phase !== "waiting" && this.state.phase !== "lobby") return;
            this.handlePlayerExit(client);
        });

        this.onMessage("input", (client, message) => {
            if (this.state.phase !== "playing") return;
            const { direction } = message;

            if (client.sessionId === this.state.p1) {
                if (this.isValidMove(this.state.direction1, direction)) {
                    this.state.direction1 = direction;
                }
            } else if (client.sessionId === this.state.p2) {
                if (this.isValidMove(this.state.direction2, direction)) {
                    this.state.direction2 = direction;
                }
            }
        });

        this.onMessage("reset", (client) => {
            if (client.sessionId === this.state.p1 || client.sessionId === this.state.p2) {
                this.resetGame();
                if (this.state.p1 && this.state.p2) {
                    this.startCountdown();
                }
            }
        });

        this.onMessage("rematch", (client) => {
            if (client.sessionId === this.state.p1 || client.sessionId === this.state.p2) {
                this.resetGame();
                if (this.state.p1 && this.state.p2) {
                    this.startCountdown();
                }
            }
        });
    }

    handlePlayerExit(client) {
        const sid = client.sessionId;
        const player = this.state.players.get(sid);
        if (player) player.slot = 0;

        // Determinar si era p1 o p2 ANTES de limpiar el slot
        const wasP1 = sid === this.state.p1;
        const wasP2 = sid === this.state.p2;

        if (wasP1) {
            this.state.p1 = "";
        } else if (wasP2) {
            this.state.p2 = "";
        }

        if (this.state.phase === "playing") {
            // El ganador es el que NO salió
            const winnerId = wasP1 ? this.state.p2 : this.state.p1;
            this.endGame(winnerId);
        }
    }

    onLeave(client, consented) {
        super.onLeave(client, consented);
    }

    handlePlayerDefeatOnLeave(player) {
        super.handlePlayerDefeatOnLeave(player);
        this.handlePlayerExit({ sessionId: player.sessionId });
    }

    handleRejoined(player, oldSessionId) {
        if (this.state.p1 === oldSessionId) this.state.p1 = player.sessionId;
        if (this.state.p2 === oldSessionId) this.state.p2 = player.sessionId;
    }

    isValidMove(current, next) {
        if (current === "UP" && next === "DOWN") return false;
        if (current === "DOWN" && next === "UP") return false;
        if (current === "LEFT" && next === "RIGHT") return false;
        if (current === "RIGHT" && next === "LEFT") return false;
        return true;
    }

    setPhase(phase) {
        super.setPhase(phase);
        if (phase === "playing") {
            this.initializePlayState();
        } else {
            this.setSimulationInterval(null);
        }
    }

    initializePlayState() {
        this.tickCount = 0;
        this.state.winner = "";

        const p1 = this.state.players.get(this.state.p1);
        const p2 = this.state.players.get(this.state.p2);

        if (!p1 || !p2) {
            super.setPhase("waiting");
            return;
        }

        p1.segments.clear();
        let s1 = new Point(); s1.x = 5; s1.y = 10;
        p1.segments.push(s1);
        let s2 = new Point(); s2.x = 4; s2.y = 10;
        p1.segments.push(s2);
        let s3 = new Point(); s3.x = 3; s3.y = 10;
        p1.segments.push(s3);

        p2.segments.clear();
        let s4 = new Point(); s4.x = 34; s4.y = 10;
        p2.segments.push(s4);
        let s5 = new Point(); s5.x = 35; s5.y = 10;
        p2.segments.push(s5);
        let s6 = new Point(); s6.x = 36; s6.y = 10;
        p2.segments.push(s6);

        this.state.direction1 = "RIGHT";
        this.state.direction2 = "LEFT";

        this.spawnApple();

        this.setSimulationInterval(() => this.update(), INITIAL_SPEED);
    }

    spawnApple() {
        let x, y, occupied;
        const p1 = this.state.players.get(this.state.p1);
        const p2 = this.state.players.get(this.state.p2);

        do {
            x = Math.floor(Math.random() * GRID_SIZE);
            y = Math.floor(Math.random() * GRID_SIZE);
            occupied = false;

            if (p1) {
                for (const seg of p1.segments) {
                    if (seg.x === x && seg.y === y) { occupied = true; break; }
                }
            }
            if (!occupied && p2) {
                for (const seg of p2.segments) {
                    if (seg.x === x && seg.y === y) { occupied = true; break; }
                }
            }
        } while (occupied);

        this.state.apple = new Point().assign({ x, y });
    }

    update() {
        if (this.state.phase !== "playing") return;

        const p1 = this.state.players.get(this.state.p1);
        const p2 = this.state.players.get(this.state.p2);

        if (!p1 || !p2) return;

        const head1 = {
            x: p1.segments[0].x + DIRECTIONS[this.state.direction1].x,
            y: p1.segments[0].y + DIRECTIONS[this.state.direction1].y
        };
        const head2 = {
            x: p2.segments[0].x + DIRECTIONS[this.state.direction2].x,
            y: p2.segments[0].y + DIRECTIONS[this.state.direction2].y
        };

        // Check food consumption
        const grow1 = head1.x === this.state.apple.x && head1.y === this.state.apple.y;
        const grow2 = head2.x === this.state.apple.x && head2.y === this.state.apple.y;

        if (grow1 || grow2) {
            this.spawnApple();
        }

        // Collision logic
        const p1Loses = this.checkCollision(head1, p1.segments, p2.segments);
        const p2Loses = this.checkCollision(head2, p2.segments, p1.segments);

        if (p1Loses && p2Loses) {
            if (head1.x === head2.x && head1.y === head2.y) {
                this.state.winner = "head_collision";
            } else {
                this.state.winner = "draw";
            }
            this.setPhase("finished");
        } else if (p1Loses) {
            this.state.winner = this.state.p2;
            this.setPhase("finished");
        } else if (p2Loses) {
            this.state.winner = this.state.p1;
            this.setPhase("finished");
        }

        if (this.state.phase === "finished") {
            return;
        }

        // Move snakes
        this.moveSnake(p1.segments, head1, grow1);
        this.moveSnake(p2.segments, head2, grow2);
    }

    checkCollision(head, self, other) {
        // Wall
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) return true;

        // Collision with self (exclude head, check from segment 1)
        for (let i = 1; i < self.length; i++) {
            if (self[i].x === head.x && self[i].y === head.y) return true;
        }

        // Collision with other
        for (let i = 0; i < other.length; i++) {
            if (other[i].x === head.x && other[i].y === head.y) return true;
        }

        return false;
    }

    moveSnake(segments, head, grow) {
        const newHead = new Point();
        newHead.x = head.x;
        newHead.y = head.y;
        segments.unshift(newHead);
        if (!grow) {
            segments.pop();
        }
    }

    onResetGame() {
        this.state.winner = "";
        this.state.countdown = -1;
        this.state.players.forEach(p => {
            if (p.segments) p.segments.clear();
        });
        this.setSimulationInterval(null);
        this.setPhase("waiting");
    }
}
