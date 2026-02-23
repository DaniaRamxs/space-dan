import { supabase } from '../supabaseClient';

/**
 * Creates a notification for a user.
 * @param {string} userId - The ID of the user receiving the notification.
 * @param {string} type - 'achievement', 'record', or 'system'.
 * @param {string} message - The content of the notification.
 */
export async function createNotification(userId, type, message) {
    if (!userId) return;
    try {
        await supabase.from('notifications').insert({
            user_id: userId,
            type,
            message
        });
    } catch (err) {
        console.error("Failed to create notification:", err);
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
