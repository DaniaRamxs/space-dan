import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface SpaceCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  gradient: string;
  iconBg: string;
}

export function SpaceCard({ icon: Icon, title, subtitle, gradient, iconBg }: SpaceCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.98 }}
      className="relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-6 cursor-pointer group"
      style={{
        background: gradient,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10 flex flex-col items-center gap-2 sm:gap-3">
        <div 
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300"
          style={{ background: iconBg }}
        >
          <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
        </div>
        
        <div className="text-center">
          <h3 className="text-white font-bold text-base sm:text-lg mb-0.5 sm:mb-1">{title}</h3>
          <p className="text-white/70 text-[10px] sm:text-xs">{subtitle}</p>
        </div>
      </div>

      <div className="absolute bottom-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/5 rounded-tl-full" />
    </motion.div>
  );
}