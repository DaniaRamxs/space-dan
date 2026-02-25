import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import SeasonMiniBadge from '../components/SeasonMiniBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '../contexts/AuthContext';
import { getProductivityStats, finishFocusSession, getRecentFocusSessions } from '../services/productivity';
import CabinPomodoro from '../components/CabinPomodoro';
import CabinTodo from '../components/CabinTodo';
import CabinIdeas from '../components/CabinIdeas';
import { useSeason } from '../hooks/useSeason';
import * as FaceMeshLib from '@mediapipe/face_mesh';
import * as CameraLib from '@mediapipe/camera_utils';

import { Link } from 'react-router-dom';
import RadioPlayer from '../components/RadioPlayer';

export default function SpaceCabinPage() {
    const { user } = useAuthContext();
    const { claimSeasonReward } = useSeason();
    const [stats, setStats] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Real-time biometric buffer for the telemetry graph
    const [bioHistory, setBioHistory] = useState(Array.from({ length: 20 }, () => ({ fatigue: 0, movement: 0 })));

    useEffect(() => {
        if (user) loadStats();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [user]);

    const handleTelemetryUpdate = useCallback((data) => {
        setBioHistory(prev => {
            const next = [...prev.slice(1), { fatigue: data.fatigue, movement: data.movement }];
            return next;
        });
    }, []);

    const loadStats = async () => {
        try {
            const [s, sessions] = await Promise.all([
                getProductivityStats(user.id),
                getRecentFocusSessions(user.id, 7)
            ]);
            setStats(s);

            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return { date: d.toISOString().split('T')[0], label: d.toLocaleDateString('es', { weekday: 'short' }), total: 0 };
            });

            sessions.forEach(sess => {
                const day = sess.created_at.split('T')[0];
                const dayObj = last7Days.find(d => d.date === day);
                if (dayObj) dayObj.total += (sess.duration_minutes || 0);
            });
            setChartData([...last7Days]); // Use spread to ensure state update triggers
        } catch (err) {
            console.error('[CabinStats] Load Error:', err);
            // Even on error, show the empty chart
            const fallbackDays = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return { label: d.toLocaleDateString('es', { weekday: 'short' }), total: 0 };
            });
            setChartData(fallbackDays);
        } finally {
            setLoading(false);
        }
    };

    const handlePomodoroFinish = async (minutes) => {
        if (!user) return;
        try {
            const newStats = await finishFocusSession(user.id, minutes);
            setStats((prev) => ({
                ...prev,
                total_focus_minutes: newStats.minutes,
                total_sessions: newStats.sessions,
                current_streak: newStats.streak,
                dancoins_earned: (prev?.dancoins_earned || 0) + newStats.coins_awarded
            }));
            const baseCoins = newStats.coins_awarded > 0 ? newStats.coins_awarded : 10;
            await claimSeasonReward(baseCoins);
            loadStats();
        } catch (err) {
            console.error(err);
        }
    };

    if (!user) return null;

    return (
        <div className="cabin-cockpit min-h-screen bg-[#020205] text-white p-4 md:p-8 lg:p-12 select-none flex flex-col overflow-x-hidden">
            {/* Header / HUD Overlay */}
            <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 md:mb-12 z-50">
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 w-full md:w-auto text-center md:text-left">
                    <Link to="/posts" className="order-2 md:order-1 px-6 py-3 bg-white/5 hover:bg-red-500/20 border border-white/10 rounded-xl transition-all group w-full md:w-auto">
                        <span className="text-[10px] font-black tracking-widest text-white/40 group-hover:text-red-400">✕ SALIR_AL_UNIVERSO</span>
                    </Link>
                    <div className="hidden md:block h-10 w-[1px] bg-white/10 order-2"></div>
                    <div className="space-y-0.5 order-1 md:order-3">
                        <div className="text-[8px] md:text-[10px] font-black tracking-[0.5em] text-cyan-500 uppercase">CABINA ESPACIAL DE SPACE_DAN</div>
                        <h1 className="text-xl md:text-3xl font-black italic tracking-tighter uppercase">SISTEMA <span className="text-cyan-400">FOCUS GUARD PRO</span></h1>
                    </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 md:gap-12 w-full md:w-auto border-t md:border-none border-white/5 pt-6 md:pt-0">
                    <div className="flex flex-col items-start md:items-center">
                        <div className="text-[8px] md:text-[10px] font-black tracking-widest text-white/20 uppercase mb-1">Time_STD</div>
                        <div className="text-lg md:text-2xl font-black font-mono tracking-widest">
                            {currentTime.toLocaleTimeString('es', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                    <div className="flex gap-4 md:gap-8">
                        <StatBox label="RACHA" value={`${stats?.current_streak || 0}d`} icon="🔥" />
                        <StatBox label="MINS" value={stats?.total_focus_minutes || 0} icon="⌛" />
                    </div>
                </div>
            </header>

            {/* Main Cockpit Grid */}
            <div className="max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch flex-1 pb-8 w-full">

                {/* Left Panel: Primary Systems */}
                <div className="lg:col-span-3 space-y-6 flex flex-col order-2 lg:order-1">
                    <CockpitPanel title="CRONOS // POMODORO" icon="⏲️">
                        <CabinPomodoro onFinish={handlePomodoroFinish} />
                    </CockpitPanel>

                    <CockpitPanel title="TELEMETRÍA // ENLACE BIOMÉTRICO" icon="🧬" className="min-h-[300px] lg:flex-1">
                        <div className="flex flex-col h-full justify-between gap-4 overflow-hidden">
                            <div className="flex-1 flex flex-col gap-4">
                                {/* Fatigue Real-time Wave */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[8px] font-bold text-cyan-500/50 uppercase">
                                        <span>Monitor_Fatiga</span>
                                        <span className={(bioHistory[bioHistory.length - 1]?.fatigue || 0) > 50 ? 'text-red-400' : 'text-cyan-400'}>
                                            {Math.round(bioHistory[bioHistory.length - 1]?.fatigue || 0)}%
                                        </span>
                                    </div>
                                    <div className="h-16 flex items-end gap-[2px] bg-white/[0.02] rounded-lg p-1 border border-white/5 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(6,182,212,0.05)_50%,transparent_100%)] animate-[scan_2s_linear_infinite]"></div>
                                        {bioHistory.map((d, i) => (
                                            <div
                                                key={i}
                                                className={`flex-1 rounded-full transition-all duration-300 ${d.fatigue > 50 ? 'bg-red-500' : 'bg-cyan-500'}`}
                                                style={{
                                                    height: `${Math.max(10, d.fatigue)}%`,
                                                    opacity: 0.2 + (i / bioHistory.length) * 0.8
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Movement Real-time Wave */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[8px] font-bold text-cyan-500/50 uppercase">
                                        <span>Sync_Motor // Inclinación</span>
                                        <span className="text-cyan-400">{Math.round((bioHistory[bioHistory.length - 1]?.movement || 0) * 100)}%</span>
                                    </div>
                                    <div className="h-16 flex items-end gap-[2px] bg-white/[0.02] rounded-lg p-1 border border-white/5 relative overflow-hidden">
                                        {bioHistory.map((d, i) => (
                                            <div
                                                key={i}
                                                className="flex-1 bg-white/20 rounded-full transition-all duration-300"
                                                style={{
                                                    height: `${Math.max(5, d.movement * 100)}%`,
                                                    opacity: 0.1 + (i / bioHistory.length) * 0.6
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="text-[9px] font-mono text-cyan-500/60 uppercase p-3 border-t border-white/5 bg-white/[0.01] flex justify-between">
                                <span>{' >'} ENLACE: ESTABLECIDO</span>
                                <span className="animate-pulse">● LIVE</span>
                            </div>
                        </div>
                    </CockpitPanel>
                </div>

                {/* Center Panel: MAIN VIEWPORT (Focus Guard) - Top priority on mobile */}
                <div className="lg:col-span-6 flex flex-col gap-6 lg:gap-8 order-1 lg:order-2">
                    <div className="relative aspect-video lg:flex-1 rounded-2xl md:rounded-[3rem] bg-gradient-to-b from-cyan-500/20 to-transparent p-[1px] overflow-hidden group/viewport shadow-[0_0_100px_rgba(6,182,212,0.05)] min-h-[350px]">
                        <div className="absolute inset-0 bg-[#050510] rounded-2xl md:rounded-[3rem]"></div>
                        <div className="relative h-full overflow-hidden">
                            <FocusGuardSystem onTelemetry={handleTelemetryUpdate} />
                        </div>
                    </div>

                    {/* Console Feed */}
                    <div className="bg-[#0a0a1a] border border-white/5 rounded-2xl md:rounded-[2rem] flex flex-col md:flex-row items-center justify-between p-6 md:px-10 gap-4 relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 w-1 bg-cyan-500/50"></div>
                        <div className="space-y-1 text-center md:text-left">
                            <div className="text-[8px] font-black text-cyan-500/40 uppercase tracking-[0.3em]">Command_Log</div>
                            <p className="text-[10px] md:text-[11px] font-mono tracking-widest text-cyan-400/80">
                                {'>'} MONITOR_INITIALIZED // WAITING_FOR_INPUT...
                            </p>
                        </div>
                        <div className="flex gap-4 opacity-50">
                            <div className="w-8 h-1 bg-cyan-500/20 animate-pulse"></div>
                            <div className="w-8 h-1 bg-cyan-500/20 animate-pulse delay-75"></div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Operations */}
                <div className="lg:col-span-3 space-y-6 flex flex-col order-3 lg:order-3">
                    <CockpitPanel title="LOGÍSTICA // TAREAS" icon="📝">
                        <CabinTodo userId={user.id} />
                    </CockpitPanel>

                    <CockpitPanel title="IDEARIO // NÚCLEO" icon="🧠" className="min-h-[300px] lg:flex-1">
                        <CabinIdeas userId={user.id} />
                    </CockpitPanel>
                </div>
            </div>

            {/* Radio / Atmospheric control */}
            <div className="fixed bottom-12 right-12 z-[100]">
                <RadioPlayer />
            </div>

            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none -z-50 overflow-hidden">
                <div className="absolute inset-0 bg-[url('/grid-pattern.png')] opacity-[0.05] scale-[2]"></div>
                <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-cyan-500/10 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full h-[30vh] bg-gradient-to-t from-red-500/5 to-transparent"></div>
            </div>
        </div>
    );
}

function CockpitPanel({ title, icon, children, className = "" }) {
    return (
        <div className={`flex flex-col bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl md:rounded-[2rem] overflow-hidden transition-all hover:border-white/20 group/panel ${className}`}>
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <h2 className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em] text-white/40 group-hover/panel:text-white/70 transition-colors">
                    {icon} {title}
                </h2>
                <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-cyan-500/30"></div>
                </div>
            </div>
            <div className="p-4 md:p-6 h-full overflow-y-auto scrollbar-hide">
                {children}
            </div>
        </div>
    );
}

function StatBox({ label, value, icon }) {
    return (
        <div className="flex flex-col items-center md:items-end">
            <div className="text-[8px] md:text-[9px] font-black tracking-widest opacity-30 flex items-center gap-1 uppercase">
                {icon} {label}
            </div>
            <div className="text-lg md:text-2xl font-black font-mono text-white tracking-widest leading-none mt-1">
                {value}
            </div>
        </div>
    );
}

export function FocusGuardSystem({ onTelemetry }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isRunning, setIsRunning] = useState(false);
    const isRunningRef = useRef(false); // Use ref for closure-safe checks in onResults
    const [isAwaitingCamera, setIsAwaitingCamera] = useState(false);
    const [focusScore, setFocusScore] = useState(100);
    const [stats, setStats] = useState({
        blinkCount: 0,
        distractionCount: 0,
        eyeStatus: 'ABIERTO',
        state: 'ENFOCADO',
        fatigue: 0
    });
    const [alert, setAlert] = useState(null);
    const wakeLock = useRef(null);

    // Screen Wake Lock to prevent screen saver/sleep
    useEffect(() => {
        const requestWakeLock = async () => {
            if ('wakeLock' in navigator && isRunning) {
                try {
                    wakeLock.current = await navigator.wakeLock.request('screen');
                    console.log('[FocusGuard] Wake Lock activo');
                } catch (err) {
                    console.error('[FocusGuard] Wake Lock failed:', err);
                }
            }
        };

        if (isRunning) {
            requestWakeLock();
        } else {
            if (wakeLock.current) {
                wakeLock.current.release();
                wakeLock.current = null;
            }
        }

        return () => {
            if (wakeLock.current) wakeLock.current.release();
        };
    }, [isRunning]);

    // Trackers
    const internal = useRef({
        lastEar: 1,
        isBlinking: false,
        eyesClosedStart: null,
        lastDistractionTime: null,
        smoothedFocus: 100,
        blinkRate: 0,
        blinks: [],
        frames: 0
    });

    const audioCtx = useRef(null);

    const playAlert = useCallback((type) => {
        try {
            if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.current.createOscillator();
            const gain = audioCtx.current.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.current.destination);

            if (type === 'sleep') {
                osc.frequency.setValueAtTime(880, audioCtx.current.currentTime);
                osc.type = 'sawtooth';
                gain.gain.linearRampToValueAtTime(0.1, audioCtx.current.currentTime + 0.05);
                osc.start();
                osc.stop(audioCtx.current.currentTime + 0.3);
            } else if (type === 'distraction') {
                osc.frequency.setValueAtTime(220, audioCtx.current.currentTime);
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.05, audioCtx.current.currentTime);
                osc.start();
                osc.stop(audioCtx.current.currentTime + 0.1);
            } else if (type === 'blink') {
                osc.frequency.setValueAtTime(1200, audioCtx.current.currentTime);
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.02, audioCtx.current.currentTime);
                osc.start();
                osc.stop(audioCtx.current.currentTime + 0.05);
            }
        } catch (e) { /* audio fallback */ }
    }, []);

    const calculateMAR = (landmarks) => {
        const top = landmarks[13];
        const bottom = landmarks[14];
        const left = landmarks[78];
        const right = landmarks[308];
        const dist = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
        return dist(top, bottom) / dist(left, right);
    };

    const calculateEAR = (landmarks, indices) => {
        const p = indices.map(i => landmarks[i]);
        const dist = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
        const d_v1 = dist(p[1], p[5]);
        const d_v2 = dist(p[2], p[4]);
        const d_h = dist(p[0], p[3]);
        return (d_v1 + d_v2) / (2.0 * d_h);
    };

    // Callback ref to avoid closure issues with faceMesh.onResults
    const onResultsRef = useRef();

    const onResults = useCallback((results) => {
        if (!canvasRef.current || !isRunningRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        const width = canvasRef.current.width;
        const height = canvasRef.current.height;

        ctx.save();
        ctx.clearRect(0, 0, width, height);

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];

            // EAR Analysis
            const leftEyeIndices = [33, 160, 158, 133, 153, 144];
            const rightEyeIndices = [362, 385, 387, 263, 373, 380];
            const earL = calculateEAR(landmarks, leftEyeIndices);
            const earR = calculateEAR(landmarks, rightEyeIndices);
            const ear = (earL + earR) / 2;

            // MAR Analysis (Yawn)
            const mar = calculateMAR(landmarks);

            // Blink tracking
            if (ear < 0.18 && !internal.current.isBlinking) {
                internal.current.isBlinking = true;
                internal.current.blinks.push(Date.now());
                playAlert('blink');
                setStats(s => ({ ...s, blinkCount: s.blinkCount + 1 }));
            } else if (ear > 0.22) {
                internal.current.isBlinking = false;
            }

            // Fatigue calc based on blinks and yawning
            const minuteAgo = Date.now() - 60000;
            internal.current.blinks = internal.current.blinks.filter(b => b > minuteAgo);

            let fatigueLevel = Math.min(100, Math.round(internal.current.blinks.length * 4));
            if (mar > 0.5) {
                fatigueLevel = Math.min(100, fatigueLevel + 2); // Dynamic fatigue increase
                if (mar > 0.7) {
                    setAlert('ADVERTENCIA: BOSTEZO DETECTADO // FATIGA ALTA');
                    playAlert('distraction');
                }
            }

            // Sleep detection (1.5s closure)
            if (ear < 0.15) {
                if (!internal.current.eyesClosedStart) internal.current.eyesClosedStart = Date.now();
                const closureTime = (Date.now() - internal.current.eyesClosedStart) / 1000;
                if (closureTime > 1.5) {
                    setAlert('PROTOCOL_SLEEP_DETECTED // WAKE UP');
                    playAlert('sleep');
                    setStats(s => ({ ...s, eyeStatus: 'CERRADO (💤)', state: 'PELIGRO', fatigue: fatigueLevel }));
                }
            } else {
                internal.current.eyesClosedStart = null;
                // Only clear alert if it's the sleep one
                setAlert(prev => (prev?.includes('SLEEP') ? null : prev));
                setStats(s => ({ ...s, eyeStatus: 'ABIERTO', state: 'ENFOCADO', fatigue: fatigueLevel }));
            }

            // Pose / Focus score logic
            const headCenter = landmarks[5];
            const noseTip = landmarks[1];
            const headDev = Math.abs(noseTip.x - headCenter.x);
            let currentFocus = 100;
            if (headDev > 0.05) {
                currentFocus -= 30;
                if (!internal.current.lastDistractionTime || Date.now() - internal.current.lastDistractionTime > 2000) {
                    playAlert('distraction');
                    internal.current.lastDistractionTime = Date.now();
                }
            }
            if (ear < 0.2) currentFocus -= 15;

            internal.current.smoothedFocus = (0.05 * currentFocus) + (0.95 * internal.current.smoothedFocus);
            setFocusScore(Math.round(internal.current.smoothedFocus));

            // Push to parent telemetry if callback exists
            if (onTelemetry) {
                onTelemetry({
                    fatigue: fatigueLevel,
                    movement: headDev
                });
            }

            // HUD Graphics
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 1;

            // Iris centers
            [468, 473].forEach(idx => {
                const pt = landmarks[idx];
                ctx.beginPath();
                ctx.arc(pt.x * width, pt.y * height, 4, 0, 2 * Math.PI);
                ctx.stroke();
            });

            // Head grid simulation
            ctx.beginPath();
            ctx.moveTo(landmarks[10].x * width, landmarks[10].y * height);
            ctx.lineTo(landmarks[152].x * width, landmarks[152].y * height); // vertical
            ctx.moveTo(landmarks[234].x * width, landmarks[234].y * height);
            ctx.lineTo(landmarks[454].x * width, landmarks[454].y * height); // horizontal
            ctx.setLineDash([5, 5]);
            ctx.stroke();
        }
        ctx.restore();
    }, [playAlert]);

    // Update the ref whenever onResults changes
    useEffect(() => {
        onResultsRef.current = onResults;
    }, [onResults]);

    const initGuard = async () => {
        setIsAwaitingCamera(true);
        try {
            // Handle different export patterns in FaceMesh/Camera
            const FaceMeshConstructor = FaceMeshLib.FaceMesh || (FaceMeshLib.default && FaceMeshLib.default.FaceMesh) || FaceMeshLib.default || window.FaceMesh;
            const CameraConstructor = CameraLib.Camera || (CameraLib.default && CameraLib.default.Camera) || CameraLib.default || window.Camera;

            if (!FaceMeshConstructor || !CameraConstructor) return;

            if (videoRef.current) {
                const faceMesh = new FaceMeshConstructor({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
                });

                faceMesh.setOptions({
                    maxNumFaces: 1,
                    refineLandmarks: true,
                    minDetectionConfidence: 0.6,
                    minTrackingConfidence: 0.6,
                });

                // Call the ref instead of the callback directly to avoid closure freezes
                faceMesh.onResults((res) => onResultsRef.current && onResultsRef.current(res));

                const camera = new CameraConstructor(videoRef.current, {
                    onFrame: async () => {
                        if (videoRef.current) await faceMesh.send({ image: videoRef.current });
                    },
                    width: 640,
                    height: 480,
                });

                await camera.start();
                isRunningRef.current = true;
                setIsRunning(true);
            }
        } catch (err) {
            console.error('[FocusGuard] Error:', err);
        } finally {
            setIsAwaitingCamera(false);
        }
    };

    return (
        <div className="h-full w-full flex flex-col p-4 md:p-8 relative overflow-hidden font-mono">
            {/* HUD Status Bar - Re-structured for mobile */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4 z-10">
                <div className="flex flex-col gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-cyan-400 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="text-[10px] md:text-sm font-black text-white uppercase font-mono tracking-widest">
                            {isRunning ? 'SISTEMA_GUÍA_ACTIVO' : 'SISTEMA_EN_ESPERA'}
                        </span>
                    </div>
                    {isRunning && (
                        <div className="text-[8px] md:text-[10px] text-cyan-400/60 font-mono tracking-tighter uppercase whitespace-pre opacity-60">
                            RAW_ID: FG-PRO.VX-7 | CALIBRATION: NOMINAL
                        </div>
                    )}
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4 border-t border-white/5 pt-4 md:border-none md:pt-0">
                    <div className="text-[9px] font-bold text-cyan-400/40 uppercase">Puntaje_Enfoque</div>
                    <div className={`text-4xl md:text-6xl font-black italic tracking-tighter transition-colors ${focusScore < 60 ? 'text-red-500' : 'text-cyan-400'}`}>
                        {focusScore}<span className="text-xl">%</span>
                    </div>
                </div>
            </div>

            {/* Central Viewport */}
            <div className={`flex-1 min-h-[300px] md:min-h-[400px] relative rounded-3xl md:rounded-[3rem] border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center`}>

                {/* Video feed: mirrored and low opacity background */}
                <video
                    ref={videoRef}
                    className={`absolute inset-0 w-full h-full object-cover mirror transition-opacity duration-1000 ${isRunning ? 'opacity-40' : 'opacity-0'}`}
                    playsInline
                    muted
                />

                {!isRunning && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center space-y-6 md:space-y-8 p-6 md:p-12 z-20"
                    >
                        <div className="relative inline-block">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="absolute -inset-6 md:-inset-8 border border-cyan-500/20 rounded-full"
                            />
                            <div className="text-4xl md:text-6xl mb-4 md:mb-6 relative z-10">🛡️</div>
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-base md:text-xl font-black italic text-white tracking-widest uppercase">Protocolo FocusGuard</h4>
                            <p className="text-[9px] md:text-[11px] text-white/40 leading-relaxed uppercase tracking-tighter max-w-sm mx-auto">
                                ACTIVAR EL MONITOREO NEURONAL PARA PREVENIR LA FRAGMENTACIÓN DE ATENCIÓN.
                                EL PROCESAMIENTO ES 100% LOCAL.
                            </p>
                        </div>

                        <button
                            onClick={initGuard}
                            disabled={isAwaitingCamera}
                            className={`group relative px-8 md:px-12 py-4 md:py-5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl transition-all shadow-[0_20px_50px_rgba(8,145,178,0.3)] hover:scale-105 active:scale-95 disabled:opacity-50 w-full md:w-auto`}
                        >
                            <div className="absolute inset-0 bg-white/10 rounded-2xl translate-y-1 group-active:translate-y-0 transition-transform"></div>
                            <span className="relative z-10 font-black text-[12px] md:text-sm tracking-[0.3em] uppercase">
                                {isAwaitingCamera ? 'Sincronizando...' : 'INICIAR_BLINDAJE'}
                            </span>
                        </button>
                    </motion.div>
                )}

                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover mirror pointer-events-none" width={1000} height={750} />

                {/* HUD Overlays */}
                <OverlayGraphics active={isRunning} />

                {/* Alerts */}
                <AnimatePresence>
                    {alert && (
                        <motion.div
                            initial={{ opacity: 0, scale: 1.2 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-x-4 bottom-12 md:bottom-24 z-50 flex justify-center"
                        >
                            <div className="bg-red-600 px-4 md:px-8 py-2 md:py-3 rounded-none border-x-4 border-white text-white font-black text-sm md:text-lg skew-x-[-15deg] shadow-[0_0_80px_rgba(220,38,38,0.8)] animate-pulse text-center">
                                {alert}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Biological Telemetry Bar - Stacked on mobile */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6 md:mt-8">
                <TeleBox label="PARPADEOS" value={stats.blinkCount} unit="NUM" />
                <TeleBox label="FATIGA" value={stats.fatigue} unit="ID" highlight={stats.fatigue > 50 ? 'text-yellow-400' : 'text-cyan-400'} />
                <TeleBox label="OJO" value={stats.eyeStatus} unit="RAW" />
                <TeleBox label="ENFOQUE" value={stats.state} unit="LVL" highlight={stats.state === 'ENFOCADO' ? 'text-green-400' : 'text-red-500'} />
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .mirror { transform: scaleX(-1); }
            `}} />
        </div>
    );
}

function TeleBox({ label, value, unit, highlight = "text-white/80" }) {
    return (
        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl group transition-all hover:bg-white/[0.05]">
            <div className="text-[8px] font-black tracking-widest text-white/20 mb-1">{label}</div>
            <div className="flex items-baseline gap-2">
                <div className={`text-xl font-black italic tracking-tighter ${highlight}`}>{value}</div>
                <div className="text-[7px] text-white/10 font-mono">[{unit}]</div>
            </div>
        </div>
    );
}

function OverlayGraphics({ active }) {
    if (!active) return null;
    return (
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-8 right-8 w-24 h-24 border-r border-t border-cyan-500/20"></div>
            <div className="absolute bottom-8 left-8 w-24 h-24 border-l border-b border-cyan-500/20"></div>
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-cyan-500/[0.03]"></div>
            <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-cyan-500/[0.03]"></div>
            <div className="absolute inset-0 bg-[url('/grid-pattern.png')] opacity-[0.02] mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#020205] via-transparent to-transparent opacity-40"></div>
            {/* Scan animation */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-500/20 animate-[scan_5s_linear_infinite]"></div>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
            `}} />
        </div>
    );
}
