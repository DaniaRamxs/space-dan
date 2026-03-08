import GameRoom from "./GameRoom.mjs";
import { LudoState, Player, Piece } from "../schema/LudoState.mjs";

const COLORS = ["red", "green", "yellow", "blue"];
const START_POSITIONS = {
    "red": 0,
    "green": 13,
    "yellow": 26,
    "blue": 39
};

export class LudoRoom extends GameRoom {
    maxPlayers = 4;

    initializeGame(options) {
        this.setState(new LudoState());

        this.onMessage("roll_dice", (client) => {
            if (this.state.currentTurn !== client.sessionId) return;
            if (this.state.waitingForMove) return;

            const roll = Math.floor(Math.random() * 6) + 1;
            this.state.diceValue = roll;
            this.state.lastRollWasSix = (roll === 6);

            const player = this.state.players.get(client.sessionId);
            const canMove = player.pieces.some(p => this.canPieceMove(p, roll));

            if (!canMove) {
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

    async onJoin(client, options) {
        // Use base join logic
        await super.onJoin(client, options);

        const player = this.state.players.get(client.sessionId);
        // If it's a new player (just joined, not reconnected)
        if (!player.color) {
            const usedColors = Array.from(this.state.players.values())
                .map(p => p.color)
                .filter(c => !!c);

            const availableColor = COLORS.find(c => !usedColors.includes(c));
            player.color = availableColor || "red";
            player.initPieces();
            this.state.turnOrder.push(client.sessionId);
        }

        // Auto start if enough players
        if (this.state.phase === "waiting" && this.state.players.size >= 2) {
            this.startCountdown();
        }
    }

    onResetGame() {
        this.state.diceValue = 0;
        this.state.winners.clear();
        this.state.waitingForMove = false;
        this.state.lastRollWasSix = false;

        // Redraw pieces for all
        this.state.players.forEach(p => p.initPieces());

        // Set first turn
        if (this.state.turnOrder.length > 0) {
            this.state.currentTurn = this.state.turnOrder[0];
        }
    }

    // Overriding setPhase to handle Ludo start
    setPhase(phase) {
        super.setPhase(phase);
        if (phase === "playing") {
            if (!this.state.currentTurn && this.state.turnOrder.length > 0) {
                this.state.currentTurn = this.state.turnOrder[0];
            }
        }
    }

    canPieceMove(piece, roll) {
        if (piece.status === "finished") return false;
        if (piece.status === "base") return roll === 6;
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

        if (piece.status === "path") {
            this.checkCapture(player, piece);
        }

        this.state.waitingForMove = false;

        // Check Winner
        if (player.pieces.every(p => p.status === "finished")) {
            if (!this.state.winners.includes(player.userId)) {
                this.state.winners.push(player.userId);
            }
            if (this.state.winners.length >= this.state.players.size - 1) {
                this.endGame(this.state.winners[0]); // First winner is absolute winner
                return;
            }
        }

        if (this.state.lastRollWasSix && piece.status !== "finished") {
            this.state.diceValue = 0;
        } else {
            this.nextTurn();
        }
    }

    checkCapture(movingPlayer, piece) {
        const absPos = (START_POSITIONS[movingPlayer.color] + piece.position) % 52;
        const safeSquares = [0, 8, 13, 21, 26, 34, 39, 47];
        if (safeSquares.includes(absPos)) return;

        this.state.players.forEach((otherPlayer, sessionId) => {
            if (sessionId === movingPlayer.sessionId) return;

            otherPlayer.pieces.forEach(otherPiece => {
                if (otherPiece.status !== "path") return;
                const otherAbsPos = (START_POSITIONS[otherPlayer.color] + otherPiece.position) % 52;
                if (absPos === otherAbsPos) {
                    otherPiece.position = -1;
                    otherPiece.status = "base";
                }
            });
        });
    }

    nextTurn() {
        if (this.state.turnOrder.length === 0) return;
        const currentIndex = this.state.turnOrder.indexOf(this.state.currentTurn);
        const nextIndex = (currentIndex + 1) % this.state.turnOrder.length;
        this.state.currentTurn = this.state.turnOrder[nextIndex];
        this.state.diceValue = 0;
        this.state.waitingForMove = false;
        this.state.lastRollWasSix = false;
    }
}
