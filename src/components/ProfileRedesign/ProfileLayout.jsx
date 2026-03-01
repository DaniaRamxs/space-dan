import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const ProfileLayout = ({ children, theme }) => {
    const getFontStyle = (font) => {
        switch (font) {
            case 'mono': return 'font-mono';
            case 'serif': return 'font-serif';
            case 'display': return 'font-display font-black tracking-tighter uppercase italic';
            default: return 'font-sans';
        }
    };

    const getBackgroundStyle = (bg) => {
        switch (bg) {
            case 'dark': return 'bg-[#04040a]';
            case 'light': return 'bg-[#f4f4f9] text-black';
            case 'mesh': return 'bg-[#04040a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/40 via-[#04040a] to-[#04040a]';
            default: return 'bg-[#04040a]';
        }
    };

    return (
        <div
            className={`min-h-screen text-white relative transition-all duration-1000 ${getFontStyle(theme.font_style)} ${getBackgroundStyle(theme.background_style)}`}
            style={{
                '--primary': theme.primary_color,
                '--secondary': theme.secondary_color,
            }}
        >
            {/* Dynamic Mesh Background Layers */}
            {theme.background_style === 'mesh' && (
                <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[120px] animate-pulse duration-[5s]" />
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] z-10" />
                </div>
            )}

            {/* Grid Pattern */}
            <div className="fixed inset-0 bg-[url('/grid-pattern.png')] opacity-[0.02] pointer-events-none z-[1]" />

            <main className="relative z-10">
                {children}
            </main>
        </div>
    );
};
