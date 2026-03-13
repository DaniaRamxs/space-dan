/**
 * Reputation Service
 * Gestiona puntos de reputación y niveles por comunidad
 */

import { supabase } from '../supabaseClient';

// Puntos por acción
export const REPUTATION_POINTS = {
  MESSAGE: 5,
  VOICE_PARTICIPATION: 10,
  CREATE_ACTIVITY: 20
};

// Niveles de reputación
export const REPUTATION_LEVELS = {
  NOVATO: { name: 'Novato', min: 0, max: 49, color: '#9CA3AF', badge: '⚪' },
  EXPLORADOR: { name: 'Explorador', min: 50, max: 149, color: '#10B981', badge: '🟢' },
  VETERANO: { name: 'Veterano', min: 150, max: 399, color: '#8B5CF6', badge: '🟣' },
  LEYENDA: { name: 'Leyenda', min: 400, max: Infinity, color: '#F59E0B', badge: '🟡' }
};

/**
 * Calcular nivel basado en puntos
 * @param {number} points - Puntos totales
 * @returns {Object} - Información del nivel
 */
export function calculateLevel(points) {
  if (points >= 400) return REPUTATION_LEVELS.LEYENDA;
  if (points >= 150) return REPUTATION_LEVELS.VETERANO;
  if (points >= 50) return REPUTATION_LEVELS.EXPLORADOR;
  return REPUTATION_LEVELS.NOVATO;
}

/**
 * Obtener el nombre del nivel
 * @param {number} points - Puntos totales
 * @returns {string} - Nombre del nivel
 */
export function getLevelName(points) {
  return calculateLevel(points).name;
}

/**
 * Obtener el badge del nivel
 * @param {number} points - Puntos totales
 * @returns {string} - Emoji badge
 */
export function getLevelBadge(points) {
  return calculateLevel(points).badge;
}

/**
 * Obtener el color del nivel
 * @param {number} points - Puntos totales
 * @returns {string} - Color hexadecimal
 */
export function getLevelColor(points) {
  return calculateLevel(points).color;
}

/**
 * Actualizar reputación de un usuario en una comunidad
 * @param {string} userId - ID del usuario
 * @param {string} communityId - ID de la comunidad
 * @param {number} points - Puntos a añadir
 * @param {string} actionType - Tipo de acción ('message', 'voice', 'activity')
 * @param {string} description - Descripción opcional
 * @returns {Promise<Object>} - Resultado de la actualización
 */
export async function updateReputation(userId, communityId, points, actionType, description = null) {
  try {
    const { data, error } = await supabase.rpc('update_community_reputation', {
      p_user_id: userId,
      p_community_id: communityId,
      p_points: points,
      p_action_type: actionType,
      p_description: description
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[Reputation] Update failed:', error);
    throw error;
  }
}

/**
 * Añadir puntos por enviar mensaje
 * @param {string} userId - ID del usuario
 * @param {string} communityId - ID de la comunidad
 * @returns {Promise<Object>}
 */
export async function addMessagePoints(userId, communityId) {
  return updateReputation(
    userId,
    communityId,
    REPUTATION_POINTS.MESSAGE,
    'message',
    'Mensaje enviado en chat'
  );
}

/**
 * Añadir puntos por participar en voz
 * @param {string} userId - ID del usuario
 * @param {string} communityId - ID de la comunidad
 * @returns {Promise<Object>}
 */
export async function addVoicePoints(userId, communityId) {
  return updateReputation(
    userId,
    communityId,
    REPUTATION_POINTS.VOICE_PARTICIPATION,
    'voice',
    'Participación en sala de voz'
  );
}

/**
 * Añadir puntos por crear actividad
 * @param {string} userId - ID del usuario
 * @param {string} communityId - ID de la comunidad
 * @returns {Promise<Object>}
 */
export async function addActivityPoints(userId, communityId) {
  return updateReputation(
    userId,
    communityId,
    REPUTATION_POINTS.CREATE_ACTIVITY,
    'activity',
    'Creación de actividad'
  );
}

/**
 * Obtener reputación de un usuario en una comunidad
 * @param {string} userId - ID del usuario
 * @param {string} communityId - ID de la comunidad
 * @returns {Promise<Object|null>}
 */
export async function getUserReputation(userId, communityId) {
  try {
    const { data, error } = await supabase
      .from('community_reputation')
      .select('*')
      .eq('user_id', userId)
      .eq('community_id', communityId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
  } catch (error) {
    console.error('[Reputation] Get failed:', error);
    return null;
  }
}

/**
 * Obtener ranking de reputación de una comunidad
 * @param {string} communityId - ID de la comunidad
 * @param {number} limit - Límite de resultados
 * @returns {Promise<Array>}
 */
export async function getCommunityRanking(communityId, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('community_reputation')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .eq('community_id', communityId)
      .order('points', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map((item, index) => ({
      rank: index + 1,
      userId: item.user_id,
      username: item.profiles?.username || 'Anónimo',
      avatarUrl: item.profiles?.avatar_url,
      points: item.points,
      level: item.level,
      badge: getLevelBadge(item.points),
      color: getLevelColor(item.points)
    }));
  } catch (error) {
    console.error('[Reputation] Get ranking failed:', error);
    return [];
  }
}

/**
 * Obtener historial de puntos de un usuario
 * @param {string} userId - ID del usuario
 * @param {string} communityId - ID de la comunidad
 * @param {number} limit - Límite de resultados
 * @returns {Promise<Array>}
 */
export async function getReputationHistory(userId, communityId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('reputation_history')
      .select('*')
      .eq('user_id', userId)
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[Reputation] Get history failed:', error);
    return [];
  }
}

/**
 * Suscribirse a cambios de reputación en tiempo real
 * @param {string} userId - ID del usuario
 * @param {string} communityId - ID de la comunidad
 * @param {Function} callback - Función a llamar cuando cambie
 * @returns {Function} - Función para desuscribirse
 */
export function subscribeToReputation(userId, communityId, callback) {
  const channel = supabase
    .channel(`reputation-${userId}-${communityId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'community_reputation',
        filter: `user_id=eq.${userId} AND community_id=eq.${communityId}`
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Exportar servicio completo
export const reputationService = {
  calculateLevel,
  getLevelName,
  getLevelBadge,
  getLevelColor,
  updateReputation,
  addMessagePoints,
  addVoicePoints,
  addActivityPoints,
  getUserReputation,
  getCommunityRanking,
  getReputationHistory,
  subscribeToReputation,
  REPUTATION_POINTS,
  REPUTATION_LEVELS
};
