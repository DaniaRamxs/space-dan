import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { useAuthContext } from '../contexts/AuthContext';
import { getRecentNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/supabaseNotifications';

export default function NotificationBell() {
    const { user } = useAuthContext();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0, width: 320 });

    const buttonRef = useRef(null);
    const menuRef = useRef(null);

    // Load initial notifications
    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        const loadNotifications = async () => {
            const data = await getRecentNotifications(15);
            setNotifications(data || []);
        };

        loadNotifications();

        // Subscribe to real-time inserts for this user
        const channel = supabase.channel('user_notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    setNotifications((prev) => [payload.new, ...prev].slice(0, 15));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    // Handle outside click to close dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!isOpen) return;

            const clickedOutsideButton = buttonRef.current && !buttonRef.current.contains(e.target);
            const clickedOutsideMenu = menuRef.current && !menuRef.current.contains(e.target);

            if (clickedOutsideButton && clickedOutsideMenu) {
                setIsOpen(false);
            }
        };

        // Escucha mousedown y touchstart para una mejor respuesta en móviles
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    const handleToggle = (e) => {
        // Detener la propagación para evitar que el click outside lo cierre inmediatamente
        e.stopPropagation();

        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();

            // Calculamos 10px de margen mínimo de los bordes derecho y izquierdo
            let rightPos = window.innerWidth - rect.right - 10;
            if (rightPos < 10) rightPos = 10;

            setDropdownPosition({
                top: rect.bottom + 12, // 12px debajo del botón
                right: rightPos
            });
        }

        setIsOpen((prev) => !prev);
    };

    const handleNotificationClick = async (notif) => {
        if (!notif.is_read) {
            await markNotificationAsRead(notif.id);
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
        }
    };

    const handleMarkAllRead = async () => {
        await markAllNotificationsAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    if (!user) return null;

    const unreadCount = notifications.filter(n => !n.is_read).length;

    // Menú flotante creado con Portal para salir de cualquier "overflow: hidden" o "backdrop-filter"
    const dropdownMenu = isOpen ? createPortal(
        <div
            className="notificationDropdown"
            ref={menuRef}
            style={{
                position: 'fixed',
                top: `${dropdownPosition.top}px`,
                right: `${dropdownPosition.right}px`,
                width: '320px',
                maxWidth: 'calc(100vw - 20px)', // Evita desbordamiento en móviles
                maxHeight: '400px',
                background: 'var(--bg)',
                border: '1px solid var(--accent)',
                borderRadius: '8px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.8), 0 0 20px rgba(255, 110, 180, 0.3)',
                zIndex: 9999999,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}
        >
            <div style={{ padding: '15px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,110,180,0.05)' }}>
                <h4 style={{ margin: 0, color: 'var(--text)', fontSize: '1rem' }}>Notificaciones</h4>
                {unreadCount > 0 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleMarkAllRead(); }}
                        style={{ background: 'none', border: 'none', color: 'var(--cyan)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                    >
                        Marcar todas leídas
                    </button>
                )}
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '10px 0' }}>
                {notifications.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text)', opacity: 0.6, fontSize: '0.9rem' }}>
                        No tienes notificaciones nuevas.
                    </div>
                ) : (
                    notifications.map(n => (
                        <div
                            key={n.id}
                            onClick={(e) => { e.stopPropagation(); handleNotificationClick(n); }}
                            style={{
                                padding: '12px 15px',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                cursor: 'pointer',
                                background: n.is_read ? 'transparent' : 'rgba(0, 229, 255, 0.08)',
                                transition: 'background 0.2s',
                                display: 'flex',
                                gap: '12px',
                                alignItems: 'flex-start'
                            }}
                        >
                            <div style={{ fontSize: '1.2rem', marginTop: '2px' }}>
                                {n.type === 'achievement' ? '🏆' : n.type === 'record' ? '🔥' : n.type === 'letter' ? '✉️' : n.type === 'room_invite' ? '🚪' : '⚙️'}
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ color: n.is_read ? 'var(--text)' : '#fff', fontSize: '0.9rem', lineHeight: '1.4' }}>
                                    {n.message}
                                </div>
                                <div style={{ color: 'var(--accent)', fontSize: '0.75rem', marginTop: '5px', opacity: 0.8 }}>
                                    {new Date(n.created_at).toLocaleString()}
                                </div>
                            </div>
                            {!n.is_read && (
                                <div style={{ width: '8px', height: '8px', background: 'var(--cyan)', borderRadius: '50%', marginTop: '6px' }} />
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>,
        document.body
    ) : null;

    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
                ref={buttonRef}
                onClick={handleToggle}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    position: 'relative',
                    padding: '5px',
                    color: 'var(--text)'
                }}
                title="Notificaciones"
            >
                🔔
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '0px',
                        right: '0px',
                        background: '#ff3366',
                        color: 'white',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 5px #ff3366'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>
            {dropdownMenu}
        </div>
    );
}
