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

// Create the HTTP server first, then pass it directly to the transport.
// This ensures Colyseus attaches its matchmaking routes (with built-in CORS)
// to the same server that Express uses — not to an internal empty server.
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

gameServer.listen(port).then(() => {
    console.log(`[Colyseus Server] Battle station active at port ${port}`);
});
