import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

/**
 * BeatSoundState - Schema para el juego de ritmo sincronizado
 * Maneja: beats, puntuación, jugadores, efectos visuales
 */

// Jugador individual en la sesión
export class PlayerState extends Schema {
    constructor() {
        super();
        this.sessionId = "";
        this.userId = "";
        this.username = "Anon";
        this.avatar = "/default-avatar.png";
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.perfectHits = 0;
        this.goodHits = 0;
        this.missHits = 0;
        this.streak = 0; // Fire streak
        this.color = "#ff6b6b"; // Color de ondas personalizado
        this.isReady = false;
        this.lastHitTime = 0;
        this.ping = 0; // Latencia del jugador
        this.timeOffset = 0; // Offset de tiempo server-client
    }
}

type("string")(PlayerState.prototype, "sessionId");
type("string")(PlayerState.prototype, "userId");
type("string")(PlayerState.prototype, "username");
type("string")(PlayerState.prototype, "avatar");
type("number")(PlayerState.prototype, "score");
type("number")(PlayerState.prototype, "combo");
type("number")(PlayerState.prototype, "maxCombo");
type("number")(PlayerState.prototype, "perfectHits");
type("number")(PlayerState.prototype, "goodHits");
type("number")(PlayerState.prototype, "missHits");
type("number")(PlayerState.prototype, "streak");
type("string")(PlayerState.prototype, "color");
type("boolean")(PlayerState.prototype, "isReady");
type("number")(PlayerState.prototype, "lastHitTime");
type("number")(PlayerState.prototype, "ping");
type("number")(PlayerState.prototype, "timeOffset");

// Un beat individual en la timeline
export class BeatState extends Schema {
    constructor() {
        super();
        this.time = 0; // Tiempo en ms desde inicio
        this.serverTime = 0; // Timestamp server cuando debe sonar
        this.duration = 500;
        this.type = "normal"; // normal, double, hold, special
        this.intensity = 1;
        this.lane = 0; // Carril (0-3) para Rhythm Dash
        this.isActive = true;
        this.hitByCount = 0;
        this.hitFeedback = ""; // "perfect", "good", "miss"
    }
}

type("number")(BeatState.prototype, "time");
type("number")(BeatState.prototype, "serverTime");
type("number")(BeatState.prototype, "duration");
type("string")(BeatState.prototype, "type");
type("number")(BeatState.prototype, "intensity");
type("number")(BeatState.prototype, "lane");
type("boolean")(BeatState.prototype, "isActive");
type("number")(BeatState.prototype, "hitByCount");
type("string")(BeatState.prototype, "hitFeedback");

// Hit reciente para feedback visual - OPTIMIZADO: campos esenciales solo
export class HitFeedback extends Schema {
    constructor() {
        super();
        this.playerId = "";
        this.accuracy = "miss"; // perfect, good, miss (simplificado, no great)
        this.points = 0;
        this.combo = 0;
        this.timestamp = 0;
    }
}

type("string")(HitFeedback.prototype, "playerId");
type("string")(HitFeedback.prototype, "accuracy");
type("number")(HitFeedback.prototype, "points");
type("number")(HitFeedback.prototype, "combo");
type("number")(HitFeedback.prototype, "timestamp");

// Configuración de dificultad con ventanas precisas
export class GameConfig extends Schema {
    constructor() {
        super();
        this.difficulty = "normal";
        this.perfectWindow = 40;  // ±40ms = PERFECT 
        this.greatWindow = 80;    // ±80ms = GREAT   
        this.goodWindow = 120;    // ±120ms = GOOD   
        this.preBeatWarning = 1000;
        this.showGhostLines = true;
        this.vibrationEnabled = true;
        this.soundEffectsEnabled = true;
    }
}

type("string")(GameConfig.prototype, "difficulty");
type("number")(GameConfig.prototype, "perfectWindow");
type("number")(GameConfig.prototype, "greatWindow");
type("number")(GameConfig.prototype, "goodWindow");
type("number")(GameConfig.prototype, "preBeatWarning");
type("boolean")(GameConfig.prototype, "showGhostLines");
type("boolean")(GameConfig.prototype, "vibrationEnabled");
type("boolean")(GameConfig.prototype, "soundEffectsEnabled");

// Estado de sincronización Galáctica
export class GalacticSync extends Schema {
    constructor() {
        super();
        this.active = false;
        this.intensity = 0; // 2-8 jugadores
        this.startTime = 0;
        this.effectType = "meteor"; // meteor, galaxy, supernova
    }
}

type("boolean")(GalacticSync.prototype, "active");
type("number")(GalacticSync.prototype, "intensity");
type("number")(GalacticSync.prototype, "startTime");
type("string")(GalacticSync.prototype, "effectType");

// Estado principal
export class BeatSoundState extends Schema {
    constructor() {
        super();
        this.players = new MapSchema();
        this.beats = new ArraySchema();
        this.recentHits = new ArraySchema();
        this.config = new GameConfig();
        this.galacticSync = new GalacticSync();
        
        // Tiempo sincronizad
        this.serverStartTime = 0; // Cuando empezó la canción (server timestamp)
        this.trackDuration = 180000; // 3 minutos por defecto
        this.currentTime = 0;
        this.isPlaying = false;
        this.gamePhase = 0;
        this.countdown = 3;
        
        // Info de canción
        this.roomName = "";
        this.currentTrackId = "";
        this.currentTrackName = "";
        this.currentTrackArtist = "";
        
        // YouTube sync
        this.youtubeReadyTime = 0; // Cuando YouTube está listo
        this.youtubeBuffering = false;
        
        // Leaderboard
        this.leaderId = "";
    }
}

type({ map: PlayerState })(BeatSoundState.prototype, "players");
type({ array: BeatState })(BeatSoundState.prototype, "beats");
type({ array: HitFeedback })(BeatSoundState.prototype, "recentHits");
type(GameConfig)(BeatSoundState.prototype, "config");
type(GalacticSync)(BeatSoundState.prototype, "galacticSync");
type("number")(BeatSoundState.prototype, "serverStartTime");
type("number")(BeatSoundState.prototype, "trackDuration");
type("number")(BeatSoundState.prototype, "currentTime");
type("boolean")(BeatSoundState.prototype, "isPlaying");
type("number")(BeatSoundState.prototype, "gamePhase");
type("number")(BeatSoundState.prototype, "countdown");
type("string")(BeatSoundState.prototype, "roomName");
type("string")(BeatSoundState.prototype, "currentTrackId");
type("string")(BeatSoundState.prototype, "currentTrackName");
type("string")(BeatSoundState.prototype, "currentTrackArtist");
type("number")(BeatSoundState.prototype, "youtubeReadyTime");
type("boolean")(BeatSoundState.prototype, "youtubeBuffering");
type("string")(BeatSoundState.prototype, "leaderId");
