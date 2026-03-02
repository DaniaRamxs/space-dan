import { useState, useEffect, useCallback } from 'react';
import { unlockAchievement } from './useAchievements';

const SHOP_KEY = 'space-dan-shop-purchased';
const EQUIPPED_KEY = 'space-dan-shop-equipped';

export const SHOP_ITEMS = [
  // ── Cursor trails ──────────────────────────────────────────────
  { id: 'cursor_cyan', category: 'cursor', title: 'Trail Cian', desc: 'Partículas cian eléctrico', price: 50, icon: '💠', swatch: ['#00e5ff', '#00bcd4'] },
  { id: 'cursor_green', category: 'cursor', title: 'Trail Matrix', desc: 'Partículas verde hacker', price: 75, icon: '💚', swatch: ['#39ff14', '#00ff88'] },
  { id: 'cursor_gold', category: 'cursor', title: 'Trail Dorado', desc: 'Partículas dorado exclusivo', price: 100, icon: '✨', swatch: ['#ffd700', '#ffaa00'] },
  { id: 'cursor_rainbow', category: 'cursor', title: 'Trail Arcoíris', desc: 'Todos los colores a la vez', price: 200, icon: '🌈', swatch: ['#ff3366', '#ffa500', '#ffff00', '#00ff88', '#00e5ff', '#b464ff'] },
  { id: 'cursor_pink', category: 'cursor', title: 'Trail Magenta', desc: 'Partículas rosa eléctrico', price: 60, icon: '🩷', swatch: ['#ff69b4', '#ff1493'] },
  { id: 'cursor_white', category: 'cursor', title: 'Trail Blanco', desc: 'Partículas blanco puro y suave', price: 45, icon: '🤍', swatch: ['#f0f0f0', '#c0c0c0'] },
  // ── Screensavers ───────────────────────────────────────────────
  { id: 'saver_matrix', category: 'screensaver', title: 'Matrix Rain', desc: 'Lluvia de código verde', price: 100, icon: '🟩' },
  { id: 'saver_dvd', category: 'screensaver', title: 'DVD Bounce', desc: 'Logo clásico rebotando', price: 80, icon: '📀' },
  { id: 'saver_pipes', category: 'screensaver', title: 'Tuberías 3D', desc: 'Clásico Windows 95/98', price: 120, icon: '🔧' },
  // ── Estrellas ──────────────────────────────────────────────────
  { id: 'stars_blue', category: 'stars', title: 'Nebulosa Azul', desc: 'Cambia el fondo estelar a azul profundo', price: 80, icon: '🔵', swatch: ['#64b4ff', '#0096ff'] },
  { id: 'stars_green', category: 'stars', title: 'Estrellas Matrix', desc: 'Cambia el fondo estelar a verde hacker', price: 80, icon: '🟢', swatch: ['#64ff82', '#00ff88'] },
  { id: 'stars_red', category: 'stars', title: 'Inferno Stars', desc: 'Cambia el fondo estelar a rojo carmesí', price: 80, icon: '🔴', swatch: ['#ff7850', '#ff3300'] },
  { id: 'stars_purple', category: 'stars', title: 'Nebulosa Púrpura', desc: 'Cambia el fondo estelar a púrpura cósmico', price: 80, icon: '🟣', swatch: ['#b464ff', '#8800ff'] },
  // ── Radio stations ─────────────────────────────────────────────
  { id: 'radio_jcore', category: 'radio', title: 'J-Core Station', desc: 'Anime beats y J-pop con una estética cyber-tokyo.', price: 50, icon: 'svg:jcore' },
  { id: 'radio_groove', category: 'radio', title: 'Groove Salad', desc: 'Ambient electronica relajante para sesiones de focus profundo.', price: 50, icon: 'svg:groove' },
  { id: 'radio_beatblender', category: 'radio', title: 'Beat Blender', desc: 'Deep house y electro nocturno con ritmos persistentes.', price: 60, icon: 'svg:beat' },
  { id: 'radio_dronezone', category: 'radio', title: 'Drone Zone', desc: 'Ambient cósmico y espacial para viajes astrales.', price: 50, icon: 'svg:space' },
  { id: 'radio_secretagent', category: 'radio', title: 'Secret Agent', desc: 'Spy jazz y lounge 60s para una atmósfera de misterio.', price: 55, icon: 'svg:agent' },
  { id: 'radio_kpop', category: 'radio', title: 'K-Pop Universe', desc: 'Los mejores hits del K-Pop en vivo las 24hs con toda la energía Hallyu.', price: 120, icon: 'svg:kpop' },
  // ── Temas visuales ─────────────────────────────────────────────
  { id: 'theme_forest', category: 'theme', title: 'Bosque Digital', desc: 'Transforma toda la interfaz con tonos verde hacker (#39ff14). Cambia los bordes de cristal, los textos de acento y los resplandores de los botones a una estética de terminal selvática.', price: 150, icon: '🌿', swatch: ['#39ff14', '#00ff88'] },
  { id: 'theme_ocean', category: 'theme', title: 'Deep Ocean', desc: 'Sumerge tu Spacely en un azul abisal (#00c6ff). Cambia el fondo general, los indicadores de nivel y las barras de progreso a un gradiente oceánico profundo.', price: 150, icon: '🌊', swatch: ['#00c6ff', '#0072ff'] },
  { id: 'theme_sunset', category: 'theme', title: 'Sunset Retrowave', desc: 'Aplica una estética ochentera de neón rosa y naranja. Cambia los acentos de la UI (#ff0090) y añade un resplandor cálido a todas las tarjetas de información.', price: 200, icon: '🌅', swatch: ['#ff6b35', '#ff0090'] },
  { id: 'theme_hacker', category: 'theme', title: 'Terminal Verde', desc: 'El modo oscuro definitivo. Elimina gradientes innecesarios y aplica un verde puro de fósforo (#39ff14) sobre fondos negro absoluto para máxima concentración.', price: 120, icon: '💻', swatch: ['#39ff14', '#00ff00'] },
  { id: 'theme_mono', category: 'theme', title: 'Mono Minimal', desc: 'Limpia la interfaz de distracciones cromáticas. Aplica una escala de grises elegante y profesional a todos los iconos, bordes y botones del sistema.', price: 100, icon: '⬛', swatch: ['#f0f0f0', '#888888'] },
  // ── Banners Dinámicos ──────────────────────────────────────────
  { id: 'banner_galaxy', category: 'banner', title: 'Corazón de Galaxia', desc: 'Un gradiente profundo que evoca el centro de un sistema solar en colapso.', price: 150, icon: '🌌', rarity: 'rare', metadata: { gradient: ['#0d0221', '#240b36', '#c31432'], fx: 'stars' } },
  { id: 'banner_cyber', category: 'banner', title: 'Neon Overload', desc: 'Cian eléctrico y magenta neón fusionados en una explosión cyberpunk.', price: 120, icon: '🖼️', rarity: 'rare', metadata: { gradient: ['#00d2ff', '#3a7bd5', '#ff00ff'] } },
  { id: 'banner_nebula', category: 'banner', title: 'Velo de Orión', desc: 'Púrpuras y azules místicos que envuelven tu perfil en un aura espacial.', price: 150, icon: '🌌', rarity: 'rare', metadata: { gradient: ['#6a11cb', '#2575fc'] } },
  { id: 'banner_gold', category: 'banner', title: 'Prestigio Áureo', desc: 'El banner definitivo de la nobleza espacial. Oro puro líquido.', price: 200, icon: '✨', rarity: 'epic', metadata: { gradient: ['#bf953f', '#fcf6ba', '#b38728', '#fbf5b7', '#aa771c'] } },
  { id: 'banner_matrix', category: 'banner', title: 'Source Code', desc: 'Observa la realidad binaria con este fondo de código en cascada.', price: 200, icon: '💻', rarity: 'epic', metadata: { gradient: ['#000000', '#003300'], fx: 'matrix' } },
  { id: 'banner_aurora', category: 'banner', title: 'Aurora Boreal', desc: 'Fenómeno atmosférico legendario plasmado en tu cabecera.', price: 300, icon: '✨', rarity: 'legendary', metadata: { gradient: ['#12c2e9', '#c471ed', '#f64f59'], animated: true } },
  { id: 'banner_retro', category: 'banner', title: '8-Bit Nostalgia', desc: 'Vibras de sala arcade con scanlines y estética retro de los 80.', price: 180, icon: '👾', rarity: 'epic', metadata: { gradient: ['#23074d', '#cc5333'], fx: 'scanlines' } },
  { id: 'banner_void', category: 'banner', title: 'Vacío Absoluto', desc: 'Para los que no temen a la nada. Un negro tan profundo que devora la luz.', price: 400, icon: '🌑', rarity: 'legendary', metadata: { gradient: ['#000000', '#1a1a1a', '#000000'], fx: 'void' } },
  { id: 'banner_pink_nebula', category: 'banner', title: 'Nebulosa Rosa', desc: 'Una explosión de polvo estelar rosa para los perfiles más brillantes.', price: 180, icon: '🌸', rarity: 'rare', metadata: { gradient: ['#ff00cc', '#333399'], fx: 'stars' } },

  // ── Marcos de Vínculo (Solo disponibles con vínculo) ─────────────
  { id: 'frame_link_lv1', category: 'frame', title: 'Chispas de Vínculo', desc: 'Un inicio eléctrico para tu perfil', price: 0, icon: '✨', partnership_only: true },
  { id: 'frame_link_lv2', category: 'frame', title: 'Aura de Vínculo', desc: 'Borde pulsante de pura energía', price: 0, icon: '💫', partnership_only: true },
  { id: 'frame_link_lv3', category: 'frame', title: 'Resonancia Vínculo', desc: 'Gradiente rotativo de alta frecuencia', price: 0, icon: '🌀', partnership_only: true },
  { id: 'frame_link_lv4', category: 'frame', title: 'Fusión Estelar', desc: 'El poder de dos estrellas en tu avatar', price: 0, icon: '🔥', partnership_only: true },
  { id: 'frame_link_lv5', category: 'frame', title: 'Singularidad', desc: 'Marco definitivo de vínculo absoluto', price: 0, icon: '🌌', partnership_only: true },

  // ── Nickname Styles ──────────────────────────────────────────
  { id: 'nick_kawaii', category: 'nickname_style', title: 'Estilo Kawaii', desc: '¿Te sientes muy onichan?', price: 250, icon: '🎀', rarity: 'rare' },
  { id: 'nick_goth', category: 'nickname_style', title: 'Estilo Gótico', desc: 'Oscuridad, elegancia y un toque místico.', price: 250, icon: '🦇', rarity: 'rare' },
  { id: 'nick_cyber', category: 'nickname_style', title: 'Estilo Cyber', desc: 'Neon, glitches y tecnología del futuro.', price: 300, icon: '💾', rarity: 'epic' },
  { id: 'nick_royal', category: 'nickname_style', title: 'Estilo Real', desc: 'Dorado, coronas y prestigio absoluto.', price: 500, icon: '👑', rarity: 'legendary' },
  { id: 'nick_ghost', category: 'nickname_style', title: 'Estilo Espectro', desc: 'Ethereal, flotante y casi invisible.', price: 200, icon: '👻', rarity: 'rare' },
  { id: 'nick_lollipop', category: 'nickname_style', title: 'Estilo Lollipop', desc: 'Colores de caramelo y vibras dulces.', price: 250, icon: '🍭', rarity: 'rare' },
  { id: 'nick_fairy', category: 'nickname_style', title: 'Estilo Fairy', desc: 'Polvos mágicos y aleteo constante.', price: 300, icon: '🧚', rarity: 'epic' },
  { id: 'nick_valentine', category: 'nickname_style', title: 'Estilo Valentine', desc: 'Un corazón que late justo al lado de tu nombre.', price: 280, icon: '💝', rarity: 'rare' },
  { id: 'nick_magic', category: 'nickname_style', title: 'Estilo Mágico', desc: 'Un aura divina y destellos cósmicos.', price: 350, icon: '🌌', rarity: 'epic' },

  // ── Roles ─────────────────────────────────────────────────────
  { id: 'role_creator', category: 'role', title: 'Creador Cósmico', desc: 'Obtén el emblema de Creador y la capacidad de anclar un post semanal en el Global Feed.', price: 500, icon: '🎨', rarity: 'epic' },
  { id: 'role_mod', category: 'role', title: 'Moderador Solar', desc: 'Obtén el emblema de Moderador y herramientas básicas de gestión de paz en la comunidad.', price: 400, icon: '🛡️', rarity: 'rare' },
  { id: 'role_scout', category: 'role', title: 'Explorador Estelar', desc: 'Obtén el emblema oficial de explorador y acceso a trasmisiones básicas del Spacely.', price: 100, icon: '🔭', rarity: 'common' },
  { id: 'role_warden', category: 'role', title: 'Vigilante del Cosmos', desc: 'Obtén el emblema de Vigilante y el poder de reportar publicaciones con prioridad de revisión.', price: 300, icon: '🛡️', rarity: 'rare' },
  { id: 'role_nomad', category: 'role', title: 'Nómada Astral', desc: 'Obtén el emblema de Nómada y un aura de color neón exclusivo en tu avatar de perfil.', price: 450, icon: '🧗', rarity: 'rare' },
  { id: 'role_wizard', category: 'role', title: 'Mago de los Datos', desc: 'Obtén el emblema de Mago y la capacidad de ver estadísticas avanzadas y vistas detalladas de tus posts.', price: 600, icon: '🧙', rarity: 'epic' },
  { id: 'role_goth_lord', category: 'role', title: 'Señor de la Noche', desc: 'Obtén el emblema de Señor de la Noche y una sombra roja mística permanente en tu perfil.', price: 700, icon: '🦇', rarity: 'epic' },
  { id: 'role_hacker', category: 'role', title: 'Cyber Hacker', desc: 'Obtén el emblema de Hacker y un efecto de glitch digital único en tu biografía técnica.', price: 750, icon: '💾', rarity: 'epic' },
  { id: 'role_deity', category: 'role', title: 'Deidad del Espacio', desc: 'El rango supremo. Obtén el emblema de Deidad, un aura dorada divina y acceso total a zonas restringidas.', price: 1500, icon: '👑', rarity: 'legendary' },
  { id: 'role_pioneer', category: 'role', title: 'Pionero Espacial', desc: 'Obtén el emblema de Pionero y acceso exclusivo a la sala "Alfa Central", reservada para los primeros exploradores.', price: 1000, icon: '🚩', rarity: 'rare' },
  { id: 'role_void', category: 'role', title: 'Caminante del Vacío', desc: 'Obtén el emblema del Vacío y un aura de partículas oscuras que envuelve tu perfil en las profundidades del feed.', price: 2000, icon: '🌑', rarity: 'legendary' },
  { id: 'role_architect', category: 'role', title: 'Arquitecto de Realidad', desc: 'Obtén el emblema de Arquitecto y el poder de desbloquear widgets de personalización avanzada en tu Universe Home.', price: 1200, icon: '📐', rarity: 'epic' },
];

