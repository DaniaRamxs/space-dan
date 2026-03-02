import { useState, useEffect, useCallback } from 'react';
import { syncAchievementToDb } from '../services/supabaseScores';

const ACH_KEY = 'space-dan-achievements';

export const ACHIEVEMENTS = [
  { id: 'first_visit', icon: '🌟', title: 'Bienvenid@', desc: 'Visita el sitio por primera vez', coins: 20 },
  { id: 'explorer', icon: '🗺️', title: 'Explorador/a', desc: 'Visita 10 secciones diferentes', coins: 50 },
  { id: 'completionist', icon: '🏆', title: 'Completista', desc: 'Visita todas las secciones', coins: 200 },
  { id: 'gamer', icon: '🎮', title: 'Gamer', desc: 'Juega 5 juegos diferentes', coins: 40 },
  { id: 'highscore', icon: '💥', title: 'Récord Roto', desc: 'Consigue un nuevo récord en cualquier juego', coins: 50 },
  { id: 'konami', icon: '⬆️', title: 'Konami Master', desc: 'Activa el código Konami secreto', coins: 100 },
  { id: 'social', icon: '📝', title: 'Sociable', desc: 'Firma el libro de visitas', coins: 30 },
  { id: 'night_owl', icon: '🦉', title: 'Noctámbul@', desc: 'Visita entre medianoche y las 5am', coins: 75 },
  { id: 'music_lover', icon: '🎵', title: 'Music Lover', desc: 'Abre el reproductor de música', coins: 20 },
  { id: 'radio_listener', icon: '📻', title: 'Radio Listener', desc: 'Escucha la radio en vivo', coins: 30 },
  { id: 'capsule_opener', icon: '⏳', title: 'Viajero del Tiempo', desc: 'Visita la cápsula del tiempo', coins: 30 },
  { id: 'secret_finder', icon: '🔮', title: 'Secreto Desvelado', desc: 'Encuentra la página secreta', coins: 100 },
  { id: 'shopper', icon: '🛍️', title: 'De Compras', desc: 'Compra algo en la tienda', coins: 25 },
  { id: 'rich', icon: '💰', title: 'Dan-Rico/a', desc: 'Acumula 500 Starlys', coins: 0 },
  { id: 'os_user', icon: '🖥️', title: 'Usuario del OS', desc: 'Abre una ventana en el OS Desktop', coins: 20 },
  { id: 'os_hacker', icon: '💀', title: 'Hacker', desc: 'Escribe un comando en la terminal del OS', coins: 30 },
  { id: 'os_multitask', icon: '🪟', title: 'Multitarea', desc: 'Abre 5 ventanas a la vez en el OS', coins: 50 },
  { id: 'os_dev', icon: '🧮', title: 'Dev Mode', desc: 'Usa la calculadora del OS', coins: 15 },
  { id: 'five_achievements', icon: '🎖️', title: 'Coleccionista', desc: 'Desbloquea 5 logros', coins: 60 },
  { id: 'all_achievements', icon: '👑', title: 'Leyenda', desc: 'Desbloquea todos los logros', coins: 500 },
];

const ALL_IDS = ACHIEVEMENTS.map(a => a.id);

function loadUnlocked() {
  try { return JSON.parse(localStorage.getItem(ACH_KEY) || '[]'); }
  catch { return []; }
}

/** Unlock an achievement from anywhere — safe to call multiple times */
export function unlockAchievement(id) {
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  if (!ach) return false;

  const current = loadUnlocked();
  if (current.includes(id)) return false;

  const next = [...current, id];
  try { localStorage.setItem(ACH_KEY, JSON.stringify(next)); } catch { }

  // Sync to Supabase and award coins via SECURITY DEFINER (fire-and-forget)
  syncAchievementToDb(id, ach.title, ach.coins);

  window.dispatchEvent(new CustomEvent('dan:achievement-unlocked', {
    detail: { achievement: ach, total: next.length }
  }));

  // Chain achievements
  setTimeout(() => {
    const updated = loadUnlocked();
    if (updated.length >= 5 && !updated.includes('five_achievements'))
      unlockAchievement('five_achievements');
    if (updated.length >= ALL_IDS.length - 1 && !updated.includes('all_achievements'))
      unlockAchievement('all_achievements');
  }, 400);

  return true;
}

export default function useAchievements() {
  const [unlocked, setUnlocked] = useState(loadUnlocked);

  useEffect(() => {
    const sync = () => setUnlocked(loadUnlocked());
    window.addEventListener('dan:achievement-unlocked', sync);
    return () => window.removeEventListener('dan:achievement-unlocked', sync);
  }, []);

  const hasUnlocked = useCallback((id) => unlocked.includes(id), [unlocked]);
  const unlock = useCallback((id) => unlockAchievement(id), []);

  return { achievements: ACHIEVEMENTS, unlocked, hasUnlocked, unlock };
}
