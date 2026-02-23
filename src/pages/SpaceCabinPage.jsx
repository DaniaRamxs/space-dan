import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthContext } from '../contexts/AuthContext';
import { getProductivityStats, finishFocusSession } from '../services/productivity';
import CabinPomodoro from '../components/CabinPomodoro';
import CabinTodo from '../components/CabinTodo';
import CabinIdeas from '../components/CabinIdeas';

export default function SpaceCabinPage() {
    const { user } = useAuthContext();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadStats();
        }
    }, [user]);

    const loadStats = async () => {
        try {
            const s = await getProductivityStats(user.id);
            setStats(s);
        } catch (err) {
            console.error(err);
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
        } catch (err) {
            console.error(err);
        }
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-10">
                <h1 className="text-3xl font-bold mb-4">Acceso Restringido</h1>
                <p className="opacity-60 max-w-md">Debes estar en órbita (autenticado) para acceder a tu cabina personal.</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full overflow-y-auto overflow-x-hidden pb-24 max-w-6xl mx-auto p-4 md:p-8 space-y-8"
        >
            {/* Header Estelar */}
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
                <div className="space-y-2 text-center lg:text-left">
                    <motion.h1
                        initial={{ y: -20 }}
                        animate={{ y: 0 }}
                        className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-white"
                    >
                        CABINA <span className="text-accent">ESPACIAL</span>
                    </motion.h1>
                    <p className="text-sm opacity-40 uppercase tracking-[0.3em]">Módulo de Enfoque Personal</p>
                </div>

                {/* Mini Stats Bar */}
                <div className="flex flex-wrap gap-4 md:gap-8 justify-center lg:justify-end items-center bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-md lg:bg-transparent lg:p-0 lg:border-none lg:backdrop-none">
                    <StatBox label="Racha" value={`${stats?.current_streak || 0}d`} icon="🔥" />
                    <StatBox label="Enfoque" value={`${Math.round((stats?.total_focus_minutes || 0) / 60)}h`} icon="⏳" />
                    <StatBox label="Sesiones" value={stats?.total_sessions || 0} icon="✨" />
                </div>
            </header>

            {/* Grid de Cabina */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Consola Central: Pomodoro & Todo */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-3xl p-6 md:p-10">
                        <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5 pb-8 md:pb-0 md:pr-10">
                            <CabinPomodoro onFinish={handlePomodoroFinish} />
                        </div>

                        <div className="pt-8 md:pt-0 md:pl-6">
                            <h2 className="text-xs uppercase tracking-[0.2em] font-bold opacity-30 mb-6 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                Consola de Tareas
                            </h2>
                            <CabinTodo userId={user.id} />
                        </div>
                    </div>

                    {/* Recordatorios / Live Feed sutil */}
                    <footer className="p-6 border border-white/5 rounded-2xl opacity-40 hover:opacity-100 transition-opacity">
                        <p className="text-xs italic text-center">
                            "El silencio del vacío es el mejor aliado de la claridad."
                        </p>
                    </footer>
                </div>

                {/* Panel Lateral: Ideario */}
                <div className="lg:col-span-4 h-full min-h-[400px]">
                    <CabinIdeas userId={user.id} />
                </div>
            </div>

            {/* Decorative Blur Orbs */}
            <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-[120px] pointer-events-none -z-10" />
            <div className="fixed bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[150px] pointer-events-none -z-10" />
        </motion.div>
    );
}

function StatBox({ label, value, icon }) {
    return (
        <div className="text-right">
            <div className="text-[10px] uppercase opacity-40 tracking-widest flex items-center justify-end gap-1">
                {icon} {label}
            </div>
            <div className="text-xl font-bold text-white">{value}</div>
        </div>
    );
}
