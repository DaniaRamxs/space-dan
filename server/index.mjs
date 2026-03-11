/**
 * Spacely Multiplayer Server — Optimized for Railway ($5/mo budget)
 * Colyseus + Express + CORS
 *
 * Optimizations:
 * - Idle auto-shutdown: exits after IDLE_TIMEOUT_MS with 0 WebSocket connections
 *   so Railway can sleep the service and stop billing CPU/RAM.
 * - Ping interval increased to 15s (from 5s) to reduce network overhead.
 * - Duplicate CORS middleware removed.
 * - Game loops only run during active gameplay (see individual rooms).
 * - Logging suppressed in production.
 */

import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
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
import { PuzzleRoom } from "./rooms/PuzzleRoom.mjs";
import { LudoRoom } from "./rooms/LudoRoom.mjs";
import { BeatSoundRoom } from "./rooms/BeatSoundRoom.mjs";
import youtubeRoutes from "./youtubeSearch.mjs";

const PORT = process.env.PORT || 2567;
const IS_PROD = process.env.NODE_ENV === "production";

// Debug: Log environment on startup
console.log(`[STARTUP] NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`[STARTUP] PORT from env: ${process.env.PORT || 'not set (using 2567)'}`);
console.log(`[STARTUP] Final PORT: ${PORT}`);

/* ==================== EXPRESS APP ==================== */

const app = express();

/* ---------------- CORS CONFIGURATION ---------------- */

const allowedOrigins = [
  "https://www.joinspacely.com",
  "https://joinspacely.com", 
  "http://localhost:5173",
  "http://localhost:3000"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  maxAge: 86400,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

/* ---------------- BODY PARSER ---------------- */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------------- HEALTH CHECK ---------------- */

app.get("/", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));
app.get("/health", (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: "ok",
    memory: {
      rss: Math.round(mem.rss / 1048576),       // MB
      heapUsed: Math.round(mem.heapUsed / 1048576),
      heapTotal: Math.round(mem.heapTotal / 1048576),
    },
    uptime: Math.round(process.uptime()),
    port: PORT,
    environment: IS_PROD ? 'production' : 'development'
  });
});

/* ---------------- API ROUTES ---------------- */

app.use("/api", youtubeRoutes);

/* ==================== HTTP SERVER ==================== */

const server = http.createServer(app);

/* ==================== COLYSEUS SERVER ==================== */

const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
    pingInterval: 15000,  // 15s (was 5s) — reduces network traffic ~66%
    pingMaxRetries: 3,
  })
});

// Simple shutdown handler
gameServer.onShutdown(() => { 
  console.log("[SERVER] Colyseus shutdown requested"); 
});

/* ==================== ROOM DEFINITIONS ==================== */

gameServer.define("blackjack", BlackjackRoom).filterBy(['roomName']);
gameServer.define("connect4", Connect4Room).filterBy(['roomName']);
gameServer.define("snake", SnakeDuelRoom).filterBy(['roomName']);
gameServer.define("tetris", TetrisDuelRoom).filterBy(['roomName']);
gameServer.define("poker", PokerRoom).filterBy(['roomName']);
gameServer.define("starboard", StarboardRoom).filterBy(['roomName']);
gameServer.define("asteroid-battle", AsteroidBattleRoom).filterBy(['roomName']);
gameServer.define("chess", ChessRoom).filterBy(['roomName']);
gameServer.define("pixel-galaxy", PixelGalaxyRoom).filterBy(['roomName']);
gameServer.define("puzzle", PuzzleRoom).filterBy(['roomName']);
gameServer.define("ludo", LudoRoom).filterBy(['roomName']);
gameServer.define("beat_sound", BeatSoundRoom).filterBy(['roomName']);

/* ==================== ERROR HANDLING ==================== */

process.on("uncaughtException", (err) => {
  console.error("[SERVER] Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (err) => {
  console.error("[SERVER] Unhandled Rejection:", err?.message || err);
});

/* ==================== START SERVER ==================== */

server.listen(PORT, () => {
  console.log(`🚀 [SERVER] Spacely v2.2.0 | port ${PORT} | ${IS_PROD ? 'prod' : 'dev'} | WebSocket ready`);
  console.log(`🌐 [SERVER] Health: http://localhost:${PORT}/health`);
});

export { app, server, gameServer };