export const CURSOR_COLORS = {
  default: { a: '#ff00ff', b: '#00e5ff' },
  cursor_cyan: { a: '#00e5ff', b: '#00bcd4' },
  cursor_green: { a: '#39ff14', b: '#00ff88' },
  cursor_gold: { a: '#ffd700', b: '#ffaa00' },
  cursor_rainbow: null, // handled separately
  cursor_pink: { a: '#ff69b4', b: '#ff1493' },
  cursor_white: { a: '#f0f0f0', b: '#c0c0c0' },
};

function loadPurchased() {
  try { return JSON.parse(localStorage.getItem(SHOP_KEY) || '[]'); }
  catch { return []; }
}

function loadEquipped() {
  try { return JSON.parse(localStorage.getItem(EQUIPPED_KEY) || '{}'); }
  catch { return {}; }
}

/** Buy an item — returns true on success */
export function purchaseItem(id) {
  const item = SHOP_ITEMS.find(i => i.id === id);
  if (!item) return false;

  const purchased = loadPurchased();
  if (purchased.includes(id)) return false;

  const coins = parseInt(localStorage.getItem('space-dan-coins') || '0', 10);
  if (coins < item.price) return false;

  // Deduct coins
  localStorage.setItem('space-dan-coins', String(coins - item.price));
  window.dispatchEvent(new CustomEvent('dan:coins-changed'));

  // Save purchase
  const next = [...purchased, id];
  localStorage.setItem(SHOP_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('dan:item-purchased', { detail: { itemId: id } }));

  unlockAchievement('shopper');
  return true;
}

