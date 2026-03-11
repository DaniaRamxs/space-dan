import GameRoom from "./GameRoom.mjs";
import { PuzzleState, Piece } from "../schema/PuzzleState.mjs";
import { Player } from "../schema/BaseGameState.mjs";

export class PuzzleRoom extends GameRoom {
    static patchRateMs = 250; // collaborative — moderate sync rate
    maxPlayers = 12;

    handleRejoined(player, oldSessionId) { }

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

            const boardWidth = 600;
            const boardHeight = 400;

            const pieceWidth = boardWidth / this.state.cols;
            const pieceHeight = boardHeight / this.state.rows;

            for (let r = 0; r < this.state.rows; r++) {
                for (let c = 0; c < this.state.cols; c++) {
                    const id = `piece_${r}_${c}`;
                    const targetX = c * pieceWidth;
                    const targetY = r * pieceHeight;
                    const piece = new Piece(id, targetX, targetY, pieceWidth, pieceHeight);

                    // Mezclar piezas aleatoriamente después de crearlas
                    piece.x = Math.random() * (boardWidth - pieceWidth);
                    piece.y = Math.random() * (boardHeight - pieceHeight);

                    this.state.pieces.set(id, piece);
                }
            }
            this.setPhase("playing");
        });

        this.onMessage("grab_piece", (client, message) => {
            const piece = this.state.pieces.get(message.id);
            if (piece && !piece.isLocked) {
                const now = Date.now();
                
                // Conflict resolution: if piece is held, check if we should override
                if (piece.heldBy === "") {
                    piece.heldBy = client.sessionId;
                    piece.lastGrabTime = now;
                    this.broadcast("piece_grabbed", { id: piece.id, by: client.sessionId }, { except: client });
                } else if (piece.heldBy !== client.sessionId && now - piece.lastGrabTime > 100) {
                    // Allow grabbing if previous holder hasn't moved it for 100ms
                    piece.heldBy = client.sessionId;
                    piece.lastGrabTime = now;
                    this.broadcast("piece_grabbed", { id: piece.id, by: client.sessionId }, { except: client });
                }
            }
        });

        this.onMessage("move_piece", (client, message) => {
            const piece = this.state.pieces.get(message.id);
            if (piece && !piece.isLocked) {
                // Only the holder can move the piece
                if (piece.heldBy === client.sessionId) {
                    piece.x = message.x;
                    piece.y = message.y;
                    piece.lastGrabTime = Date.now(); // Refresh grab time during movement
                }
            }
        });

        this.onMessage("release_piece", (client, message) => {
            const piece = this.state.pieces.get(message.id);
            if (piece && piece.heldBy === client.sessionId) {
                piece.heldBy = "";
                this.broadcast("piece_released", { id: piece.id, by: client.sessionId }, { except: client });
                this.checkSnap(piece);
            }
        });

        this.onMessage("rotate_piece", (client, message) => {
            const piece = this.state.pieces.get(message.id);
            // Permitir rotar si: no está bloqueada, y (no está sostenida por nadie O la sostiene el jugador actual)
            if (piece && !piece.isLocked && (piece.heldBy === "" || piece.heldBy === client.sessionId)) {
                piece.rotation = (piece.rotation + 90) % 360;
                this.checkSnap(piece);
            }
        });
    }

    handlePlayerDefeatOnLeave(player) {
        // Co-op: just release pieces held by the leaving player
        this.state.pieces.forEach(p => {
            if (p.heldBy === player.sessionId) p.heldBy = "";
        });
        // Host transfer is handled by GameRoom base class
        super.handlePlayerDefeatOnLeave(player);
    }

    checkSnap(piece) {
        if (piece.isLocked) return;

        // Snap dinámico según tamaño de pieza
        const snapThreshold = piece.width * 0.25;
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
