import { Room } from "colyseus";
import { SnakeDuelState, SnakePlayer, Point } from "../schema/SnakeDuelState.mjs";

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const DIRECTIONS = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 }
};

export class SnakeDuelRoom extends Room {
    onCreate(options) {
        this.setState(new SnakeDuelState());
        this.maxClients = 50;
        this.tickCount = 0;

        this.onMessage("join_slot", (client, message) => {
            const { slot, name, avatar } = message;
            if (this.state.gameState !== "lobby") return;
            if (this.state.p1 === client.sessionId || this.state.p2 === client.sessionId) return;

            if (slot === 1 && !this.state.p1) {
                this.state.p1 = client.sessionId;
                this.state.players.set(client.sessionId, new SnakePlayer(client.sessionId, name, avatar, 1));
            } else if (slot === 2 && !this.state.p2) {
                this.state.p2 = client.sessionId;
                this.state.players.set(client.sessionId, new SnakePlayer(client.sessionId, name, avatar, 2));
            }

            if (this.state.p1 && this.state.p2) {
                this.startCountdown();
            }
        });

        this.onMessage("leave_slot", (client) => {
            if (this.state.gameState !== "lobby") return;
            if (this.state.p1 === client.sessionId) {
                this.state.p1 = "";
                this.state.players.delete(client.sessionId);
            } else if (this.state.p2 === client.sessionId) {
                this.state.p2 = "";
                this.state.players.delete(client.sessionId);
            }
        });

        this.onMessage("input", (client, message) => {
            if (this.state.gameState !== "playing") return;
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
            }
        });
    }

    isValidMove(current, next) {
        if (current === "UP" && next === "DOWN") return false;
        if (current === "DOWN" && next === "UP") return false;
        if (current === "LEFT" && next === "RIGHT") return false;
        if (current === "RIGHT" && next === "LEFT") return false;
        return true;
    }

    startCountdown() {
        this.state.countdown = 3;
        const interval = this.clock.setInterval(() => {
            this.state.countdown--;
            if (this.state.countdown === 0) {
                interval.clear();
                this.startGame();
            }
        }, 1000);
    }

    startGame() {
        this.state.gameState = "playing";
        this.state.countdown = -1;
        this.tickCount = 0;
        this.state.winner = "";

        this.state.snake1.clear();
        this.state.snake1.push(new Point().assign({ x: 5, y: 10 }));
        this.state.snake1.push(new Point().assign({ x: 4, y: 10 }));
        this.state.snake1.push(new Point().assign({ x: 3, y: 10 }));

        this.state.snake2.clear();
        this.state.snake2.push(new Point().assign({ x: 14, y: 10 }));
        this.state.snake2.push(new Point().assign({ x: 15, y: 10 }));
        this.state.snake2.push(new Point().assign({ x: 16, y: 10 }));

        this.state.direction1 = "RIGHT";
        this.state.direction2 = "LEFT";

        this.spawnFood();

        this.setSimulationInterval(() => this.update(), INITIAL_SPEED);
    }

    spawnFood() {
        let x, y, occupied;
        do {
            x = Math.floor(Math.random() * GRID_SIZE);
            y = Math.floor(Math.random() * GRID_SIZE);
            occupied = false;
            // Check snake 1
            for (const seg of this.state.snake1) {
                if (seg.x === x && seg.y === y) { occupied = true; break; }
            }
            if (!occupied) {
                // Check snake 2
                for (const seg of this.state.snake2) {
                    if (seg.x === x && seg.y === y) { occupied = true; break; }
                }
            }
        } while (occupied);

        this.state.food = new Point().assign({ x, y });
    }

    update() {
        if (this.state.gameState !== "playing") return;

        const head1 = { x: this.state.snake1[0].x + DIRECTIONS[this.state.direction1].x, y: this.state.snake1[0].y + DIRECTIONS[this.state.direction1].y };
        const head2 = { x: this.state.snake2[0].x + DIRECTIONS[this.state.direction2].x, y: this.state.snake2[0].y + DIRECTIONS[this.state.direction2].y };

        // Check food consumption
        const grow1 = head1.x === this.state.food.x && head1.y === this.state.food.y;
        const grow2 = head2.x === this.state.food.x && head2.y === this.state.food.y;

        if (grow1 || grow2) {
            this.spawnFood();
        }

        // Collision logic
        const p1Loses = this.checkCollision(head1, this.state.snake1, this.state.snake2);
        const p2Loses = this.checkCollision(head2, this.state.snake2, this.state.snake1);

        if (p1Loses && p2Loses) {
            this.state.winner = "draw";
            this.state.gameState = "finished";
        } else if (p1Loses) {
            this.state.winner = this.state.p2;
            this.state.gameState = "finished";
        } else if (p2Loses) {
            this.state.winner = this.state.p1;
            this.state.gameState = "finished";
        }

        if (this.state.gameState === "finished") {
            this.setSimulationInterval(null);
            return;
        }

        // Move snakes
        this.moveSnake(this.state.snake1, head1, grow1);
        this.moveSnake(this.state.snake2, head2, grow2);
    }

    checkCollision(head, self, other) {
        // Wall
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) return true;
        // Self
        for (let i = 0; i < self.length; i++) {
            if (self[i].x === head.x && self[i].y === head.y) return true;
        }
        // Other
        for (let i = 0; i < other.length; i++) {
            if (other[i].x === head.x && other[i].y === head.y) return true;
        }
        return false;
    }

    moveSnake(snake, head, grow) {
        snake.unshift(new Point().assign(head));
        if (!grow) {
            snake.pop();
        }
    }

    onLeave(client) {
        if (this.state.p1 === client.sessionId) {
            this.state.p1 = "";
            this.state.players.delete(client.sessionId);
            if (this.state.gameState === "playing") this.resetGame();
        } else if (this.state.p2 === client.sessionId) {
            this.state.p2 = "";
            this.state.players.delete(client.sessionId);
            if (this.state.gameState === "playing") this.resetGame();
        }
    }

    resetGame() {
        this.state.gameState = "lobby";
        this.state.winner = "";
        this.state.countdown = -1;
        this.state.snake1.clear();
        this.state.snake2.clear();
        this.setSimulationInterval(null);
    }
}
