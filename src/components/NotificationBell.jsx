import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuthContext } from '../contexts/AuthContext';
import { getRecentNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/supabaseNotifications';

export default function NotificationBell() {
    const { user } = useAuthContext();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

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
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

    const handleToggle = (e) => {
        if (!isOpen) {
            const rect = e.currentTarget.getBoundingClientRect();
            // In mobile, we might want it to be right-aligned to the screen edge
            // rather than the button edge if it's very tight.
            const rightMargin = window.innerWidth - rect.right;
            setDropdownPosition({
                top: rect.bottom + 10,
                right: rightMargin < 10 ? 10 : rightMargin // Minimum 10px from screen edge
            });
        }
        setIsOpen(!isOpen);
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

    return (
        <div className="notificationBellContainer" ref={dropdownRef} style={{ display: 'flex', alignItems: 'center' }}>
            <button
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

            {isOpen && (
                <div
                    className="notificationDropdown"
                    style={{
                        position: 'fixed',
                        top: `${dropdownPosition.top}px`,
                        right: window.innerWidth < 400 ? '10px' : `${window.innerWidth - dropdownPosition.right}px`,
                        width: '320px',
                        maxWidth: 'calc(100vw - 20px)',
                        maxHeight: '400px',
                        background: 'var(--bg)',
                        border: '1px solid var(--accent)',
                        borderRadius: '8px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.8), 0 0 20px rgba(255, 110, 180, 0.3)',
                        zIndex: 999999,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}
                >
                    <div style={{ padding: '15px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,110,180,0.05)' }}>
                        <h4 style={{ margin: 0, color: 'var(--text)', fontSize: '1rem' }}>Notificaciones</h4>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
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
                                    onClick={() => handleNotificationClick(n)}
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
                                        {n.type === 'achievement' ? '🏆' : n.type === 'record' ? '🔥' : '⚙️'}
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
                </div>
            )}
        </div>
    );
}
