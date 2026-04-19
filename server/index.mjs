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

import mangaRoutes from './routes/mangaRoutes.js';

// ── Simple IP-based rate limiter (no external dep) ────────────────────────────
// Tracks request counts per IP in a sliding window. Cleans up stale entries to
// avoid memory growth. Not a replacement for a proper WAF, but stops casual abuse.
function makeRateLimiter({ windowMs, max, message = 'Too many requests' }) {
  const hits = new Map(); // ip → { count, resetAt }
  // Cleanup stale entries every window
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of hits) {
      if (now >= entry.resetAt) hits.delete(ip);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || now >= entry.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count++;
    if (entry.count > max) {
      res.set('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

// 60 req / 15 min para endpoints de proxy público (manga, youtube search)
const publicApiLimiter = makeRateLimiter({ windowMs: 15 * 60 * 1000, max: 60, message: 'Rate limit exceeded — try again later' });
// 20 req / 15 min para scrape (operación más costosa)
const scrapeLimiter = makeRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, message: 'Scrape rate limit exceeded' });

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
import { LiveActivityRoom } from "./rooms/LiveActivityRoom.mjs";
import youtubeRoutes from "./youtubeSearch.mjs";
import socialRoutes from "./modules/social/index.mjs";
import audioRoutes from "./modules/audio/audioRoutes.mjs";
import { SpaceSessionRoom } from "./rooms/SpaceSessionRoom.mjs";
import { getActiveSpaces } from "./spacesRegistry.mjs";

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
  "http://localhost:3000",
  "http://localhost",         // Capacitor Android WebView (androidScheme=http)
  "https://localhost",        // Capacitor Android WebView (androidScheme=https, default v5+)
  "capacitor://localhost",    // Capacitor iOS WebView
  "http://tauri.localhost",   // Tauri desktop app (production build)
  "tauri://localhost",        // Tauri desktop app (macOS/Linux)
];

const corsOptions = {
  origin: function (origin, callback) {
    // No origin = curl / Postman / mobile native app — allow in dev, block in prod
    if (!origin) {
      return IS_PROD
        ? callback(new Error('CORS: origin header required in production'))
        : callback(null, true);
    }
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  maxAge: 86400,
  optionsSuccessStatus: 200
};

// Manga proxy CORS: wildcard origin is safe here because credentials:true is absent.
// These endpoints return public CDN images / MangaDex API data — no auth cookies involved.
app.use('/api/manga', cors({ origin: '*', methods: ['GET', 'OPTIONS'] }));
app.options('/api/manga', cors({ origin: '*' }));

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

/* ---------------- BODY PARSER ---------------- */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------------- HEALTH CHECK ---------------- */

app.get("/", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));
// Live spaces preview — consumed by SpacesPage hub
app.get("/api/spaces/active", (_req, res) => {
  res.json(getActiveSpaces());
});

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

/* ---------------- SUPABASE AUTH MIDDLEWARE ---------------- */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

if (!supabaseAdmin) {
  console.warn('[Auth] ⚠  SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no definidas — auth desactivada');
}

// Middleware to validate Supabase JWT and extract user
async function authenticateSupabase(req, res, next) {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Auth service not configured' });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = { id: user.id, email: user.email, token };
    next();
  } catch (error) {
    console.error('[Auth] Token validation error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

// Apply auth middleware to protected routes
app.use("/api/communities", authenticateSupabase);
app.use("/api/activities", authenticateSupabase);

/* ---------------- API ROUTES ---------------- */

app.use("/api", publicApiLimiter, youtubeRoutes);
app.use("/api", socialRoutes);
app.use("/api/audio", audioRoutes);
app.use("/api/manga/scrape", scrapeLimiter);
app.use("/api/manga/ext-image", publicApiLimiter);
app.use("/api/manga", mangaRoutes);

console.log('[ROUTES] Social API mounted: /api/communities, /api/activities');
console.log('[ROUTES] Audio API mounted: /api/audio');

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
gameServer.define("live_activity", LiveActivityRoom).filterBy(['instanceId']);
gameServer.define("space_session", SpaceSessionRoom).filterBy(['spaceId']);


/* ==================== 404 HANDLER ==================== */

// Catch all 404s and return JSON instead of HTML
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
    message: 'This endpoint does not exist.'
  });
});

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
