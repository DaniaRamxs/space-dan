import GameRoom from "./GameRoom.mjs";
import { BlackjackState, Player, Card } from "../schema/BlackjackState.mjs";
import { ArraySchema } from "@colyseus/schema";
import { supabase } from "../supabaseClient.mjs";

const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const ROUND_BET = 100;

export class BlackjackRoom extends GameRoom {
    maxPlayers = 6;

    createPlayer() { return new Player(); }

    initializeGame(options) {
        this.setState(new BlackjackState());
        this.deck = [];
        this.createDeck();

        this.onMessage("bet", async (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player && this.state.phase === "waiting") {
                if (player.status === "betting") return;

                const success = await this.deductPlayerBalance(player.userId, ROUND_BET);

                if (success) {
                    player.bet = ROUND_BET;
                    player.status = "betting";
                    this.state.pot += ROUND_BET;
                    this.checkStartRound();
                } else {
                    client.send("error", { message: "No tienes suficientes Starlys para apostar" });
                }
            }
        });

        this.onMessage("hit", (client) => {
            if (this.state.phase !== "playing" || this.state.currentTurn !== client.sessionId) return;
            const player = this.state.players.get(client.sessionId);
            this.dealCard(player);
            if (player.score > 21) {
                player.status = "bust";
                this.nextTurn();
            }
        });

        this.onMessage("stand", (client) => {
            if (this.state.phase !== "playing" || this.state.currentTurn !== client.sessionId) return;
            const player = this.state.players.get(client.sessionId);
            player.status = "stay";
            this.nextTurn();
        });
    }

    // Economy Logic (Reusing and making userId-centric)
    async deductPlayerBalance(userId, amount) {
        if (!supabase || !userId) return true;
        try {
            const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single();
            if (!profile || profile.balance < amount) return false;

            const { error: txError } = await supabase.from('transactions').insert({
                user_id: userId,
                amount: -amount,
                type: 'casino_bet',
                description: 'Apuesta Blackjack Tournament',
                balance_after: profile.balance - amount
            });

            const { error: upError } = await supabase.from('profiles').update({ balance: profile.balance - amount }).eq('id', userId);
            return !txError && !upError;
        } catch (e) {
            console.error("[Blackjack Economy Error]", e);
            return false;
        }
    }

    async awardTournamentWinner(userId, amount) {
        if (!supabase || !userId) return;
        try {
            await supabase.rpc('award_coins', {
                p_user_id: userId,
                p_amount: amount,
                p_type: 'game_reward',
                p_description: 'Premio Pozo Blackjack (10 Rondas)'
            });
        } catch (e) {
            console.error("[Blackjack Payout Error]", e);
        }
    }

    // --- Card Helpers ---
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
        if (this.state.players.size < 2) return;
        const allBet = Array.from(this.state.players.values()).every(p => p.status === "betting");
        if (allBet) {
            this.setPhase("playing");
            this.startRound();
        }
    }

    async startRound() {
        this.createDeck();
        this.state.players.forEach(p => {
            p.cards = new ArraySchema();
            p.score = 0;
            p.status = "playing";
        });
        this.state.dealer.cards = new ArraySchema();
        this.state.dealer.score = 0;

        for (let i = 0; i < 2; i++) {
            for (const player of this.state.players.values()) {
                await this.delay(300);
                this.dealCard(player);
            }
            await this.delay(300);
            this.dealCard(this.state.dealer, i === 1);
        }

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
        if (this.state.dealer.cards[1]) this.state.dealer.cards[1].isHidden = false;
        this.calculateScore(this.state.dealer);

        while (this.state.dealer.score < 17) {
            await this.delay(800);
            this.dealCard(this.state.dealer);
        }

        this.finishRound();
    }

    async finishRound() {
        this.state.roundsPlayed++;

        this.state.players.forEach(p => {
            if (p.status === "bust") p.status = "lose";
            else if (this.state.dealer.score > 21 || p.score > this.state.dealer.score) {
                p.status = "win";
                p.roundWins++;
            }
            else if (p.score === this.state.dealer.score) p.status = "draw";
            else p.status = "lose";
        });

        if (this.state.roundsPlayed >= this.state.maxRounds) {
            await this.processTournamentEnd();
        } else {
            this.clock.setTimeout(() => {
                this.setPhase("waiting");
                this.state.players.forEach(p => {
                    p.bet = 0;
                    p.status = "waiting";
                    p.cards = new ArraySchema();
                });
            }, 5000);
        }
    }

    async processTournamentEnd() {
        this.setPhase("finished");

        let winners = [];
        let maxWins = -1;

        this.state.players.forEach(p => {
            if (p.roundWins > maxWins) {
                maxWins = p.roundWins;
                winners = [p];
            } else if (p.roundWins === maxWins && maxWins > 0) {
                winners.push(p);
            }
        });

        if (winners.length > 0 && this.state.pot > 0) {
            const prizePerWinner = Math.floor(this.state.pot / winners.length);
            for (const winner of winners) {
                await this.awardTournamentWinner(winner.userId, prizePerWinner);
            }
            this.state.winner = winners[0].userId; // Just for display
        }

        this.clock.setTimeout(() => {
            this.resetGame();
            this.state.roundsPlayed = 0;
            this.state.pot = 0;
            this.state.players.forEach(p => p.roundWins = 0);
        }, 10000);
    }

    onResetGame() {
        // Extra cleanup if needed
    }

    delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}
