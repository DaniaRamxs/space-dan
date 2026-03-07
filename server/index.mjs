import express from "express";
import http from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { BlackjackRoom } from "./rooms/BlackjackRoom.mjs";
import { Connect4Room } from "./rooms/Connect4Room.mjs";
import { SnakeDuelRoom } from "./rooms/SnakeDuelRoom.mjs";
import { TetrisDuelRoom } from "./rooms/TetrisDuelRoom.mjs";
import { PokerRoom } from "./rooms/PokerRoom.mjs";
import { StarboardRoom } from "./rooms/StarboardRoom.mjs";
import { AsteroidBattleRoom } from "./rooms/AsteroidBattleRoom.mjs";
import { ChessRoom } from "./rooms/ChessRoom.mjs";
import { PixelGalaxyRoom } from "./rooms/PixelGalaxyRoom.mjs";

import cors from "cors";

const port = process.env.PORT || 2567;
const app = express();

app.use(cors());
app.use(express.json());
app.get("/health", (_, res) => res.send("Server is alive!"));

// Pass the HTTP server directly to the transport so Colyseus uses the same server
const server = http.createServer(app);

const gameServer = new Server({
    transport: new WebSocketTransport({
        server,
        maxPayload: 1024 * 1024,
    })
});

// Configure rooms
gameServer.define("blackjack", BlackjackRoom).filterBy(['roomName']);
gameServer.define("connect4", Connect4Room).filterBy(['roomName']);
gameServer.define("snake", SnakeDuelRoom).filterBy(['roomName']);
gameServer.define("tetris", TetrisDuelRoom).filterBy(['roomName']);
gameServer.define("poker", PokerRoom).filterBy(['roomName']);
gameServer.define("starboard", StarboardRoom).filterBy(['roomName']);
gameServer.define("asteroid-battle", AsteroidBattleRoom).filterBy(['roomName']);
gameServer.define("chess", ChessRoom).filterBy(['roomName']);
gameServer.define("pixel-galaxy", PixelGalaxyRoom).filterBy(['roomName']);

const listeners = server.listeners("request");
console.log(`[CORS] listeners after Server init: ${listeners.length}`);
const colyseusHandler = listeners[0];
server.removeAllListeners("request");
server.on("request", (req, res) => {
    const origin = req.headers["origin"] || "*";
    console.log(`[REQ] ${req.method} ${req.url} | origin: ${origin}`);

    if (req.method === "OPTIONS") {
        console.log(`[CORS] → 204 preflight`);
        res.writeHead(204, {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "86400",
        });
        res.end();
        return;
    }

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (typeof colyseusHandler === "function") {
        colyseusHandler(req, res);
    } else {
        console.error("[CORS] colyseusHandler missing — falling back to express");
        app(req, res);
    }
});

server.listen(port, () => {
    console.log(`[Colyseus Server] Battle station active at port ${port}`);
});
