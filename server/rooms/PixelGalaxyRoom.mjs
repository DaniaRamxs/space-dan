import GameRoom from "./GameRoom.mjs";
import { PixelGalaxyState, PixelPlayer, PixelEntry, LeaderboardEntry } from "../schema/PixelGalaxyState.mjs";
import { supabase } from "../supabaseClient.mjs";

const CANVAS_W = 128;
const CANVAS_H = 128;
const COOLDOWN_MS = 1000;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export class PixelGalaxyRoom extends GameRoom {
    static patchRateMs = 250; // collaborative — pixel placement not time-critical
    maxPlayers = 50;

    createPlayer() { return new PixelPlayer(); }

    async initializeGame(options) {
        this.setState(new PixelGalaxyState());
        this.cooldowns = new Map();
        this.roomKey = options.roomName || "default";

        console.log(`[PixelGalaxy] Room "${this.roomKey}" | supabase: ${supabase ? 'OK' : 'NULL'}`);

        await this.loadFromDB();

        this.onMessage("place_pixel", async (client, msg) => {
            if (!this.checkCooldown(client)) return;
            const { x, y, color } = msg;
            if (!this.validCoord(x, y) || !this.validColor(color)) return;

            const key = `${x}_${y}`;
            const player = this.state.players.get(client.sessionId);
            const userId = player?.userId || client.sessionId;
            const username = player?.username || "Anon";
            const avatar = player?.avatar || "/default-avatar.png";

            let pixel = this.state.pixels.get(key);

            // GESTIÓN DE LA GUERRA DE PÍXELES (Sobreescritura)
            if (pixel && pixel.userId !== userId) {
                // El píxel anterior pierde 1 punto de territorio
                const oldOwner = this.state.leaderboard.get(pixel.userId);
                if (oldOwner) oldOwner.count = Math.max(0, oldOwner.count - 1);
            }

            if (pixel) {
                pixel.color = color;
                pixel.userId = userId;
                pixel.username = username;
            } else {
                pixel = new PixelEntry();
                pixel.x = x;
                pixel.y = y;
                pixel.color = color;
                pixel.userId = userId;
                pixel.username = username;
                this.state.pixels.set(key, pixel);
                this.state.totalPixels++;
            }

            // El nuevo dueño gana 1 punto de territorio (o sigue teniendo el punto si solo cambió el color)
            // (Si ya era suyo, no aumentamos doble, solo si cambió el dueño o es nuevo)
            let stats = this.state.leaderboard.get(userId);
            if (!stats) {
                stats = new LeaderboardEntry();
                stats.username = username;
                stats.avatar = avatar;
                stats.count = 0;
                this.state.leaderboard.set(userId, stats);
            }

            // Recalcular exactamente para ser precisos (evitar drifts por errores de lógica)
            // Pero por performance simplemente incrementamos si es un cambio de dueño
            if (!this.state.pixels.get(key) || this.state.pixels.get(key).userId === userId) {
                stats.count++;
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
            const pixel = this.state.pixels.get(key);
            if (pixel) {
                // Descontar del leaderboard al borrar
                const owner = this.state.leaderboard.get(pixel.userId);
                if (owner) owner.count = Math.max(0, owner.count - 1);

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
                .select("x, y, color, user_id, username")
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
                pixel.username = row.username || "Anon";
                this.state.pixels.set(key, pixel);

                // Actualizar contador del leaderboard
                let stats = this.state.leaderboard.get(pixel.userId);
                if (!stats) {
                    stats = new LeaderboardEntry();
                    stats.username = pixel.username;
                    stats.avatar = "/default-avatar.png";
                    stats.count = 0;
                    this.state.leaderboard.set(pixel.userId, stats);
                }
                stats.count++;

                count++;
            }
            this.state.totalPixels = count;
        } catch (e) {
            console.error("[PixelGalaxy] loadFromDB fail:", e.message);
        }
    }

    async savePixelToDB(x, y, color, userId, username) {
        if (!supabase) {
            console.error("[PixelGalaxy] Supabase not configured");
            this.broadcast('save_error', { error: 'Supabase no configurado' });
            return;
        }
        try {
            const { error } = await supabase
                .from("pixel_galaxy")
                .upsert({
                    room_name: this.roomKey,
                    x, y, color,
                    user_id: userId,
                    username: username || null,
                    placed_at: new Date().toISOString(),
                }, { onConflict: 'room_name,x,y' });

            if (error) {
                console.error("[PixelGalaxy] upsert err:", error.message);
                this.broadcast('save_error', { error: error.message });
            }
        } catch (e) {
            console.error("[PixelGalaxy] save exception:", e.message);
            this.broadcast('save_error', { error: e.message });
        }
    }

    async deletePixelFromDB(x, y) {
        if (!supabase) {
            return;
        }
        try {
            const { error } = await supabase.from("pixel_galaxy").delete().eq("room_name", this.roomKey).eq("x", x).eq("y", y);
            if (error) {
                console.error("[PixelGalaxy] delete err:", error.message);
            } else {
                // silent success
            }
        } catch (e) {
            console.error("[PixelGalaxy] delete exception:", e.message);
        }
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
