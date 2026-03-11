import GameRoom from "./GameRoom.mjs";
import { PokerState, PokerPlayer, PokerCard } from "../schema/PokerState.mjs";

const SUITS = ['♠', '♣', '♥', '♦'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export class PokerRoom extends GameRoom {
    static patchRateMs = 500; // turn-based
    maxPlayers = 24;

    createPlayer() { return new PokerPlayer(); }

    initializeGame(options) {
        this.setState(new PokerState());
        this.deck = [];

        this.onMessage("join_seat", (client, message) => {
            const { seatIdx } = message;
            if (this.state.phase !== "waiting" && this.state.phase !== "lobby") return;
            if (this.state.seats[seatIdx] !== "") return;

            // Check already seated
            for (let i = 0; i < 8; i++) {
                if (this.state.seats[i] === client.sessionId) return;
            }

            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.isParticipating = true;
                player.seatIdx = seatIdx;
                this.state.seats[seatIdx] = client.sessionId;
                console.log(`[PokerRoom] ${player.username} sat at seat ${seatIdx}`);
            }
        });

        this.onMessage("action", (client, message) => {
            if (this.state.phase !== "playing") return;
            const player = this.state.players.get(client.sessionId);
            if (!player || this.state.currentTurnIdx !== player.seatIdx) return;

            const { action, amount } = message;
            if (action === "fold") {
                player.folded = true;
                this.state.lastAction = `${player.username} Folded`;
            } else if (action === "call" || action === "raise") {
                player.stack -= amount;
                player.bet += amount;
                this.state.pot += amount;
                this.state.lastAction = `${player.username} ${action} ${amount}`;
            } else if (action === "check") {
                this.state.lastAction = `${player.username} Checked`;
            }

            this.nextTurn();
        });

        this.onMessage("leave_seat", (client) => {
            this.handlePlayerExit(client);
        });

        this.onMessage("reset", (client) => {
            this.resetGame();
        });

        this.onMessage("start_hand", (client) => {
            if (this.state.phase === "waiting" || this.state.phase === "lobby") {
                const participating = Array.from(this.state.players.values()).filter(p => p.isParticipating);
                if (participating.length >= 2) {
                    this.startCountdown();
                }
            }
        });
    }

    setPhase(phase) {
        super.setPhase(phase);
        if (phase === "playing") {
            this.startNewHand();
        }
    }

    startNewHand() {
        this.state.bettingRound = 0;
        this.state.pot = 0;
        this.state.communityCards.clear();
        this.state.winnerMessage = "";

        this.deck = [];
        SUITS.forEach(s => VALUES.forEach(v => this.deck.push({ v, s })));
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }

        this.state.players.forEach(p => {
            if (!p.isParticipating) return;
            p.folded = false;
            p.bet = 0;
            p.cards.clear();
            const c1 = this.deck.pop();
            const c2 = this.deck.pop();
            if (c1 && c2) {
                p.cards.push(new PokerCard().assign({ v: c1.v, s: c1.s }));
                p.cards.push(new PokerCard().assign({ v: c2.v, s: c2.s }));
            }
        });

        const active = Array.from(this.state.players.values())
            .filter(p => p.isParticipating)
            .sort((a, b) => a.seatIdx - b.seatIdx);
        if (active.length > 0) this.state.currentTurnIdx = active[0].seatIdx;
    }

    nextTurn() {
        const players = Array.from(this.state.players.values()).sort((a, b) => a.seatIdx - b.seatIdx);
        const alive = players.filter(p => !p.folded);

        if (alive.length <= 1) {
            this.endHand();
            return;
        }

        const currentPos = players.findIndex(p => p.seatIdx === this.state.currentTurnIdx);
        let nextPos = (currentPos + 1) % players.length;
        while (players[nextPos].folded) {
            nextPos = (nextPos + 1) % players.length;
        }
        this.state.currentTurnIdx = players[nextPos].seatIdx;
    }

    endHand() {
        this.setPhase("finished");
        const winner = Array.from(this.state.players.values()).find(p => !p.folded);
        if (winner) {
            this.state.winnerMessage = `${winner.username} wins!`;
            winner.stack += this.state.pot;
            this.state.winner = winner.userId;
        }
    }

    handleRejoined(player, oldSessionId) {
        for (let i = 0; i < 8; i++) {
            if (this.state.seats[i] === oldSessionId) {
                this.state.seats[i] = player.sessionId;
            }
        }
        console.log(`[PokerRoom] Updated session IDs for rejoining player ${player.username}`);
    }

    onResetGame() {
        this.state.pot = 0;
        this.state.communityCards.clear();
        this.state.players.forEach(p => {
            p.folded = false;
            p.bet = 0;
            p.cards.clear();
        });
    }

    handlePlayerExit(client) {
        const sid = client.sessionId;
        const player = this.state.players.get(sid);
        if (player) {
            if (player.seatIdx !== undefined) {
                this.state.seats[player.seatIdx] = "";
            }
            player.seatIdx = undefined;
            player.isParticipating = false;
        }

        if (this.state.phase === "playing" && player && !player.folded) {
            player.folded = true;
            this.nextTurn();
        }
    }

    handlePlayerDefeatOnLeave(player) {
        this.handlePlayerExit({ sessionId: player.sessionId });
    }
}
