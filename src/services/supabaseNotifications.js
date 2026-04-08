import { supabase } from '../supabaseClient';

/**
 * Creates a notification for a user.
 * Usa la función RPC notify_user (SECURITY DEFINER) para poder notificar a otros usuarios
 * sin que RLS bloquee el insert cruzado.
 *
 * @param {string} userId     - ID del usuario que recibe la notificación.
 * @param {string} type       - Tipo: 'mention', 'follow', 'reaction', 'achievement', etc.
 * @param {string} message    - Texto de la notificación.
 * @param {string|null} referenceId - UUID de referencia opcional (mensaje, post, etc.).
 */
export async function createNotification(userId, type, message, referenceId = null) {
    if (!userId) return;
    try {
        const { error } = await supabase.rpc('notify_user', {
            p_user_id:      userId,
            p_type:         type,
            p_message:      message,
            p_reference_id: referenceId ?? null,
        });
        if (error) console.error('[Notification] RPC error:', error.message);
    } catch (err) {
        console.error('[Notification] Failed:', err);
    }
}

/**
 * Fetches recent notifications for the logged-in user.
 * @param {number} limit - Maximum notifications to fetch.
 */
export async function getRecentNotifications(limit = 10) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return [];

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Error fetching notifications:", error);
        return [];
    }
    return data;
}

/**
 * Marks a notification as read.
 * @param {string} notificationId 
 */
export async function markNotificationAsRead(notificationId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', session.user.id);
}

/**
 * Deletes a notification permanently.
 * @param {string} notificationId
 */
export async function deleteNotification(notificationId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', session.user.id);
}

/**
 * Marks all notifications as read for the current user.
 */
export async function markAllNotificationsAsRead() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false);
}
