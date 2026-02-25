import { useEffect, useRef, useState, useCallback } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function FocusGuardSystem() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isRunning, setIsRunning] = useState(false);
    const [isAwaitingCamera, setIsAwaitingCamera] = useState(false);
    const [focusScore, setFocusScore] = useState(100);
    const [stats, setStats] = useState({
        blinkCount: 0,
        distractionCount: 0,
        eyeStatus: 'ABIERTO',
        state: 'ENFOCADO'
    });
    const [alert, setAlert] = useState(null);

    // Internal trackers
    const internal = useRef({
        lastEar: 1,
        isBlinking: false,
        eyesClosedStart: null,
        lastDistractionTime: null,
        smoothedFocus: 100,
        blinkRate: 0,
        blinks: [],
        distractions: 0
    });

    // Audio context for alerts
    const audioCtx = useRef(null);

    const playAlert = useCallback((type) => {
        if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.current.createOscillator();
        const gain = audioCtx.current.createGain();

        osc.connect(gain);
        gain.connect(audioCtx.current.destination);

        if (type === 'sleep') {
            osc.frequency.setValueAtTime(880, audioCtx.current.currentTime);
            osc.type = 'sawtooth';
            gain.gain.setValueAtTime(0.3, audioCtx.current.currentTime);
            osc.start();
            osc.stop(audioCtx.current.currentTime + 0.5);
        } else {
            osc.frequency.setValueAtTime(440, audioCtx.current.currentTime);
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.1, audioCtx.current.currentTime);
            osc.start();
            osc.stop(audioCtx.current.currentTime + 0.1);
        }
    }, []);

    const calculateEAR = (landmarks, indices) => {
        const p = indices.map(i => landmarks[i]);
        const dist = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
        const d_v1 = dist(p[1], p[5]);
        const d_v2 = dist(p[2], p[4]);
        const d_h = dist(p[0], p[3]);
        return (d_v1 + d_v2) / (2.0 * d_h);
    };

    const onResults = useCallback((results) => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        ctx.save();
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];

            // EAR Calculation (Eye Aspect Ratio)
            const leftEyeIndices = [33, 160, 158, 133, 153, 144];
            const rightEyeIndices = [362, 385, 387, 263, 373, 380];

            const earL = calculateEAR(landmarks, leftEyeIndices);
            const earR = calculateEAR(landmarks, rightEyeIndices);
            const ear = (earL + earR) / 2;

            // Blink Detection
            if (ear < 0.18 && !internal.current.isBlinking) {
                internal.current.isBlinking = true;
                internal.current.blinks.push(Date.now());
                setStats(s => ({ ...s, blinkCount: s.blinkCount + 1 }));
                playAlert('blink');
            } else if (ear > 0.22) {
                internal.current.isBlinking = false;
            }

            // Sleep Detection
            if (ear < 0.15) {
                if (!internal.current.eyesClosedStart) internal.current.eyesClosedStart = Date.now();
                const duration = (Date.now() - internal.current.eyesClosedStart) / 1000;
                if (duration > 1.5) {
                    setAlert('¡DESPIERTA! Fatiga Crítica Detectada ⚠️');
                    playAlert('sleep');
                    setStats(s => ({ ...s, eyeStatus: 'DORMINDO', state: 'FATIGA' }));
                }
            } else {
                internal.current.eyesClosedStart = null;
                setAlert(null);
                setStats(s => ({ ...s, eyeStatus: 'ABIERTO', state: 'ENFOCADO' }));
            }

            // Gaze / Focus estimation (Simplified)
            // iris indices: 468 (L iris center), 473 (R iris center)
            const noseTip = landmarks[1];
            const faceCenter = landmarks[5]; // near bridge
            const headTurn = Math.abs(noseTip.x - faceCenter.x);

            let currentFocus = 100;
            if (headTurn > 0.05) currentFocus -= 40; // Looking away
            if (ear < 0.2) currentFocus -= 20; // Sleepy

            internal.current.smoothedFocus = (0.1 * currentFocus) + (0.9 * internal.current.smoothedFocus);
            setFocusScore(Math.round(internal.current.smoothedFocus));

            // Draw minimal landmarks (Perspective IA)
            ctx.fillStyle = '#06b6d4';
            [468, 473, 1, 5, 33, 133, 362, 263].forEach(idx => {
                const pt = landmarks[idx];
                ctx.beginPath();
                ctx.arc(pt.x * canvasRef.current.width, pt.y * canvasRef.current.height, 2, 0, 2 * Math.PI);
                ctx.fill();
            });
        }
        ctx.restore();
    }, [playAlert]);

    const startGuard = async () => {
        setIsAwaitingCamera(true);
        try {
            const faceMesh = new FaceMesh({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
            });

            faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
            });

            faceMesh.onResults(onResults);

            if (videoRef.current) {
                const camera = new Camera(videoRef.current, {
                    onFrame: async () => {
                        await faceMesh.send({ image: videoRef.current });
                    },
                    width: 640,
                    height: 480,
                });
                await camera.start();
                setIsRunning(true);
            }
        } catch (err) {
            console.error('Focus Guard failed to initialize:', err);
            alert('No se pudo acceder a la cámara. Revisa los permisos.');
        } finally {
            setIsAwaitingCamera(false);
        }
    };

    return (
        <div className="relative group/guard bg-gradient-to-br from-[#06060c] to-[#0a0a1f] border border-white/5 rounded-3xl p-6 overflow-hidden flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="text-[10px] font-black tracking-[0.4em] text-blue-400 uppercase">Focus Guard Pro</div>
                    <h3 className="text-xl font-black italic tracking-tighter text-white">SISTEMA <span className="text-blue-500">ACTIVO</span></h3>
                </div>
                <div className="flex flex-col items-end">
                    <div className="text-[10px] font-black text-white/30 uppercase">Focus Score</div>
                    <div className={`text-3xl font-black font-mono transition-colors ${focusScore < 50 ? 'text-red-500' : focusScore < 80 ? 'text-yellow-400' : 'text-blue-400'}`}>
                        {focusScore}%
                    </div>
                </div>
            </div>

            <div className="relative aspect-video bg-black/40 rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                {!isRunning && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#06060c]/80 backdrop-blur-md p-6 text-center">
                        {isAwaitingCamera ? (
                            <div className="space-y-4">
                                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Sincronizando Óptica...</span>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="text-4xl">🛡️</div>
                                <div className="space-y-2">
                                    <h4 className="text-sm font-black text-white uppercase tracking-widest">Inhibidor de Distracciones</h4>
                                    <p className="text-[10px] text-white/40 leading-relaxed max-w-[200px] mx-auto">Activa el sistema de visión artificial para monitorear tu enfoque en tiempo real.</p>
                                </div>
                                <button
                                    onClick={startGuard}
                                    className="px-8 py-3 bg-blue-600 hover:bg-blue-400 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-[0_10px_30px_rgba(37,99,235,0.3)]"
                                >
                                    INICIAR BLINDAJE
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <video ref={videoRef} className="hidden" playsInline muted />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover mirror" width={640} height={480} />

                {isRunning && (
                    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                        <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div>
                            <span className="text-[9px] font-black text-white/80 uppercase">LIVE PERSPECTIVE IA</span>
                        </div>
                    </div>
                )}

                <AnimatePresence>
                    {alert && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[100] flex items-center justify-center bg-red-600/30 backdrop-blur-[2px]"
                        >
                            <div className="px-6 py-4 bg-red-600 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.5)] animate-bounce text-center">
                                {alert}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Scanline Effect */}
                <div className="absolute inset-0 pointer-events-none bg-[url('/grid-pattern.png')] opacity-[0.05]"></div>
                <div className="absolute top-0 left-0 w-full h-[1px] bg-blue-400/20 animate-[scan_3s_linear_infinite]"></div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                <MetricBox label="Parpadeos" value={stats.blinkCount} />
                <MetricBox label="Ojos" value={stats.eyeStatus} highlight={stats.eyeStatus === 'DORMINDO' ? 'text-red-500' : 'text-green-400'} />
                <MetricBox label="Estado" value={stats.state} highlight={stats.state === 'FATIGA' ? 'text-red-500' : 'text-blue-400'} />
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .mirror { transform: scaleX(-1); }
                @keyframes scan {
                    0% { top: 0; }
                    100% { top: 100%; }
                }
            `}} />
        </div>
    );
}

function MetricBox({ label, value, highlight = 'text-white' }) {
    return (
        <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
            <div className="text-[8px] font-bold text-white/20 uppercase tracking-widest mb-1">{label}</div>
            <div className={`text-xs font-black uppercase ${highlight}`}>{value}</div>
        </div>
    );
}
