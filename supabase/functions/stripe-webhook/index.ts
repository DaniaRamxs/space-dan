
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
    const signature = req.headers.get('stripe-signature')!
    const body = await req.text()

    try {
        const event = stripe.webhooks.constructEvent(
            body,
            signature,
            Deno.env.get('STRIPE_WEBHOOK_SECRET')!
        )

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object
            const userId = session.metadata.user_id
            const productId = session.metadata.product_id

            // Usar Service Role key para saltarse RLS y entregar los premios
            const supabaseAdmin = createClient(
                Deno.env.get('SUPABASE_URL')!,
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            )

            console.log(`[Webhook] Procesando compra: User ${userId} -> Product ${productId}`);

            const { data, error } = await supabaseAdmin.rpc('process_premium_purchase', {
                p_user_id: userId,
                p_product_id: productId
            })

            if (error) {
                console.error('[Webhook] Error entregando premios:', error);
                return new Response('Error processing rewards', { status: 500 })
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 })
    } catch (error) {
        console.error(`[Webhook Error] ${error.message}`);
        return new Response(`Webhook Error: ${error.message}`, { status: 400 })
    }
})
