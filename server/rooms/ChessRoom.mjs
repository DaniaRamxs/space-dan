import { Room } from "colyseus";
import { Chess } from "chess.js";
import { ChessState, ChessPlayer } from "../schema/ChessState.mjs";

export class ChessRoom extends Room {
    onCreate(options) {
        this.setState(new ChessState());
        this.maxClients = 14; // 2 players + spectators
        this.chess = new Chess();
        this.clockInterval = null;
        this.rematchVotes = new Set();

        // ── Move ──────────────────────────────────────────────────────────────
        this.onMessage("move", (client, message) => {
            this.handleMove(client, message);
        });

        // ── Resign ────────────────────────────────────────────────────────────
        this.onMessage("resign", (client) => {
            if (this.state.gameState !== "playing") return;
            const player = this.state.players.get(client.sessionId);
            if (!player || player.color === "spectator") return;
            const winner = player.color === "white" ? "black" : "white";
            this.endGame(winner, "resign");
        });

        // ── Set clock (lobby only) ────────────────────────────────────────────
        this.onMessage("set_clock", (client, message) => {
            if (this.state.gameState !== "waiting") return;
            const player = this.state.players.get(client.sessionId);
            if (!player || player.color === "spectator") return;
            const mode = ["none", "1", "3", "5", "10"].includes(message.mode)
                ? message.mode
                : "none";
            this.state.clockMode = mode;
            const secs = (parseInt(mode) || 0) * 60;
            this.state.whiteTime = secs;
            this.state.blackTime = secs;
        });

        // ── Rematch ───────────────────────────────────────────────────────────
        this.onMessage("request_rematch", (client) => {
            if (this.state.gameState !== "finished") return;
            const player = this.state.players.get(client.sessionId);
            if (!player || player.color === "spectator") return;
            this.rematchVotes.add(client.sessionId);
            if (
                this.rematchVotes.has(this.state.white) &&
                this.rematchVotes.has(this.state.black)
            ) {
                this.startRematch();
            }
        });
    }

    onJoin(client, options) {
        const player = new ChessPlayer(
            client.sessionId,
            options.name   || "Anon",
            options.avatar || "/default-avatar.png",
            "spectator"
        );

        // Assign color to the first two spots
        if (!this.state.white) {
            this.state.white = client.sessionId;
            player.color = "white";
        } else if (!this.state.black) {
            this.state.black = client.sessionId;
            player.color = "black";
        }
        // else: spectator

        this.state.players.set(client.sessionId, player);

        // Start when both seats are filled
        if (this.state.white && this.state.black && this.state.gameState === "waiting") {
            this.startGame();
        }
    }

    onLeave(client, consented) {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        if (player.color !== "spectator" && this.state.gameState === "playing") {
            const winner = player.color === "white" ? "black" : "white";
            this.endGame(winner, "abandoned");
        }

        this.state.players.delete(client.sessionId);

        if (client.sessionId === this.state.white) {
            this.state.white = "";
        } else if (client.sessionId === this.state.black) {
            this.state.black = "";
        }

        // Remove from rematch votes
        this.rematchVotes.delete(client.sessionId);
    }

    // ── Game logic ─────────────────────────────────────────────────────────────

    handleMove(client, message) {
        if (this.state.gameState !== "playing") return;

        const player = this.state.players.get(client.sessionId);
        if (!player || player.color === "spectator") return;

        // Enforce turn order
        if (this.state.turn === "w" && player.color !== "white") return;
        if (this.state.turn === "b" && player.color !== "black") return;

        const { from, to, promotion } = message;
        if (!from || !to) return;

        let moveResult;
        try {
            moveResult = this.chess.move({ from, to, promotion: promotion || "q" });
        } catch (e) {
            // Invalid move — silently ignore
            return;
        }

        // Sync state
        this.state.fen      = this.chess.fen();
        this.state.turn     = this.chess.turn();
        this.state.lastFrom = from;
        this.state.lastTo   = to;
        this.state.moveCount++;
        this.state.inCheck  = this.chess.inCheck();
        this.state.moveHistory.push(moveResult.san);

        // Check end conditions
        if (this.chess.isCheckmate()) {
            this.endGame(moveResult.color === "w" ? "white" : "black", "checkmate");
        } else if (this.chess.isStalemate()) {
            this.endGame("draw", "stalemate");
        } else if (this.chess.isThreefoldRepetition()) {
            this.endGame("draw", "repetition");
        } else if (this.chess.isInsufficientMaterial()) {
            this.endGame("draw", "insufficient_material");
        } else if (this.chess.isDraw()) {
            this.endGame("draw", "fifty_moves");
        }
    }

    startGame() {
        this.chess = new Chess();
        this.state.fen       = this.chess.fen();
        this.state.turn      = "w";
        this.state.lastFrom  = "";
        this.state.lastTo    = "";
        this.state.winner    = "";
        this.state.endReason = "";
        this.state.inCheck   = false;
        this.state.moveCount = 0;
        this.state.moveHistory.splice(0);
        this.state.gameState = "playing";

        const mins = parseInt(this.state.clockMode) || 0;
        if (mins > 0) {
            this.state.whiteTime = mins * 60;
            this.state.blackTime = mins * 60;
            this.startClock();
        } else {
            this.state.whiteTime = 0;
            this.state.blackTime = 0;
        }
    }

    startClock() {
        if (this.clockInterval) clearInterval(this.clockInterval);
        this.clockInterval = setInterval(() => {
            if (this.state.gameState !== "playing") {
                clearInterval(this.clockInterval);
                this.clockInterval = null;
                return;
            }
            if (this.state.turn === "w") {
                this.state.whiteTime = Math.max(0, this.state.whiteTime - 1);
                if (this.state.whiteTime === 0) this.endGame("black", "timeout");
            } else {
                this.state.blackTime = Math.max(0, this.state.blackTime - 1);
                if (this.state.blackTime === 0) this.endGame("white", "timeout");
            }
        }, 1000);
    }

    endGame(winner, reason) {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
        this.state.winner    = winner;
        this.state.endReason = reason;
        this.state.gameState = "finished";
        this.rematchVotes.clear();
    }

    startRematch() {
        this.rematchVotes.clear();

        // Swap colors
        const oldWhite = this.state.white;
        const oldBlack = this.state.black;
        this.state.white = oldBlack;
        this.state.black = oldWhite;

        const wp = this.state.players.get(this.state.white);
        const bp = this.state.players.get(this.state.black);
        if (wp) wp.color = "white";
        if (bp) bp.color = "black";

        const mins = parseInt(this.state.clockMode) || 0;
        this.state.whiteTime = mins * 60;
        this.state.blackTime = mins * 60;

        this.startGame();
    }

    onDispose() {
        if (this.clockInterval) clearInterval(this.clockInterval);
    }
}
