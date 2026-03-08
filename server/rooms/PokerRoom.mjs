import GameRoom from "./GameRoom.mjs";
import { PokerState, PokerPlayer, PokerCard } from "../schema/PokerState.mjs";

const SUITS = ['♠', '♣', '♥', '♦'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export class PokerRoom extends GameRoom {
    maxPlayers = 8;

    initializeGame(options) {
        this.setState(new PokerState());
        this.deck = [];

        this.onMessage("join_seat", (client, message) => {
            const { seatIdx } = message;
            if (this.state.phase !== "waiting") return;
            if (this.state.seats[seatIdx] !== "") return;

            // Check already seated
            for (let i = 0; i < 8; i++) {
                if (this.state.seats[i] === client.sessionId) return;
            }

            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.seatIdx = seatIdx;
                this.state.seats[seatIdx] = client.sessionId;
            }

            if (this.state.players.size >= 2) {
                this.startCountdown();
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
            p.folded = false;
            p.bet = 0;
            p.cards.clear();
            const c1 = this.deck.pop();
            const c2 = this.deck.pop();
            p.cards.push(new PokerCard().assign({ v: c1.v, s: c1.s }));
            p.cards.push(new PokerCard().assign({ v: c2.v, s: c2.s }));
        });

        const active = Array.from(this.state.players.values()).sort((a, b) => a.seatIdx - b.seatIdx);
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

    onResetGame() {
        this.state.pot = 0;
        this.state.communityCards.clear();
        this.state.players.forEach(p => {
            p.folded = false;
            p.bet = 0;
            p.cards.clear();
        });
    }

    handlePlayerDefeatOnLeave(player) {
        if (player.seatIdx !== undefined) {
            this.state.seats[player.seatIdx] = "";
        }
        if (this.state.phase === "playing" && this.state.currentTurnIdx === player.seatIdx) {
            this.nextTurn();
        }
    }
}
