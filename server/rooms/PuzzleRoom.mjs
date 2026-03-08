import GameRoom from "./GameRoom.mjs";
import { PuzzleState, Player, Piece } from "../schema/PuzzleState.mjs";

export class PuzzleRoom extends GameRoom {
    maxPlayers = 12;

    initializeGame(options) {
        this.setState(new PuzzleState());

        this.onMessage("setup_puzzle", (client, message) => {
            if (this.state.hostId && this.state.hostId !== client.sessionId) return;

            this.state.imageUri = message.imageUri;
            this.state.rows = message.rows || 4;
            this.state.cols = message.cols || 4;
            this.state.pieces.clear();
            this.state.progress = 0;
            this.state.isCompleted = false;
            this.state.startTime = Date.now();
            this.state.completeTime = 0;

            const pieceWidth = 100;
            const pieceHeight = 100;

            for (let r = 0; r < this.state.rows; r++) {
                for (let c = 0; c < this.state.cols; c++) {
                    const id = `piece_${r}_${c}`;
                    const targetX = c * pieceWidth;
                    const targetY = r * pieceHeight;
                    const piece = new Piece(id, targetX, targetY, pieceWidth, pieceHeight);
                    this.state.pieces.set(id, piece);
                }
            }
            this.setPhase("playing");
        });

        this.onMessage("move_piece", (client, message) => {
            const piece = this.state.pieces.get(message.id);
            if (piece && !piece.isLocked) {
                if (piece.heldBy === "" || piece.heldBy === client.sessionId) {
                    piece.x = message.x;
                    piece.y = message.y;
                    piece.heldBy = client.sessionId;
                }
            }
        });

        this.onMessage("release_piece", (client, message) => {
            const piece = this.state.pieces.get(message.id);
            if (piece && piece.heldBy === client.sessionId) {
                piece.heldBy = "";
                this.checkSnap(piece);
            }
        });

        this.onMessage("rotate_piece", (client, message) => {
            const piece = this.state.pieces.get(message.id);
            if (piece && !piece.isLocked) {
                piece.rotation = (piece.rotation + 90) % 360;
                this.checkSnap(piece);
            }
        });
    }

    async onJoin(client, options) {
        await super.onJoin(client, options);
        if (!this.state.hostId) {
            this.state.hostId = client.sessionId;
        }
    }

    handlePlayerDefeatOnLeave(player) {
        // Co-op: just release pieces
        this.state.pieces.forEach(p => {
            if (p.heldBy === player.sessionId) p.heldBy = "";
        });

        // Reassign host if necessary
        if (this.state.hostId === player.sessionId) {
            const nextHost = this.state.players.keys().next().value;
            this.state.hostId = nextHost || "";
        }
    }

    checkSnap(piece) {
        if (piece.isLocked) return;
        const snapThreshold = 20;
        const dist = Math.sqrt(
            Math.pow(piece.x - piece.targetX, 2) +
            Math.pow(piece.y - piece.targetY, 2)
        );

        if (dist < snapThreshold && piece.rotation === 0) {
            piece.x = piece.targetX;
            piece.y = piece.targetY;
            piece.isLocked = true;
            piece.heldBy = "";
            this.updateProgress();
        }
    }

    updateProgress() {
        let lockedCount = 0;
        this.state.pieces.forEach(p => {
            if (p.isLocked) lockedCount++;
        });

        const total = this.state.pieces.size;
        this.state.progress = total > 0 ? Math.floor((lockedCount / total) * 100) : 0;

        if (this.state.progress === 100 && !this.state.isCompleted) {
            this.state.isCompleted = true;
            this.state.completeTime = Date.now();
            this.endGame("Team"); // Base logic for completion
            this.broadcast("puzzle_complete", {
                time: (this.state.completeTime - this.state.startTime) / 1000,
                winner: "Team"
            });
        }
    }
}
