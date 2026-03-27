import { motion } from 'motion/react';
import { Plus, Sparkles } from 'lucide-react';

export function CreateSpaceButton() {
  return (
    <div className="px-4 sm:px-6 mb-4 sm:mb-6">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full relative overflow-hidden rounded-xl sm:rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 shadow-lg shadow-blue-500/30 group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <span className="text-white font-bold text-lg sm:text-xl tracking-wide">CREAR ESPACIO</span>
        </div>
        
        <p className="relative z-10 text-white/70 text-[10px] sm:text-xs mt-2 sm:mt-3 text-center">
          o elige una actividad para lanzar directo
        </p>
      </motion.button>
    </div>
  );
}