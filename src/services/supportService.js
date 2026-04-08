import { supabase } from '../supabaseClient';

/**
 * supportService.js
 * Maneja el Sistema de Apoyo Estelar: Regalos, propinas y ayuda con deudas.
 */
export const supportService = {
    /**
     * Envía Starlys con un mensaje y tipo de apoyo.
     * @param {string} fromId - UUID emisor
     * @param {string} toId - UUID receptor
     * @param {number} amount
     * @param {string} message - Máx 120 caracteres
     * @param {'gift'|'tip'|'financial_aid'|'bet'} supportType
     */
    async sendGift(fromId, toId, amount, message, supportType = 'gift') {
        const { data, error } = await supabase.rpc('send_stellar_support', {
            p_from_id: fromId,
            p_to_id: toId,
            p_amount: amount,
            p_message: message,
            p_support_type: supportType
        });
        if (error) throw error;
        return data;
    },

    /**
     * Ayuda a pagar la deuda de otro usuario.
     * @param {string} donorId
     * @param {string} recipientId
     * @param {number} amount
     */
    async supportDebt(donorId, recipientId, amount) {
        const { data, error } = await supabase.rpc('pay_user_debt', {
            p_donor_id: donorId,
            p_recipient_id: recipientId,
            p_amount: amount
        });
        if (error) throw error;
        return data;
    },

    /**
     * Obtiene el progreso de apoyo comunitario para un usuario endeudado.
     */
    async getDebtProgress(userId) {
        const { data, error } = await supabase.rpc('get_debt_support_progress', {
            p_user_id: userId
        });
        if (error) throw error;
        return data;
    },

    /**
     * Obtiene la lista de Guardianes Estelares de un usuario.
     */
    async getGuardians(userId) {
        const { data, error } = await supabase
            .from('stellar_guardians')
            .select('*')
            .eq('recipient_id', userId)
            .limit(10);
        if (error) throw error;
        return data || [];
    },

    /**
     * Obtiene los apoyos (regalos) recientes recibidos por un usuario.
     */
    async getRecentSupports(userId, limit = 5) {
        const { data, error } = await supabase
            .from('transfers')
            .select(`
        id, amount, message, support_type, created_at,
        from_user:profiles!from_user_id(username, avatar_url)
      `)
            .eq('to_user_id', userId)
            .neq('support_type', 'debt_payment')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    }
};
