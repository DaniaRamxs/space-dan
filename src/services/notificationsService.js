/**
 * Notifications Service
 * Sistema de notificaciones en tiempo real
 */

import { supabase } from '../supabaseClient';

// Tipos de notificación
export const NOTIFICATION_TYPES = {
  REPLY: 'reply',
  VOICE_ACTIVITY: 'voice_activity',
  COMMUNITY_ACTIVITY: 'community_activity',
  MENTION: 'mention',
  SYSTEM: 'system'
};

// Iconos por tipo de notificación
export const NOTIFICATION_ICONS = {
  [NOTIFICATION_TYPES.REPLY]: '💬',
  [NOTIFICATION_TYPES.VOICE_ACTIVITY]: '🔊',
  [NOTIFICATION_TYPES.COMMUNITY_ACTIVITY]: '🎯',
  [NOTIFICATION_TYPES.MENTION]: '@️',
  [NOTIFICATION_TYPES.SYSTEM]: '🔔'
};

/**
 * Crear una notificación
 * @param {string} userId - ID del usuario destinatario
 * @param {string} type - Tipo de notificación
 * @param {string} title - Título
 * @param {string} message - Mensaje
 * @param {Object} data - Datos adicionales
 * @param {string} actionUrl - URL opcional para acción
 * @returns {Promise<string|null>} - ID de la notificación creada
 */
export async function createNotification(userId, type, title, message, data = {}, actionUrl = null) {
  try {
    const { data: result, error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_message: message,
      p_data: data,
      p_action_url: actionUrl
    });

    if (error) throw error;
    return result;
  } catch (error) {
    console.error('[Notifications] Create failed:', error);
    return null;
  }
}

/**
 * Obtener notificaciones del usuario
 * @param {number} limit - Límite de resultados
 * @param {number} offset - Offset para paginación
 * @param {boolean} onlyUnread - Solo no leídas
 * @returns {Promise<Array>}
 */
export async function getNotifications(limit = 20, offset = 0, onlyUnread = false) {
  try {
    const { data, error } = await supabase.rpc('get_user_notifications', {
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
      p_limit: limit,
      p_offset: offset,
      p_only_unread: onlyUnread
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[Notifications] Get failed:', error);
    return [];
  }
}

/**
 * Obtener conteo de notificaciones no leídas
 * @returns {Promise<number>}
 */
export async function getUnreadCount() {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('read', false);

    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    console.error('[Notifications] Get unread count failed:', error);
    return 0;
  }
}

/**
 * Marcar notificaciones como leídas
 * @param {string[]} notificationIds - IDs específicos (null para todas)
 * @returns {Promise<number>} - Cantidad marcadas
 */
export async function markAsRead(notificationIds = null) {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return 0;

    const { data, error } = await supabase.rpc('mark_notifications_read', {
      p_user_id: userId,
      p_notification_ids: notificationIds
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('[Notifications] Mark read failed:', error);
    return 0;
  }
}

/**
 * Marcar una notificación como leída
 * @param {string} notificationId - ID de la notificación
 * @returns {Promise<boolean>}
 */
export async function markOneAsRead(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[Notifications] Mark one read failed:', error);
    return false;
  }
}

/**
 * Eliminar una notificación
 * @param {string} notificationId - ID de la notificación
 * @returns {Promise<boolean>}
 */
export async function deleteNotification(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[Notifications] Delete failed:', error);
    return false;
  }
}

/**
 * Notificar respuesta a mensaje
 * @param {string} parentUserId - Usuario que recibirá la notificación
 * @param {string} replyUserId - Usuario que respondió
 * @param {string} communityId - ID de comunidad
 * @param {string} communityName - Nombre de comunidad
 * @param {string} messagePreview - Preview del mensaje
 * @returns {Promise<string|null>}
 */
export async function notifyMessageReply(parentUserId, replyUserId, communityId, communityName, messagePreview) {
  try {
    const { data, error } = await supabase.rpc('notify_message_reply', {
      p_parent_user_id: parentUserId,
      p_reply_user_id: replyUserId,
      p_community_id: communityId,
      p_community_name: communityName,
      p_message_preview: messagePreview
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[Notifications] Reply notify failed:', error);
    return null;
  }
}

/**
 * Notificar actividad de voz
 * @param {string} userId - Usuario a notificar
 * @param {string} actorUserId - Usuario que inició la sala
 * @param {string} communityId - ID de comunidad
 * @param {string} communityName - Nombre de comunidad
 * @param {string} roomName - Nombre de la sala
 * @returns {Promise<string|null>}
 */
export async function notifyVoiceActivity(userId, actorUserId, communityId, communityName, roomName = 'Sala de voz') {
  try {
    const { data, error } = await supabase.rpc('notify_voice_activity', {
      p_user_id: userId,
      p_actor_user_id: actorUserId,
      p_community_id: communityId,
      p_community_name: communityName,
      p_room_name: roomName
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[Notifications] Voice notify failed:', error);
    return null;
  }
}

/**
 * Notificar nueva actividad en comunidad
 * @param {string} userId - Usuario a notificar
 * @param {string} communityId - ID de comunidad
 * @param {string} communityName - Nombre de comunidad
 * @param {string} activityType - Tipo de actividad
 * @param {string} activityName - Nombre de la actividad
 * @returns {Promise<string|null>}
 */
export async function notifyCommunityActivity(userId, communityId, communityName, activityType, activityName) {
  try {
    const { data, error } = await supabase.rpc('notify_community_activity', {
      p_user_id: userId,
      p_community_id: communityId,
      p_community_name: communityName,
      p_activity_type: activityType,
      p_activity_name: activityName
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[Notifications] Activity notify failed:', error);
    return null;
  }
}

/**
 * Suscribirse a notificaciones en tiempo real
 * @param {Function} callback - Función a llamar con nuevas notificaciones
 * @returns {Function} - Función para desuscribirse
 */
export function subscribeToNotifications(callback) {
  const getUserId = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id;
  };

  let channel;

  getUserId().then(userId => {
    if (!userId) return;

    channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();
  });

  return () => {
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}

/**
 * Suscribirse a cambios en el conteo de notificaciones
 * @param {Function} callback - Función a llamar con el nuevo conteo
 * @returns {Function} - Función para desuscribirse
 */
export function subscribeToUnreadCount(callback) {
  const getUserId = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id;
  };

  let channel;

  getUserId().then(userId => {
    if (!userId) return;

    channel = supabase
      .channel(`notifications-count-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        async () => {
          const count = await getUnreadCount();
          callback(count);
        }
      )
      .subscribe();
  });

  return () => {
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}

// Exportar servicio completo
export const notificationsService = {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markOneAsRead,
  deleteNotification,
  notifyMessageReply,
  notifyVoiceActivity,
  notifyCommunityActivity,
  subscribeToNotifications,
  subscribeToUnreadCount,
  NOTIFICATION_TYPES,
  NOTIFICATION_ICONS
};
