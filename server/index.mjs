import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { BlackjackRoom } from "./rooms/BlackjackRoom.mjs";
import { Connect4Room } from "./rooms/Connect4Room.mjs";
import { SnakeRoom } from "./rooms/SnakeRoom.mjs";
import { TetrisRoom } from "./rooms/TetrisRoom.mjs";
import { PokerRoom } from "./rooms/PokerRoom.mjs";
import { StarboardRoom } from "./rooms/StarboardRoom.mjs";
import { AsteroidBattleRoom } from "./rooms/AsteroidBattleRoom.mjs";
import { ChessRoom } from "./rooms/ChessRoom.mjs";
import { PixelGalaxyRoom } from "./rooms/PixelGalaxyRoom.mjs";
import { PuzzleRoom } from "./rooms/PuzzleRoom.mjs";
import { LudoRoom } from "./rooms/LudoRoom.mjs";

const port = process.env.PORT || 2567;
const app = express();

app.use(cors({
    origin: [
        "https://www.joinspacely.com",
        "https://joinspacely.com",
        "http://localhost:5173"
    ],
    credentials: true
}));

app.options("*path", cors());
app.use(express.json());

app.get("/health", (_, res) => res.send("Server is alive!"));

const server = http.createServer(app);
const gameServer = new Server({
    transport: new WebSocketTransport({
        server,
        pingInterval: 5000,
        pingMaxRetries: 3,
    })
});

// Define rooms
gameServer.define("blackjack", BlackjackRoom).filterBy(['roomName']);
gameServer.define("connect4", Connect4Room).filterBy(['roomName']);
gameServer.define("snake", SnakeRoom).filterBy(['roomName']);
gameServer.define("tetris", TetrisRoom).filterBy(['roomName']);
gameServer.define("poker", PokerRoom).filterBy(['roomName']);
gameServer.define("starboard", StarboardRoom).filterBy(['roomName']);
gameServer.define("asteroid-battle", AsteroidBattleRoom).filterBy(['roomName']);
gameServer.define("chess", ChessRoom).filterBy(['roomName']);
gameServer.define("pixel-galaxy", PixelGalaxyRoom).filterBy(['roomName']);
gameServer.define("puzzle", PuzzleRoom).filterBy(['roomName']);
gameServer.define("ludo", LudoRoom).filterBy(['roomName']);

server.listen(port, () => {
    console.log(`[Colyseus Server] Listening on port ${port}`);
});
