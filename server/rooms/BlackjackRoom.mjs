import { Room } from "colyseus";
import { BlackjackState, Player, Card } from "../schema/BlackjackState.mjs";
import { ArraySchema } from "@colyseus/schema";

const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export class BlackjackRoom extends Room {
    onCreate(options) {
        this.setState(new BlackjackState());
        this.maxClients = 6;
        this.deck = [];
        this.createDeck();

        this.onMessage("bet", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player && this.state.gameState === "waiting") {
                player.bet = message.amount || 10;
                player.status = "betting";
                this.checkStartRound();
            }
        });

        this.onMessage("hit", (client) => {
            if (this.state.gameState !== "player_turn" || this.state.currentTurn !== client.sessionId) return;
            const player = this.state.players.get(client.sessionId);
            this.dealCard(player);
            if (player.score > 21) {
                player.status = "bust";
                this.nextTurn();
            }
        });

        this.onMessage("stand", (client) => {
            if (this.state.gameState !== "player_turn" || this.state.currentTurn !== client.sessionId) return;
            const player = this.state.players.get(client.sessionId);
            player.status = "stay";
            this.nextTurn();
        });

        this.onMessage("double", (client) => {
            if (this.state.gameState !== "player_turn" || this.state.currentTurn !== client.sessionId) return;
            const player = this.state.players.get(client.sessionId);
            player.bet *= 2;
            this.dealCard(player);
            player.status = player.score > 21 ? "bust" : "stay";
            this.nextTurn();
        });
    }

    onJoin(client, options) {
        console.log(`[Blackjack] ${options.name} joined`);
        this.state.players.set(client.sessionId, new Player(
            client.sessionId,
            options.name || "Anon",
            options.avatar || "/default-avatar.png"
        ));
    }

    onLeave(client) {
        this.state.players.delete(client.sessionId);
        if (this.state.currentTurn === client.sessionId) {
            this.nextTurn();
        }
    }

    createDeck() {
        this.deck = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                let value = parseInt(rank);
                if (rank === "A") value = 11;
                else if (["J", "Q", "K"].includes(rank)) value = 10;
                this.deck.push({ suit, rank, value });
            }
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    checkStartRound() {
        const allBet = Array.from(this.state.players.values()).every(p => p.status === "betting");
        if (allBet && this.state.players.size > 0) {
            this.startRound();
        }
    }

    async startRound() {
        this.state.gameState = "dealing";
        this.createDeck();

        // Reset players
        this.state.players.forEach(p => {
            p.cards = new ArraySchema();
            p.score = 0;
            p.status = "playing";
        });
        this.state.dealer.cards = new ArraySchema();
        this.state.dealer.score = 0;

        // Deal initial cards
        for (let i = 0; i < 2; i++) {
            for (const player of this.state.players.values()) {
                await this.delay(300);
                this.dealCard(player);
            }
            await this.delay(300);
            this.dealCard(this.state.dealer, i === 1); // Second dealer card hidden
        }

        this.state.gameState = "player_turn";
        this.nextTurn();
    }

    dealCard(player, isHidden = false) {
        if (this.deck.length === 0) this.createDeck();
        const cardData = this.deck.pop();
        const card = new Card();
        card.suit = cardData.suit;
        card.rank = cardData.rank;
        card.value = cardData.value;
        card.isHidden = isHidden;
        player.cards.push(card);
        this.calculateScore(player);
    }

    calculateScore(player) {
        let score = 0;
        let aces = 0;
        player.cards.forEach(c => {
            if (c.isHidden) return;
            score += c.value;
            if (c.rank === "A") aces++;
        });
        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }
        player.score = score;
    }

    nextTurn() {
        const pIds = Array.from(this.state.players.keys());
        const currentIndex = pIds.indexOf(this.state.currentTurn);

        const nextPlayer = pIds.find((id, idx) => idx > currentIndex && this.state.players.get(id).status === "playing");

        if (nextPlayer) {
            this.state.currentTurn = nextPlayer;
        } else {
            this.state.currentTurn = "";
            this.dealerTurn();
        }
    }

    async dealerTurn() {
        this.state.gameState = "dealer_turn";
        // Reveal card
        if (this.state.dealer.cards[1]) this.state.dealer.cards[1].isHidden = false;
        this.calculateScore(this.state.dealer);

        while (this.state.dealer.score < 17) {
            await this.delay(800);
            this.dealCard(this.state.dealer);
        }

        this.finishRound();
    }

    finishRound() {
        this.state.gameState = "finished";
        this.state.players.forEach(p => {
            if (p.status === "bust") p.status = "lose";
            else if (this.state.dealer.score > 21 || p.score > this.state.dealer.score) p.status = "win";
            else if (p.score === this.state.dealer.score) p.status = "draw";
            else p.status = "lose";
        });

        this.clock.setTimeout(() => {
            this.state.gameState = "waiting";
            this.state.players.forEach(p => {
                p.bet = 0;
                p.status = "waiting";
                p.cards = new ArraySchema();
            });
        }, 5000);
    }

    delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}
