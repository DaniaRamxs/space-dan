import { Room } from "colyseus";
import { BeatSoundState, PlayerState, BeatState, HitFeedback } from "../schema/BeatSoundState.mjs";

const IS_PROD = process.env.NODE_ENV === "production";
const log = (...args) => { if (!IS_PROD) console.log(...args); };

const BEAT_INTERVALS = {
    easy: 800,    // ms entre beats
    normal: 600,
    pro: 400,
};

const POINTS = {
    perfect: 100,
    good: 50,
    miss: 0,
};

const COLORS = [
    "#ff6b6b", // Rojo
    "#4ecdc4", // Turquesa
    "#ffe66d", // Amarillo
    "#95e1d3", // Menta
    "#f38181", // Coral
    "#aa96da", // Púrpura
    "#fcbad3", // Rosa
    "#ffffd2", // Crema
];

export class BeatSoundRoom extends Room {
    maxClients = 8;
    
    onCreate(options) {
        this.setState(new BeatSoundState());
        this.autoDispose = true;
        this.setPatchRate(100); // 10 syncs/sec — rhythm needs decent sync
        this.state.roomName = options.roomName || "beat-sound-room";
        
        // Generar beats aleatorios para la canción
        this.generateBeats();
        
        // Mensajes del cliente
        this.onMessage("ping", (client, data) => {
            client.send("pong", { serverTime: Date.now(), clientTime: data.clientTime });
        });
        
        this.onMessage("hit", (client, data) => {
            this.validateHit(client, data.clientTime, data.x, data.y);
        });
        
        this.onMessage("ready", (client) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.isReady = true;
                this.checkAllReady();
            }
        });
        
        this.onMessage("set_track", (client, data) => {
            // Solo el host puede cambiar canción
            if (client.sessionId === this.state.leaderId || this.state.players.size === 1) {
                this.state.currentTrackId = data.trackId;
                this.state.currentTrackName = data.trackName;
                this.state.currentTrackArtist = data.artist;
                // Duración por defecto: 3 minutos (180000ms)
                this.state.trackDuration = data.duration || 180000;
                this.generateBeats();
            }
        });
        
        this.onMessage("set_difficulty", (client, data) => {
            if (client.sessionId === this.state.leaderId || this.state.players.size === 1) {
                this.state.config.difficulty = data.difficulty;
                this.generateBeats();
            }
        });
        
        this.onMessage("update_duration", (client, data) => {
            if (data.duration && data.duration > 0) {
                this.state.trackDuration = data.duration;
                log(`[BeatSound] Track duration updated to ${data.duration}ms`);
                // Regenerar beats con la nueva duración
                this.generateBeats();
            }
        });
        
        this.onMessage("sync_time", (client, data) => {
            // Sincronizar tiempo del juego con el audio del cliente
            if (this.state.isPlaying && data.currentTime !== undefined) {
                // Solo actualizar si la diferencia es significativa (>200ms)
                const diff = Math.abs(this.state.currentTime - data.currentTime);
                if (diff > 200) {
                    this.state.currentTime = data.currentTime;
                    log(`[BeatSound] Time synced to ${data.currentTime}ms (diff: ${diff}ms)`);
                }
            }
        });
        
        // Game loop starts only when game is playing (see startGame/endRound)
        this.gameLoop = null;
    }

    _startGameLoop() {
        if (this.gameLoop) return;
        this.gameLoop = this.clock.setInterval(() => {
            this.state.currentTime += 100;
            this.updateActiveBeats();
            if (this.state.currentTime >= this.state.trackDuration) {
                this.endRound();
            }
        }, 100); // 100ms tick — halves CPU vs 50ms, still within hit windows
    }

    _stopGameLoop() {
        if (this.gameLoop) {
            this.gameLoop.clear();
            this.gameLoop = null;
        }
    }
    
    async onJoin(client, options) {
        const player = new PlayerState();
        player.sessionId = client.sessionId;
        player.userId = options.userId || client.sessionId;
        player.username = options.username || "Anon";
        player.avatar = options.avatar || "/default-avatar.png";
        player.color = COLORS[this.state.players.size % COLORS.length];
        
        this.state.players.set(client.sessionId, player);
        
        // Primer jugador es líder
        if (this.state.players.size === 1) {
            this.state.leaderId = client.sessionId;
        }
        
        log(`[BeatSound] ${player.username} joined`);
    }
    
    async onLeave(client, consented) {
        this.state.players.delete(client.sessionId);
        
        // Reasignar líder si era el que salió
        if (client.sessionId === this.state.leaderId && this.state.players.size > 0) {
            const next = this.state.players.values().next();
            if (next.value) {
                this.state.leaderId = next.value.sessionId;
            }
        }
        
        log(`[BeatSound] left, remaining: ${this.state.players.size}`);
    }
    
    onDispose() {
        this._stopGameLoop();
        log("[BeatSound] Room disposed");
    }
    
    // Generar beats basados en dificultad
    generateBeats() {
        this.state.beats.clear();
        const interval = BEAT_INTERVALS[this.state.config.difficulty] || 600;
        const duration = this.state.trackDuration || 120000; // 2 min default
        
        let time = 2000; // Empezar después de 2 segundos
        let beatCount = 0;
        
        while (time < duration) {
            const beat = new BeatState();
            beat.time = time;
            beat.duration = this.state.config.beatWindow;
            
            // Cada 10 beats, uno especial
            if (beatCount % 10 === 9) {
                beat.type = "special";
                beat.intensity = 3;
            } else if (beatCount % 5 === 4) {
                beat.type = "double";
                beat.intensity = 2;
            } else {
                beat.type = "normal";
                beat.intensity = 1;
            }
            
            this.state.beats.push(beat);
            
            // Variación aleatoria en intervalo
            const variance = Math.random() * 200 - 100;
            time += interval + variance;
            beatCount++;
        }
        
        log(`[BeatSound] Generated ${beatCount} beats`);
    }
    
    // Validación server-side de hits con precisión
    validateHit(client, clientTime, x, y) {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;
        
        // Aplicar offset del jugador
        const adjustedTime = this.state.currentTime;
        
        // Encontrar beat más cercano
        let closestBeat = null;
        let minDiff = Infinity;
        
        for (const beat of this.state.beats) {
            if (!beat.isActive) continue;
            
            const diff = Math.abs(adjustedTime - beat.time);
            if (diff < minDiff && diff < this.state.config.goodWindow * 2) {
                minDiff = diff;
                closestBeat = beat;
            }
        }
        
        // Calcular precisión con ventanas
        let accuracy = "miss";
        let points = 0;
        const config = this.state.config;
        
        if (closestBeat && minDiff <= config.goodWindow) {
            if (minDiff <= config.perfectWindow) {
                accuracy = "perfect";
                points = 100;
                player.perfectHits++;
                player.streak++;
            } else if (minDiff <= config.greatWindow) {
                accuracy = "great";
                points = 75;
                player.goodHits++;
                player.streak++;
            } else {
                accuracy = "good";
                points = 50;
                player.goodHits++;
                player.streak = Math.max(0, player.streak - 1);
            }
            
            // Bonus por tipo
            if (closestBeat.type === "special") points *= 3;
            else if (closestBeat.type === "double") points *= 2;
            
            closestBeat.hitByCount++;
        } else {
            player.missHits++;
            player.streak = 0;
            player.combo = 0;
        }
        
        // Combo multiplier
        if (accuracy !== "miss") {
            const comboMultiplier = 1 + (player.combo * 0.05);
            points = Math.floor(points * comboMultiplier);
            player.combo++;
            if (player.combo > player.maxCombo) {
                player.maxCombo = player.combo;
            }
        }
        
        player.score += points;
        player.lastHitTime = Date.now();
        
        // Crear resultado
        const result = new HitResult();
        result.playerId = client.sessionId;
        result.username = player.username;
        result.accuracy = accuracy;
        result.diff = minDiff;
        result.points = points;
        result.combo = player.combo;
        result.x = x || 0.5;
        result.y = y || 0.5;
        result.timestamp = Date.now();
        result.color = {
            perfect: "#a855f7",
            great: "#3b82f7",
            good: "#eab308",
            miss: "#ef4444"
        }[accuracy];
        
        this.state.recentHits.push(result);
        
        // Enviar feedback
        client.send("hit_result", {
            accuracy,
            diff: minDiff,
            points,
            combo: player.combo,
        });
        
        // Verificar Galactic Sync
        this.checkGalacticSync(accuracy);
        this.updateLeader();
        
        // Limpiar hit antiguo
        setTimeout(() => {
            const idx = this.state.recentHits.indexOf(result);
            if (idx > -1) this.state.recentHits.splice(idx, 1);
        }, 2000);
    }
    
    // Registrar hit para feedback visual
    registerHit(playerId, type, points, combo = 0) {
        const feedback = new HitFeedback();
        feedback.playerId = playerId;
        feedback.type = type;
        feedback.points = points;
        feedback.combo = combo;
        feedback.time = Date.now();
        feedback.x = 0.3 + Math.random() * 0.4; // Centro de pantalla
        feedback.y = 0.2 + Math.random() * 0.3;
        
        this.state.recentHits.push(feedback);
        
        // Limpiar hits antiguos después de 2 segundos
        setTimeout(() => {
            const idx = this.state.recentHits.indexOf(feedback);
            if (idx > -1) {
                this.state.recentHits.splice(idx, 1);
            }
        }, 2000);
    }
    
    // Verificar Galactic Sync (2+ jugadores perfect)
    checkGalacticSync(accuracy) {
        if (accuracy !== "perfect" && accuracy !== "great") return;
        
        const now = Date.now();
        const recentHits = Array.from(this.state.recentHits.values())
            .filter(h => h.accuracy === "perfect" && now - h.timestamp < 300);
        
        const uniquePlayers = new Set(recentHits.map(h => h.playerId));
        
        if (uniquePlayers.size >= 2) {
            this.state.galacticSync.active = true;
            this.state.galacticSync.intensity = uniquePlayers.size;
            this.state.galacticSync.startTime = now;
            this.state.galacticSync.effectType = uniquePlayers.size >= 4 ? "supernova" : 
                                                  uniquePlayers.size >= 3 ? "galaxy" : "meteor";
            
            this.broadcast("galactic_sync", {
                intensity: uniquePlayers.size,
                effectType: this.state.galacticSync.effectType,
            });
            
            setTimeout(() => {
                this.state.galacticSync.active = false;
                this.state.galacticSync.intensity = 0;
            }, 3000);
        }
    }
    
    // Actualizar quién va ganando
    updateLeader() {
        let maxScore = -1;
        let leaderId = "";
        
        for (const [id, player] of this.state.players) {
            if (player.score > maxScore) {
                maxScore = player.score;
                leaderId = id;
            }
        }
        
        this.state.leaderId = leaderId;
    }
    
    // Actualizar beats activos basado en tiempo actual
    updateActiveBeats() {
        const currentTime = this.state.currentTime;
        
        for (const beat of this.state.beats) {
            // Desactivar beats que ya pasaron mucho tiempo
            if (currentTime > beat.time + this.state.config.goodWindow * 2) {
                if (beat.isActive && beat.hitByCount === 0) {
                    // Nadie acertó este beat - contar como miss para todos
                    beat.isActive = false;
                }
            }
            
            // Activar beats próximos
            if (currentTime >= beat.time - this.state.config.preBeatWarning) {
                beat.isActive = true;
            }
        }
    }
    
    // Verificar si todos están listos para empezar
    checkAllReady() {
        if (this.state.players.size === 0) return;
        
        const allReady = Array.from(this.state.players.values())
            .every(p => p.isReady);
        
        if (allReady && this.state.gamePhase === 0) {
            this.startCountdown();
        }
    }
    
    // Iniciar cuenta regresiva
    startCountdown() {
        this.state.gamePhase = 1;
        this.state.countdown = 3;
        
        const countdownInterval = setInterval(() => {
            this.state.countdown--;
            
            if (this.state.countdown <= 0) {
                clearInterval(countdownInterval);
                this.startGame();
            }
        }, 1000);
    }
    
    // Empezar juego
    startGame() {
        this.state.gamePhase = 2;
        this.state.isPlaying = true;
        this.state.currentTime = 0;
        this.state.serverStartTime = Date.now();
        this._startGameLoop();
        
        // Resetear jugadores
        for (const player of this.state.players.values()) {
            player.score = 0;
            player.combo = 0;
            player.maxCombo = 0;
            player.perfectHits = 0;
            player.goodHits = 0;
            player.missHits = 0;
            player.streak = 0;
        }
        
        // Resetear beats
        for (const beat of this.state.beats) {
            beat.isActive = false;
            beat.hitByCount = 0;
            beat.hitFeedback = "";
        }
        
        this.broadcast("game_start", {
            serverStartTime: this.state.serverStartTime,
            trackId: this.state.currentTrackId,
        });
        
        log("[BeatSound] Game started!");
    }
    
    // Terminar ronda
    endRound() {
        this.state.isPlaying = false;
        this.state.gamePhase = 3;
        this._stopGameLoop();
        
        // Calcular accuracy
        for (const player of this.state.players.values()) {
            const total = player.perfectHits + player.goodHits + player.missHits;
            if (total > 0) {
                player.accuracy = Math.floor(
                    ((player.perfectHits * 100 + player.goodHits * 75) / total)
                );
            }
        }
        
        this.broadcast("game_end", { 
            leaderboard: Array.from(this.state.players.values())
                .sort((a, b) => b.score - a.score)
                .map(p => ({ username: p.username, score: p.score }))
        });
        
        log("[BeatSound] Round ended");
    }
}
