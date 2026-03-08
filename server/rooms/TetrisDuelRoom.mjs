import { Room } from "colyseus";
import { TetrisDuelState, TetrisPlayer } from "../schema/TetrisDuelState.mjs";

const COLS = 10;
const ROWS = 20;

export class TetrisDuelRoom extends Room {

    maxClients = 2;

    onCreate() {

        this.setState(new TetrisDuelState());

        this.onMessage("move", (client, message) => {

            if (this.state.gameState !== "playing") return;

            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            const board = player.slot === 1 ? this.state.board1 : this.state.board2;
            const piece = player.slot === 1 ? this.state.p1Piece : this.state.p2Piece;

            const dir = message.dir;

            if (dir === "LEFT") this.tryMove(board, piece, -1, 0);
            if (dir === "RIGHT") this.tryMove(board, piece, 1, 0);
            if (dir === "DOWN") this.tryMove(board, piece, 0, 1);
            if (dir === "ROTATE") this.rotatePiece(board, piece);
            if (dir === "DROP") this.hardDrop(board, piece);

        });

    }

    /* ===============================
       JOIN
    =============================== */

    onJoin(client, options) {

        const slot = this.state.players.size === 0 ? 1 : 2;

        const player = new TetrisPlayer(
            client.sessionId,
            options.name || "Player",
            options.avatar || "",
            slot
        );

        this.state.players.set(client.sessionId, player);

        if (slot === 1) this.state.p1 = client.sessionId;
        else this.state.p2 = client.sessionId;

        if (this.state.players.size === 2) {
            this.startCountdown();
        }

    }

    onLeave(client) {

        this.state.players.delete(client.sessionId);

        if (client.sessionId === this.state.p1) this.state.p1 = "";
        if (client.sessionId === this.state.p2) this.state.p2 = "";

        this.resetGame();

    }

    /* ===============================
       COUNTDOWN
    =============================== */

    startCountdown() {

        this.state.gameState = "countdown";
        this.state.countdown = 3;

        const interval = this.clock.setInterval(() => {

            this.state.countdown--;

            if (this.state.countdown <= 0) {

                interval.clear();
                this.startGame();

            }

        }, 1000);

    }

    /* ===============================
       START GAME
    =============================== */

    startGame() {

        this.state.gameState = "playing";

        this.clearBoard(this.state.board1);
        this.clearBoard(this.state.board2);

        this.spawnPiece(this.state.p1Piece);
        this.spawnPiece(this.state.p2Piece);

        this.setSimulationInterval(() => this.gravityTick(), 800);

    }

    /* ===============================
       GRAVITY
    =============================== */

    gravityTick() {

        if (this.state.gameState !== "playing") return;

        this.tryMove(this.state.board1, this.state.p1Piece, 0, 1, true);
        this.tryMove(this.state.board2, this.state.p2Piece, 0, 1, true);

    }

    /* ===============================
       MOVEMENT
    =============================== */

    tryMove(board, piece, dx, dy, gravity = false) {

        const next = {
            x: piece.x + dx,
            y: piece.y + dy,
            type: piece.type,
            rotation: piece.rotation
        };

        if (!this.checkCollision(board, next)) {

            piece.x = next.x;
            piece.y = next.y;

            return true;

        } else if (gravity && dy === 1) {

            this.lockPiece(board, piece);
            this.spawnPiece(piece);

        }

        return false;

    }

    rotatePiece(board, piece) {

        const next = {
            x: piece.x,
            y: piece.y,
            type: piece.type,
            rotation: (piece.rotation + 1) % 4
        };

        if (!this.checkCollision(board, next)) {
            piece.rotation = next.rotation;
        }

    }

    hardDrop(board, piece) {

        while (this.tryMove(board, piece, 0, 1)) { }

        this.lockPiece(board, piece);
        this.spawnPiece(piece);

    }

    /* ===============================
       PIECES
    =============================== */

    spawnPiece(piece) {

        piece.x = 3;
        piece.y = 0;
        piece.type = Math.floor(Math.random() * 7);
        piece.rotation = 0;

    }

    lockPiece(board, piece) {

        const index = piece.y * COLS + piece.x;

        if (index >= 0 && index < board.length) {
            board[index] = "block";
        }

    }

    /* ===============================
       BOARD
    =============================== */

    clearBoard(board) {

        for (let i = 0; i < ROWS * COLS; i++) {
            board[i] = "0";
        }

    }

    checkCollision(board, piece) {

        if (piece.x < 0) return true;
        if (piece.x >= COLS) return true;
        if (piece.y >= ROWS) return true;

        return false;

    }

    /* ===============================
       RESET
    =============================== */

    resetGame() {

        this.state.gameState = "lobby";
        this.state.countdown = -1;
        this.state.winner = "";

    }

}