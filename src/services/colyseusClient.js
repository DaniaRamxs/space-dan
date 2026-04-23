import * as Colyseus from "colyseus.js";

const PROD_COLYSEUS_URL = "wss://spacely-server-production.up.railway.app";

function isNativePlatform() {
    if (typeof window === 'undefined') return false;
    const w = window;
    return (
        (typeof w.Capacitor !== 'undefined' && w.Capacitor.isNativePlatform?.()) ||
        w.__TAURI_INTERNALS__ !== undefined ||
        w.location.hostname === 'tauri.localhost' ||
        w.location.protocol === 'tauri:'
    );
}

function getColyseusUrl() {
    if (process.env.NEXT_PUBLIC_COLYSEUS_URL) return process.env.NEXT_PUBLIC_COLYSEUS_URL;
    if (typeof window === 'undefined') return PROD_COLYSEUS_URL;
    // Capacitor/Tauri native: localhost = device, never the dev server
    if (isNativePlatform()) return PROD_COLYSEUS_URL;
    return (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? `ws://${window.location.hostname}:2567`
        : PROD_COLYSEUS_URL;
}

export const client = typeof window !== 'undefined' ? new Colyseus.Client(getColyseusUrl()) : null;

export const joinOrCreateRoom = async (roomName, options = {}) => {
    if (!client) throw new Error('Colyseus client not initialized (SSR)');
    try {
        const room = await client.joinOrCreate(roomName, options);
        return room;
    } catch (e) {
        console.error("Colyseus join error", e);
        throw e;
    }
};
