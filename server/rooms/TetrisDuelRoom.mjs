import GameRoom from "./GameRoom.mjs";
import { TetrisDuelState, TetrisPlayer } from "../schema/TetrisDuelState.mjs";

const COLS = 10;
const ROWS = 20;

// SHAPES definition for collision detection on server
const SHAPES = [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    [[1, 0, 0], [1, 1, 1], [0, 0, 0]],                         // J
    [[0, 0, 1], [1, 1, 1], [0, 0, 0]],                         // L
    [[1, 1], [1, 1]],                                         // O
    [[0, 1, 1], [1, 1, 0], [0, 0, 0]],                         // S
    [[0, 1, 0], [1, 1, 1], [0, 0, 0]],                         // T
    [[1, 1, 0], [0, 1, 1], [0, 0, 0]]                          // Z
];
export class TetrisDuelRoom extends GameRoom {
    static patchRateMs = 100; // real-time duel
    maxPlayers = 20;
    createPlayer() { return new TetrisPlayer(); }

    initializeGame(options) {
        this.setState(new TetrisDuelState());

        this.onMessage("join_slot", (client, message) => {
            if (this.state.phase !== "waiting" && this.state.phase !== "lobby") return;

            const slot = message.slot;
            if (slot === 1 && this.state.p1 !== "") return;
            if (slot === 2 && this.state.p2 !== "") return;

            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            player.slot = slot;
            player.username = message.username || "Player";
            player.avatar = message.avatar || "";
            player.isParticipating = true;

            if (slot === 1) this.state.p1 = client.sessionId;
            else if (slot === 2) this.state.p2 = client.sessionId;

            if (this.state.p1 !== "" && this.state.p2 !== "") {
                this.startCountdown();
            }
        });

        this.onMessage("leave_slot", (client) => {
            this.handlePlayerExit(client);
        });

        this.onMessage("move", (client, message) => {
            if (this.state.phase !== "playing") return;

            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            const slot = player.slot;
            const board = slot === 1 ? this.state.board1 : this.state.board2;
            const piece = slot === 1 ? this.state.p1Piece : this.state.p2Piece;

            const dir = message.dir;
            if (dir === "LEFT") this.tryMove(board, piece, -1, 0);
            if (dir === "RIGHT") this.tryMove(board, piece, 1, 0);
            if (dir === "DOWN") this.tryMove(board, piece, 0, 1);
            if (dir === "ROTATE") this.rotatePiece(board, piece);
            if (dir === "DROP") this.hardDrop(board, piece);
        });

        this.onMessage("reset", (client) => {
            if (client.sessionId === this.state.p1 || client.sessionId === this.state.p2) {
                this.resetGame();
                if (this.state.p1 !== "" && this.state.p2 !== "") {
                    this.startCountdown();
                }
            }
        });
    }

    handlePlayerExit(client) {
        const sid = client.sessionId;
        const player = this.state.players.get(sid);
        if (player) {
            player.slot = 0;
            player.isParticipating = false;
        }

        if (sid === this.state.p1) {
            this.state.p1 = "";
        } else if (sid === this.state.p2) {
            this.state.p2 = "";
        }

        if (this.state.phase === "playing") {
            const winnerId = (sid === this.state.p1) ? this.state.p2 : this.state.p1;
            this.endGame(winnerId);
        }
    }

    onJoin(client, options) {
        super.onJoin(client, options);
    }

    onLeave(client, consented) {
        super.onLeave(client, consented);
    }

    handlePlayerDefeatOnLeave(player) {
        super.handlePlayerDefeatOnLeave(player);

        const sid = player.sessionId;
        if (sid === this.state.p1) this.state.p1 = "";
        if (sid === this.state.p2) this.state.p2 = "";

        if (this.state.phase === "playing") {
            const winnerId = (sid === this.state.p1) ? this.state.p2 : this.state.p1;
            this.endGame(winnerId);
        }
    }

    handleRejoined(player, oldSessionId) {
        if (this.state.p1 === oldSessionId) this.state.p1 = player.sessionId;
        if (this.state.p2 === oldSessionId) this.state.p2 = player.sessionId;
    }

    onResetGame() {
        this.state.phase = "lobby";
        this.state.countdown = -1;
        this.state.winner = "";
        this.clearBoard(this.state.board1);
        this.clearBoard(this.state.board2);
        this.state.p1Piece.clear();
        this.state.p2Piece.clear();
    }

    setPhase(phase) {
        super.setPhase(phase);
        if (phase === "playing") {
            this.startGame();
        } else {
            this.setSimulationInterval(null);
        }
    }

