import { Room } from "colyseus";
import { BaseGameState, Player } from "../schema/BaseGameState.mjs";

export default class GameRoom extends Room {

    maxPlayers = 2;
    reconnectionTimeout = 20;

    async onCreate(options) {

        this.setState(new BaseGameState());

        this.autoDispose = true;

        /* ========================
           INPUT HANDLER
        ======================== */

        this.onMessage("player_input", (client, data) => {

            if (this.state.phase !== "playing") return;

            this.handlePlayerInput(client, data);

        });

        /* ========================
           REMATCH
        ======================== */

        this.onMessage("rematch", (client) => {

            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            this.state.rematchVotes.set(player.userId, true);

            this.handleRematchLogic();

        });

        this.initializeGame(options);
    }

    /* ========================
       PLAYER JOIN
    ======================== */

    async onJoin(client, options) {

        const userId = options.userId || client.sessionId;
        const username = options.username || "Anon";
        const avatar = options.avatar || "/default-avatar.png";

        let existingPlayer = null;

        for (let p of this.state.players.values()) {
            if (p.userId === userId) {
                existingPlayer = p;
                break;
            }
        }

        if (existingPlayer) {

            this.state.players.delete(existingPlayer.sessionId);

            existingPlayer.sessionId = client.sessionId;
            existingPlayer.isConnected = true;

            this.state.players.set(client.sessionId, existingPlayer);

        } else {

            const player = this.createPlayer(client, options);

            player.userId = userId;
            player.username = username;
            player.avatar = avatar;
            player.sessionId = client.sessionId;
            player.isConnected = true;

            this.state.players.set(client.sessionId, player);

        }

        if (!this.state.hostId) {
            this.state.hostId = client.sessionId;
        }

        if (this.state.phase === "waiting" && this.state.players.size >= this.maxPlayers) {
            this.startCountdown();
        }
    }

    /* ========================
       PLAYER LEAVE
    ======================== */

    async onLeave(client, consented) {

        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        player.isConnected = false;

        if (consented) {

            this.state.players.delete(client.sessionId);

            this.handlePlayerDefeatOnLeave(player);

        } else {

            try {

                await this.allowReconnection(client, this.reconnectionTimeout);

                player.isConnected = true;

            } catch {

                this.state.players.delete(client.sessionId);

                this.handlePlayerDefeatOnLeave(player);

            }

        }
    }

    /* ========================
       PLAYER LEAVE LOGIC
    ======================== */

    handlePlayerDefeatOnLeave(leavingPlayer) {

        if (this.state.hostId === leavingPlayer.sessionId) {

            const nextHost = this.state.players.keys().next().value;

            this.state.hostId = nextHost || "";

        }

        if (this.state.phase === "playing" && this.state.players.size < this.maxPlayers) {

            for (let p of this.state.players.values()) {

                this.endGame(p.userId);

                break;

            }

        }
    }

    /* ========================
       PHASE SYSTEM
    ======================== */

    setPhase(phase) {

        this.state.phase = phase;

        console.log(`[GameRoom] phase → ${phase}`);

    }

    startCountdown() {

        if (this.state.phase === "countdown") return;

        this.setPhase("countdown");

        this.state.countdown = 3;

        const timer = setInterval(() => {

            this.state.countdown--;

            if (this.state.countdown <= 0) {

                clearInterval(timer);

                this.setPhase("playing");

            }

        }, 1000);

    }

    endGame(winnerId) {

        this.state.winner = winnerId;

        this.setPhase("finished");

    }

    /* ========================
       RESET GAME
    ======================== */

    resetGame() {

        this.state.winner = "";

        this.state.rematchVotes.clear();

        this.state.countdown = 0;

        this.state.players.forEach(p => {

            p.score = 0;

            p.isReady = false;

        });

        this.setPhase("waiting");

        this.onResetGame();

    }

    /* ========================
       REMATCH SYSTEM
    ======================== */

    handleRematchLogic() {

        const votes = this.state.rematchVotes.size;
        const total = this.state.players.size;

        if (votes >= total && total >= this.maxPlayers) {

            this.resetGame();

            this.startCountdown();

        }

    }

    /* ========================
       HOOKS PARA SUBCLASES
    ======================== */

    createPlayer(client, options) {
        return new Player();
    }

    initializeGame(options) { }

    handlePlayerInput(client, data) { }

    onResetGame() { }

    onDispose() {

        console.log("Room disposed");

    }
}