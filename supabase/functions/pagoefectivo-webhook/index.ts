
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    // PagoEfectivo envía notificaciones vía POST
    try {
        const payload = await req.json()
        console.log('[PagoEfectivo Webhook Received]', payload)

        // PagoEfectivo envía típicamente un status 'paid' o similar
        // El id externo que enviamos arriba es payload.external_id o payload.request_id
        const { external_id, status, cip } = payload

        if (status !== 'paid' && status !== 'COMPLETED') {
            return new Response('Status not handled', { status: 200 })
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // 1. Verificar si la compra existe y está pendiente
        const { data: purchase, error: purchaseError } = await supabaseAdmin
            .from('user_purchases')
            .select('*')
            .eq('id', external_id)
            .single()

        if (purchaseError || !purchase) {
            console.error('Compra no encontrada:', external_id)
            return new Response('Purchase not found', { status: 404 })
        }

        if (purchase.status === 'completed') {
            return new Response('Already processed', { status: 200 })
        }

        // 2. Marcar como completada
        await supabaseAdmin
            .from('user_purchases')
            .update({ status: 'completed' })
            .eq('id', external_id)

        // 3. Procesar premios (Starlys, Items, etc.)
        const { error: rewardError } = await supabaseAdmin.rpc('process_premium_purchase', {
            p_user_id: purchase.user_id,
            p_product_id: purchase.product_id
        })

        if (rewardError) {
            console.error('Error procesando premios:', rewardError)
            // Aquí podrías guardar el error en un log para procesarlo manualmente
        }

        return new Response('OK', { status: 200 })

    } catch (error) {
        console.error('[PagoEfectivo Webhook Error]', error.message)
        return new Response('Internal Server Error', { status: 500 })
    }
})
