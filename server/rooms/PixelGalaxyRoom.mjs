import { Room } from "colyseus";
import { PixelGalaxyState, PixelEntry, PixelPlayer } from "../schema/PixelGalaxyState.mjs";

const CANVAS_W    = 128;
const CANVAS_H    = 128;
const COOLDOWN_MS = 1000; // 1 second between placements per player

// Regex: valid #RRGGBB hex color
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export class PixelGalaxyRoom extends Room {
    onCreate(options) {
        this.setState(new PixelGalaxyState());
        this.maxClients = 50;
        // sessionId → last placement timestamp (ms)
        this.cooldowns = new Map();

        // ── place_pixel ───────────────────────────────────────────────────────
        this.onMessage("place_pixel", (client, msg) => {
            if (!this.checkCooldown(client)) return;

            const { x, y, color } = msg;
            if (!this.validCoord(x, y) || !this.validColor(color)) return;

            const key = `${x}_${y}`;
            const existing = this.state.pixels.get(key);

            if (existing) {
                existing.color  = color;
                existing.userId = client.sessionId;
            } else {
                this.state.pixels.set(key, new PixelEntry(x, y, color, client.sessionId));
                this.state.totalPixels++;
            }

            // Increment contribution counter
            const player = this.state.players.get(client.sessionId);
            if (player) player.contributions++;
        });

        // ── remove_pixel ──────────────────────────────────────────────────────
        this.onMessage("remove_pixel", (client, msg) => {
            if (!this.checkCooldown(client)) return;

            const { x, y } = msg;
            if (!this.validCoord(x, y)) return;

            const key = `${x}_${y}`;
            if (this.state.pixels.has(key)) {
                this.state.pixels.delete(key);
                this.state.totalPixels = Math.max(0, this.state.totalPixels - 1);
            }
        });

        // ── clear_mine ────────────────────────────────────────────────────────
        // Removes all pixels placed by the requesting player
        this.onMessage("clear_mine", (client) => {
            const toDelete = [];
            this.state.pixels.forEach((pixel, key) => {
                if (pixel.userId === client.sessionId) toDelete.push(key);
            });
            toDelete.forEach(key => this.state.pixels.delete(key));
            this.state.totalPixels = Math.max(0, this.state.totalPixels - toDelete.length);
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
        console.log(`[PixelGalaxy] ${options.name || 'Anon'} joined — ${this.clients.length} online`);
    }

    onLeave(client) {
        this.state.players.delete(client.sessionId);
        this.cooldowns.delete(client.sessionId);
        // Pixels remain after player leaves (persistent canvas)
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
