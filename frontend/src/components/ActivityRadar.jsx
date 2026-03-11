import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

export default function ActivityRadar() {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        // Initial system check notification
        const timer = setTimeout(() => {
            addNotification({
                id: `sys-init-${Math.random().toString(36).substr(2, 9)}`,
                text: '🛰️ Radar Estelar: Sistema en línea. Escaneando sector...',
                icon: '🛰️',
                color: 'text-amber-400'
            });
        }, 1500);

        // Listen for new posts
        const postsChannel = supabase
            .channel('global_posts_radar')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
                addNotification({
                    id: `post-${Date.now()}-${Math.random()}`,
                    text: '📡 Nueva transmisión detectada en el sector',
                    icon: '📡',
                    color: 'text-purple-400'
                });
            })
            .subscribe();

        // Listen for new echoes
        const echoesChannel = supabase
            .channel('space_echoes_radar')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'space_echoes' }, payload => {
                addNotification({
                    id: `echo-${Date.now()}-${Math.random()}`,
                    text: '🌌 Alguien dejó un nuevo eco en el universo',
                    icon: '🌠',
                    color: 'text-cyan-400'
                });
            })
            .subscribe();

        return () => {
            clearTimeout(timer);
            supabase.removeChannel(postsChannel);
            supabase.removeChannel(echoesChannel);
        };
    }, []);

    const addNotification = (notif) => {
        setNotifications(prev => [...prev, notif]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notif.id));
        }, 5000);
    };

    return (
        <div className="fixed top-20 right-6 z-[9999] flex flex-col gap-3 items-end pointer-events-none">
            <AnimatePresence>
                {notifications.map(n => (
                    <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: 50, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                        className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 min-w-[200px]"
                    >
                        <span className="text-xl">{n.icon}</span>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Radar del Sistema</span>
                            <span className={`text-[11px] font-bold ${n.color}`}>{n.text}</span>
                        </div>
                        {/* Progress bar timer */}
                        <motion.div
                            initial={{ width: '100%' }}
                            animate={{ width: '0%' }}
                            transition={{ duration: 5, ease: "linear" }}
                            className="absolute bottom-0 left-0 h-0.5 bg-white/20 rounded-full"
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
