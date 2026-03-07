import { Room } from "colyseus";
import { TetrisDuelState, TetrisPlayer } from "../schema/TetrisDuelState.mjs";

const COLS = 10;
const ROWS = 20;

const TETROMINOS = [
    { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: "cyan" },
    { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: "blue" },
    { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: "orange" },
    { shape: [[1, 1], [1, 1]], color: "yellow" },
    { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: "green" },
    { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: "purple" },
    { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: "red" }
];

export class TetrisDuelRoom extends Room {
    onCreate(options) {
        this.setState(new TetrisDuelState());
        this.maxClients = 10;

        this.gravityTimer = null;
        this.dropSpeed = 800;

        this.onMessage("join_slot", (client, message) => {
            const { slot, name, avatar } = message;
            if (this.state.gameState !== "lobby") return;
            if (this.state.p1 === client.sessionId || this.state.p2 === client.sessionId) return;

            if (slot === 1 && !this.state.p1) {
                this.state.p1 = client.sessionId;
                this.state.players.set(client.sessionId, new TetrisPlayer(client.sessionId, name, avatar, 1));
            } else if (slot === 2 && !this.state.p2) {
                this.state.p2 = client.sessionId;
                this.state.players.set(client.sessionId, new TetrisPlayer(client.sessionId, name, avatar, 2));
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

        this.onMessage("move", (client, message) => {
            if (this.state.gameState !== "playing") return;
            const { dir } = message;
            const isP1 = client.sessionId === this.state.p1;
            const isP2 = client.sessionId === this.state.p2;
            if (!isP1 && !isP2) return;

            const board = isP1 ? this.state.board1 : this.state.board2;
            const piece = isP1 ? this.state.p1Piece : this.state.p2Piece;

            if (dir === "LEFT") this.tryMove(board, piece, { x: -1, y: 0 });
            else if (dir === "RIGHT") this.tryMove(board, piece, { x: 1, y: 0 });
            else if (dir === "DOWN") this.tryMove(board, piece, { x: 0, y: 1 });
            else if (dir === "ROTATE") this.tryRotate(board, piece);
            else if (dir === "DROP") this.hardDrop(board, piece);
        });

        this.onMessage("reset", (client) => {
            if (client.sessionId === this.state.p1 || client.sessionId === this.state.p2) {
                this.resetGame();
            }
        });
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
        this.state.winner = "";

        // Reset boards
        for (let i = 0; i < 200; i++) {
            this.state.board1[i] = "0";
            this.state.board2[i] = "0";
        }

        this.spawnPiece(this.state.p1Piece);
        this.spawnPiece(this.state.p2Piece);

        this.setSimulationInterval(() => this.gravityTick(), this.dropSpeed);
    }

    gravityTick() {
        if (this.state.gameState !== "playing") return;

        this.tryMove(this.state.board1, this.state.p1Piece, { x: 0, y: 1 }, true);
        this.tryMove(this.state.board2, this.state.p2Piece, { x: 0, y: 1 }, true);
    }

    spawnPiece(pieceState) {
        const typeIndex = Math.floor(Math.random() * TETROMINOS.length);
        pieceState.set("x", 3);
        pieceState.set("y", 0);
        pieceState.set("type", typeIndex);
        pieceState.set("rotation", 0);

        // Check game over
        const board = pieceState === this.state.p1Piece ? this.state.board1 : this.state.board2;
        if (this.checkCollision(board, pieceState)) {
            this.state.gameState = "finished";
            this.state.winner = (pieceState === this.state.p1Piece) ? this.state.p2 : this.state.p1;
        }
    }

    tryMove(board, piece, offset, isGravity = false) {
        const nextX = piece.get("x") + offset.x;
        const nextY = piece.get("y") + offset.y;

        const testState = {
            x: nextX,
            y: nextY,
            type: piece.get("type"),
            rotation: piece.get("rotation")
        };

        if (!this.checkCollision(board, testState)) {
            piece.set("x", nextX);
            piece.set("y", nextY);
            return true;
        } else if (isGravity && offset.y > 0) {
            this.lockPiece(board, piece);
            this.spawnPiece(piece);
        }
        return false;
    }

    tryRotate(board, piece) {
        const nextRotation = (piece.get("rotation") + 1) % 4;
        const testState = {
            x: piece.get("x"),
            y: piece.get("y"),
            type: piece.get("type"),
            rotation: nextRotation
        };

        if (!this.checkCollision(board, testState)) {
            piece.set("rotation", nextRotation);
        }
    }

    hardDrop(board, piece) {
        while (this.tryMove(board, piece, { x: 0, y: 1 })) { }
        this.lockPiece(board, piece);
        this.spawnPiece(piece);
    }

    lockPiece(board, pieceState) {
        const type = TETROMINOS[pieceState.get("type")];
        const shape = this.getRotatedShape(type.shape, pieceState.get("rotation"));

        shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const bx = x + pieceState.get("x");
                    const by = y + pieceState.get("y");
                    if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
                        board[by * COLS + bx] = type.color;
                    }
                }
            });
        });

        this.clearLines(board, pieceState === this.state.p1Piece);
    }

    clearLines(board, isP1) {
        let linesCleared = 0;
        const newBoard = [];

        for (let y = 0; y < ROWS; y++) {
            let full = true;
            for (let x = 0; x < COLS; x++) {
                if (board[y * COLS + x] === "0") {
                    full = false;
                    break;
                }
            }
            if (full) {
                linesCleared++;
            } else {
                const row = [];
                for (let x = 0; x < COLS; x++) row.push(board[y * COLS + x]);
                newBoard.push(row);
            }
        }

        while (newBoard.length < ROWS) {
            newBoard.unshift(Array(COLS).fill("0"));
        }

        // Update board
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                board[y * COLS + x] = newBoard[y][x];
            }
        }

        if (linesCleared > 1) {
            const opponentBoard = isP1 ? this.state.board2 : this.state.board1;
            const garbage = linesCleared === 4 ? 4 : linesCleared - 1;
            this.sendGarbage(opponentBoard, garbage);
        }
    }

    sendGarbage(board, lines) {
        const newBoard = [];
        // Remove top lines
        for (let y = lines; y < ROWS; y++) {
            const row = [];
            for (let x = 0; x < COLS; x++) row.push(board[y * COLS + x]);
            newBoard.push(row);
        }
        // Add garbage lines at bottom
        const hole = Math.floor(Math.random() * COLS);
        for (let i = 0; i < lines; i++) {
            const row = Array(COLS).fill("zinc");
            row[hole] = "0";
            newBoard.push(row);
        }
        // Sync back
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                board[y * COLS + x] = newBoard[y][x];
            }
        }
    }

    checkCollision(board, piece) {
        const shape = this.getRotatedShape(TETROMINOS[piece.type].shape, piece.rotation);
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const bx = x + piece.x;
                    const by = y + piece.y;
                    if (bx < 0 || bx >= COLS || by >= ROWS || (by >= 0 && board[by * COLS + bx] !== "0")) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    getRotatedShape(shape, rotation) {
        let current = shape;
        for (let i = 0; i < rotation; i++) {
            current = current[0].map((_, index) => current.map(col => col[index]).reverse());
        }
        return current;
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
        this.setSimulationInterval(null);
    }
}
