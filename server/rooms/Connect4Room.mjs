import GameRoom from "./GameRoom.mjs";
import { Connect4State, Connect4Player } from "../schema/Connect4State.mjs";

export class Connect4Room extends GameRoom {
    static patchRateMs = 500; // turn-based
    maxPlayers = 20;
    createPlayer() { return new Connect4Player(); }

    initializeGame(options) {
        this.setState(new Connect4State());

        this.onMessage("join_slot", (client, message) => {
            if (this.state.phase !== "waiting" && this.state.phase !== "lobby") return;
            const { slot } = message;

            if (slot === 1 && this.state.p1 !== "") return;
            if (slot === 2 && this.state.p2 !== "") return;

            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            if (message.name) player.username = message.name;
            if (message.avatar) player.avatar = message.avatar;

            player.isParticipating = true;
            if (slot === 1) this.state.p1 = client.sessionId;
            else this.state.p2 = client.sessionId;

            console.log(`[Connect4Room] Player ${player.username} joined slot ${slot}`);

            if (this.state.p1 || this.state.p2) {
                this.startCountdown();
            }
        });

        this.onMessage("leave_slot", (client) => {
            const player = this.state.players.get(client.sessionId);
            if (player) player.isParticipating = false;

            if (this.state.p1 === client.sessionId) this.state.p1 = "";
            if (this.state.p2 === client.sessionId) this.state.p2 = "";

            this.resetGame();
        });

        this.onMessage("drop", (client, { col }) => {
            if (this.state.phase !== "playing") return;
            if (this.state.currentTurnSid !== client.sessionId) return;

            const player = this.state.players.get(client.sessionId);
            if (!player || !player.isParticipating) return;

            const row = this.getAvailableRow(col);

            if (row !== -1) {
                const index = row * 7 + col;
                this.state.board[index] = player.colorIndex;

                if (this.checkWinner(row, col, player.colorIndex)) {
                    this.state.winner = player.colorIndex.toString();
                    this.endGame(player.userId);
                } else if (this.state.board.every(b => b !== 0)) {
                    this.state.winner = "3"; // Draw
                    this.endGame("draw");
                } else {
                    this.switchTurn();
                }
            }
        });

        this.onMessage("join_game", (client) => {
            if (this.state.phase !== "waiting" && this.state.phase !== "lobby") return;
            const player = this.state.players.get(client.sessionId);
            if (!player || player.isParticipating) return;

            // Auto-assign to available slot
            if (this.state.p1 === "") {
                this.state.p1 = client.sessionId;
                player.isParticipating = true;
            } else if (this.state.p2 === "") {
                this.state.p2 = client.sessionId;
                player.isParticipating = true;
            }

            if (this.state.p1 !== "" && this.state.p2 !== "") {
                this.startCountdown();
            }
        });

        this.onMessage("reset", (client) => {
            this.resetGame();
            if (this.state.p1 && this.state.p2) {
                this.startCountdown();
            }
        });
    }

    onPlayerLeave(player) {
        if (this.state.p1 === player.sessionId) this.state.p1 = "";
        if (this.state.p2 === player.sessionId) this.state.p2 = "";
        if (this.state.phase === "playing") {
            this.resetGame();
        }
    }

    onResetGame() {
        for (let i = 0; i < 42; i++) this.state.board[i] = 0;
        this.state.winner = ""; // Reset winner

        // Asignar colores solo a los 2 jugadores del slot
        const p1 = this.state.players.get(this.state.p1);
        if (p1) p1.colorIndex = 1;
        const p2 = this.state.players.get(this.state.p2);
        if (p2) p2.colorIndex = 2;

        this.state.currentTurnSid = this.state.p1;
    }

    resetGame() {
        this.onResetGame();
        this.setPhase("waiting");
    }

    setPhase(phase) {
        super.setPhase(phase);
        if (phase === "playing") {
            this.onResetGame(); // Ensure clean board on start
        }
    }

    getAvailableRow(col) {
        // Start from bottom row (5) up to 0
        for (let r = 5; r >= 0; r--) {
            if (this.state.board[r * 7 + col] === 0) return r;
        }
        return -1;
    }

    switchTurn() {
        if (!this.state.p1 || !this.state.p2) {
            // Stay with current player if alone
            return;
        }
        this.state.currentTurnSid = (this.state.currentTurnSid === this.state.p1) ? this.state.p2 : this.state.p1;
    }

    handleRejoined(player, oldSessionId) {
        if (this.state.p1 === oldSessionId) this.state.p1 = player.sessionId;
        if (this.state.p2 === oldSessionId) this.state.p2 = player.sessionId;
        if (this.state.currentTurnSid === oldSessionId) this.state.currentTurnSid = player.sessionId;
        console.log(`[Connect4Room] Updated session IDs for rejoining player ${player.username}`);
    }

    endGame(winnerId) {
        this.setPhase("finished");
        // winnerId is either userId or "draw"
        if (winnerId === "draw") {
            this.state.winner = "3";
        } else {
            // Find which player won by colorIndex
            const p1 = this.state.players.get(this.state.p1);
            const p2 = this.state.players.get(this.state.p2);
            if (p1 && p1.userId === winnerId) {
                this.state.winner = "1";
            } else if (p2 && p2.userId === winnerId) {
                this.state.winner = "2";
            }
        }
    }

    checkWinner(r, c, color) {
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (const [dr, dc] of directions) {
            let count = 1;
            // Positive
            for (let i = 1; i < 4; i++) {
                const nr = r + dr * i, nc = c + dc * i;
                if (nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && this.state.board[nr * 7 + nc] === color) count++;
                else break;
            }
            // Negative
            for (let i = 1; i < 4; i++) {
                const nr = r - dr * i, nc = c - dc * i;
                if (nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && this.state.board[nr * 7 + nc] === color) count++;
                else break;
            }
            if (count >= 4) return true;
        }
        return false;
    }
}
