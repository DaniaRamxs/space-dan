import GameRoom from "./GameRoom.mjs";
import { Chess } from "chess.js";
import { ChessState } from "../schema/ChessState.mjs";

export class ChessRoom extends GameRoom {
    maxPlayers = 2; // Althoughroom can have 14 clients, only 2 are active players

    initializeGame(options) {
        this.setState(new ChessState());
        this.chess = new Chess();
        this.clockInterval = null;

        this.onMessage("move", (client, message) => {
            if (this.state.phase !== "playing") return;
            this.handleMove(client, message);
        });

        this.onMessage("resign", (client) => {
            if (this.state.phase !== "playing") return;
            const player = this.state.players.get(client.sessionId);
            if (!player || player.color === "spectator") return;
            const winner = player.color === "white" ? "black" : "white";
            this.endGame(winner);
            this.state.endReason = "resign";
        });

        this.onMessage("set_clock", (client, message) => {
            if (this.state.phase !== "waiting") return;
            const player = this.state.players.get(client.sessionId);
            if (!player || player.color === "spectator") return;
            const mode = ["none", "1", "3", "5", "10"].includes(message.mode) ? message.mode : "none";
            this.state.clockMode = mode;
            const secs = (parseInt(mode) || 0) * 60;
            this.state.whiteTime = secs;
            this.state.blackTime = secs;
        });
    }

    async onJoin(client, options) {
        await super.onJoin(client, options);
        const player = this.state.players.get(client.sessionId);

        // Color assignment
        if (!this.state.whiteSid) {
            this.state.whiteSid = client.sessionId;
            player.color = "white";
        } else if (!this.state.blackSid) {
            this.state.blackSid = client.sessionId;
            player.color = "black";
        } else {
            player.color = "spectator";
        }

        if (this.state.whiteSid && this.state.blackSid && this.state.phase === "waiting") {
            this.startCountdown();
        }
    }

    setPhase(phase) {
        super.setPhase(phase);
        if (phase === "playing") {
            this.startActiveGame();
        }
    }

    startActiveGame() {
        this.chess = new Chess();
        this.state.fen = this.chess.fen();
        this.state.turn = "w";
        this.state.lastFrom = "";
        this.state.lastTo = "";
        this.state.inCheck = false;
        this.state.moveCount = 0;
        this.state.moveHistory.clear();

        const mins = parseInt(this.state.clockMode) || 0;
        if (mins > 0) {
            this.state.whiteTime = mins * 60;
            this.state.blackTime = mins * 60;
            this.startClock();
        }
    }

    handleMove(client, message) {
        const player = this.state.players.get(client.sessionId);
        if (!player || player.color === "spectator") return;
        if (this.state.turn === "w" && player.color !== "white") return;
        if (this.state.turn === "b" && player.color !== "black") return;

        const { from, to, promotion } = message;
        try {
            const moveResult = this.chess.move({ from, to, promotion: promotion || "q" });
            this.state.fen = this.chess.fen();
            this.state.turn = this.chess.turn();
            this.state.lastFrom = from;
            this.state.lastTo = to;
            this.state.moveCount++;
            this.state.inCheck = this.chess.inCheck();
            this.state.moveHistory.push(moveResult.san);

            if (this.chess.isCheckmate()) {
                this.endGame(moveResult.color === "w" ? "white" : "black");
                this.state.endReason = "checkmate";
            } else if (this.chess.isDraw()) {
                this.endGame("draw");
                this.state.endReason = "draw";
            }
        } catch (e) {
            console.warn("Invalid chess move", e);
        }
    }

    startClock() {
        if (this.clockInterval) clearInterval(this.clockInterval);
        this.clockInterval = setInterval(() => {
            if (this.state.phase !== "playing") return;
            if (this.state.turn === "w") {
                this.state.whiteTime = Math.max(0, this.state.whiteTime - 1);
                if (this.state.whiteTime === 0) this.endGame("black");
            } else {
                this.state.blackTime = Math.max(0, this.state.blackTime - 1);
                if (this.state.blackTime === 0) this.endGame("white");
            }
        }, 1000);
    }

    onResetGame() {
        if (this.clockInterval) clearInterval(this.clockInterval);
        // Swap colors for rematch
        const oldWhite = this.state.whiteSid;
        const oldBlack = this.state.blackSid;
        this.state.whiteSid = oldBlack;
        this.state.blackSid = oldWhite;

        const wp = this.state.players.get(this.state.whiteSid);
        const bp = this.state.players.get(this.state.blackSid);
        if (wp) wp.color = "white";
        if (bp) bp.color = "black";
    }

    onDispose() {
        if (this.clockInterval) clearInterval(this.clockInterval);
    }
}
