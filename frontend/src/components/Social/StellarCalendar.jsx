import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Star, CheckCircle2, Lock, Gift, ChevronLeft, ChevronRight, Zap, X } from 'lucide-react';
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
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="h-10 sm:h-16" />);
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
                    className={`h-10 sm:h-16 rounded-xl sm:rounded-2xl border flex flex-col items-center justify-center relative overflow-hidden transition-all ${isActive
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                        : isToday
                            ? 'bg-white/10 border-white/30 text-white'
                            : 'bg-white/[0.02] border-white/5 text-white/20'
                        }`}
                >
                    {isActive && <div className="absolute top-1 right-1"><CheckCircle2 size={8} className="text-cyan-400" /></div>}
                    <span className="text-[10px] sm:text-xs font-black">{day}</span>
                    {isToday && <div className="mt-0.5 w-1 h-1 bg-white rounded-full animate-pulse" />}
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
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-3xl"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="bg-[#050510] border-t sm:border border-white/10 w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden max-h-[90vh] sm:max-h-[95vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Section */}
                <div className="p-6 sm:p-10 border-b border-white/5 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 shrink-0 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-6 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-4 mb-8 text-left">
                        <div className="p-3 bg-cyan-500/20 rounded-2xl text-cyan-400">
                            <CalendarIcon size={24} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter leading-none">Mi Bitácora</h2>
                            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold mt-1">Sincronización Estelar</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 sm:gap-4">
                        <StatCard icon={<Zap size={16} />} label="Racha" val={`${profile?.mission_streak || 0}`} color="text-yellow-400" />
                        <StatCard icon={<Star size={16} />} label="Nivel" val={`${profile?.level || 1}`} color="text-cyan-400" />
                        <StatCard icon={<Gift size={16} />} label="Meta" val={history.length} color="text-purple-400" />
                    </div>
                </div>

                {/* Calendar Grid Section */}
                <div className="p-6 sm:p-10 flex-1 overflow-y-auto no-scrollbar pb-12 sm:pb-10">
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                            className="p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-95"
                        >
                            <ChevronLeft size={20} className="text-white/40" />
                        </button>
                        <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-widest">{monthName} {currentDate.getFullYear()}</h3>
                        <button
                            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                            className="p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-95"
                        >
                            <ChevronRight size={20} className="text-white/40" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-4">
                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                            <div key={`day-header-${i}`} className="text-center text-[9px] sm:text-[10px] font-black text-white/10 uppercase">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                        {loading ? (
                            <div className="col-span-7 h-48 sm:h-64 flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                            </div>
                        ) : renderDays()}
                    </div>
                </div>

                <div className="p-4 sm:p-6 bg-white/[0.02] border-t border-white/5 text-center shrink-0">
                    <p className="text-[8px] sm:text-[9px] text-white/20 font-bold uppercase tracking-widest italic leading-relaxed">
                        "Cada día es una nueva oportunidad para colonizar el vacío"
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
}

function StatCard({ icon, label, val, color }) {
    return (
        <div className="bg-black/40 border border-white/5 p-3 sm:p-4 rounded-2xl transition-all hover:border-white/10 text-left">
            <div className="flex items-center gap-2 mb-1">
                <div className={`${color} opacity-40 shrink-0`}>{icon}</div>
                <span className="text-[8px] sm:text-[9px] font-black text-white/20 uppercase tracking-widest truncate">{label}</span>
            </div>
            <div className={`text-lg sm:text-xl font-black ${color}`}>{val}</div>
        </div>
    );
}
