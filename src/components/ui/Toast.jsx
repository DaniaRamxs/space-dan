import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

const icons = {
    success: <CheckCircle2 size={16} className="text-emerald-400" />,
    error: <AlertCircle size={16} className="text-rose-500" />,
    info: <Info size={16} className="text-cyan-400" />,
};

export default function Toast({
    message,
    type = 'info',
    isVisible,
    onClose,
    duration = 5000
}) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    className="fixed bottom-8 right-8 z-[2000] flex items-center gap-4 p-4 pl-5
                     bg-[#0a0a14] border border-white/10 rounded-2xl shadow-2xl shadow-black/60
                     min-w-[300px] max-w-sm"
                >
                    <div className="shrink-0">{icons[type]}</div>

                    <div className="flex-1">
                        <p className="text-[11px] font-bold text-white uppercase tracking-wider leading-relaxed">
                            {message}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all"
                    >
                        <X size={14} />
                    </button>

                    {/* Progress bar timer */}
                    <motion.div
                        initial={{ width: '100%' }}
                        animate={{ width: 0 }}
                        transition={{ duration: duration / 1000, ease: 'linear' }}
                        className={`absolute bottom-0 left-0 h-0.5 bg-current opacity-20`}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
