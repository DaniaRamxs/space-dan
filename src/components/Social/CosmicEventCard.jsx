import { memo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

// ── Configuración visual por rareza ─────────────────────────────────────────
const RARITY_CONFIG = {
    epic: {
        label: 'Épico',
        border: 'border-violet-500/40',
        glow: 'shadow-[0_0_25px_rgba(139,92,246,0.15)]',
        bgGradient: 'from-violet-900/20 via-[#080816] to-[#080816]',
        badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
        dot: 'bg-violet-400',
        textAccent: 'text-violet-300',
        orb: 'from-violet-500 to-indigo-600',
    },
    legendary: {
        label: 'Legendario',
        border: 'border-amber-500/50',
        glow: 'shadow-[0_0_30px_rgba(245,158,11,0.2)]',
        bgGradient: 'from-amber-900/20 via-[#080816] to-[#080816]',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        dot: 'bg-amber-400',
        textAccent: 'text-amber-300',
        orb: 'from-amber-400 to-orange-500',
    },
    mythic: {
        label: 'Mítico',
        border: 'border-cyan-400/60',
        glow: 'shadow-[0_0_40px_rgba(34,211,238,0.25)]',
        bgGradient: 'from-cyan-900/20 via-[#04040e] to-[#04040e]',
        badge: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40',
        dot: 'bg-cyan-300',
        textAccent: 'text-cyan-200',
        orb: 'from-cyan-400 to-blue-500',
    },
};

const EVENT_LABEL = {
    chest_open: '📦 Cofre Abierto',
    rare_character: '🌟 Descubrimiento',
    frame_unlock: '🖼️ Marco Desbloqueado',
    cosmetic_rare: '💄 Cosmético Raro',
    collection_complete: '🎖️ Colección Completa',
    community: '🌐 Evento Comunitario',
};

function safeTimeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60) return 'ahora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

// ── Partículas de brillo para míticos ───────────────────────────────────────
function MythicParticles() {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            {[...Array(6)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-px h-px rounded-full bg-cyan-400"
                    style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
                    animate={{ opacity: [0, 1, 0], scale: [0, 2, 0], y: [-10, -30, -50] }}
                    transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
                />
            ))}
        </div>
    );
}

const CosmicEventCard = memo(({ event }) => {
    const rarity = event.rarity || 'epic';
    const cfg = RARITY_CONFIG[rarity] || RARITY_CONFIG.epic;
    const eventLabel = EVENT_LABEL[event.event_type] || '🛰️ Evento Cósmico';
    const author = event.author || {};

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                relative mb-4 rounded-2xl border overflow-hidden
                bg-gradient-to-br ${cfg.bgGradient}
                ${cfg.border} ${cfg.glow}
            `}
        >
            {rarity === 'mythic' && <MythicParticles />}

            {/* Línea decorativa superior */}
            <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-50 ${cfg.textAccent}`} />

            <div className="relative p-4">
                {/* Header: etiqueta evento + tiempo */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {/* Dot pulsante */}
                        <span className="relative flex h-2 w-2">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${cfg.dot}`} />
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.dot}`} />
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                            {eventLabel}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${cfg.badge} opacity-70`}>
                            {cfg.label}
                        </span>
                    </div>
                    <span className="text-[10px] text-white/25 font-mono">
                        {safeTimeAgo(event.created_at)}
                    </span>
                </div>

                {/* Cuerpo: avatar + texto */}
                <div className="flex items-center gap-3">
                    {/* Avatar con orb de rareza */}
                    <Link to={author.username ? `/@${author.username}` : '#'} className="shrink-0 relative">
                        <div className={`absolute -inset-0.5 rounded-full bg-gradient-to-br ${cfg.orb} opacity-60 blur-sm`} />
                        <img
                            src={author.avatar_url || '/default_user_blank.png'}
                            className="relative w-10 h-10 rounded-full object-cover border-2 border-black/50"
                            alt={author.username}
                        />
                        {/* Ícono del evento */}
                        <span className="absolute -bottom-1 -right-1 text-sm leading-none">{event.icon || '✨'}</span>
                    </Link>

                    {/* Texto del evento */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug text-white/90">
                            <Link
                                to={author.username ? `/@${author.username}` : '#'}
                                className={`font-black hover:underline ${cfg.textAccent}`}
                            >
                                {author.username || 'Explorador'}
                            </Link>{' '}
                            <span className="text-white/60 font-medium">
                                {event.title?.replace(/^[^\s]+\s/, '') || event.title}
                            </span>
                        </p>
                        <p className="text-xs text-white/35 mt-0.5 leading-relaxed">
                            {event.description}
                        </p>
                    </div>
                </div>
            </div>

            {/* Línea decorativa inferior para míticos/legendarios */}
            {(rarity === 'mythic' || rarity === 'legendary') && (
                <div className={`h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-30 ${cfg.textAccent}`} />
            )}
        </motion.div>
    );
});

CosmicEventCard.displayName = 'CosmicEventCard';
export default CosmicEventCard;
