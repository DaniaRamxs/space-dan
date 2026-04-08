import * as Colyseus from "colyseus.js";

function getColyseusUrl() {
    if (process.env.NEXT_PUBLIC_COLYSEUS_URL) return process.env.NEXT_PUBLIC_COLYSEUS_URL;
    if (typeof window === 'undefined') return "wss://spacely-server-production.up.railway.app";
    return (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? `ws://${window.location.hostname}:2567`
        : "wss://spacely-server-production.up.railway.app";
}

export const client = typeof window !== 'undefined' ? new Colyseus.Client(getColyseusUrl()) : null;

export const joinOrCreateRoom = async (roomName, options = {}) => {
    try {
        const room = await client.joinOrCreate(roomName, options);
        return room;
    } catch (e) {
        console.error("Colyseus join error", e);
        throw e;
    }
};
