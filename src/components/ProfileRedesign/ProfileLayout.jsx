import React from 'react';

export const ProfileLayout = ({ children, theme }) => {
    const getFontStyle = (font) => {
        switch (font) {
            case 'mono': return 'font-mono';
            case 'serif': return 'font-serif';
            case 'display': return 'font-display font-black tracking-tighter uppercase italic';
            default: return 'font-sans';
        }
    };

    const getBackgroundStyle = (bg, customColor) => {
        if (customColor) return '';
        switch (bg) {
            case 'dark': return 'bg-[#04040a]';
            case 'light': return 'bg-[#f4f4f9] text-black';
            case 'mesh': return 'bg-[#04040a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/40 via-[#04040a] to-[#04040a]';
            default: return 'bg-[#04040a]';
        }
    };

    return (
        <div className={`min-h-screen text-white ${getFontStyle(theme?.font_style)} ${getBackgroundStyle(theme?.background_style, theme?.primary_color)}`}>
            <main className="relative z-10">
                {children}
            </main>
        </div>
    );
};