import { Room } from "colyseus";
import { StarboardState, StarboardPlayer, StarboardObject } from "../schema/StarboardState.mjs";

export class StarboardRoom extends Room {
    onCreate(options) {
        this.setState(new StarboardState());

        this.onMessage("cursor", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.nx = message.nx;
                player.ny = message.ny;
                player.color = message.color;
            }
        });

        this.onMessage("obj_add", (client, message) => {
            console.log(`[Starboard] Add Object from ${client.sessionId}:`, message.tool);
            const obj = new StarboardObject(message);
            this.state.objects.set(obj.id, obj);
        });

        this.onMessage("obj_update", (client, message) => {
            const obj = this.state.objects.get(message.id);
            if (obj) {
                obj.assign(message);
            }
        });

        this.onMessage("obj_delete", (client, message) => {
            this.state.objects.delete(message.id);
        });

        this.onMessage("board_clear", (client) => {
            this.state.objects.clear();
        });
    }

    onJoin(client, options) {
        this.state.players.set(client.sessionId, new StarboardPlayer(
            options.userId || client.sessionId,
            options.name || "Invitado",
            options.color || "#ffffff"
        ));
    }

    onLeave(client) {
        this.state.players.delete(client.sessionId);
    }
}
