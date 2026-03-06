import { useState, useEffect, useCallback } from 'react';

/**
 * HOOK: useShopItems
 * Gestiona el catálogo de la tienda y el inventario local para usuarios invitados.
 */

export const SHOP_ITEMS = [
  // ── Estilos de Nickname (Cosméticos de nombre) ─────────────────
  { id: 'nick_minimal', category: 'nickname_style', title: 'Minimalismo Blanco', desc: 'Sencillez y elegancia pura.', price: 30000, icon: '⚪', rarity: 'common' },
  { id: 'nick_gradient', category: 'nickname_style', title: 'Gradiente Espacial', desc: 'Un flujo cromático inspirado en las nébulas.', price: 100000, icon: '🌈', rarity: 'rare' },
  { id: 'nick_neon', category: 'nickname_style', title: 'Neón Cibernético', desc: 'Luz de gas neón para destacar en la ciudad.', price: 120000, icon: '💡', rarity: 'rare' },
  { id: 'nick_ember', category: 'nickname_style', title: 'Ascuas Estelares', desc: 'Partículas de fuego espacial y calor térmico.', price: 350000, icon: '🔥', rarity: 'epic' },
  { id: 'nick_glitch', category: 'nickname_style', title: 'Inestabilidad Glitch', desc: 'Efectos de interferencia digital avanzada.', price: 500000, icon: '👾', rarity: 'epic' },
  { id: 'nick_holographic', category: 'nickname_style', title: 'Proyección Holográfica', desc: 'Efecto 3D parpadeante de alta tecnología.', price: 1500000, icon: '🛰️', rarity: 'legendary' },
  { id: 'nick_spectral', category: 'nickname_style', title: 'Espectro de Datos', desc: 'Un aura de interferencia verde esmeralda y desincronización.', price: 2000000, icon: '👻', rarity: 'legendary' },
  { id: 'nick_mythic_singularity', category: 'nickname_style', title: 'Singularidad Mítica', desc: 'Tu nombre es un evento gravitatorio que distorsiona el chat.', price: 8000000, icon: '💠', rarity: 'mythic' },
  { id: 'nick_void_pulse', category: 'nickname_style', title: 'Pulso del Vacío', desc: 'Tu nombre late con energía oscura y desvanece el entorno.', price: 10000000, icon: '💠', rarity: 'mythic' },

  // ── Marcos de Avatar (Social HoloCard) ────────────────────────
  { id: 'frame_basic', category: 'frame', title: 'Anillo Estándar', desc: 'Contorno de seguridad básico.', price: 25000, icon: '⚪', rarity: 'common' },
  { id: 'frame_neon', category: 'frame', title: 'Anillo de Neón', desc: 'Círculo de luz vibrante para tu perfil.', price: 90000, icon: '⭕', rarity: 'rare' },
  { id: 'frame_angelic', category: 'frame', title: 'Halo de Plasma', desc: 'Aura divina de energía blanca y pura.', price: 450000, icon: '😇', rarity: 'epic' },
  { id: 'frame_galaxy', category: 'frame', title: 'Nébulas Profundas', desc: 'Animación sutil de estrellas en tu marco.', price: 600000, icon: '🌌', rarity: 'epic' },
  { id: 'frame_hacker', category: 'frame', title: 'Código Fuente', desc: 'Barras de datos en constante movimiento y escaneos verdes.', price: 1800000, icon: '💻', rarity: 'legendary' },
  { id: 'frame_golden', category: 'frame', title: 'Prestigio Áureo', desc: 'Para los verdaderos señores del Starly.', price: 2500000, icon: '👑', rarity: 'legendary' },
  { id: 'frame_prism', category: 'frame', title: 'Prisma Mítico', desc: 'Refracta toda la luz del servidor.', price: 7000000, icon: '💠', rarity: 'mythic' },
  { id: 'frame_void', category: 'frame', title: 'Singularidad', desc: 'Un agujero negro masivo que absorbe la luz a su alrededor.', price: 9500000, icon: '🌑', rarity: 'mythic' },

  // ── Roles Especiales (Estatus Social) ──────────────────────────
  { id: 'role_pioneer', category: 'role', title: 'Pionero Galáctico', desc: 'De los primeros exploradores del vacío.', price: 40000, icon: '🚀', rarity: 'common' },
  { id: 'role_guardian', category: 'role', title: 'Guardián Estelar', desc: 'Protector del nexo de Spacely.', price: 150000, icon: '🛡️', rarity: 'rare' },
  { id: 'role_technomancer', category: 'role', title: 'Tecnomante', desc: 'Maestro en la manipulación de flujos de energía.', price: 400000, icon: '🧙', rarity: 'epic' },
  { id: 'role_phantom', category: 'role', title: 'Fantasma del Código', desc: 'Una entidad que opera entre las sombras.', price: 550000, icon: '👤', rarity: 'epic' },
  { id: 'role_overlord', category: 'role', title: 'Soberano de Datos', desc: 'Control total sobre el flujo de información.', price: 2000000, icon: '👁️', rarity: 'legendary' },
  { id: 'role_specter', category: 'role', title: 'Espectro de la Red', desc: 'Inalcanzable, invisible, omnipresente.', price: 2800000, icon: '👻', rarity: 'legendary' },
  { id: 'role_archon', category: 'role', title: 'Arcón del Nexo', desc: 'Gobernador supremo de la realidad digital.', price: 12000000, icon: '🏛️', rarity: 'mythic' },

  // ── Efectos de Chat (Interacción Visual) ───────────────────────
  { id: 'chat_pulse', category: 'chat_effect', title: 'Pulso Estelar', desc: 'Ondas de luz al enviar tus mensajes.', price: 110000, icon: '💫', rarity: 'rare' },
  { id: 'chat_kawaii', category: 'chat_effect', title: 'Dulce Galaxia', desc: 'Rosa pastel, destellos y una aura de ternura.', price: 180000, icon: '🎀', rarity: 'rare' },
  { id: 'chat_plasma', category: 'chat_effect', title: 'Incendio de Plasma', desc: 'Tu texto arde con energía azul neón y destellos violetas.', price: 450000, icon: '🔥', rarity: 'epic' },
  { id: 'chat_eco', category: 'chat_effect', title: 'Eco Cósmico', desc: 'Efecto de desvanecimiento fantasmal.', price: 500000, icon: '🗣️', rarity: 'epic' },
  { id: 'chat_goth', category: 'chat_effect', title: 'Espectro Gótico', desc: 'Sombras profundas y un aura carmesí inquietante.', price: 600000, icon: '🦇', rarity: 'epic' },
  { id: 'chat_stars', category: 'chat_effect', title: 'Lluvia de Novas', desc: 'Cada mensaje es una supernova visual constante.', price: 1500000, icon: '💥', rarity: 'legendary' },
  { id: 'chat_cyberpunky', category: 'chat_effect', title: 'Nexo Cyberpunk', desc: 'Líneas de datos cian y circuitos neón activados.', price: 2000000, icon: '🔌', rarity: 'legendary' },
  { id: 'chat_matrix', category: 'chat_effect', title: 'Cascada Digital', desc: 'Lluvia de código verde descendiendo sobre tus palabras.', price: 3000000, icon: '🟢', rarity: 'legendary' },
  { id: 'chat_void', category: 'chat_effect', title: 'Colapso del Vacío', desc: 'Tus mensajes aparecen de una singularidad oscura con distorsión masiva.', price: 15000000, icon: '🌑', rarity: 'mythic' },

  // ── Emblemas (Badges) ──────────────────────────────────────────
  { id: 'badge_star', category: 'chat_badge', title: 'Estrella Fugaz', desc: 'Pequeño destello de clase estelar.', price: 20000, icon: '⭐', rarity: 'common' },
  { id: 'badge_heart', category: 'chat_badge', title: 'Pulso Vital', desc: 'Diseño orgánico en un mundo digital.', price: 25000, icon: '❤️', rarity: 'common' },
  { id: 'badge_skull', category: 'chat_badge', title: 'Skull System', desc: 'Advertencia de sistema en peligro.', price: 85000, icon: '💀', rarity: 'rare' },
  { id: 'badge_bolt', category: 'chat_badge', title: 'Rayo de Energía', desc: 'Poder puro junto a tu nombre.', price: 100000, icon: '⚡', rarity: 'rare' },
  { id: 'badge_planet', category: 'chat_badge', title: 'Anillos de Saturno', desc: 'Órbita planetaria miniatura.', price: 320000, icon: '🪐', rarity: 'epic' },
  { id: 'badge_alien', category: 'chat_badge', title: 'Visitante de Orión', desc: 'Contacto extraterrestre confirmado.', price: 380000, icon: '👽', rarity: 'epic' },
  { id: 'badge_crown', category: 'chat_badge', title: 'Corona de Datos', desc: 'Emblema de realeza en el nexo.', price: 1500000, icon: '👑', rarity: 'legendary' },
  { id: 'badge_skull_gold', category: 'chat_badge', title: 'Cráneo Dorado', desc: 'Símbolo de maestría y longevidad.', price: 2200000, icon: '💀', rarity: 'legendary' },
  { id: 'badge_singularity', category: 'chat_badge', title: 'Ojo del Nexo', desc: 'La insignia definitiva de control.', price: 8500000, icon: '👁️', rarity: 'mythic' },

  // ── Radios (Ambiente Sonoro) ───────────────────────────────────
  { id: 'radio_lofi', category: 'radio', title: 'Beats de Vacío', desc: 'Música relajante para contemplar el nexo.', price: 35000, icon: '🎧', rarity: 'common' },
  { id: 'radio_retro', category: 'radio', title: 'Frecuencia FM', desc: 'Sonido nostálgico de radios antiguas.', price: 130000, icon: '📻', rarity: 'rare' },
  { id: 'radio_synthwave', category: 'radio', title: 'Synth 80s', desc: 'Paisajes sonoros de neón y sintetizadores.', price: 200000, icon: '🎹', rarity: 'rare' },
  { id: 'radio_cyberpunk', category: 'radio', title: 'Nivel Crítico', desc: 'BPMs altos para sesiones intensas.', price: 400000, icon: '🔊', rarity: 'epic' },
  { id: 'radio_urbano', category: 'radio', title: 'Nexo Urbano', desc: 'Los mejores ritmos de reggaetón y género urbano.', price: 500000, icon: '🔥', rarity: 'epic' },
  { id: 'radio_yeye', category: 'radio', title: 'Radio Yeye', desc: 'Rock y pop internacional, desde clásicos hasta Maneskin.', price: 1500000, icon: '🎸', rarity: 'legendary' },
  { id: 'radio_dark', category: 'radio', title: 'Frecuencias Oscuras', desc: 'Ambientación industrial y misteriosa.', price: 1800000, icon: '🕯️', rarity: 'legendary' },

  // ── HoloCards (Fondo de Identidad) ────────────────────────────
  { id: 'holo_minimal', category: 'holocard', title: 'Nexo Blanco', desc: 'Claridad y luz para tu identidad.', price: 50000, icon: '⬜', rarity: 'common' },
  { id: 'holo_cyber', category: 'holocard', title: 'Interfaz Cyber', desc: 'Estética industrial y cables integrados.', price: 250000, icon: '🔌', rarity: 'rare' },
  { id: 'holo_glass', category: 'holocard', title: 'Cristal Espectral', desc: 'Tarjeta con transparencia máxima.', price: 800000, icon: '💎', rarity: 'epic' },
  { id: 'holo_gold', category: 'holocard', title: 'Oro Líquido', desc: 'Elegancia suprema metalizada.', price: 3500000, icon: '💰', rarity: 'legendary' },
  { id: 'holo_matrix', category: 'holocard', title: 'Sistema Raíz', desc: 'Visualización de flujos de datos en tiempo real.', price: 3000000, icon: '🟢', rarity: 'legendary' },
  { id: 'holo_void', category: 'holocard', title: 'Velo del Vacío', desc: 'Minimalismo oscuro absoluto.', price: 9000000, icon: '⬛', rarity: 'mythic' },
  { id: 'holo_nebula', category: 'holocard', title: 'Nébula Vivida', desc: 'Un fondo animado de nubes estelares en constante cambio.', price: 12000000, icon: '🌌', rarity: 'mythic' },

  // ── Cofres de Colección (Gacha) ────────────────────────────────
  { id: 'chest_scrap', category: 'chest', title: 'Cofre de Chatarra', desc: 'Suministros básicos rescatados del cinturón de asteroides.', price: 80000, icon: '📦', rarity: 'common', featured: true },
  { id: 'chest_nebula', category: 'chest', title: 'Cofre Nécula', desc: 'Contenedor de alta energía con personajes raros.', price: 500000, icon: '💎', rarity: 'epic', featured: true },
  { id: 'chest_magnate', category: 'chest', title: 'Cofre del Magnate', desc: 'Suministros de lujo con alta probabilidad de legendarios.', price: 2000000, icon: '👑', rarity: 'mythic', featured: true },
];

