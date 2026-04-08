import { motion } from 'framer-motion';

const variants = {
    primary: 'bg-white text-black hover:bg-white/90 shadow-xl shadow-white/5',
    secondary: 'bg-white/[0.05] text-white border border-white/10 hover:bg-white/[0.1]',
    ghost: 'bg-transparent text-white/60 hover:text-white hover:bg-white/5',
    outline: 'bg-transparent border border-white/20 text-white hover:border-white/40 hover:bg-white/5',
    danger: 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20',
};

const sizes = {
    xs: 'px-3 py-1.5 text-[10px] rounded-lg',
    sm: 'px-4 py-2 text-xs rounded-xl',
    md: 'px-6 py-3 text-sm rounded-xl',
    lg: 'px-8 py-4 text-base rounded-2xl',
};

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    loading = false,
    disabled = false,
    ...props
}) {
    return (
        <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={disabled || loading}
            className={`
        relative flex items-center justify-center font-bold uppercase tracking-widest transition-all focus-ring
        ${variants[variant]} 
        ${sizes[size]} 
        ${disabled ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'}
        ${className}
      `}
            {...props}
        >
            {loading ? (
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Cargando</span>
                </div>
            ) : children}
        </motion.button>
    );
}
