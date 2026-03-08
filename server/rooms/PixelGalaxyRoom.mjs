import GameRoom from "./GameRoom.mjs";
import { PixelGalaxyState, PixelEntry } from "../schema/PixelGalaxyState.mjs";
import { supabase } from "../supabaseClient.mjs";

const CANVAS_W = 128;
const CANVAS_H = 128;
const COOLDOWN_MS = 1000;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export class PixelGalaxyRoom extends GameRoom {
    maxPlayers = 50;

    async initializeGame(options) {
        this.setState(new PixelGalaxyState());
        this.cooldowns = new Map();
        this.roomKey = options.roomName || "default";

        await this.loadFromDB();

        this.onMessage("place_pixel", async (client, msg) => {
            if (!this.checkCooldown(client)) return;
            const { x, y, color } = msg;
            if (!this.validCoord(x, y) || !this.validColor(color)) return;

            const key = `${x}_${y}`;
            const player = this.state.players.get(client.sessionId);
            const userId = player?.userId || client.sessionId;

            let pixel = this.state.pixels.get(key);
            if (pixel) {
                pixel.color = color;
                pixel.userId = userId;
            } else {
                pixel = new PixelEntry();
                pixel.x = x;
                pixel.y = y;
                pixel.color = color;
                pixel.userId = userId;
                this.state.pixels.set(key, pixel);
                this.state.totalPixels++;
            }

            if (player) player.contributions++;

            this.savePixelToDB(x, y, color, userId, player?.username).catch(e =>
                console.error("[PixelGalaxy] save error:", e.message)
            );
        });

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
    }

    async onJoin(client, options) {
        await super.onJoin(client, options);
    }

    // --- DB Logic ---
    async loadFromDB() {
        if (!supabase) return;
        try {
            const { data, error } = await supabase
                .from("pixel_galaxy")
                .select("x, y, color, user_id")
                .eq("room_name", this.roomKey);

            if (error) throw error;

            let count = 0;
            for (const row of data || []) {
                const key = `${row.x}_${row.y}`;
                const pixel = new PixelEntry();
                pixel.x = row.x;
                pixel.y = row.y;
                pixel.color = row.color;
                pixel.userId = row.user_id;
                this.state.pixels.set(key, pixel);
                count++;
            }
            this.state.totalPixels = count;
        } catch (e) {
            console.error("[PixelGalaxy] loadFromDB fail:", e.message);
        }
    }

    async savePixelToDB(x, y, color, userId, username) {
        if (!supabase) return;
        await supabase.from("pixel_galaxy").upsert({
            room_name: this.roomKey,
            x, y, color,
            user_id: userId,
            username: username || null,
            placed_at: new Date().toISOString(),
        }, { onConflict: "room_name,x,y" });
    }

    async deletePixelFromDB(x, y) {
        if (!supabase) return;
        await supabase.from("pixel_galaxy").delete().eq("room_name", this.roomKey).eq("x", x).eq("y", y);
    }

    checkCooldown(client) {
        const now = Date.now();
        const last = this.cooldowns.get(client.sessionId) || 0;
        if (now - last < COOLDOWN_MS) return false;
        this.cooldowns.set(client.sessionId, now);
        return true;
    }

    validCoord(x, y) { return x >= 0 && x < CANVAS_W && y >= 0 && y < CANVAS_H; }
    validColor(color) { return HEX_RE.test(color); }
}
