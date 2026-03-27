import { Home, Users, Zap, MessageCircle, User, Menu } from 'lucide-react';
import { motion } from 'motion/react';

const navItems = [
  { icon: Home, label: 'FEED', active: false },
  { icon: Users, label: 'COMUNIDADES', active: false },
  { icon: Zap, label: 'ESPACIOS', active: true },
  { icon: MessageCircle, label: 'CHAT', active: false },
  { icon: User, label: 'PERFIL', active: false },
  { icon: Menu, label: 'MÁS', active: false },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-lg border-t border-white/10 safe-area-inset-bottom">
      <div className="max-w-2xl mx-auto px-1 sm:px-2 py-2 sm:py-3">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <motion.button
              key={item.label}
              whileTap={{ scale: 0.9 }}
              className={`flex flex-col items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors ${
                item.active 
                  ? 'text-cyan-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <item.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[9px] sm:text-[10px] font-medium hidden xs:block">{item.label}</span>
              {item.active && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full"
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </nav>
  );
}