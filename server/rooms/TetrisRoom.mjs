import GameRoom from "./GameRoom.mjs";
import { TetrisState, TetrisPlayer } from "../schema/TetrisState.mjs";
import { ArraySchema } from "@colyseus/schema";

export class TetrisRoom extends GameRoom {
    maxPlayers = 2; // Strict 1v1

    initializeGame(options) {
        this.setState(new TetrisState());

        // Client sends full board state or piece updates
        // To prevent cheating, we should ideally validate moves, 
        // but for high-speed responsiveness we sync block placements
        this.onMessage("place_piece", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (!player || this.state.phase !== "playing") return;

            // message: { board: [], linesCleared: N }
            if (message.board) {
                player.board = new ArraySchema(...message.board);
            }

            if (message.linesCleared > 0) {
                this.handleLineClears(client.sessionId, message.linesCleared);
            }
        });

        this.onMessage("game_over", (client) => {
            if (this.state.phase !== "playing") return;

            // If one loses, the other wins
            for (let [id, player] of this.state.players.entries()) {
                if (id !== client.sessionId) {
                    this.endGame(player.userId);
                    break;
                }
            }
        });
    }

    handleLineClears(sessionId, count) {
        const attacker = this.state.players.get(sessionId);

        // Tetris Duel Logic: Send garbage lines to opponent
        // 2 lines clear -> 1 garbage
        // 3 lines clear -> 2 garbage
        // 4 lines clear (Tetris) -> 4 garbage
        let garbage = 0;
        if (count === 2) garbage = 1;
        else if (count === 3) garbage = 2;
        else if (count === 4) garbage = 4;

        if (garbage > 0) {
            this.state.players.forEach((p, id) => {
                if (id !== sessionId) {
                    p.garbageLinesQueue += garbage;
                    // We can also broadcast a specific event for UI excitement
                    this.broadcast("garbage_sent", {
                        from: attacker.username,
                        to: p.username,
                        amount: garbage
                    });
                }
            });
        }
    }

    onResetGame() {
        this.state.players.forEach(p => {
            p.board = new ArraySchema(...Array(200).fill(0));
            p.score = 0;
            p.linesCleared = 0;
            p.garbageLinesQueue = 0;
        });
    }
}
