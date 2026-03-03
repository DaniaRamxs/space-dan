import { useEffect, memo } from 'react';
import { motion } from 'framer-motion';

// ──────────────────────────────────────────────
//  GameImmersiveLayout — Full-screen game host
//  Improvements: richer starfield, deeper
//  atmospheric gradients, no layout changes.
// ──────────────────────────────────────────────

// Static star layer generated once — no re-render cost
const StarLayer = memo(() => (
    <>
        {/* Far stars — tiny, low opacity */}
        <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: `
                radial-gradient(1px 1px at 15% 20%, rgba(255,255,255,0.35), transparent),
                radial-gradient(1px 1px at 42% 8%, rgba(255,255,255,0.25), transparent),
                radial-gradient(1px 1px at 68% 35%, rgba(255,255,255,0.3), transparent),
                radial-gradient(1px 1px at 85% 14%, rgba(255,255,255,0.2), transparent),
                radial-gradient(1px 1px at 22% 72%, rgba(255,255,255,0.28), transparent),
                radial-gradient(1px 1px at 55% 60%, rgba(255,255,255,0.22), transparent),
                radial-gradient(1px 1px at 78% 80%, rgba(255,255,255,0.3), transparent),
                radial-gradient(1px 1px at 8%  48%, rgba(255,255,255,0.18), transparent),
                radial-gradient(1px 1px at 91% 55%, rgba(255,255,255,0.24), transparent),
                radial-gradient(1px 1px at 33% 90%, rgba(255,255,255,0.2), transparent)
            `,
            backgroundRepeat: 'repeat',
            backgroundSize: '220px 220px',
        }} />

        {/* Mid stars — slightly larger */}
        <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: `
                radial-gradient(1.5px 1.5px at 30px 60px, rgba(255,255,255,0.22), transparent),
                radial-gradient(1.5px 1.5px at 90px 20px, rgba(255,255,255,0.18), transparent),
                radial-gradient(1.5px 1.5px at 160px 100px, rgba(255,255,255,0.2), transparent),
                radial-gradient(1.5px 1.5px at 50px 150px, rgba(255,255,255,0.15), transparent),
                radial-gradient(1.5px 1.5px at 130px 170px, rgba(255,255,255,0.18), transparent)
            `,
            backgroundRepeat: 'repeat',
            backgroundSize: '200px 200px',
        }} />

        {/* Near stars — sparse, brighter */}
        <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: `
                radial-gradient(2px 2px at 60px 40px, rgba(255,255,255,0.18), transparent),
                radial-gradient(2px 2px at 180px 120px, rgba(255,255,255,0.14), transparent),
                radial-gradient(2px 2px at 110px 180px, rgba(255,255,255,0.16), transparent)
            `,
            backgroundRepeat: 'repeat',
            backgroundSize: '250px 250px',
        }} />

        {/* Corner nebula glows — very subtle depth */}
        <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `
                radial-gradient(ellipse 60% 40% at 0% 100%, rgba(0,100,180,0.04) 0%, transparent 60%),
                radial-gradient(ellipse 50% 35% at 100% 0%, rgba(120,0,160,0.04) 0%, transparent 60%),
                radial-gradient(ellipse 40% 30% at 50% 100%, rgba(0,40,80,0.06) 0%, transparent 70%)
            `,
        }} />
    </>
));

export function GameImmersiveLayout({ children }) {
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, filter: 'blur(8px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(8px)' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                width: '100vw',
                height: '100dvh',
                zIndex: 99999,
                backgroundColor: '#050508',
                background: `
                    radial-gradient(ellipse 80% 50% at 50% -10%, #131328 0%, #050508 65%),
                    radial-gradient(ellipse 40% 30% at 80% 110%, rgba(10,5,30,0.8) 0%, transparent 70%)
                `,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                overscrollBehavior: 'none',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
            }}
        >
            <StarLayer />

            {/* Content centred, max-width for desktop */}
            <div style={{
                width: '100%',
                maxWidth: 1400,
                height: '100%',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                {children}
            </div>
        </motion.div>
    );
}
