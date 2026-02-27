/**
 * styles.js
 * Utilidades centralizadas para estilos visuales de marcos y personalización.
 */

/**
 * Retorna el estilo CSS para un marco basado en su ID.
 * @param {string|null} frameItemId 
 * @returns {object} { border, borderRadius, boxShadow, className, imageRendering, animated }
 */
export function getFrameStyle(frameItemId) {
    const id = String(frameItemId || '').toLowerCase();
    if (!id) return {};

    // Marcos de Vínculo Especiales (Usando Clases CSS)
    if (id === 'frame_link_lv1') return { className: 'marco-evolutivo-base marco-evolutivo-lv1' };
    if (id === 'frame_link_lv2') return { className: 'marco-evolutivo-base marco-evolutivo-lv2' };
    if (id === 'frame_link_lv3') return { className: 'marco-evolutivo-base marco-evolutivo-lv3' };
    if (id === 'frame_link_lv4') return { className: 'marco-evolutivo-base marco-evolutivo-lv4' };
    if (id === 'frame_link_lv5') return { className: 'marco-evolutivo-base marco-evolutivo-lv5' };

    // IDs concretos de la DB
    if (id === 'frame_stars') return { className: 'marco-estelar' };
    if (id === 'frame_neon') return { border: '3px solid #00e5ff', borderRadius: '50%', boxShadow: '0 0 20px rgba(0,229,255,0.8)' };
    if (id === 'frame_pixel') return { border: '4px solid #ff6b35', borderRadius: '50%', boxShadow: '0 0 15px rgba(255,107,53,0.7)', imageRendering: 'pixelated' };
    if (id === 'frame_holo') return { border: '3px solid #b464ff', borderRadius: '50%', boxShadow: '0 0 20px rgba(180,100,255,0.8), 0 0 40px rgba(0,229,255,0.4)', animated: true };
    if (id === 'frame_crown') return { className: 'marco-corona' };

    // Fallbacks por keyword
    if (id.includes('gold')) return { border: '3px solid #ffd700', borderRadius: '50%', boxShadow: '0 0 15px rgba(255,215,0,0.6)' };
    if (id.includes('cyan') || id.includes('cyber')) return { border: '3px solid #00e5ff', borderRadius: '50%', boxShadow: '0 0 15px rgba(0,229,255,0.6)' };
    if (id.includes('pink') || id.includes('rose')) return { border: '3px solid #ff69b4', borderRadius: '50%', boxShadow: '0 0 15px rgba(255,105,180,0.6)' };
    if (id.includes('purple') || id.includes('galaxy')) return { border: '3px solid #b464ff', borderRadius: '50%', boxShadow: '0 0 15px rgba(180,100,255,0.6)' };
    if (id.includes('green') || id.includes('matrix')) return { border: '3px solid #39ff14', borderRadius: '50%', boxShadow: '0 0 15px rgba(57,255,20,0.6)' };
    if (id.includes('red') || id.includes('fire')) return { border: '3px solid #ff3300', borderRadius: '50%', boxShadow: '0 0 15px rgba(255,51,0,0.6)' };

    // Default fallback (para cuando hay un ID randoom pero no mapeado)
    return { border: '2px solid rgba(255,255,255,0.2)', borderRadius: '50%', boxShadow: '0 0 10px rgba(255,255,255,0.1)' };
}

/**
 * Retorna el estilo del marco evolutivo basado en el nivel de evolución del vínculo.
 * @param {number} evolutionLevel 
 * @returns {object} Style object
 */
export function getLinkedFrameStyle(evolutionLevel) {
    // If an object (partnership) is passed, extract the level
    const lvl = (typeof evolutionLevel === 'object' ? evolutionLevel?.evolution_level : evolutionLevel) || 1;
    if (lvl >= 5) return {
        border: 'none', padding: '4px', background: 'conic-gradient(from 0deg, #ff007f, #06b6d4, #8b5cf6, #ff007f)', borderRadius: '50%', boxShadow: '0 0 40px rgba(6,182,212,0.5)', animation: 'spinStriking 2s linear infinite'
    };
    if (lvl >= 4) return {
        border: '3px solid transparent', borderRadius: '50%', backgroundImage: 'linear-gradient(#000,#000), linear-gradient(45deg, #06b6d4, #f43f5e, #8b5cf6, #10b981)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', boxShadow: '0 0 30px rgba(244,63,94,0.6)', animation: 'gradientFlowStriking 3s infinite'
    };
    if (lvl >= 3) return {
        border: '3px solid transparent', borderRadius: '50%', backgroundImage: 'linear-gradient(#000,#000), linear-gradient(135deg, #06b6d4, #8b5cf6, #ec4899)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', boxShadow: '0 0 25px rgba(139,92,246,0.7)', animation: 'rotationGradientStriking 4s linear infinite'
    };
    if (lvl >= 2) return {
        border: '2px solid #8b5cf6', borderRadius: '50%', boxShadow: '0 0 20px rgba(139,92,246,0.8)', animation: 'pulseAuraStriking 2s infinite alternate ease-in-out'
    };
    return {
        border: '2px solid #06b6d4', borderRadius: '50%', boxShadow: '0 0 15px rgba(6,182,212,0.6)'
    };
}

/**
 * Retorna las clases de colores para el resplandor del vínculo.
 */
export function getLinkedGlowClass(evolutionLevel) {
    if (evolutionLevel >= 5) return 'from-[#ff00ee] via-[#00ffff] to-[#ffff00]';
    if (evolutionLevel >= 4) return 'from-[#7000ff] via-[#00ffff] to-[#ff0077]';
    if (evolutionLevel >= 3) return 'from-[#00d4ff] to-[#ff00ee]';
    return 'from-[#00ffff] to-[#7000ff]';
}
