import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuthContext } from '../contexts/AuthContext';
import {
    getRecentNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
} from '../services/supabaseNotifications';
import { universeService } from '../services/universe';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bell, AtSign, Users, Trophy, Settings, X, CheckCheck, Trash2 } from 'lucide-react';

// ── Configuración de tipos ────────────────────────────────────────────────────
const NOTIF_CONFIG = {
    achievement:         { icon: '🏆', color: 'text-amber-400',  ring: 'ring-amber-400/30',  bg: 'bg-amber-400/10',  label: 'Logro',      href: '/profile/logros' },
    record:              { icon: '🔥', color: 'text-orange-400', ring: 'ring-orange-400/30', bg: 'bg-orange-400/10', label: 'Récord',     href: '/profile/logros' },
    letter:              { icon: '✉️', color: 'text-cyan-400',   ring: 'ring-cyan-400/30',   bg: 'bg-cyan-400/10',   label: 'Carta',      href: '/cartas' },
    room_invite:         { icon: '🚪', color: 'text-purple-400', ring: 'ring-purple-400/30', bg: 'bg-purple-400/10', label: 'Sala',       href: null },
    partnership_request: { icon: '✨', color: 'text-pink-400',   ring: 'ring-pink-400/30',   bg: 'bg-pink-400/10',   label: 'Vínculo',   href: null },
    mention:             { icon: '@',  color: 'text-blue-400',   ring: 'ring-blue-400/30',   bg: 'bg-blue-400/10',   label: 'Mención',    href: '/chat' },
    reaction:            { icon: '⚡', color: 'text-yellow-400', ring: 'ring-yellow-400/30', bg: 'bg-yellow-400/10', label: 'Reacción',   href: null },
    repost:              { icon: '🔁', color: 'text-green-400',  ring: 'ring-green-400/30',  bg: 'bg-green-400/10',  label: 'Reposteo',  href: null },
    quote:               { icon: '💬', color: 'text-indigo-400', ring: 'ring-indigo-400/30', bg: 'bg-indigo-400/10', label: 'Cita',       href: null },
    comment:             { icon: '💭', color: 'text-teal-400',   ring: 'ring-teal-400/30',   bg: 'bg-teal-400/10',   label: 'Comentario', href: null },
    follow:              { icon: '👤', color: 'text-rose-400',   ring: 'ring-rose-400/30',   bg: 'bg-rose-400/10',   label: 'Seguidor',   href: null },
    system:              { icon: '⚙️', color: 'text-white/40',   ring: 'ring-white/10',      bg: 'bg-white/5',       label: 'Sistema',    href: null },
};

const TABS = [
    { id: 'all',      label: 'Todas',     Icon: Bell,     filter: null },
    { id: 'mentions', label: 'Menciones', Icon: AtSign,   filter: ['mention'] },
    { id: 'social',   label: 'Social',    Icon: Users,    filter: ['reaction', 'repost', 'quote', 'comment', 'letter', 'partnership_request', 'follow'] },
    { id: 'logros',   label: 'Logros',    Icon: Trophy,   filter: ['achievement', 'record'] },
    { id: 'sistema',  label: 'Sistema',   Icon: Settings, filter: ['system', 'room_invite'] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(date) {
    try { return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es }); }
    catch { return ''; }
}

function getHref(notif) {
    const cfg = NOTIF_CONFIG[notif.type] || NOTIF_CONFIG.system;
    if (cfg.href) return cfg.href;
    if (['reaction', 'repost', 'quote', 'comment'].includes(notif.type) && notif.reference_id)
        return `/transmission/${notif.reference_id}`;
    if (notif.type === 'room_invite' && notif.reference_id)
        return `/foco/${notif.reference_id}`;
    if (notif.type === 'mention' && notif.reference_id)
        return `/chat?msg=${notif.reference_id}`;
    return null;
}

function filterByTab(notifications, tabId) {
    const tab = TABS.find(t => t.id === tabId);
    if (!tab?.filter) return notifications;
    return notifications.filter(n => tab.filter.includes(n.type));
}

function unreadInTab(notifications, tabId) {
    return filterByTab(notifications, tabId).filter(n => !n.is_read).length;
}