    startGame() {
        this.clearBoard(this.state.board1);
        this.clearBoard(this.state.board2);

        this.spawnPiece(this.state.p1Piece);
        this.spawnPiece(this.state.p2Piece);

        this.setSimulationInterval(() => this.gravityTick(), 800);
    }

    gravityTick() {
        if (this.state.phase !== "playing") return;

        const ok1 = this.tryMove(this.state.board1, this.state.p1Piece, 0, 1, true);
        const ok2 = this.tryMove(this.state.board2, this.state.p2Piece, 0, 1, true);
    }

    tryMove(board, piece, dx, dy, gravity = false) {
        if (piece.size === 0) return false;

        const next = {
            x: piece.get("x") + dx,
            y: piece.get("y") + dy,
            type: piece.get("type"),
            rotation: piece.get("rotation")
        };

        if (!this.checkCollision(board, next)) {
            piece.set("x", next.x);
            piece.set("y", next.y);
            return true;
        } else if (gravity && dy === 1) {
            this.lockPiece(board, piece);
            this.clearLines(board);
            if (!this.spawnPiece(piece, board)) {
                // Game Over for this player
                const winnerId = (piece === this.state.p1Piece) ? this.state.p2 : this.state.p1;
                this.endGame(winnerId);
            }
        }
        return false;
    }

    rotatePiece(board, piece) {
        if (piece.size === 0) return;

        const next = {
            x: piece.get("x"),
            y: piece.get("y"),
            type: piece.get("type"),
            rotation: (piece.get("rotation") + 1) % 4
        };

        if (!this.checkCollision(board, next)) {
            piece.set("rotation", next.rotation);
        }
    }

    hardDrop(board, piece) {
        if (piece.size === 0) return;

        while (this.tryMove(board, piece, 0, 1)) { }
        this.lockPiece(board, piece);
        this.clearLines(board);
        if (!this.spawnPiece(piece, board)) {
            const winnerId = (piece === this.state.p1Piece) ? this.state.p2 : this.state.p1;
            this.endGame(winnerId);
        }
    }

    spawnPiece(piece, board = null) {
        const type = Math.floor(Math.random() * SHAPES.length);
        const spawnData = { x: 3, y: 0, type, rotation: 0 };

        if (board && this.checkCollision(board, spawnData)) {
            return false;
        }

        piece.set("x", spawnData.x);
        piece.set("y", spawnData.y);
        piece.set("type", spawnData.type);
        piece.set("rotation", spawnData.rotation);
        return true;
    }

    lockPiece(board, piece) {
        const x = piece.get("x");
        const y = piece.get("y");
        const rotation = piece.get("rotation");
        const type = piece.get("type");

        let shape = SHAPES[type];
        if (!shape) return;

        for (let i = 0; i < rotation; i++) {
            shape = shape[0].map((_, index) => shape.map(col => col[index]).reverse());
        }

        shape.forEach((row, py) => {
            row.forEach((val, px) => {
                if (val) {
                    const bx = x + px;
                    const by = y + py;
                    if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
                        board[by * COLS + bx] = "block";
                    }
                }
            });
        });
    }

    clearLines(board) {
        for (let y = ROWS - 1; y >= 0; y--) {
            let full = true;
            for (let x = 0; x < COLS; x++) {
                if (board[y * COLS + x] === "0") {
                    full = false;
                    break;
                }
            }
            if (full) {
                // Shift lines down
                for (let yy = y; yy > 0; yy--) {
                    for (let x = 0; x < COLS; x++) {
                        board[yy * COLS + x] = board[(yy - 1) * COLS + x];
                    }
                }
                for (let x = 0; x < COLS; x++) {
                    board[x] = "0";
                }
                y++; // Check same line again
            }
        }
    }

    clearBoard(board) {
        for (let i = 0; i < ROWS * COLS; i++) {
            board[i] = "0";
        }
    }

    checkCollision(board, piece) {
        const { x, y, type, rotation } = piece;
        let shape = SHAPES[type];
        if (!shape) return true;

        for (let i = 0; i < rotation; i++) {
            shape = shape[0].map((_, index) => shape.map(col => col[index]).reverse());
        }

        for (let py = 0; py < shape.length; py++) {
            for (let px = 0; px < shape[py].length; px++) {
                if (shape[py][px]) {
                    const bx = x + px;
                    const by = y + py;
                    if (bx < 0 || bx >= COLS || by >= ROWS) return true;
                    if (by >= 0 && board[by * COLS + bx] !== "0") return true;
                }
            }
        }
        return false;
    }

    endGame(winnerId) {
        this.state.phase = "finished";
        this.state.winner = winnerId;
        this.setPhase("finished");
        this.setSimulationInterval(null);
    }
}