export function getEquippedItem(category) {
  return loadEquipped()[category] || null;
}

export default function useShopItems() {
  const [purchased, setPurchased] = useState(loadPurchased);
  const [equipped, setEquipped] = useState(loadEquipped);

  useEffect(() => {
    const syncPurchased = () => setPurchased(loadPurchased());
    const syncEquipped = () => setEquipped(loadEquipped());
    window.addEventListener('dan:item-purchased', syncPurchased);
    window.addEventListener('dan:item-equipped', syncEquipped);
    return () => {
      window.removeEventListener('dan:item-purchased', syncPurchased);
      window.removeEventListener('dan:item-equipped', syncEquipped);
    };
  }, []);

  const hasPurchased = useCallback((id) => purchased.includes(id), [purchased]);

  const equip = useCallback((category, itemId) => {
    const current = loadEquipped();
    const next = { ...current, [category]: itemId };
    localStorage.setItem(EQUIPPED_KEY, JSON.stringify(next));
    setEquipped(next);
    window.dispatchEvent(new CustomEvent('dan:item-equipped', { detail: { category, itemId } }));
  }, []);

  const unequip = useCallback((category) => {
    const current = loadEquipped();
    const { [category]: _removed, ...rest } = current;
    localStorage.setItem(EQUIPPED_KEY, JSON.stringify(rest));
    setEquipped(rest);
    window.dispatchEvent(new CustomEvent('dan:item-equipped', { detail: { category, itemId: null } }));
  }, []);

  const getEquipped = useCallback((category) => equipped[category] || null, [equipped]);

  return { shopItems: SHOP_ITEMS, purchased, hasPurchased, purchaseItem, equip, unequip, getEquipped };
}
