import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '../contexts/AuthContext';
import { affinityService } from '../services/affinityService';
import { useNavigate } from 'react-router-dom';

const OPTIONS = [
    { value: 1, label: 'Muy en desacuerdo', color: 'rgba(239, 68, 68, 0.4)' },
    { value: 2, label: 'En desacuerdo', color: 'rgba(239, 68, 68, 0.2)' },
    { value: 3, label: 'Neutral', color: 'rgba(255, 255, 255, 0.1)' },
    { value: 4, label: 'De acuerdo', color: 'rgba(34, 197, 94, 0.2)' },
    { value: 5, label: 'Muy de acuerdo', color: 'rgba(34, 197, 94, 0.4)' },
];

export default function AffinityPage() {
    const { refreshProfile } = useAuthContext();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadQuestions();
    }, []);

    const loadQuestions = async () => {
        try {
            const q = await affinityService.getQuestions();
            setQuestions(q);
        } catch (err) {
            console.error('[AffinityPage] Load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (value) => {
        const qId = questions[currentIndex].id;
        setAnswers(prev => ({ ...prev, [qId]: value }));

        // Auto-next with small delay
        if (currentIndex < questions.length - 1) {
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
            }, 300);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const payload = Object.entries(answers).map(([id, val]) => ({
                question_id: id,
                answer_value: val
            }));
            await affinityService.submitTest(payload);
            await refreshProfile(); // Importante para que App.jsx deje de redirigir
            navigate('/posts');
        } catch (err) {
            console.error('[AffinityPage] Submit error:', err);
            alert('Error al guardar tus datos estelares.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050510]">
                <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-cyan-500 font-black uppercase tracking-[0.3em] text-[10px]"
                >
                    Sincronizando_Frecuencias...
                </motion.div>
            </div>
        );
    }

    const currentQ = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;
    const isLast = currentIndex === questions.length - 1;
    const currentAnswer = answers[currentQ?.id];

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6 bg-[#030308]">
            {/* Background Decor */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.png')] opacity-[0.03]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl relative z-10"
            >
                {/* Header */}
                <div className="text-center mb-12 space-y-4">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 mb-2">
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Protocolo de Afinidad Spacely</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase leading-none">
                        Sincroniza tu <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Energía Estelar</span>
                    </h1>
                    <p className="text-sm text-white/30 max-w-md mx-auto italic font-medium">
                        "Descubre con quién conectas mejor explorando los rincones del multiverso Spacely."
                    </p>
                </div>

                {/* Progress Bar Container */}
                <div className="mb-12 space-y-3">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-none">Progreso de calibración</span>
                        <span className="text-xl font-black font-mono text-cyan-400 italic leading-none">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-gradient-to-r from-purple-600 to-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                        />
                    </div>
                </div>

                {/* Question Card */}
                <div className="relative min-h-[400px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-white/[0.02] backdrop-blur-3xl border border-white/[0.07] rounded-[40px] p-8 md:p-12 shadow-2xl space-y-12"
                        >
                            <div className="space-y-6">
                                <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">Pregunta {currentIndex + 1} de {questions.length}</span>
                                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-snug">
                                    {currentQ?.question_text}
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => handleSelect(opt.value)}
                                        className={`group relative flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 text-left ${currentAnswer === opt.value
                                                ? 'bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.2)]'
                                                : 'bg-white/[0.03] border-white/5 text-white/60 hover:text-white hover:bg-white/[0.08] hover:border-white/20'
                                            }`}
                                    >
                                        <span className="text-sm font-bold uppercase tracking-widest">{opt.label}</span>
                                        <div className={`w-2 h-2 rounded-full transition-all duration-500 ${currentAnswer === opt.value ? 'bg-black scale-150' : 'bg-white/20 group-hover:bg-white/50'}`} />
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer Navigation */}
                <div className="mt-12 flex items-center justify-between">
                    <button
                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className={`text-[10px] font-black uppercase tracking-[0.25em] transition-all ${currentIndex === 0 ? 'opacity-0' : 'opacity-40 hover:opacity-100 hover:text-cyan-400'}`}
                    >
                        ← Retroceder Frecuencia
                    </button>

                    {isLast && currentAnswer && (
                        <motion.button
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="px-10 py-5 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-[0.3em] shadow-[0_20px_40px_rgba(255,255,255,0.2)] hover:shadow-[0_25px_50px_rgba(255,255,255,0.3)] transition-all flex items-center gap-4"
                        >
                            {submitting ? 'Guardando_Bits...' : 'Finalizar Calibración'}
                            {!submitting && <span>✨</span>}
                        </motion.button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
