import { useState, useEffect, useCallback } from 'react';
import { unlockAchievement } from './useAchievements';

const SHOP_KEY     = 'space-dan-shop-purchased';
const EQUIPPED_KEY = 'space-dan-shop-equipped';

export const SHOP_ITEMS = [
  // ── Cursor trails ──────────────────────────────────────────────
  { id: 'cursor_cyan',    category: 'cursor',      title: 'Trail Cian',       desc: 'Partículas cian eléctrico',        price: 50,  icon: '💠' },
  { id: 'cursor_green',   category: 'cursor',      title: 'Trail Matrix',     desc: 'Partículas verde hacker',          price: 75,  icon: '💚' },
  { id: 'cursor_gold',    category: 'cursor',      title: 'Trail Dorado',     desc: 'Partículas dorado exclusivo',      price: 100, icon: '✨' },
  { id: 'cursor_rainbow', category: 'cursor',      title: 'Trail Arcoíris',   desc: 'Todos los colores a la vez',       price: 200, icon: '🌈' },
  // ── Screensavers ───────────────────────────────────────────────
  { id: 'saver_matrix',   category: 'screensaver', title: 'Matrix Rain',      desc: 'Lluvia de código verde',           price: 100, icon: '🟩' },
  { id: 'saver_dvd',      category: 'screensaver', title: 'DVD Bounce',       desc: 'Logo clásico rebotando',           price: 80,  icon: '📀' },
  { id: 'saver_pipes',    category: 'screensaver', title: 'Tuberías 3D',      desc: 'Clásico Windows 95/98',            price: 120, icon: '🔧' },
  // ── Estrellas ──────────────────────────────────────────────────
  { id: 'stars_blue',     category: 'stars',       title: 'Nebulosa Azul',    desc: 'Estrellas azul profundo',          price: 80,  icon: '🔵' },
  { id: 'stars_green',    category: 'stars',       title: 'Estrellas Matrix', desc: 'Fondo verde hacker',               price: 80,  icon: '🟢' },
  { id: 'stars_red',      category: 'stars',       title: 'Inferno Stars',    desc: 'Estrellas rojo carmesí',           price: 80,  icon: '🔴' },
  // ── Radio stations ─────────────────────────────────────────────
  { id: 'radio_jcore',    category: 'radio',       title: 'J-Core Station',   desc: 'Anime beats y J-pop',              price: 50,  icon: '🎌' },
  { id: 'radio_groove',   category: 'radio',       title: 'Groove Salad',     desc: 'Ambient electronica relajante',    price: 50,  icon: '🥗' },
];

export const CURSOR_COLORS = {
  default:        { a: '#ff00ff', b: '#00e5ff' },
  cursor_cyan:    { a: '#00e5ff', b: '#00bcd4' },
  cursor_green:   { a: '#39ff14', b: '#00ff88' },
  cursor_gold:    { a: '#ffd700', b: '#ffaa00' },
  cursor_rainbow: null, // handled separately
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
  const [purchased, setPurchased]  = useState(loadPurchased);
  const [equipped, setEquipped]    = useState(loadEquipped);

  useEffect(() => {
    const syncPurchased = () => setPurchased(loadPurchased());
    const syncEquipped  = () => setEquipped(loadEquipped());
    window.addEventListener('dan:item-purchased', syncPurchased);
    window.addEventListener('dan:item-equipped',  syncEquipped);
    return () => {
      window.removeEventListener('dan:item-purchased', syncPurchased);
      window.removeEventListener('dan:item-equipped',  syncEquipped);
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

  const getEquipped = useCallback((category) => equipped[category] || null, [equipped]);

  return { shopItems: SHOP_ITEMS, purchased, hasPurchased, equip, getEquipped };
}
