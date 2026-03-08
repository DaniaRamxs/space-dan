import { Room } from "colyseus";
import { BaseGameState, Player } from "../schema/BaseGameState.mjs";

export default class GameRoom extends Room {
    // Subclasses should override these
    maxPlayers = 2; // Default limit
    reconnectionTimeout = 20; // 20 seconds window
    autoDispose = true;

    async onCreate(options) {
        this.setState(new BaseGameState());
        this.autoDispose = true;

        // Message Handlers
        this.onMessage("rematch", (client) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                this.state.rematchVotes.set(player.userId, true);
                this.handleRematchLogic();
            }
        });

        this.onMessage("player_input", (client, data) => {
            if (this.state.phase === "playing") {
                this.handlePlayerInput(client, data);
            }
        });

        // Initialize specific game setup
        this.initializeGame(options);
    }

    async onJoin(client, options) {
        // Fallback to client.sessionId if userId is missing
        const userId = options.userId || client.sessionId;
        const username = options.username || options.name || "Anon";
        const avatar = options.avatar || "/default-avatar.png";

        // Check for existing player with same userId to prevent duplicates on refresh
        let existingPlayer = null;
        for (let p of this.state.players.values()) {
            if (p.userId === userId) {
                existingPlayer = p;
                break;
            }
        }

        if (existingPlayer) {
            // Manual reconnection / Duplicated tab behavior
            // We transfer the state to the new session
            this.state.players.delete(existingPlayer.sessionId);
            existingPlayer.sessionId = client.sessionId;
            existingPlayer.isConnected = true;
            this.state.players.set(client.sessionId, existingPlayer);
        } else {
            // New player
            const player = this.createPlayer(client, options);
            player.userId = userId;
            player.username = username || "Anon";
            player.avatar = avatar || "/default-avatar.png";
            player.sessionId = client.sessionId;
            this.state.players.set(client.sessionId, player);
        }

        // Check if we can start countdown
        if (this.state.phase === "waiting" && this.state.players.size >= this.maxPlayers) {
            this.startCountdown();
        }
    }

    async onLeave(client, consented) {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        player.isConnected = false;

        if (consented) {
            // User explicitly left
            this.state.players.delete(client.sessionId);
            this.handlePlayerDefeatOnLeave(player);
        } else {
            // Accidental disconnect: window of reconnection
            try {
                await this.allowReconnection(client, this.reconnectionTimeout);
                player.isConnected = true;
            } catch (e) {
                // Permanently lost
                this.state.players.delete(client.sessionId);
                this.handlePlayerDefeatOnLeave(player);
            }
        }
    }

    handlePlayerDefeatOnLeave(leavingPlayer) {
        // If the game is playing and someone leaves permanently, end it
        if (this.state.phase === "playing" && this.state.players.size < this.maxPlayers) {
            // Find the winner (remaining player)
            for (let winnerCandidate of this.state.players.values()) {
                this.endGame(winnerCandidate.userId);
                break;
            }
        }
    }

    setPhase(phase) {
        this.state.phase = phase;
        console.log(`[GameRoom] Entering phase: ${phase}`);
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

    resetGame() {
        this.state.winner = "";
        this.state.rematchVotes.clear();
        this.state.countdown = 0;
        this.state.gameData = "";

        // Reset player specific logic if needed
        this.state.players.forEach(p => {
            p.score = 0;
            p.isReady = false;
        });

        this.setPhase("waiting");

        // Custom reset for subclasses
        this.onResetGame();
    }

    handleRematchLogic() {
        const votes = this.state.rematchVotes.size;
        const totalPlayers = this.state.players.size;

        if (votes >= totalPlayers && totalPlayers >= this.maxPlayers) {
            this.resetGame();
            this.startCountdown();
        }
    }

    // --- Hooks for Subclasses ---
    createPlayer(client, options) {
        return new Player();
    }

    initializeGame(options) {
        // Setup initial board, logic, intervals
    }

    onResetGame() {
        // Additional cleanup for subclasses
    }

    handlePlayerInput(client, data) {
        // Process moves
    }

    onDispose() {
        console.log("Room disposed.");
    }
}
