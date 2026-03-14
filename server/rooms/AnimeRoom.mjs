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
            this.state.videoId = options.videoId || options.episodeId || "";
            this.state.hostId = options.hostId || "";
            this.activityId = options.activityId || "";

            // Authoritative State Update Handler
            this.onMessage("update_state", (client, { videoId, currentTime, playing }) => {
                const participant = this.state.participants.get(client.sessionId);
                const isHost = participant && (participant.isHost || participant.userId === this.state.hostId);

                if (isHost) {
                    if (videoId !== undefined) this.state.videoId = videoId;
                    if (currentTime !== undefined) this.state.currentTime = currentTime;
                    if (playing !== undefined) this.state.playing = playing;
                    
                    this.state.lastUpdate = Date.now();
                } else {
                    // Unauthorized client trying to sync - force sync them back to current state
                    client.send("STATE_UPDATE", this.getSnapshot());
                }
            });

            this.onMessage("play", (client, { currentTime }) => {
                const participant = this.state.participants.get(client.sessionId);
                if (participant && (participant.isHost || client.sessionId === this.state.hostId)) {
                    this.state.playing = true;
                    if (currentTime !== undefined) this.state.currentTime = currentTime;
                    this.state.lastUpdate = Date.now();
                }
            });

            this.onMessage("pause", (client, { currentTime }) => {
                const participant = this.state.participants.get(client.sessionId);
                if (participant && (participant.isHost || client.sessionId === this.state.hostId)) {
                    this.state.playing = false;
                    if (currentTime !== undefined) this.state.currentTime = currentTime;
                    this.state.lastUpdate = Date.now();
                }
            });

            this.onMessage("seek", (client, { currentTime }) => {
                const participant = this.state.participants.get(client.sessionId);
                if (participant && (participant.isHost || client.sessionId === this.state.hostId)) {
                    this.state.currentTime = currentTime;
                    this.state.lastUpdate = Date.now();
                }
            });

            // Late join request for snapshot
            this.onMessage("request_sync", (client) => {
                client.send("STATE_UPDATE", this.getSnapshot());
            });

            this.onMessage("chat", (client, payload) => {
                const participant = this.state.participants.get(client.sessionId);
                const message = typeof payload === "string" ? payload : payload?.message;
                if (participant && typeof message === "string" && message.trim()) {
                    this.broadcast("chat", {
                        userId: participant.userId,
                        username: participant.username,
                        avatar: participant.avatar,
                        message: message.trim().slice(0, 500),
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
