import { Room } from "colyseus";
import { AnimeState, AnimeParticipant } from "../schema/AnimeState.mjs";
import { supabase } from "../supabaseClient.mjs";

const IS_PROD = process.env.NODE_ENV === "production";
const log = (...args) => { if (!IS_PROD) console.log(...args); };

export class AnimeRoom extends Room {
    maxClients = 50;

    onCreate(options) {
        try {
            this.setState(new AnimeState());

            this.state.animeId = options.animeId || "";
            this.state.animeTitle = options.animeTitle || "";
            this.state.episodeId = options.episodeId || "";
            this.state.episodeNumber = options.episodeNumber || 1;
            this.state.hostId = options.hostId || "";
            this.activityId = options.activityId || "";

            this.onMessage("play", (client, { currentTime }) => {
                const participant = this.state.participants.get(client.sessionId);
                if (participant && (participant.isHost || client.sessionId === this.state.hostId)) {
                    this.state.isPlaying = true;
                    this.state.currentTime = currentTime;
                    this.state.lastSyncTime = Date.now();
                    this.broadcast("player_sync", { isPlaying: true, currentTime });
                }
            });

            this.onMessage("pause", (client, { currentTime }) => {
                const participant = this.state.participants.get(client.sessionId);
                if (participant && (participant.isHost || client.sessionId === this.state.hostId)) {
                    this.state.isPlaying = false;
                    this.state.currentTime = currentTime;
                    this.state.lastSyncTime = Date.now();
                    this.broadcast("player_sync", { isPlaying: false, currentTime });
                }
            });

            this.onMessage("seek", (client, { currentTime }) => {
                const participant = this.state.participants.get(client.sessionId);
                if (participant && (participant.isHost || client.sessionId === this.state.hostId)) {
                    this.state.currentTime = currentTime;
                    this.state.lastSyncTime = Date.now();
                    this.broadcast("player_sync", { isPlaying: this.state.isPlaying, currentTime });
                }
            });

            this.onMessage("chat", (client, message) => {
                const participant = this.state.participants.get(client.sessionId);
                if (participant) {
                    this.broadcast("chat", {
                        userId: participant.userId,
                        username: participant.username,
                        avatar: participant.avatar,
                        message,
                        timestamp: Date.now()
                    });
                }
            });

            log("[AnimeRoom] Room created. animeId:", this.state.animeId);

        } catch (err) {
            console.error("[AnimeRoom] onCreate ERROR:", err.message, err.stack);
        }
    }

    async onJoin(client, options) {
        console.log("[AnimeRoom] onJoin START for:", options?.username, "sessionId:", client.sessionId);
        try {
            const participant = new AnimeParticipant();
            participant.userId = options.userId || client.sessionId;
            participant.username = options.username || "Anonymous";
            participant.avatar = options.avatar || "";
            participant.isHost = participant.userId === this.state.hostId;

            this.state.participants.set(client.sessionId, participant);
            console.log("[AnimeRoom] onJoin SUCCESS:", participant.username);

            // Non-blocking DB update — a Supabase failure must NEVER cause early_leave
            if (supabase && this.activityId) {
                supabase.rpc('increment_activity_participants', { 
                    activity_id: this.activityId 
                }).then(({ error }) => {
                    if (error) console.error('[AnimeRoom] DB increment error:', error.message);
                }).catch(err => {
                    console.error('[AnimeRoom] DB increment unexpected error:', err.message);
                });
            }

        } catch (err) {
            // Always visible in production logs
            console.error("[AnimeRoom] onJoin ERROR:", err.message, err.stack);
            // Don't re-throw — let the client stay in the room
        }
    }

    async onLeave(client, consented) {
        try {
            const participant = this.state.participants.get(client.sessionId);
            if (participant) {
                log(`[AnimeRoom] ${participant.username} left`);
                this.state.participants.delete(client.sessionId);

                // Non-blocking DB update
                if (supabase && this.activityId) {
                    supabase.rpc('decrement_activity_participants', { 
                        activity_id: this.activityId 
                    }).then(({ error }) => {
                        if (error) console.error('[AnimeRoom] DB decrement error:', error.message);
                    }).catch(err => {
                        console.error('[AnimeRoom] DB decrement unexpected error:', err.message);
                    });
                }
                
                // Reassign host if the host left
                if (participant.isHost && this.state.participants.size > 0) {
                    const nextSessionId = Array.from(this.state.participants.keys())[0];
                    const nextHost = this.state.participants.get(nextSessionId);
                    if (nextHost) {
                        nextHost.isHost = true;
                        this.state.hostId = nextHost.userId;
                    }
                }
            }
        } catch (err) {
            console.error("[AnimeRoom] onLeave ERROR:", err.message);
        }
    }

    onDispose() {
        log(`[AnimeRoom] Disposed`);
    }
}
