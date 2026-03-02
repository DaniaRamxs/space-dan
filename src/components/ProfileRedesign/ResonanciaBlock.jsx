import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { affinityService } from '../../services/affinityService';

const CATEGORY_LABELS = {
    intelectual: 'Intelectual',
    emocional: 'Emocional',
    sonora: 'Sonora',
    social: 'Social',
    valores: 'Valores',
    creatividad: 'Creatividad',
    lifestyle: 'Lifestyle',
};

function getCategoryColor(pct) {
    if (pct >= 75) return 'bg-violet-500/70';
    if (pct >= 50) return 'bg-cyan-500/60';
    return 'bg-white/20';
}

function getScoreColor(pct) {
    if (pct >= 75) return 'text-violet-400';
    if (pct >= 50) return 'text-cyan-400';
    return 'text-white/50';
}

export function ResonanciaBlock({ viewerId, profileUserId }) {
    const [loading, setLoading] = useState(true);
    const [score, setScore] = useState(null);
    const [narrative, setNarrative] = useState('');
    const [categories, setCategories] = useState({});
    const [expanded, setExpanded] = useState(false);
    const [viewerCompleted, setViewerCompleted] = useState(false);
    const [profileCompleted, setProfileCompleted] = useState(false);

    useEffect(() => {
        if (!viewerId || !profileUserId) return;
        loadAffinity();
    }, [viewerId, profileUserId]);

    async function loadAffinity() {
        setLoading(true);
        try {
            const [questions, viewerAnswers, profileAnswers] = await Promise.all([
                affinityService.getQuestions().catch(() => []),
                affinityService.getUserAnswers(viewerId).catch(() => []),
                affinityService.getUserAnswers(profileUserId).catch(() => []),
            ]);

            setViewerCompleted(viewerAnswers.length > 0);
            setProfileCompleted(profileAnswers.length > 0);

            if (viewerAnswers.length > 0 && profileAnswers.length > 0 && questions.length > 0) {
                const baseScore = affinityService.calculateAffinity(viewerAnswers, profileAnswers, questions);
                setScore(baseScore);
                setNarrative(affinityService.getAffinityNarrative(baseScore));
                setCategories(affinityService.calculateAffinityByCategory(viewerAnswers, profileAnswers, questions));
            }
        } catch (e) {
            console.warn('ResonanciaBlock load error:', e);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="rounded-2xl bg-white/[0.02] border border-white/5 h-24 animate-pulse" />
        );
    }

    if (!viewerCompleted) {
        return (
            <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-5 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/25">Resonancia</span>
                <p className="text-sm text-white/35 leading-relaxed">
                    Completa el test de afinidad para ver cuánto resuenan.
                </p>
                <Link
                    to="/afinidad"
                    className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-violet-400 hover:text-violet-300 transition-colors"
                >
                    Ir al test <span className="opacity-60">→</span>
                </Link>
            </div>
        );
    }

    if (!profileCompleted) {
        return (
            <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/25">Resonancia</span>
                <p className="text-sm text-white/35 italic">Este perfil aún no ha completado su mapa de afinidad.</p>
            </div>
        );
    }

    const categoryEntries = Object.entries(categories);

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl bg-violet-500/[0.04] border border-violet-500/12 p-5 space-y-4"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400/50">Resonancia</span>
                {categoryEntries.length > 0 && (
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="text-[10px] font-bold text-white/25 hover:text-white/50 transition-colors flex items-center gap-1"
                    >
                        {expanded ? '▴ Cerrar' : '▾ Ver detalles'}
                    </button>
                )}
            </div>

            {/* Score */}
            <div className="space-y-0.5">
                <p className="text-lg font-black text-white tracking-tight leading-tight">{narrative}</p>
                {score !== null && (
                    <p className="text-sm text-white/40">
                        Resonancia contigo:{' '}
                        <span className={`font-bold ${getScoreColor(score)}`}>{score}%</span>
                    </p>
                )}
            </div>

            {/* Expandable categories */}
            <AnimatePresence initial={false}>
                {expanded && categoryEntries.length > 0 && (
                    <motion.div
                        key="cats"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="pt-4 border-t border-white/5 space-y-3">
                            {categoryEntries.map(([cat, pct]) => (
                                <div key={cat} className="flex items-center justify-between gap-3">
                                    <span className="text-[11px] text-white/35 capitalize shrink-0">
                                        {CATEGORY_LABELS[cat.toLowerCase()] || cat}
                                    </span>
                                    <div className="flex items-center gap-2 flex-1 justify-end">
                                        <div className="w-16 h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 0.7, ease: 'easeOut' }}
                                                className={`h-full rounded-full ${getCategoryColor(pct)}`}
                                            />
                                        </div>
                                        <span className={`text-[11px] font-bold w-7 text-right ${getScoreColor(pct)}`}>
                                            {pct}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
