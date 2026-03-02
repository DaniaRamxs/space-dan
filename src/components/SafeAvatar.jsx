import { useState, useEffect } from 'react';

/**
 * Componente robusto de Imagen con manejo de errores y fallback.
 * Evita que el perfil crashee o muestre iconos rotos si la URL de la DB falla.
 */
export default function SafeAvatar({ src, provider, fallback = '/default_user_blank.png', className, style, alt = "Avatar" }) {
    const [imgSrc, setImgSrc] = useState(src || fallback);
    const [hasError, setHasError] = useState(false);

    // Si no hay src y tenemos provider, podemos usar un avatar temático
    const providerFallback = (() => {
        if (!provider) return fallback;
        const p = provider.toLowerCase();
        if (p.includes('google')) return 'https://api.dicebear.com/7.x/initials/svg?seed=G&backgroundColor=ea4335';
        if (p.includes('discord')) return 'https://api.dicebear.com/7.x/initials/svg?seed=D&backgroundColor=5865f2';
        return fallback;
    })();

    // Sincronizar si el src cambia externamente
    useEffect(() => {
        if (src && src !== '/default-avatar.png') {
            setImgSrc(src);
            setHasError(false);
        } else {
            setImgSrc(providerFallback);
        }
    }, [src, providerFallback]);

    const handleError = () => {
        if (!hasError) {
            console.log(`[SafeAvatar] Aplicando fallback para URL externa: ${imgSrc}`);
            setImgSrc(providerFallback);
            setHasError(true);
        }
    };

    return (
        <img
            src={imgSrc}
            alt={alt}
            className={className}
            style={style}
            onError={handleError}
            loading="lazy"
        />
    );
}
