import { Room } from "colyseus";
import { PixelGalaxyState, PixelEntry, PixelPlayer } from "../schema/PixelGalaxyState.mjs";
import { supabase } from "../supabaseClient.mjs";

const CANVAS_W    = 128;
const CANVAS_H    = 128;
const COOLDOWN_MS = 1000;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export class PixelGalaxyRoom extends Room {

    async onCreate(options) {
        this.setState(new PixelGalaxyState());
        this.maxClients  = 50;
        this.cooldowns   = new Map();
        this.roomKey     = options.roomName || "default"; // used as DB partition key

        // ── Load saved canvas from Supabase ─────────────────────────────────
        await this.loadFromDB();

        // ── place_pixel ──────────────────────────────────────────────────────
        this.onMessage("place_pixel", async (client, msg) => {
            if (!this.checkCooldown(client)) return;

            const { x, y, color } = msg;
            if (!this.validCoord(x, y) || !this.validColor(color)) return;

            const key      = `${x}_${y}`;
            const existing = this.state.pixels.get(key);
            const player   = this.state.players.get(client.sessionId);

            if (existing) {
                existing.color  = color;
                existing.userId = client.sessionId;
            } else {
                this.state.pixels.set(key, new PixelEntry(x, y, color, client.sessionId));
                this.state.totalPixels++;
            }

            if (player) player.contributions++;

            // Persist (fire-and-forget — don't block game loop)
            this.savePixelToDB(x, y, color, client.sessionId, player?.name).catch(e =>
                console.error("[PixelGalaxy] save error:", e.message)
            );
        });

        // ── remove_pixel ─────────────────────────────────────────────────────
        this.onMessage("remove_pixel", async (client, msg) => {
            if (!this.checkCooldown(client)) return;

            const { x, y } = msg;
            if (!this.validCoord(x, y)) return;

            const key = `${x}_${y}`;
            if (this.state.pixels.has(key)) {
                this.state.pixels.delete(key);
                this.state.totalPixels = Math.max(0, this.state.totalPixels - 1);
                this.deletePixelFromDB(x, y).catch(e =>
                    console.error("[PixelGalaxy] delete error:", e.message)
                );
            }
        });

        // ── clear_mine ────────────────────────────────────────────────────────
        this.onMessage("clear_mine", async (client) => {
            const toDelete = [];
            this.state.pixels.forEach((pixel, key) => {
                if (pixel.userId === client.sessionId) toDelete.push(key);
            });
            toDelete.forEach(key => this.state.pixels.delete(key));
            this.state.totalPixels = Math.max(0, this.state.totalPixels - toDelete.length);

            this.clearPlayerPixelsFromDB(client.sessionId).catch(e =>
                console.error("[PixelGalaxy] clear_mine error:", e.message)
            );
        });
    }

    onJoin(client, options) {
        this.state.players.set(
            client.sessionId,
            new PixelPlayer(
                client.sessionId,
                options.name   || "Anon",
                options.avatar || "/default-avatar.png"
            )
        );
        console.log(`[PixelGalaxy] ${options.name || "Anon"} joined "${this.roomKey}" — ${this.clients.length} online`);
    }

    onLeave(client) {
        this.state.players.delete(client.sessionId);
        this.cooldowns.delete(client.sessionId);
        // Pixels remain (persisted in DB)
    }

    // ── DB operations ─────────────────────────────────────────────────────────

    async loadFromDB() {
        if (!supabase) {
            console.log("[PixelGalaxy] Supabase not configured — starting with empty canvas");
            return;
        }
        try {
            const { data, error } = await supabase
                .from("pixel_galaxy")
                .select("x, y, color, user_id")
                .eq("room_name", this.roomKey);

            if (error) throw error;

            let count = 0;
            for (const row of data || []) {
                const key = `${row.x}_${row.y}`;
                this.state.pixels.set(key, new PixelEntry(row.x, row.y, row.color, row.user_id));
                count++;
            }
            this.state.totalPixels = count;
            console.log(`[PixelGalaxy] Loaded ${count} pixels for room "${this.roomKey}"`);
        } catch (e) {
            console.error("[PixelGalaxy] loadFromDB failed:", e.message);
        }
    }

    async savePixelToDB(x, y, color, userId, username) {
        if (!supabase) return;
        const { error } = await supabase
            .from("pixel_galaxy")
            .upsert(
                {
                    room_name: this.roomKey,
                    x, y, color,
                    user_id:   userId,
                    username:  username || null,
                    placed_at: new Date().toISOString(),
                },
                { onConflict: "room_name,x,y" }
            );
        if (error) throw error;
    }

    async deletePixelFromDB(x, y) {
        if (!supabase) return;
        const { error } = await supabase
            .from("pixel_galaxy")
            .delete()
            .eq("room_name", this.roomKey)
            .eq("x", x)
            .eq("y", y);
        if (error) throw error;
    }

    async clearPlayerPixelsFromDB(userId) {
        if (!supabase) return;
        const { error } = await supabase
            .from("pixel_galaxy")
            .delete()
            .eq("room_name", this.roomKey)
            .eq("user_id", userId);
        if (error) throw error;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    checkCooldown(client) {
        const now  = Date.now();
        const last = this.cooldowns.get(client.sessionId) || 0;
        if (now - last < COOLDOWN_MS) return false;
        this.cooldowns.set(client.sessionId, now);
        return true;
    }

    validCoord(x, y) {
        return (
            Number.isInteger(x) && Number.isInteger(y) &&
            x >= 0 && x < CANVAS_W &&
            y >= 0 && y < CANVAS_H
        );
    }

    validColor(color) {
        return typeof color === "string" && HEX_RE.test(color);
    }
}
