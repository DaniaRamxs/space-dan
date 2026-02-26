/**
 * Utilería para manejar la consistencia de nombres de usuario y nicknames.
 */

const MAIN_USER_USERNAMES = ['DaniaRamxs', 'Dania', 'dan'];

/**
 * Retorna el nombre a mostrar (normaliza 'Dan' si es el usuario dueño).
 */
export function getUserDisplayName(profile) {
    if (!profile) return 'Usuario';
    const username = profile.username || profile.other_username || 'Usuario';
    if (MAIN_USER_USERNAMES.some(u => u.toLowerCase() === username.toLowerCase())) {
        return 'Dan';
    }
    return username;
}

/**
 * Retorna las clases CSS para el estilo de nickname si el usuario tiene uno equipado.
 */
export function getNicknameClass(profile) {
    if (!profile) return '';
    // El estilo puede venir en varios nombres de propiedad según el origen del objeto
    const styleItem = profile.nick_style_item;
    const styleId = profile.nicknameStyle ||
        profile.equipped_nickname_style ||
        profile.other_nickname_style ||
        (typeof styleItem === 'string' ? styleItem : styleItem?.id);

    if (styleId) {
        return `dan-nickname nick-style-${styleId.replace('nick_', '')}`;
    }
    return '';
}

/**
 * Formatea un username plano (ej. para chats).
 */
export function formatUsername(username) {
    if (!username) return 'Usuario';
    if (MAIN_USER_USERNAMES.some(u => u.toLowerCase() === username.toLowerCase())) {
        return 'Dan';
    }
    return username;
}
