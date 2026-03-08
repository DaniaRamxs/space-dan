import GameRoom from "./GameRoom.mjs";
import { Connect4State } from "../schema/Connect4State.mjs";

export class Connect4Room extends GameRoom {
    maxPlayers = 2;

    initializeGame(options) {
        this.setState(new Connect4State());

        this.onMessage("join_slot", (client, message) => {
            if (this.state.phase !== "waiting" && this.state.phase !== "lobby") return;
            const { slot } = message;

            if (slot === 1 && this.state.p1 !== "") return;
            if (slot === 2 && this.state.p2 !== "") return;

            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            player.isParticipating = true;
            if (slot === 1) this.state.p1 = client.sessionId;
            else this.state.p2 = client.sessionId;

            if (this.state.p1 && this.state.p2) {
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
                    this.endGame(player.userId);
                } else if (this.state.board.every(b => b !== 0)) {
                    this.endGame("draw");
                } else {
                    this.switchTurn();
                }
            }
        });

        this.onMessage("reset", (client) => {
            this.resetGame();
            if (this.state.p1 && this.state.p2) {
                this.startCountdown();
            }
        });
    }

    onResetGame() {
        for (let i = 0; i < 42; i++) this.state.board[i] = 0;
        let i = 1;
        this.state.players.forEach(p => {
            p.colorIndex = i++;
        });
        this.state.currentTurnSid = this.state.players.keys().next().value;
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
        const sids = Array.from(this.state.players.keys());
        const currentIndex = sids.indexOf(this.state.currentTurnSid);
        this.state.currentTurnSid = sids[(currentIndex + 1) % 2];
    }

    onPlayerRejoined(player, oldSessionId) {
        if (this.state.p1 === oldSessionId) this.state.p1 = player.sessionId;
        if (this.state.p2 === oldSessionId) this.state.p2 = player.sessionId;
        if (this.state.currentTurnSid === oldSessionId) this.state.currentTurnSid = player.sessionId;
        console.log(`[Connect4Room] Updated session IDs for rejoining player ${player.username}`);
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
