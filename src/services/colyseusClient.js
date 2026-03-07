import * as Colyseus from "colyseus.js";

const COLYSEUS_URL = window.location.hostname === "localhost"
    ? "ws://localhost:2567"
    : "wss://colyseus-production.up.railway.app"; // Update with actual production URL

export const client = new Colyseus.Client(COLYSEUS_URL);

export const joinOrCreateRoom = async (roomName, options = {}) => {
    try {
        const room = await client.joinOrCreate(roomName, options);
        return room;
    } catch (e) {
        console.error("Colyseus join error", e);
        throw e;
    }
};
