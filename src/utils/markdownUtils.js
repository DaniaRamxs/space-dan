/**
 * Procesa la sintaxis oficial de "Energías Espaciales"
 * Soporta bloques ::tipo ... :: e inline ((tipo)) ... ((/tipo))
 * Diseñado para ser lo más flexible posible.
 */
export function parseSpaceEnergies(content) {
    if (!content || typeof content !== 'string') return '';

    try {
        // 1. Proteger bloques de código
        const parts = content.split(/(```[\s\S]*?```|`[^`]*?`)/g);

        return parts.map((part, index) => {
            if (index % 2 !== 0 || !part) return part || '';

            let text = part;

            // 2. Bloques: ::tipo ... :: 
            // Permite espacios después de :: y antes del tipo.
            // Permite cualquier contenido incluyendo saltos de línea.
            // Case-insensitive.
            const blockRegex = /::\s*(aurora|neon|memory|warning|rgb|soft|glitch|fire|void|hacker|star|ocean|ghost|toxic|diamond|cyber|rojo|azul|verde|rosa|naranja|morado|cian)\s*([\s\S]*?)\s*::/gi;
            text = text.replace(blockRegex, (match, type, inner) => {
                const safeType = type.toLowerCase().trim();
                const safeInner = (inner || '').trim();
                return `<div class="sd-${safeType}">${safeInner}</div>`;
            });

            // 3. Inline: ((tipo)) ... ((/tipo))
            const inlineRegex = /\(\(\s*(aurora|neon|memory|warning|rgb|soft|glitch|fire|void|hacker|star|ocean|ghost|toxic|diamond|cyber|rojo|azul|verde|rosa|naranja|morado|cian)\s*\)\)([\s\S]*?)\(\(\s*\/\s*(aurora|neon|memory|warning|rgb|soft|glitch|fire|void|hacker|star|ocean|ghost|toxic|diamond|cyber|rojo|azul|verde|rosa|naranja|morado|cian)\s*\)\)/gi;
            text = text.replace(inlineRegex, (match, type, inner, typeClose) => {
                const safeType = type.toLowerCase().trim();
                const safeTypeClose = typeClose.toLowerCase().trim();
                if (safeType === safeTypeClose) {
                    return `<span class="sd-${safeType}">${inner || ''}</span>`;
                }
                return match;
            });

            return text;
        }).join('');
    } catch (e) {
        return content;
    }
}
