import React, { createContext, useContext, useState, useEffect } from 'react'; // System identity system v3.0
import { supabase } from '../supabaseClient';
import { useAuthContext } from './AuthContext';

const UniverseContext = createContext();

export const UniverseProvider = ({ children, overrideProfile = null }) => {
    const { user, profile: authProfile } = useAuthContext();
    const profile = overrideProfile || authProfile;
    const [themeConfig, setThemeConfig] = useState(null);
    const [isAmbientMuted, setIsAmbientMuted] = useState(() => {
        return localStorage.getItem('ambient_muted') === 'true';
    });
    const [partnership, setPartnership] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState({}); // { userId: { username, status, avatar_url, last_active } }
    const [activeStation, setActiveStation] = useState(null);
    const [isPresenceReady, setIsPresenceReady] = useState(false);

    // 0. Fetch global partnership for the logged in user
    useEffect(() => {
        if (!user) {
            setPartnership(null);
            return;
        }

        const fetchP = async () => {
            const { data } = await supabase.rpc('get_active_partnership', { p_user_id: user.id });
            setPartnership(data);
        };

        fetchP();

        const channel = supabase.channel('global-partnerships')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partnerships' }, payload => {
                if (payload.new?.user1_id === user.id || payload.new?.user2_id === user.id ||
                    payload.old?.user1_id === user.id || payload.old?.user2_id === user.id) {
                    fetchP();
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    const presenceChannelRef = React.useRef(null);

    // 0.5 Realtime Presence Tracking
    useEffect(() => {
        if (!user) {
            setOnlineUsers({});
            setIsPresenceReady(false);
            if (presenceChannelRef.current) {
                presenceChannelRef.current.unsubscribe();
                presenceChannelRef.current = null;
            }
            return;
        }

        const presenceChannel = supabase.channel('online-users', {
            config: { presence: { key: user.id } }
        });

        presenceChannelRef.current = presenceChannel;

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                const users = {};
                Object.keys(state).forEach(key => {
                    users[key] = state[key][0];
                });
                setOnlineUsers(users);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                setOnlineUsers(prev => ({ ...prev, [key]: newPresences[0] }));
            })
            .on('presence', { event: 'leave' }, ({ key }) => {
                setOnlineUsers(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({
                        id: user.id,
                        username: profile?.username || 'Viajero',
                        avatar_url: profile?.avatar_url,
                        last_active: new Date().toISOString()
                    });
                    setIsPresenceReady(true);
                }
            });

        return () => {
            presenceChannel.unsubscribe();
            presenceChannelRef.current = null;
            setIsPresenceReady(false);
        };
    }, [user?.id, profile?.username, profile?.avatar_url]);

    const updatePresence = React.useCallback(async (data) => {
        if (!user || !presenceChannelRef.current) return false;

        try {
            await presenceChannelRef.current.track({
                id: user.id,
                username: profile?.username || 'Viajero',
                avatar_url: profile?.avatar_url,
                last_active: new Date().toISOString(),
                ...data
            });
            return true;
        } catch (err) {
            console.error('[UniverseContext] track error:', err);
            return false;
        }
    }, [user?.id, profile?.username, profile?.avatar_url]);

    // 1. Efecto para aplicar el tema al documento mediante CSS Variables
    useEffect(() => {
        const root = document.documentElement;

        // Limpiar todas las variables --u- previas
        const currentStyles = root.getAttribute('style') || '';
        const cleanStyles = currentStyles.split(';').filter(s => !s.trim().startsWith('--u-')).join(';');
        root.setAttribute('style', cleanStyles);

        if (profile?.theme_item?.metadata) {
            const metadata = profile.theme_item.metadata;
            const vars = metadata.vars || {};

            console.log('[UniverseContext] Aplicando tema:', profile.theme_item.id, vars);

            Object.entries(vars).forEach(([key, value]) => {
                root.style.setProperty(key, value);
            });

            root.setAttribute('data-theme', profile.theme_item.id);

            // Si el tema tiene un degradado global en metadata (Universe Themes v3)
            if (metadata.gradient) {
                root.style.setProperty('--u-gradient', `linear-gradient(to bottom, ${metadata.gradient.join(', ')})`);
            }
        } else {
            root.removeAttribute('data-theme');
            root.style.removeProperty('--u-gradient');
        }
    }, [profile?.theme_item?.id, user?.id]);

    // 2. Manejo de sonido ambiental via Web Audio Synth (v3.0)
    // Las URLs externas de Mixkit devolvían 403, así que generamos el audio proceduralmente.
    const synthRef = React.useRef(null);

    const getSynth = React.useCallback(async () => {
        if (!synthRef.current) {
            const { ambientSynth } = await import('../utils/ambientSynth.js');
            synthRef.current = ambientSynth;
        }
        return synthRef.current;
    }, []);

    // Parar sonido cuando se mutea, cambia el item, o se desmonta
    useEffect(() => {
        const soundId = profile?.ambient_sound_item?.id;

        if (!soundId || isAmbientMuted) {
            if (synthRef.current) synthRef.current.stop();
        }
        // NO auto-play aquí — el navegador lo bloquea.
        // Se activa solo desde toggleAmbientMute o playAmbientManually (gesto del usuario).

        return () => {
            if (synthRef.current) synthRef.current.stop();
        };
    }, [profile?.ambient_sound_item?.id, isAmbientMuted]);

    // Reproduce manualmente — debe ser llamado desde un gesto del usuario (click)
    const playAmbientManually = async () => {
        const soundId = profile?.ambient_sound_item?.id;
        if (!soundId || isAmbientMuted) return;
        const synth = await getSynth();
        synth.play(soundId);
    };

    // Toggle mute/unmute — al desmutear arranca el sonido inmediatamente
    const toggleAmbientMute = async () => {
        const next = !isAmbientMuted;
        setIsAmbientMuted(next);
        localStorage.setItem('ambient_muted', String(next));

        if (next) {
            // Mutear → parar
            const synth = await getSynth();
            synth.stop();
        } else {
            // Desmutear → iniciar (desde gesto del usuario, así el navegador lo permite)
            const soundId = profile?.ambient_sound_item?.id;
            if (soundId) {
                const synth = await getSynth();
                synth.play(soundId);
            }
        }
    };

    const value = {
        theme: profile?.theme_item?.id || 'default',
        nicknameStyle: profile?.nick_style_item?.id,
        primaryRole: profile?.primary_role_item,
        secondaryRole: profile?.secondary_role_item,
        ambientSound: profile?.ambient_sound_item,
        isAmbientMuted,
        toggleAmbientMute,
        playAmbientManually,
        partnership: overrideProfile ? null : partnership,
        mood: {
            text: profile?.mood_text,
            emoji: profile?.mood_emoji,
            isExpired: profile?.mood_expires_at && new Date(profile.mood_expires_at) < new Date()
        },
        onlineUsers,
        updatePresence,
        activeStation,
        setActiveStation,
        isPresenceReady
    };

    return (
        <UniverseContext.Provider value={value}>
            {children}
        </UniverseContext.Provider>
    );
};

export const useUniverse = () => useContext(UniverseContext);
