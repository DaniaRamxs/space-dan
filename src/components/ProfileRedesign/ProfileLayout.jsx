
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
        <div
            className={`min-h-screen text-white relative transition-all duration-1000 ${getFontStyle(theme.font_style)} ${getBackgroundStyle(theme.background_style, theme.primary_color)}`}
            style={{
                '--primary': theme.primary_color,
                '--secondary': theme.secondary_color,
                // Solo aplica color de fondo sólido si el usuario eligió uno explícitamente
                // (distinguimos colores muy oscuros/neutrales del default para no pintar toda la página)
                ...(theme.primary_color && theme.background_url && { backgroundColor: theme.primary_color }),
            }}
        >
            {/* Dynamic Mesh Background Layers */}
            {theme.background_style === 'mesh' && (
                <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[120px] animate-pulse duration-[5s]" />
                    <div className="absolute inset-0 opacity-[0.03] z-10" style={{backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"}} />
                </div>
            )}

            {/* Grid Pattern */}
            <div className="fixed inset-0 opacity-[0.02] pointer-events-none z-[1]" style={{backgroundImage:"linear-gradient(rgba(255,255,255,0.15) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.15) 1px,transparent 1px)",backgroundSize:"40px 40px"}} />

            <main className="relative z-10">
                {children}
            </main>
        </div>
    );
};
