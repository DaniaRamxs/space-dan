import { Room } from "colyseus";
import { PuzzleState, Player, Piece } from "../schema/PuzzleState.mjs";

export class PuzzleRoom extends Room {
    onCreate(options) {
        this.setState(new PuzzleState());
        this.maxClients = 12;

        this.onMessage("setup_puzzle", (client, message) => {
            // Only host can setup or if no host defined
            if (this.state.hostId && this.state.hostId !== client.sessionId) return;

            this.state.imageUri = message.imageUri;
            this.state.rows = message.rows || 4;
            this.state.cols = message.cols || 4;
            this.state.pieces.clear();
            this.state.progress = 0;
            this.state.isCompleted = false;
            this.state.startTime = Date.now();
            this.state.completeTime = 0;

            const pieceWidth = 100; // Normalized size for state, client scales
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
        });

        this.onMessage("move_piece", (client, message) => {
            const piece = this.state.pieces.get(message.id);
            if (piece && !piece.isLocked) {
                // Anyone can move if not locked, but let's track who's holding it
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

    onJoin(client, options) {
        console.log(`[Puzzle] ${options.name} joined`);
        const player = new Player(client.sessionId, options.name, options.avatar);
        this.state.players.set(client.sessionId, player);

        if (!this.state.hostId) {
            this.state.hostId = client.sessionId;
        }
    }

    onLeave(client) {
        this.state.players.delete(client.sessionId);
        this.state.pieces.forEach(p => {
            if (p.heldBy === client.sessionId) p.heldBy = "";
        });

        if (this.state.hostId === client.sessionId) {
            // Assign new host
            const nextHost = this.state.players.keys().next().value;
            this.state.hostId = nextHost || "";
        }
    }

    checkSnap(piece) {
        if (piece.isLocked) return;

        const snapThreshold = 20; // Tolerance in pixels
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
            this.broadcast("puzzle_complete", {
                time: (this.state.completeTime - this.state.startTime) / 1000,
                winner: "Team"
            });
        }
    }
}
