import { Room } from "colyseus";
import { Connect4State, Connect4Player } from "../schema/Connect4State.mjs";

const ROWS = 6;
const COLS = 7;

export class Connect4Room extends Room {
    onCreate(options) {
        this.setState(new Connect4State());
        this.maxClients = 10; // Spectators allowed

        this.onMessage("join_slot", (client, message) => {
            const { slot, name, avatar } = message;
            if (this.state.gameState !== "lobby") return;

            // Check if already in a slot
            if (this.state.p1 === client.sessionId || this.state.p2 === client.sessionId) return;

            if (slot === 1 && !this.state.p1) {
                this.state.p1 = client.sessionId;
                this.state.players.set(client.sessionId, new Connect4Player(client.sessionId, name, avatar, 1));
            } else if (slot === 2 && !this.state.p2) {
                this.state.p2 = client.sessionId;
                this.state.players.set(client.sessionId, new Connect4Player(client.sessionId, name, avatar, 2));
            }

            this.checkStart();
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

        this.onMessage("drop", (client, message) => {
            const { col } = message;
            if (this.state.gameState !== "playing") return;
            if (this.state.currentTurn !== client.sessionId) return;

            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            const success = this.dropDisc(col, player.slot);
            if (success) {
                this.checkWin(col);
                if (this.state.gameState === "playing") {
                    this.state.currentTurn = this.state.currentTurn === this.state.p1 ? this.state.p2 : this.state.p1;
                }
            }
        });

        this.onMessage("reset", (client) => {
            // Only players can reset, or maybe just the leader. Let's say any player for now.
            if (client.sessionId === this.state.p1 || client.sessionId === this.state.p2) {
                this.resetGame();
            }
        });
    }

    onJoin(client, options) {
        console.log(`[Connect4] Client joined: ${client.sessionId}`);
    }

    onLeave(client) {
        console.log(`[Connect4] Client left: ${client.sessionId}`);
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

    checkStart() {
        if (this.state.p1 && this.state.p2 && this.state.gameState === "lobby") {
            this.state.gameState = "playing";
            this.state.currentTurn = this.state.p1;
            // Clear board
            for (let i = 0; i < 42; i++) this.state.board[i] = 0;
            this.state.winner = 0;
        }
    }

    dropDisc(col, slot) {
        if (col < 0 || col >= COLS) return false;

        for (let r = ROWS - 1; r >= 0; r--) {
            const idx = r * COLS + col;
            if (this.state.board[idx] === 0) {
                this.state.board[idx] = slot;
                return true;
            }
        }
        return false;
    }

    checkWin(lastCol) {
        const board = this.state.board;

        // Find the row where the last disc was dropped
        let lastRow = -1;
        for (let r = 0; r < ROWS; r++) {
            if (board[r * COLS + lastCol] !== 0) {
                lastRow = r;
                break;
            }
        }
        if (lastRow === -1) return;

        const p = board[lastRow * COLS + lastCol];

        const check = (dr, dc) => {
            let count = 1;
            // one direction
            for (let i = 1; i < 4; i++) {
                const nr = lastRow + dr * i;
                const nc = lastCol + dc * i;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr * COLS + nc] === p) count++;
                else break;
            }
            // opposite direction
            for (let i = 1; i < 4; i++) {
                const nr = lastRow - dr * i;
                const nc = lastCol - dc * i;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr * COLS + nc] === p) count++;
                else break;
            }
            return count >= 4;
        };

        if (check(0, 1) || check(1, 0) || check(1, 1) || check(1, -1)) {
            this.state.winner = p;
            this.state.gameState = "finished";
            return;
        }

        // Draw check
        if (board.every(cell => cell !== 0)) {
            this.state.winner = 3; // draw
            this.state.gameState = "finished";
        }
    }

    resetGame() {
        this.state.gameState = "lobby";
        for (let i = 0; i < 42; i++) this.state.board[i] = 0;
        this.state.winner = 0;
        this.state.currentTurn = "";
    }
}
