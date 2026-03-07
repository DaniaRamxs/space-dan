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

// Very permissive CORS for matchmaking
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
}));
app.options('*', cors()); // Explicitly handle pre-flight requests

app.use(express.json());

// Add a simple health check route
app.get("/health", (req, res) => res.send("Server is alive!"));

const server = http.createServer(app);
const gameServer = new Server({
    transport: new WebSocketTransport({
        server
    })
});

gameServer.define("blackjack", BlackjackRoom).filterBy(['roomName']);
gameServer.define("connect4", Connect4Room).filterBy(['roomName']);
gameServer.define("snake", SnakeDuelRoom).filterBy(['roomName']);
gameServer.define("tetris", TetrisDuelRoom).filterBy(['roomName']);
gameServer.define("poker", PokerRoom).filterBy(['roomName']);
gameServer.define("starboard", StarboardRoom).filterBy(['roomName']);
gameServer.define("asteroid-battle", AsteroidBattleRoom).filterBy(['roomName']);
gameServer.define("chess", ChessRoom).filterBy(['roomName']);
gameServer.define("pixel-galaxy", PixelGalaxyRoom).filterBy(['roomName']);

// start server
gameServer.listen(port);
console.log(`[Colyseus Server] Listening on ws://localhost:${port}`);
