export default function Input({
    label,
    error,
    className = '',
    ...props
}) {
    return (
        <div className={`flex flex-col gap-2 w-full ${className}`}>
            {label && (
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 px-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    className={`
              w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3
              text-sm font-medium text-white placeholder:text-white/10
              transition-all duration-300 focus-ring
              ${error ? 'border-rose-500/50 bg-rose-500/5' : 'focus:border-white/20 focus:bg-black/60 shadow-inner shadow-black/20'}
            `}
                    {...props}
                />
            </div>
            {error && (
                <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest px-1">
                    {error}
                </span>
            )}
        </div>
    );
}