// ── Tarjeta de notificación ───────────────────────────────────────────────────
function NotifCard({ notif, onRead, onDelete, onPartnershipAction }) {
    const navigate = useNavigate();
    const cfg = NOTIF_CONFIG[notif.type] || NOTIF_CONFIG.system;
    const href = getHref(notif);

    const handleClick = async () => {
        if (!notif.is_read) await onRead(notif.id);
        if (href) navigate(href);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
            className={`group relative flex gap-3 px-4 py-3 cursor-pointer transition-colors duration-150
                ${notif.is_read ? 'hover:bg-white/[0.03]' : 'bg-white/[0.05] hover:bg-white/[0.07]'}`}
            onClick={handleClick}
        >
            {/* Indicador de no leída */}
            {!notif.is_read && (
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-cyan-400" />
            )}

            {/* Icono tipo */}
            <div className={`shrink-0 w-9 h-9 rounded-2xl ${cfg.bg} ring-1 ${cfg.ring}
                flex items-center justify-center text-base font-black ${cfg.color} mt-0.5`}>
                {cfg.icon}
            </div>

            {/* Contenido */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className={`text-[13px] leading-snug ${notif.is_read ? 'text-white/50' : 'text-white/90'}`}>
                        {notif.message}
                    </p>
                    {/* Botón eliminar */}
                    <button
                        onClick={async (e) => { e.stopPropagation(); await onDelete(notif.id); }}
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity
                            w-6 h-6 flex items-center justify-center rounded-lg
                            hover:bg-rose-500/20 text-white/20 hover:text-rose-400"
                    >
                        <Trash2 size={11} />
                    </button>
                </div>

                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                    </span>
                    <span className="text-[10px] text-white/25 font-mono">{timeAgo(notif.created_at)}</span>
                </div>

                {/* Acciones inline vínculo */}
                {notif.type === 'partnership_request' && !notif.is_read && (
                    <div className="flex gap-2 mt-2.5" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => onPartnershipAction(notif, 'accept')}
                            className="px-3 py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30
                                text-[10px] font-black text-pink-300 uppercase tracking-widest transition-all"
                        >
                            Aceptar
                        </button>
                        <button
                            onClick={() => onPartnershipAction(notif, 'reject')}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10
                                text-[10px] font-black text-white/40 uppercase tracking-widest transition-all"
                        >
                            Rechazar
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ── Panel principal ───────────────────────────────────────────────────────────
function NotifPanel({ notifications, onRead, onDelete, onMarkAll, onPartnershipAction, onClose, isMobile }) {
    const [activeTab, setActiveTab] = useState('all');
    const visible = filterByTab(notifications, activeTab);
    const totalUnread = notifications.filter(n => !n.is_read).length;

    const panelContent = (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                    <Bell size={14} className="text-white/50" />
                    <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white/70">Notificaciones</span>
                    {totalUnread > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[9px] font-black">
                            {totalUnread}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {totalUnread > 0 && (
                        <button
                            onClick={onMarkAll}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10
                                text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white/70 transition-all"
                        >
                            <CheckCheck size={11} /> Leer todo
                        </button>
                    )}
                    {isMobile && (
                        <button
                            onClick={onClose}
                            className="w-7 h-7 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/40 transition-all"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-0.5 px-3 pt-2 pb-1 overflow-x-auto no-scrollbar">
                {TABS.map(tab => {
                    const tabUnread = unreadInTab(notifications, tab.id);
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl shrink-0 transition-all
                                text-[9px] font-black uppercase tracking-widest
                                ${isActive
                                    ? 'bg-white/10 text-white border border-white/10'
                                    : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                                }`}
                        >
                            <tab.Icon size={10} strokeWidth={2} />
                            {tab.label}
                            {tabUnread > 0 && (
                                <span className={`w-4 h-4 flex items-center justify-center rounded-full text-[8px] font-black
                                    ${isActive ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white/50'}`}>
                                    {tabUnread > 9 ? '9+' : tabUnread}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-white/[0.04]">
                <AnimatePresence initial={false}>
                    {visible.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-14 gap-3"
                        >
                            <span className="text-3xl opacity-20">
                                {activeTab === 'mentions' ? '@' : activeTab === 'logros' ? '🏆' : '🛰️'}
                            </span>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                                Sin {activeTab === 'all' ? 'notificaciones' : TABS.find(t => t.id === activeTab)?.label.toLowerCase()}
                            </p>
                        </motion.div>
                    ) : (
                        visible.map(n => (
                            <NotifCard
                                key={n.id}
                                notif={n}
                                onRead={onRead}
                                onDelete={onDelete}
                                onPartnershipAction={onPartnershipAction}
                            />
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );

    if (isMobile) {
        // Bottom sheet móvil
        return createPortal(
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex flex-col justify-end"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        onClick={e => e.stopPropagation()}
                        className="relative rounded-t-[32px] overflow-hidden flex flex-col"
                        style={{
                            background: '#090912',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderBottom: 'none',
                            height: '80vh',
                        }}
                    >
                        {/* Drag handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-white/20" />
                        </div>
                        {panelContent}
                        {/* Safe area padding */}
                        <div className="h-safe-area-inset-bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
                    </motion.div>
                </motion.div>
            </AnimatePresence>,
            document.body
        );
    }

    // Dropdown desktop
    return panelContent;
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function NotificationBell() {
    const { user } = useAuthContext();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [dropPos, setDropPos] = useState({ top: 0, right: 0 });

    const buttonRef = useRef(null);
    const panelRef = useRef(null);

    // Detectar móvil
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check, { passive: true });
        return () => window.removeEventListener('resize', check);
    }, []);

    // Cargar notificaciones
    useEffect(() => {
        if (!user) { setNotifications([]); return; }

        getRecentNotifications(40).then(data => setNotifications(data || []));

        const channel = supabase.channel(`notif_bell_${user.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                setNotifications(prev => [payload.new, ...prev].slice(0, 40));
                // Feedback háptico al recibir notificación en background
                if (Capacitor.isNativePlatform()) {
                    import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
                        Haptics.impact({ style: ImpactStyle.Medium });
                    }).catch(() => {});
                } else if ('vibrate' in navigator && document.hidden) {
                    navigator.vibrate(100);
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user?.id]);

    // Click fuera para cerrar (solo desktop)
    useEffect(() => {
        if (!isOpen || isMobile) return;
        const handler = (e) => {
            if (buttonRef.current?.contains(e.target)) return;
            if (panelRef.current?.contains(e.target)) return;
            setIsOpen(false);
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('touchstart', handler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('touchstart', handler);
        };
    }, [isOpen, isMobile]);

    const handleToggle = (e) => {
        e.stopPropagation();
        if (!isOpen && !isMobile && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropPos({
                top: rect.bottom + 8,
                right: Math.max(8, window.innerWidth - rect.right),
            });
        }
        setIsOpen(v => !v);
    };

    const handleRead = useCallback(async (id) => {
        await markNotificationAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }, []);

    const handleDelete = useCallback(async (id) => {
        await deleteNotification(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const handleMarkAll = useCallback(async () => {
        await markAllNotificationsAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }, []);

    const handlePartnershipAction = useCallback(async (notif, action) => {
        try {
            if (action === 'accept') await universeService.acceptRequest(notif.reference_id);
            else await universeService.rejectRequest(notif.reference_id);
            await handleRead(notif.id);
        } catch (err) {
            console.error('[Notif] Partnership action failed:', err);
        }
    }, [handleRead]);

    if (!user) return null;

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const panel = isMobile ? (
        isOpen && (
            <NotifPanel
                notifications={notifications}
                onRead={handleRead}
                onDelete={handleDelete}
                onMarkAll={handleMarkAll}
                onPartnershipAction={handlePartnershipAction}
                onClose={() => setIsOpen(false)}
                isMobile
            />
        )
    ) : (
        isOpen && createPortal(
            <div
                ref={panelRef}
                style={{
                    position: 'fixed',
                    top: dropPos.top,
                    right: dropPos.right,
                    width: 380,
                    maxWidth: 'calc(100vw - 16px)',
                    height: 520,
                    zIndex: 9999999,
                    background: '#090912',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: 24,
                    boxShadow: '0 24px 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                <NotifPanel
                    notifications={notifications}
                    onRead={handleRead}
                    onDelete={handleDelete}
                    onMarkAll={handleMarkAll}
                    onPartnershipAction={handlePartnershipAction}
                    onClose={() => setIsOpen(false)}
                    isMobile={false}
                />
            </div>,
            document.body
        )
    );

    return (
        <>
            <button
                ref={buttonRef}
                onClick={handleToggle}
                className={`relative w-8 h-8 flex items-center justify-center rounded-xl transition-all
                    ${isOpen
                        ? 'bg-white/10 text-white'
                        : 'text-white/50 hover:text-white hover:bg-white/[0.07]'
                    }`}
                aria-label="Notificaciones"
            >
                <Bell size={16} strokeWidth={isOpen ? 2.5 : 1.8} />
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            key="badge"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1
                                flex items-center justify-center rounded-full
                                bg-rose-500 text-white text-[8px] font-black
                                shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>
            {panel}
        </>
    );
}
