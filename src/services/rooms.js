import { supabase } from '../supabaseClient';

/**
 * ROOMS SERVICE
 * Handles real-time synchronized concentrate rooms.
 */

export const roomsService = {
    /**
     * Create or join a private room.
     */
    async getOrCreateRoom(otherUserId) {
        const { data, error } = await supabase.rpc('create_private_room', {
            p_invited_id: otherUserId
        });
        if (error) throw error;
        return data; // returns room_id
    },

    /**
     * Fetch room status (timer, participants).
     */
    async getRoomStatus(roomId) {
        const { data, error } = await supabase
            .from('private_rooms')
            .select('*')
            .eq('id', roomId)
            .single();
        if (error) throw error;
        return data;
    },

    /**
     * Update room timer state for all participants.
     */
    async updateRoomTimer(roomId, status, minutesLeft) {
        const { error } = await supabase
            .from('private_rooms')
            .update({
                timer_status: status,
                timer_minutes_left: minutesLeft,
                last_activity_at: new Date().toISOString()
            })
            .eq('id', roomId);
        if (error) throw error;
        return true;
    },

    /**
     * Join a room's realtime channel.
     */
    subscribeToRoom(roomId, onUpdate) {
        return supabase
            .channel(`room:${roomId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'private_rooms',
                filter: `id=eq.${roomId}`
            }, payload => {
                onUpdate(payload.new);
            })
            .subscribe();
    }
};
