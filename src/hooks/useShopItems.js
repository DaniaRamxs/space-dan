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
  { id: 'radio_jcore', category: 'radio', title: 'J-Core Station', desc: 'Anime beats y J-pop', price: 50, icon: '🎌' },
  { id: 'radio_groove', category: 'radio', title: 'Groove Salad', desc: 'Ambient electronica relajante', price: 50, icon: '🥗' },
  { id: 'radio_beatblender', category: 'radio', title: 'Beat Blender', desc: 'Deep house y electro nocturno', price: 60, icon: '🎛️' },
  { id: 'radio_dronezone', category: 'radio', title: 'Drone Zone', desc: 'Ambient cósmico y espacial', price: 50, icon: '🌌' },
  { id: 'radio_secretagent', category: 'radio', title: 'Secret Agent', desc: 'Spy jazz y lounge 60s', price: 55, icon: '🕵️' },
  // ── Temas visuales ─────────────────────────────────────────────
  { id: 'theme_forest', category: 'theme', title: 'Bosque Digital', desc: 'Verde hacker sobre negro bosque', price: 150, icon: '🌿', swatch: ['#39ff14', '#00ff88'] },
  { id: 'theme_ocean', category: 'theme', title: 'Deep Ocean', desc: 'Azul celeste sobre azul profundo', price: 150, icon: '🌊', swatch: ['#00c6ff', '#0072ff'] },
  { id: 'theme_sunset', category: 'theme', title: 'Sunset Retrowave', desc: 'Naranja y hot pink, vibes 80s', price: 200, icon: '🌅', swatch: ['#ff6b35', '#ff0090'] },
  { id: 'theme_hacker', category: 'theme', title: 'Terminal Verde', desc: 'Negro puro y verde terminal clásico', price: 120, icon: '💻', swatch: ['#39ff14', '#00ff00'] },
  { id: 'theme_mono', category: 'theme', title: 'Mono Minimal', desc: 'Escala de grises, sin colores', price: 100, icon: '⬛', swatch: ['#f0f0f0', '#888888'] },
  // ── Banners Dinámicos ──────────────────────────────────────────
  { id: 'banner_galaxy', category: 'banner', title: 'Banner Galaxia', desc: 'Fondo con gradiente cosmos profundo y estrellas', price: 150, icon: '🌌', rarity: 'rare', metadata: { gradient: ['#0d0221', '#190b3d', '#4a1a6e'], fx: 'stars' } },
  { id: 'banner_cyber', category: 'banner', title: 'Banner Cyber', desc: 'Gradiente cian y magenta eléctrico', price: 120, icon: '🖼️', rarity: 'rare', metadata: { gradient: ['#00e5ff', '#ff00ff'] } },
  { id: 'banner_nebula', category: 'banner', title: 'Banner Nebulosa', desc: 'Profundo púrpura cósmico', price: 150, icon: '🌌', rarity: 'rare', metadata: { gradient: ['#4c1d95', '#1e1b4b'] } },
  { id: 'banner_gold', category: 'banner', title: 'Banner Áureo', desc: 'Elegancia en dorado y ámbar', price: 200, icon: '✨', rarity: 'epic', metadata: { gradient: ['#f59e0b', '#78350f'] } },
  { id: 'banner_matrix', category: 'banner', title: 'Banner Matrix', desc: 'Fondo oscuro con lluvia de código', price: 200, icon: '💻', rarity: 'epic', metadata: { gradient: ['#001a00', '#003300'], fx: 'matrix' } },
  { id: 'banner_aurora', category: 'banner', title: 'Banner Aurora', desc: 'Efecto aurora boreal animado', price: 300, icon: '✨', rarity: 'legendary', metadata: { gradient: ['#00c9ff', '#92fe9d', '#f7971e'], animated: true } },
  { id: 'banner_retro', category: 'banner', title: 'Banner Retro', desc: 'Pixel art 8-bit nostálgico', price: 180, icon: '👾', rarity: 'epic', metadata: { gradient: ['#000033', '#1a0033'], fx: 'scanlines' } },

  // ── Marcos de Vínculo (Solo disponibles con vínculo) ─────────────
  { id: 'frame_link_lv1', category: 'frame', title: 'Chispas de Vínculo', desc: 'Un inicio eléctrico para tu perfil', price: 0, icon: '✨', partnership_only: true },
  { id: 'frame_link_lv2', category: 'frame', title: 'Aura de Vínculo', desc: 'Borde pulsante de pura energía', price: 0, icon: '💫', partnership_only: true },
  { id: 'frame_link_lv3', category: 'frame', title: 'Resonancia Vínculo', desc: 'Gradiente rotativo de alta frecuencia', price: 0, icon: '🌀', partnership_only: true },
  { id: 'frame_link_lv4', category: 'frame', title: 'Fusión Estelar', desc: 'El poder de dos estrellas en tu avatar', price: 0, icon: '🔥', partnership_only: true },
  { id: 'frame_link_lv5', category: 'frame', title: 'Singularidad', desc: 'Marco definitivo de vínculo absoluto', price: 0, icon: '🌌', partnership_only: true },
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

  return { shopItems: SHOP_ITEMS, purchased, hasPurchased, equip, unequip, getEquipped };
}
