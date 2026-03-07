import { Room } from "colyseus";
import { PokerState, PokerPlayer, PokerCard } from "../schema/PokerState.mjs";

const SUITS = ['♠', '♣', '♥', '♦'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const BUY_IN = 500;
const BIG_BLIND = 20;

export class PokerRoom extends Room {
    onCreate(options) {
        this.setState(new PokerState());
        this.maxClients = 16; // Allow spectators
        this.deck = [];

        this.onMessage("join_seat", (client, message) => {
            const { seatIdx, name, avatar, id, identity } = message;
            if (this.state.gameState !== "lobby") return;
            if (this.state.seats[seatIdx] !== "") return;

            // Check if already seated
            for (let i = 0; i < 8; i++) {
                if (this.state.seats[i] === client.sessionId) return;
            }

            this.state.seats[seatIdx] = client.sessionId;
            this.state.players.set(client.sessionId, new PokerPlayer(id, identity, name, avatar, seatIdx));
        });

        this.onMessage("leave_seat", (client) => {
            if (this.state.gameState !== "lobby") return;
            const player = this.state.players.get(client.sessionId);
            if (player) {
                this.state.seats[player.seatIdx] = "";
                this.state.players.delete(client.sessionId);
            }
        });

        this.onMessage("start_hand", (client) => {
            const seatedCount = Array.from(this.state.players.values()).length;
            if (seatedCount < 2) return;
            this.startNewHand();
        });

        this.onMessage("action", (client, message) => {
            const { action, amount } = message;
            const player = this.state.players.get(client.sessionId);
            if (!player || this.state.gameState !== "betting" || this.state.currentTurn !== player.seatIdx) return;

            if (action === "fold") {
                player.folded = true;
                this.state.lastAction = `${player.name} Folded`;
            } else if (action === "call" || action === "raise") {
                player.stack -= amount;
                player.bet += amount;
                this.state.pot += amount;
                this.state.lastAction = `${player.name} ${action === "call" ? "Called" : "Raised"} ${amount}`;
            } else if (action === "check") {
                this.state.lastAction = `${player.name} Checked`;
            }

            this.nextTurn();
        });

        this.onMessage("next_round", (client) => {
            // Only allow "host" or some authority to advance? For now simple
            this.advanceRound();
        });

        this.onMessage("reset", (client) => {
            this.state.gameState = "lobby";
            this.state.communityCards.clear();
            this.state.pot = 0;
            this.state.players.forEach(p => {
                p.folded = false;
                p.bet = 0;
                p.cards.clear();
            });
        });
    }

    startNewHand() {
        this.state.gameState = "betting";
        this.state.bettingRound = 0;
        this.state.pot = 0;
        this.state.communityCards.clear();
        this.state.winnerMessage = "";

        // Create and shuffle deck
        this.deck = [];
        SUITS.forEach(s => VALUES.forEach(v => this.deck.push({ v, s })));
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }

        // Deal cards
        this.state.players.forEach(p => {
            p.folded = false;
            p.bet = 0;
            p.cards.clear();
            const c1 = this.deck.pop();
            const c2 = this.deck.pop();
            p.cards.push(new PokerCard(c1.v, c1.s));
            p.cards.push(new PokerCard(c2.v, c2.s));
        });

        // Set first turn
        const playersArray = Array.from(this.state.players.values()).sort((a, b) => a.seatIdx - b.seatIdx);
        this.state.currentTurn = playersArray[0].seatIdx;
        this.state.lastAction = "New hand started";
    }

    nextTurn() {
        const playersArray = Array.from(this.state.players.values()).sort((a, b) => a.seatIdx - b.seatIdx);
        const activePlayers = playersArray.filter(p => !p.folded);

        if (activePlayers.length <= 1) {
            this.endHand();
            return;
        }

        const currentIdx = playersArray.findIndex(p => p.seatIdx === this.state.currentTurn);
        let nextIdx = (currentIdx + 1) % playersArray.length;

        while (playersArray[nextIdx].folded) {
            nextIdx = (nextIdx + 1) % playersArray.length;
        }

        this.state.currentTurn = playersArray[nextIdx].seatIdx;
    }

    advanceRound() {
        this.state.bettingRound++;
        if (this.state.bettingRound === 1) { // Flop
            for (let i = 0; i < 3; i++) {
                const c = this.deck.pop();
                this.state.communityCards.push(new PokerCard(c.v, c.s));
            }
        } else if (this.state.bettingRound === 2) { // Turn
            const c = this.deck.pop();
            this.state.communityCards.push(new PokerCard(c.v, c.s));
        } else if (this.state.bettingRound === 3) { // River
            const c = this.deck.pop();
            this.state.communityCards.push(new PokerCard(c.v, c.s));
        } else {
            this.state.gameState = "showdown";
            this.state.currentTurn = -1;
        }
    }

    endHand() {
        this.state.gameState = "showdown";
        this.state.currentTurn = -1;
        const winner = Array.from(this.state.players.values()).find(p => !p.folded);
        if (winner) {
            this.state.winnerMessage = `${winner.name} wins the pot!`;
            winner.stack += this.state.pot;
        }
    }

    onLeave(client) {
        const player = this.state.players.get(client.sessionId);
        if (player) {
            this.state.seats[player.seatIdx] = "";
            this.state.players.delete(client.sessionId);
            if (this.state.gameState === "betting" && this.state.currentTurn === player.seatIdx) {
                this.nextTurn();
            }
        }
    }
}
