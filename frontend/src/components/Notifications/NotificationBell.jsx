import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, Volume2, MessageCircle, Target, AtSign, AlertCircle, X } from 'lucide-react';
import { 
  notificationsService, 
  NOTIFICATION_TYPES,
  NOTIFICATION_ICONS 
} from '../../services/notificationsService';
import { formatDistanceToNow } from '../../utils/dateUtils';

// Map Lucide icons to notification types
const typeIcons = {
  [NOTIFICATION_TYPES.REPLY]: MessageCircle,
  [NOTIFICATION_TYPES.VOICE_ACTIVITY]: Volume2,
  [NOTIFICATION_TYPES.COMMUNITY_ACTIVITY]: Target,
  [NOTIFICATION_TYPES.MENTION]: AtSign,
  [NOTIFICATION_TYPES.SYSTEM]: AlertCircle
};

// Type colors
const typeColors = {
  [NOTIFICATION_TYPES.REPLY]: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  [NOTIFICATION_TYPES.VOICE_ACTIVITY]: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  [NOTIFICATION_TYPES.COMMUNITY_ACTIVITY]: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  [NOTIFICATION_TYPES.MENTION]: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  [NOTIFICATION_TYPES.SYSTEM]: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationsService.getNotifications(20, 0, false);
      setNotifications(data);
      const count = await notificationsService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('[NotificationBell] Load failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    loadNotifications();

    // Subscribe to new notifications
    const unsubscribe = notificationsService.subscribeToNotifications((newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Play notification sound (optional)
      // new Audio('/notification-sound.mp3').play().catch(() => {});
    });

    // Subscribe to count changes
    const unsubscribeCount = notificationsService.subscribeToUnreadCount((count) => {
      setUnreadCount(count);
    });

    return () => {
      unsubscribe();
      unsubscribeCount();
    };
  }, [loadNotifications]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        panelRef.current && 
        !panelRef.current.contains(event.target) &&
        !buttonRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark all as read
  const handleMarkAllRead = async () => {
    const marked = await notificationsService.markAsRead();
    if (marked > 0) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  // Mark single as read
  const handleMarkRead = async (id, event) => {
    event.stopPropagation();
    const success = await notificationsService.markOneAsRead(id);
    if (success) {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  // Delete notification
  const handleDelete = async (id, event) => {
    event.stopPropagation();
    const success = await notificationsService.deleteNotification(id);
    if (success) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await notificationsService.markOneAsRead(notification.id);
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Navigate if action_url exists
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
    
    setIsOpen(false);
  };

  // Get icon component for notification type
  const getIcon = (type) => {
    const IconComponent = typeIcons[type] || AlertCircle;
    return <IconComponent size={16} />;
  };

  // Format time
  const formatTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Recientemente';
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl hover:bg-white/10 transition-all duration-200 group"
        aria-label="Notificaciones"
      >
        <Bell 
          size={22} 
          className={`transition-all duration-200 ${
            isOpen ? 'text-cyan-400' : 'text-white/70 group-hover:text-white'
          }`} 
        />
        
        {/* Unread Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1.5 bg-rose-500 text-white text-[10px] font-bold rounded-full border-2 border-[#0a0a0f]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-3 w-[380px] max-w-[calc(100vw-24px)] bg-[#12121a] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <h3 className="font-bold text-white/90 flex items-center gap-2">
                <Bell size={16} className="text-cyan-400" />
                Notificaciones
              </h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-cyan-400 transition-colors"
                    title="Marcar todas como leídas"
                  >
                    <Check size={16} />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
                    <Bell size={24} className="text-white/20" />
                  </div>
                  <p className="text-white/40 text-sm">No hay notificaciones</p>
                  <p className="text-white/20 text-xs mt-1">
                    Las notificaciones aparecerán aquí
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => handleNotificationClick(notification)}
                      className={`group p-4 cursor-pointer transition-all hover:bg-white/[0.03] ${
                        !notification.read ? 'bg-cyan-500/[0.02]' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${
                          typeColors[notification.type] || typeColors[NOTIFICATION_TYPES.SYSTEM]
                        }`}>
                          {getIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`font-semibold text-sm ${
                              notification.read ? 'text-white/60' : 'text-white/90'
                            }`}>
                              {notification.title}
                            </h4>
                            <span className="text-[10px] text-white/30 flex-shrink-0">
                              {formatTime(notification.created_at)}
                            </span>
                          </div>
                          <p className={`text-sm mt-0.5 line-clamp-2 ${
                            notification.read ? 'text-white/40' : 'text-white/60'
                          }`}>
                            {notification.message}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.read && (
                            <button
                              onClick={(e) => handleMarkRead(notification.id, e)}
                              className="p-1.5 rounded-lg hover:bg-cyan-500/10 text-white/30 hover:text-cyan-400 transition-colors"
                              title="Marcar como leída"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(notification.id, e)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-white/30 hover:text-rose-400 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Unread indicator */}
                      {!notification.read && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-500 rounded-r-full" />
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-white/[0.06] text-center">
                <button
                  onClick={() => {
                    // Navigate to all notifications page
                    window.location.href = '/notifications';
                    setIsOpen(false);
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Ver todas las notificaciones →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
