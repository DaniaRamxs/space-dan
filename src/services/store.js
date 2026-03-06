/**
 * store.js
 * Capa de servicio para la tienda y el inventario de usuario.
 * Toda compra/equipamiento pasa por funciones SECURITY DEFINER en Supabase.
 */
import { supabase } from '../supabaseClient';

// ─────────────────────────────────────────────────────────────
// CATÁLOGO
// ─────────────────────────────────────────────────────────────

/** Todos los items activos (para la tienda) */
export async function getStoreItems(category = null) {
  let query = supabase
    .from('store_items')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Item individual */
export async function getStoreItem(itemId) {
  const { data, error } = await supabase
    .from('store_items')
    .select('*')
    .eq('id', itemId)
    .single();
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// INVENTARIO DEL USUARIO
// ─────────────────────────────────────────────────────────────

/** Items que posee un usuario */
export async function getUserItems(userId) {
  const { data, error } = await supabase
    .from('user_items')
    .select(`
      item_id,
      is_equipped,
      purchased_at,
      item:store_items(id, category, title, description, price, rarity, icon, metadata, preview_url)
    `)
    .eq('user_id', userId)
    .order('purchased_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Verifica si un usuario tiene un item específico */
export async function hasItem(userId, itemId) {
  const { data } = await supabase
    .from('user_items')
    .select('item_id')
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .maybeSingle();
  return data !== null;
}

// ─────────────────────────────────────────────────────────────
// COMPRAR
// ─────────────────────────────────────────────────────────────

/** Items coleccionables que posee un usuario (Gacha) */
export async function getUserCollectibles(userId) {
  const { data, error } = await supabase
    .from('user_collectibles')
    .select(`
      collectible_id,
      obtained_at,
      collectible:collectibles(id, name, description, series, rarity, image_url)
    `)
    .eq('user_id', userId)
    .order('obtained_at', { ascending: false });

  if (error) throw error;
  // Extraemos el objeto `collectible` simplificando la estructura para la UI
  return data.map(row => row.collectible);
}

/**
 * Compra un item de la tienda.
 * El servidor valida balance, stock, duplicados y descuenta coins.
 */
export async function purchaseItem(userId, itemId) {
  const { data, error } = await supabase.rpc('purchase_item', {
    p_user_id: userId,
    p_item_id: itemId,
  });
  if (error) throw error;
  return data;
}

/**
 * Otorga monedas (uso administrativo/tester).
 */
export async function awardCoins(userId, amount, type, reference = null, description = null) {
  const { data, error } = await supabase.rpc('award_coins', {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_reference: reference,
    p_description: description,
    p_metadata: {},
  });
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// EQUIPAR / DESEQUIPAR
// ─────────────────────────────────────────────────────────────

/**
 * Equipa un item (el servidor gestiona slots y mutual exclusividad)
 */
export async function equipItem(userId, itemId) {
  const { data, error } = await supabase.rpc('equip_item', {
    p_user_id: userId,
    p_item_id: itemId,
    p_equip: true,
  });
  if (error) throw error;
  return data;
}

/**
 * Desequipa un item
 */
export async function unequipItem(userId, itemId) {
  const { data, error } = await supabase.rpc('equip_item', {
    p_user_id: userId,
    p_item_id: itemId,
    p_equip: false,
  });
  if (error) throw error;
  return data;
}

/**
 * Abre un cofre de colección (Gacha).
 */
export async function openChest(userId, chestId) {
  const { data, error } = await supabase.rpc('open_chest', {
    p_user_id: userId,
    p_chest_id: chestId,
  });
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// END OF SERVICE
// ─────────────────────────────────────────────────────────────