export default function useShopItems() {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('spacely_purchased_items');
    return saved ? JSON.parse(saved) : [];
  });

  const [equipped, setEquipped] = useState(() => {
    const saved = localStorage.getItem('spacely_equipped_items');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('spacely_purchased_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('spacely_equipped_items', JSON.stringify(equipped));
  }, [equipped]);

  const hasPurchased = (itemId) => items.includes(itemId);

  const purchaseItem = (itemId) => {
    if (hasPurchased(itemId)) return false;
    setItems(prev => [...prev, itemId]);
    return true;
  };

  const equip = (category, itemId) => {
    setEquipped(prev => {
      if (category === 'radio') {
        const current = prev[category] || [];
        const asArray = Array.isArray(current) ? current : [current].filter(Boolean);
        if (!asArray.includes(itemId)) {
          return { ...prev, [category]: [...asArray, itemId] };
        }
        return prev;
      }
      return { ...prev, [category]: itemId };
    });
  };

  const unequip = (category, itemId) => {
    setEquipped(prev => {
      const next = { ...prev };
      if (category === 'radio') {
        const current = next[category] || [];
        const asArray = Array.isArray(current) ? current : [current].filter(Boolean);
        const filtered = asArray.filter(id => id !== itemId);
        if (filtered.length > 0) {
          next[category] = filtered;
        } else {
          delete next[category];
        }
        return next;
      }
      delete next[category];
      return next;
    });
  };

  const getEquipped = (category) => equipped[category];

  return { items, equipped, hasPurchased, purchaseItem, equip, unequip, getEquipped };
}
