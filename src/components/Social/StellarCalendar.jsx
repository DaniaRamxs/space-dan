import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Star, CheckCircle2, Lock, Gift, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEconomy } from '../../contexts/EconomyContext';

export default function StellarCalendar({ onClose }) {
    const { user, profile } = useAuthContext();
    const { refreshEconomy } = useEconomy();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const monthName = currentDate.toLocaleString('default', { month: 'long' });

    useEffect(() => {
        if (user) fetchHistory();
    }, [user, currentDate]);

    async function fetchHistory() {
        setLoading(true);
        // Simulamos o cargamos hitos de actividad desde una tabla de logs si existiera
        // Por ahora usamos las transacciones de 'daily_reward' y 'stellar_pact'
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();

        const { data, error } = await supabase
            .from('transactions')
            .select('created_at, type')
            .eq('user_id', user.id)
            .gte('created_at', startOfMonth)
            .lte('created_at', endOfMonth)
            .order('created_at', { ascending: true });

        if (!error) {
            const activeDays = new Set(data.map(t => new Date(t.created_at).getDate()));
            setHistory(Array.from(activeDays));
        }
        setLoading(false);
    }

    const renderDays = () => {
        const days = [];
        // Celdas vacías para el inicio del mes
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="h-16" />);
        }

        const today = new Date();
        const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();

        for (let day = 1; day <= daysInMonth; day++) {
            const isActive = history.includes(day);
            const isToday = isCurrentMonth && today.getDate() === day;

            days.push(
                <motion.div
                    key={day}
                    whileHover={{ scale: 1.05 }}
                    className={`h-16 rounded-2xl border flex flex-col items-center justify-center relative overflow-hidden transition-all ${isActive
                            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                            : isToday
                                ? 'bg-white/10 border-white/30 text-white'
                                : 'bg-white/[0.02] border-white/5 text-white/20'
                        }`}
                >
                    {isActive && <div className="absolute top-1 right-1"><CheckCircle2 size={10} className="text-cyan-400" /></div>}
                    <span className="text-xs font-black">{day}</span>
                    {isToday && <div className="mt-1 w-1 h-1 bg-white rounded-full animate-pulse" />}
                    {day % 7 === 0 && !isActive && <Star size={10} className="mt-1 opacity-20" />}
                </motion.div>
            );
        }
        return days;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 30 }}
                className="bg-[#05050a] border border-white/10 w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-10 border-b border-white/5 bg-gradient-to-br from-cyan-500/5 to-purple-500/5">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-cyan-500/20 rounded-2xl text-cyan-400">
                                <CalendarIcon size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Calendario de Actividad</h2>
                                <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold">Tu progreso en la red estelar</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all">✕</button>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <StatCard icon={<Zap size={16} />} label="Racha Actual" val={`${profile?.streak || 0} Días`} color="text-yellow-400" />
                        <StatCard icon={<Star size={16} />} label="Mejor Racha" val={`${profile?.best_streak || 0} Días`} color="text-cyan-400" />
                        <StatCard icon={<Gift size={16} />} label="Hitos este mes" val={history.length} color="text-purple-400" />
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="p-10">
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                            className="p-2 hover:bg-white/5 rounded-xl transition-all"
                        >
                            <ChevronLeft size={20} className="text-white/40" />
                        </button>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">{monthName} {currentDate.getFullYear()}</h3>
                        <button
                            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                            className="p-2 hover:bg-white/5 rounded-xl transition-all"
                        >
                            <ChevronRight size={20} className="text-white/40" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => (
                            <div key={d} className="text-center text-[10px] font-black text-white/20 pb-2">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                        {loading ? (
                            <div className="col-span-7 h-64 flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                            </div>
                        ) : renderDays()}
                    </div>
                </div>

                <div className="p-6 bg-white/[0.02] border-t border-white/5 text-center">
                    <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest italic">
                        "Cada día es una nueva oportunidad para colonizar el vacío"
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
}

function StatCard({ icon, label, val, color }) {
    return (
        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
                <div className={`${color} opacity-40`}>{icon}</div>
                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{label}</span>
            </div>
            <div className={`text-lg font-black ${color}`}>{val}</div>
        </div>
    );
}
