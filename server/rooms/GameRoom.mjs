import { Room } from "colyseus";
import { BaseGameState, Player } from "../schema/BaseGameState.mjs";

export default class GameRoom extends Room {

    maxPlayers = 2;
    reconnectionTimeout = 20;

    async onCreate(options) {

        this.setState(new BaseGameState());

        this.autoDispose = true;
        this.maxClients = 50;

        /* ========================
           INPUT HANDLER
        ======================== */

        this.onMessage("player_input", (client, data) => {

            if (this.state.phase !== "playing") return;

            this.handlePlayerInput(client, data);

        });

        /* ========================
           JOIN GAME
        ======================== */

        this.onMessage("join_game", (client, options) => {
            const player = this.state.players.get(client.sessionId);
            if (!player || player.isParticipating) return;

            const activePlayers = Array.from(this.state.players.values()).filter(p => p.isParticipating);
            if (activePlayers.length >= this.maxPlayers) return;

            player.isParticipating = true;
            console.log(`[GameRoom] ${player.username} is participating`);

            const currentParticipating = Array.from(this.state.players.values()).filter(p => p.isParticipating);
            if (this.state.phase === "waiting" && currentParticipating.length >= this.maxPlayers) {
                this.startCountdown();
            }
        });

        /* ========================
           REMATCH
        ======================== */

        this.onMessage("rematch", (client) => {

            const player = this.state.players.get(client.sessionId);
            if (!player || !player.isParticipating) return;

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
        const username = options.username || options.name || "Anon";
        const avatar = options.avatar || "/default-avatar.png";

        let existingPlayer = null;
        let oldSessionId = null;

        // Try to find an existing player by userId (for rejoining)
        for (let [sid, p] of this.state.players.entries()) {
            if (p.userId === userId) {
                existingPlayer = p;
                oldSessionId = sid;
                break;
            }
        }

        if (existingPlayer) {
            console.log(`[GameRoom] Player rejoining: ${username} (${userId}). Matching old session ${oldSessionId} to new session ${client.sessionId}`);

            // Remove the reference from old sessionId
            this.state.players.delete(oldSessionId);

            // Update player metadata with current session
            existingPlayer.sessionId = client.sessionId;
            existingPlayer.isConnected = true;
            // Update username/avatar in case they changed
            existingPlayer.username = username;
            existingPlayer.avatar = avatar;

            // Register with new sessionId
            this.state.players.set(client.sessionId, existingPlayer);

            // Update host if necessary
            if (this.state.hostId === oldSessionId) {
                this.state.hostId = client.sessionId;
            }

            // Hook for subclasses to update their internal state (like turns, slots, etc)
            this.onPlayerRejoined(existingPlayer, oldSessionId);

        } else {
            const player = this.createPlayer(client, options);

            player.userId = userId;
            player.username = username;
            player.avatar = avatar;
            player.sessionId = client.sessionId;
            player.isConnected = true;

            this.state.players.set(client.sessionId, player);
            console.log(`[GameRoom] New player joined: ${username} (${client.sessionId})`);
        }

        if (!this.state.hostId) {
            this.state.hostId = client.sessionId;
        }
    }

    /* ========================
       PLAYER LEAVE
    ======================== */

    async onLeave(client, consented) {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        player.isConnected = false;

        // If they were just spectating, or if the game is not active, we can remove them immediately
        const canRemoveImmediately = !player.isParticipating ||
            this.state.phase === "waiting" ||
            this.state.phase === "lobby" ||
            this.state.phase === "finished";

        if (consented && canRemoveImmediately) {
            this.state.players.delete(client.sessionId);
            this.handlePlayerDefeatOnLeave(player);
            console.log(`[GameRoom] Player left (consented): ${player.username}`);
        } else {
            // Wait for reconnection
            console.log(`[GameRoom] Player disconnected, waiting for reconnection: ${player.username}`);
            try {
                // We always allow reconnection for participating players, even if consented (e.g. Activity UI closed)
                await this.allowReconnection(client, this.reconnectionTimeout);

                // If they reconnected via Colyseus's standard reconnect(), the client object is updated
                // But if they came back via joinOrCreate, my onJoin already handled it.
                // We check if the player is still in the map and if it's the SAME session ID.
                if (this.state.players.has(client.sessionId)) {
                    player.isConnected = true;
                    console.log(`[GameRoom] Player reconnected successfully: ${player.username}`);
                }
            } catch {
                // If the timeout expires AND they haven't re-joined via my onJoin logic (which would have swapped the session)
                if (this.state.players.get(client.sessionId) === player) {
                    this.state.players.delete(client.sessionId);
                    this.handlePlayerDefeatOnLeave(player);
                    console.log(`[GameRoom] Player reconnection timeout: ${player.username}`);
                }
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