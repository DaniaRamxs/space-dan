import * as Colyseus from "colyseus.js";

const COLYSEUS_URL = import.meta.env.VITE_COLYSEUS_URL ||
    ((window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? `ws://${window.location.hostname}:2567`
        : "wss://spacely-server-production.up.railway.app");

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
