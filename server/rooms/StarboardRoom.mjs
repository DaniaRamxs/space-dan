import GameRoom from "./GameRoom.mjs";
import { StarboardState, StarboardPlayer, StarboardObject } from "../schema/StarboardState.mjs";

export class StarboardRoom extends GameRoom {
    maxPlayers = 25;

    createPlayer() { return new StarboardPlayer(); }

    initializeGame(options) {
        this.setState(new StarboardState());

        this.onMessage("cursor", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.nx = message.nx;
                player.ny = message.ny;
            }
        });

        this.onMessage("obj_add", (client, message) => {
            const obj = new StarboardObject();
            obj.assign(message);
            this.state.objects.set(obj.id, obj);
        });

        this.onMessage("obj_update", (client, message) => {
            const obj = this.state.objects.get(message.id);
            if (obj) obj.assign(message);
        });

        this.onMessage("obj_delete", (client, message) => {
            this.state.objects.delete(message.id);
        });

        this.onMessage("board_clear", (client) => {
            this.state.objects.clear();
        });
    }

    async onJoin(client, options) {
        await super.onJoin(client, options);
    }
}
