import { motion } from 'framer-motion';

export default function Card({
    children,
    className = '',
    animate = false,
    glass = true,
    interactive = false,
    ...props
}) {
    const Component = animate ? motion.div : 'div';

    return (
        <Component
            {...(animate ? { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } } : {})}
            className={`
        rounded-[24px] border border-white/5 bg-white/[0.02] p-6
        ${glass ? 'backdrop-blur-xl shadow-2xl shadow-black/40' : ''}
        ${interactive ? 'hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer' : ''}
        ${className}
      `}
            {...props}
        >
            {children}
        </Component>
    );
}
