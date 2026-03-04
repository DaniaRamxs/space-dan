
import { supabase } from '../supabaseClient';

export const stellarStoreService = {
    /**
     * Obtiene los productos disponibles en la tienda galáctica
     */
    async getProducts() {
        const { data, error } = await supabase
            .from('premium_products')
            .select('*')
            .order('price', { ascending: true });

        if (error) {
            console.error('[stellarStoreService] Error fetching products:', error);
            return [];
        }
        return data;
    },

    /**
     * Simula la compra de un producto premium
     */
    async purchaseProduct(productId) {
        // En PayPal, el flujo suele ser manejado por el SDK en el frontend.
        // Pero para el log podemos retornar la info del producto.
        const { data, error } = await supabase
            .from('premium_products')
            .select('*')
            .eq('id', productId)
            .single();
        if (error) throw error;
        return data;
    },

    async verifyPayPalPayment(orderId, productId, userId) {
        const { data, error } = await supabase.functions.invoke('paypal-capture', {
            body: { orderId, productId, userId }
        });

        if (error) {
            console.error('[stellarStoreService] PayPal Verification Error:', error);
            throw error;
        }

        return data;
    },

    /**
     * Obtiene los efectos activos del usuario (protección, bonos, etc.)
     */
    async getActiveEffects() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('active_effects')
            .select('*')
            .gt('expires_at', new Date().toISOString());

        if (error) {
            console.error('[stellarStoreService] Error fetching effects:', error);
            return [];
        }
        return data;
    }
};
