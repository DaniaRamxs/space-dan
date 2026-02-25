import React, { createContext, useContext, useState, useEffect } from 'react'; // System identity system v2.1.0
import { supabase } from '../supabaseClient';
import useAuth from '../hooks/useAuth';

const UniverseContext = createContext();

export const UniverseProvider = ({ children, overrideProfile = null }) => {
    const { user, profile: authProfile } = useAuth();
    const profile = overrideProfile || authProfile;
    const [themeConfig, setThemeConfig] = useState(null);
    const [isAmbientMuted, setIsAmbientMuted] = useState(() => {
        return localStorage.getItem('ambient_muted') === 'true';
    });

    // 1. Efecto para aplicar el tema al documento mediante CSS Variables
    useEffect(() => {
        if (profile?.theme_item?.metadata) {
            const vars = profile.theme_item.metadata.vars || {};
            const root = document.documentElement;

            // Limpiar variables de tema anteriores (opcional, pero recomendado)
            // root.removeAttribute('style'); // Ojo, esto puede borrar otros estilos in-line

            // Aplicar variables dinámicas del tema
            Object.entries(vars).forEach(([key, value]) => {
                root.style.setProperty(key, value);
            });

            root.setAttribute('data-theme', profile.theme_item.id);
        } else if (!overrideProfile) {
            // Si no hay tema equipado y no es un override, resetear a default
            document.documentElement.removeAttribute('data-theme');
            // Podríamos resetear variables aquí si fuera necesario
        }
    }, [profile, overrideProfile]);

    // 2. Manejo de sonido ambiental (Lazy Loading)
    const [ambientAudio] = useState(() => new Audio());

    useEffect(() => {
        const soundUrl = profile?.ambient_sound_item?.metadata?.url;

        if (soundUrl && !isAmbientMuted) {
            ambientAudio.src = soundUrl;
            ambientAudio.loop = true;
            ambientAudio.volume = 0.2; // Volumen bajo para ambiente

            const startPlayback = () => {
                ambientAudio.play().catch(() => {
                    // El navegador bloquea autoplay hasta interacción
                    console.log("Esperando interacción para audio ambiental...");
                });
            };

            startPlayback();

            // Reintentar si hubo bloqueo de autoplay al hacer click en el body
            const handleUserInteraction = () => {
                startPlayback();
                window.removeEventListener('click', handleUserInteraction);
            };
            window.addEventListener('click', handleUserInteraction);

            return () => {
                window.removeEventListener('click', handleUserInteraction);
                ambientAudio.pause();
                ambientAudio.src = "";
            };
        } else {
            ambientAudio.pause();
        }
    }, [profile?.ambient_sound_item, isAmbientMuted, ambientAudio]);

    const toggleAmbientMute = () => {
        setIsAmbientMuted(prev => {
            const next = !prev;
            localStorage.setItem('ambient_muted', next);
            return next;
        });
    };

    const value = {
        theme: profile?.theme_item?.id || 'default',
        nicknameStyle: profile?.nick_style_item?.id,
        primaryRole: profile?.primary_role_item,
        secondaryRole: profile?.secondary_role_item,
        ambientSound: profile?.ambient_sound_item,
        isAmbientMuted,
        toggleAmbientMute,
        mood: {
            text: profile?.mood_text,
            emoji: profile?.mood_emoji,
            isExpired: profile?.mood_expires_at && new Date(profile.mood_expires_at) < new Date()
        }
    };

    return (
        <UniverseContext.Provider value={value}>
            {children}
        </UniverseContext.Provider>
    );
};

export const useUniverse = () => useContext(UniverseContext);
