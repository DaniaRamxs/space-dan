
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAGOEFECTIVO_API_URL = Deno.env.get('PAGOEFECTIVO_API_URL') || 'https://api-hermes.pagoefectivo.pe/v1'
const PAGOEFECTIVO_API_KEY = Deno.env.get('PAGOEFECTIVO_API_KEY')
const PAGOEFECTIVO_SECRET = Deno.env.get('PAGOEFECTIVO_SECRET')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { productId, userId, email, amount, name } = await req.json()

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // 1. Crear registro pendiente en la base de datos
        const { data: purchase, error: purchaseError } = await supabaseAdmin
            .from('user_purchases')
            .insert({
                user_id: userId,
                product_id: productId,
                amount_paid: amount,
                currency: 'PEN',
                status: 'pending'
            })
            .select()
            .single()

        if (purchaseError) throw purchaseError

        // 2. Generar CIP en PagoEfectivo
        // Nota: PagoEfectivo requiere una firma HMAC o Token según la versión.
        // Aquí implementamos la llamada estándar a la API REST.
        const res = await fetch(`${PAGOEFECTIVO_API_URL}/cips`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PAGOEFECTIVO_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: amount,
                currency: "PEN",
                description: `Compra en Spacely - ${productId}`,
                email: email,
                name: name,
                expiration: 1440, // 24 horas
                external_id: purchase.id, // Usamos nuestro ID de compra como referencia
                callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/pagoefectivo-webhook`
            })
        })

        const data = await res.json()

        if (!res.ok) throw new Error(data.message || 'Error al generar CIP')

        // 3. Devolver datos del CIP al frontend
        return new Response(JSON.stringify({
            success: true,
            cip: data.cip,
            expiry: data.expiry,
            qr: data.qr_code,
            amount: amount,
            purchaseId: purchase.id
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('[PagoEfectivo Generate Error]', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
