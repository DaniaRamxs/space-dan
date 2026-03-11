
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { redemptionService } from '../services/redemptionService';
import { useAuthContext } from '../contexts/AuthContext';
import { Sparkles, Skull, HelpCircle, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';

const GAMES_COUNT = 3;

export default function RedemptionZone() {
    const navigate = useNavigate();
    const { user } = useAuthContext();
    const [gameState, setGameState] = useState('intro'); // intro, playing, result
    const [currentGame, setCurrentGame] = useState(0); // 0, 1, 2
    const [loading, setLoading] = useState(false);
    const [finalMessage, setFinalMessage] = useState('');
    const [resultType, setResultType] = useState(null); // 'win', 'lose'
    const [eligibility, setEligibility] = useState(null);

    // Minigame states
    const [gameResult, setGameResult] = useState(null); // 'pending', 'win', 'lose'

    useEffect(() => {
        const fetchEligibility = async () => {
            const res = await redemptionService.checkEligibility();
            setEligibility(res);
        };
        fetchEligibility();
    }, []);

    const handleGameOver = async (isWin) => {
        if (!isWin) {
            setResultType('lose');
            setFinalMessage('El universo no ha estado de tu lado esta vez. Tu deuda sigue intacta.');
            setGameState('result');
            await redemptionService.submitResult('lose', currentGame);
            return;
        }

        if (currentGame < GAMES_COUNT - 1) {
            setCurrentGame(prev => prev + 1);
            setGameResult('pending');
        } else {
            // Victory!
            setLoading(true);
            try {
                const res = await redemptionService.submitResult('win', GAMES_COUNT);
                setResultType('win');
                setFinalMessage('Has sobrevivido a los Juegos de Redención. Tu deuda ha sido eliminada. Pero recuerda… el universo siempre cobra su precio.');
                setGameState('result');
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
    };

    const renderGame = () => {
        switch (currentGame) {
            case 0: return <MemoryGame onFinish={handleGameOver} />;
            case 1: return <VoidPathGame onFinish={handleGameOver} />;
            case 2: return <FinalPortalGame onFinish={handleGameOver} />;
            default: return null;
        }
    };

    if (gameState === 'intro') {
        return (
            <div className="fixed inset-0 bg-black z-[1000] flex items-center justify-center p-6 font-sans">
                <div className="max-w-md w-full text-center space-y-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4"
                    >
                        <Skull className="w-16 h-16 text-rose-500 mx-auto animate-pulse" />
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">ZONA DE REDENCIÓN</h1>
                        <p className="text-sm text-white/40 leading-relaxed italic">
                            "Has entrado en el vacío donde las deudas se pagan con voluntad, no con Starlys.
                            Supera las tres pruebas y tu pasado financiero será borrado."
                        </p>
                    </motion.div>

                    <div className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl space-y-6">
                        <div className="space-y-4 text-left">
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 font-bold">!</div>
                                <p className="text-[10px] text-white/60 font-medium uppercase tracking-widest">Si pierdes una sola prueba, el juego termina.</p>
                            </div>

                            {eligibility && (
                                <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">EL PRECIO DEL COSMOS:</p>
                                    <p className="text-[11px] text-white/80 leading-relaxed font-medium">
                                        Al ganar, tu deuda de <strong className="text-rose-400">◈ {eligibility.debt?.toLocaleString()}</strong> será eliminada, pero tu balance actual de <strong className="text-rose-400">◈ {eligibility.balance?.toLocaleString()}</strong> se reseteará a <strong className="text-white">0</strong>.
                                    </p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setGameState('playing')}
                            disabled={!eligibility?.eligible}
                            className={`w-full py-4 font-black uppercase tracking-widest rounded-2xl transition-all ${!eligibility?.eligible ? 'bg-white/5 text-white/10 cursor-not-allowed' : 'bg-white text-black hover:scale-[1.02] active:scale-95'}`}
                        >
                            {eligibility?.eligible ? 'Comenzar Sacrificio' : 'No elegible'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (gameState === 'result') {
        return (
            <div className="fixed inset-0 bg-black z-[1000] flex items-center justify-center p-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-sm space-y-8"
                >
                    {resultType === 'win' ? (
                        <CheckCircle2 className="w-16 h-16 text-cyan-400 mx-auto" />
                    ) : (
                        <XCircle className="w-16 h-16 text-rose-500 mx-auto" />
                    )}

                    <h2 className={`text-3xl font-black uppercase tracking-tighter ${resultType === 'win' ? 'text-cyan-400' : 'text-rose-500'}`}>
                        {resultType === 'win' ? 'VICTORIA' : 'DERROTA'}
                    </h2>

                    <p className="text-sm text-white/60 leading-relaxed font-medium">
                        {finalMessage}
                    </p>

                    <button
                        onClick={() => navigate('/posts')}
                        className="px-8 py-3 bg-white/10 text-white font-bold uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all"
                    >
                        Volver al Universo
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-[#050510] z-[1000] flex flex-col items-center justify-center p-6 overflow-hidden">
            {/* HUD */}
            <div className="absolute top-12 left-0 right-0 px-12 flex justify-between items-center max-w-2xl mx-auto w-full">
                <div className="flex gap-2">
                    {[0, 1, 2].map(i => (
                        <div
                            key={i}
                            className={`h-1.5 w-12 rounded-full transition-all duration-500 ${i === currentGame ? 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : i < currentGame ? 'bg-cyan-400/20' : 'bg-white/5'}`}
                        />
                    ))}
                </div>
                <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
                    PRUEBA {currentGame + 1} / 3
                </div>
            </div>

            <div className="w-full max-w-2xl">
                {renderGame()}
            </div>

            {loading && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="w-12 h-12 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}

// ────────────────────────────────────────────────────────────
// MINI GAME 1: MEMORY CONSTELLATIONS
// ────────────────────────────────────────────────────────────
function MemoryGame({ onFinish }) {
    const [pattern, setPattern] = useState([]);
    const [userInput, setUserInput] = useState([]);
    const [stage, setStage] = useState('memorize'); // memorize, action
    const GRID_SIZE = 16;
    const SEQUENCE_LENGTH = 5;

    useEffect(() => {
        const newPattern = [];
        while (newPattern.length < SEQUENCE_LENGTH) {
            const pos = Math.floor(Math.random() * GRID_SIZE);
            if (!newPattern.includes(pos)) newPattern.push(pos);
        }
        setPattern(newPattern);

        const timer = setTimeout(() => {
            setStage('action');
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    const handleClick = (idx) => {
        if (stage !== 'action' || userInput.includes(idx)) return;

        const nextInput = [...userInput, idx];
        setUserInput(nextInput);

        if (!pattern.includes(idx)) {
            onFinish(false);
            return;
        }

        if (nextInput.length === pattern.length) {
            setTimeout(() => onFinish(true), 500);
        }
    };

    return (
        <div className="space-y-12">
            <div className="text-center space-y-2">
                <h3 className="text-xs font-black text-cyan-400 uppercase tracking-[0.4em]">MEMORIA ESTELAR</h3>
                <p className="text-[10px] text-white/30 uppercase tracking-widest">
                    {stage === 'memorize' ? 'Memoriza la posición de las estrellas...' : 'Recrea el patrón oculto'}
                </p>
            </div>

            <div className="grid grid-cols-4 gap-4 max-w-xs mx-auto">
                {Array.from({ length: GRID_SIZE }).map((_, i) => (
                    <motion.button
                        key={i}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleClick(i)}
                        className={`aspect-square rounded-2xl border transition-all duration-300 ${stage === 'memorize' && pattern.includes(i)
                            ? 'bg-cyan-400 border-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.4)]'
                            : userInput.includes(i)
                                ? 'bg-cyan-400/40 border-cyan-400/60'
                                : 'bg-white/[0.03] border-white/5 hover:border-white/20'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────────
// MINI GAME 2: VOID PATH (Reaction)
// ────────────────────────────────────────────────────────────
function VoidPathGame({ onFinish }) {
    const [activeIdx, setActiveIdx] = useState(0);
    const [timeLeft, setTimeLeft] = useState(1.5);
    const PATH_LENGTH = 8;

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 0) {
                    clearInterval(interval);
                    onFinish(false);
                    return 0;
                }
                return prev - 0.1;
            });
        }, 100);
        return () => clearInterval(interval);
    }, [activeIdx, onFinish]);

    const handleStep = () => {
        if (activeIdx < PATH_LENGTH - 1) {
            setActiveIdx(prev => prev + 1);
            setTimeLeft(Math.max(0.6, 1.5 - (activeIdx * 0.1))); // Harder progressively
        } else {
            onFinish(true);
        }
    };

    return (
        <div className="space-y-12 text-center">
            <div className="space-y-2">
                <h3 className="text-xs font-black text-rose-400 uppercase tracking-[0.4em]">CAMINO DEL VACÍO</h3>
                <p className="text-[10px] text-white/30 uppercase tracking-widest">Presiona rápido antes de caer al olvido</p>
            </div>

            <div className="flex flex-col items-center gap-8">
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden max-w-xs">
                    <motion.div
                        className="h-full bg-rose-500"
                        animate={{ width: `${(timeLeft / 1.5) * 100}%` }}
                        transition={{ duration: 0.1, ease: 'linear' }}
                    />
                </div>

                <div className="flex gap-3 h-24 items-end">
                    {Array.from({ length: PATH_LENGTH }).map((_, i) => (
                        <div
                            key={i}
                            className={`w-4 rounded-full transition-all duration-300 ${i === activeIdx
                                ? 'h-16 bg-white shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                                : i < activeIdx ? 'h-4 bg-white/10' : 'h-8 bg-white/10'
                                }`}
                        />
                    ))}
                </div>

                <button
                    onClick={handleStep}
                    className="w-24 h-24 rounded-full bg-white text-black font-black uppercase text-[10px] shadow-2xl hover:scale-105 active:scale-90 transition-all border-4 border-black ring-4 ring-white/10"
                >
                    SALTO
                </button>
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────────
// MINI GAME 3: FINAL PORTAL (Chance/Intuition)
// ────────────────────────────────────────────────────────────
function FinalPortalGame({ onFinish }) {
    const portals = useMemo(() => {
        const arr = ['lose', 'lose', 'lose'];
        arr[Math.floor(Math.random() * 3)] = 'win';
        return arr;
    }, []);

    const [selected, setSelected] = useState(null);

    const handleChoose = (idx) => {
        setSelected(idx);
        setTimeout(() => {
            onFinish(portals[idx] === 'win');
        }, 1500);
    };

    return (
        <div className="space-y-12 text-center">
            <div className="space-y-2">
                <h3 className="text-xs font-black text-violet-400 uppercase tracking-[0.4em]">EL PORTAL FINAL</h3>
                <p className="text-[10px] text-white/30 uppercase tracking-widest">Confía en tu intuición estelar</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-12">
                {portals.map((type, i) => (
                    <motion.button
                        key={i}
                        whileHover={selected === null ? { y: -10, scale: 1.05 } : {}}
                        onClick={() => selected === null && handleChoose(i)}
                        className={`group relative aspect-[3/4] rounded-[2rem] border overflow-hidden transition-all duration-700 ${selected === i
                            ? 'border-white bg-white/10'
                            : selected !== null
                                ? 'border-white/5 bg-transparent opacity-20 filter grayscale'
                                : 'border-white/10 bg-white/[0.02] hover:border-white/30'
                            }`}
                    >
                        <div className={`absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/60 to-transparent transition-opacity ${selected === i ? 'opacity-0' : 'opacity-100'}`} />
                        <div className="absolute inset-0 flex items-center justify-center">
                            {selected === i ? (
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ repeat: Infinity, duration: 1 }}
                                    className="w-12 h-12 rounded-full border border-white"
                                />
                            ) : (
                                <HelpCircle className="w-8 h-8 text-white/10 group-hover:text-white/40 group-hover:scale-110 transition-all" />
                            )}
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
