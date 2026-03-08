import { Room } from "colyseus";
import { LudoState, Player, Piece } from "../schema/LudoState.mjs";

const COLORS = ["red", "green", "yellow", "blue"];
const START_POSITIONS = {
    "red": 0,
    "green": 13,
    "yellow": 26,
    "blue": 39
};

export class LudoRoom extends Room {
    onCreate(options) {
        this.setState(new LudoState());
        this.maxClients = 4;

        this.onMessage("roll_dice", (client) => {
            if (this.state.currentTurn !== client.sessionId) return;
            if (this.state.waitingForMove) return;

            const roll = Math.floor(Math.random() * 6) + 1;
            this.state.diceValue = roll;
            this.state.lastRollWasSix = (roll === 6);

            // Check if player can move any piece
            const player = this.state.players.get(client.sessionId);
            const canMove = player.pieces.some(p => this.canPieceMove(p, roll));

            if (!canMove) {
                // Skip turn after a delay
                this.clock.setTimeout(() => {
                    this.nextTurn();
                }, 1500);
            } else {
                this.state.waitingForMove = true;
            }
        });

        this.onMessage("move_piece", (client, message) => {
            if (this.state.currentTurn !== client.sessionId) return;
            if (!this.state.waitingForMove) return;

            const player = this.state.players.get(client.sessionId);
            const piece = player.pieces[message.index];

            if (this.canPieceMove(piece, this.state.diceValue)) {
                this.executeMove(player, piece, this.state.diceValue);
            }
        });
    }

    onJoin(client, options) {
        if (this.state.players.size >= 4) return;

        const color = COLORS[this.state.players.size];
        const player = new Player(client.sessionId, options.name || "Player", options.avatar || "", color);
        this.state.players.set(client.sessionId, player);
        this.state.turnOrder.push(client.sessionId);

        if (this.state.players.size >= 2 && this.state.gameState === "waiting") {
            this.state.gameState = "playing";
            this.state.currentTurn = this.state.turnOrder[0];
        }
    }

    onLeave(client) {
        this.state.players.delete(client.sessionId);
        const index = this.state.turnOrder.indexOf(client.sessionId);
        if (index > -1) this.state.turnOrder.splice(index, 1);

        if (this.state.currentTurn === client.sessionId) {
            this.nextTurn();
        }

        if (this.state.players.size < 2 && this.state.gameState === "playing") {
            this.state.gameState = "waiting";
        }
    }

    canPieceMove(piece, roll) {
        if (piece.status === "finished") return false;

        if (piece.status === "base") {
            return roll === 6;
        }

        // Home path check
        if (piece.position + roll > 57) return false;

        return true;
    }

    executeMove(player, piece, roll) {
        if (piece.status === "base") {
            piece.position = 0;
            piece.status = "path";
        } else {
            piece.position += roll;
            if (piece.position === 57) {
                piece.status = "finished";
            } else if (piece.position > 50) {
                piece.status = "home";
            }
        }

        // Handle Capture
        if (piece.status === "path") {
            this.checkCapture(player, piece);
        }

        this.state.waitingForMove = false;

        // Check Winner
        if (player.pieces.every(p => p.status === "finished")) {
            if (!this.state.winners.includes(player.id)) {
                this.state.winners.push(player.id);
            }
            if (this.state.winners.length >= this.state.players.size - 1) {
                this.state.gameState = "finished";
                return;
            }
        }

        // Extra turn if roll was 6, otherwise next turn
        if (this.state.lastRollWasSix && piece.status !== "finished") {
            // Roll again
            this.state.diceValue = 0;
        } else {
            this.nextTurn();
        }
    }

    checkCapture(movingPlayer, piece) {
        const absPos = (START_POSITIONS[movingPlayer.color] + piece.position) % 52;

        // Safe squares (traditional: 0, 8, 13, 21, 26, 34, 39, 47)
        const safeSquares = [0, 8, 13, 21, 26, 34, 39, 47];
        if (safeSquares.includes(absPos)) return;

        this.state.players.forEach((otherPlayer, sessionId) => {
            if (sessionId === movingPlayer.id) return;

            otherPlayer.pieces.forEach(otherPiece => {
                if (otherPiece.status !== "path") return;

                const otherAbsPos = (START_POSITIONS[otherPlayer.color] + otherPiece.position) % 52;
                if (absPos === otherAbsPos) {
                    // Capture!
                    otherPiece.position = -1;
                    otherPiece.status = "base";
                    console.log(`[Ludo] ${movingPlayer.color} captured ${otherPlayer.color}`);
                }
            });
        });
    }

    nextTurn() {
        const currentIndex = this.state.turnOrder.indexOf(this.state.currentTurn);
        const nextIndex = (currentIndex + 1) % this.state.turnOrder.length;
        this.state.currentTurn = this.state.turnOrder[nextIndex];
        this.state.diceValue = 0;
        this.state.waitingForMove = false;
        this.state.lastRollWasSix = false;
    }
}
