-- ============================================================
-- GALACTIC STORE V2 :: REBORN
-- Implementación de Tiers, Automatización y Beneficios Globales
-- ============================================================

-- 1. EXTENSIÓN DE PERFILES (Nuevas capacidades premium)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS sub_tier          integer      DEFAULT 0,
ADD COLUMN IF NOT EXISTS sub_expires_at    timestamptz  DEFAULT NULL,
ADD COLUMN IF NOT EXISTS anti_rob_until    timestamptz  DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bot_assistant     boolean      DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_name_color  text         DEFAULT NULL;

-- 2. LIMPIEZA Y ACTUALIZACIÓN DEL CATÁLOGO
TRUNCATE public.premium_products CASCADE;

INSERT INTO public.premium_products (id, name, description, price, type, reward_starlys, metadata) VALUES
('tier_explorer', 'Explorador del Vacío', 'Badge exclusivo y multiplicador x1.2 en todas tus misiones.', 1.99, 'subscription', 0, '{"tier": 1, "work_multi": 1.2}'),

('tier_citizen', 'Ciudadano de Spacely', '2.5M Starlys inmediatos + Un cofre de colección mensual.', 4.99, 'subscription', 2500000, '{"tier": 2, "chest_grant": 1}'),

('tier_lord', 'Lord de la Galaxia', 'Color de nombre personalizado, Chat VIP y 1 Anuncio Global mensual.', 9.99, 'subscription', 5000000, '{"tier": 3, "vip_access": true, "custom_color": true}'),

('global_pulse', 'Pulso Cósmico (Global)', 'Otorga x2 de ganancias a TODOS los usuarios activos durante 30 min.', 2.99, 'item', 0, '{"event": "cosmic_pulse", "multiplier": 2.0, "duration": 30}'),

('bot_assistant', 'Asistente HyperBot', 'Automatiza tus recordatorios y optimiza tus tiempos de trabajo.', 1.99, 'subscription', 0, '{"assistant": true}'),

('anti_theft_shield', 'Escudo de Neutrones', 'Inmunidad total ante intentos de robo durante 7 días.', 1.99, 'item', 0, '{"anti_rob_days": 7}');

-- 3. FUNCIÓN MAESTRA DE PROCESAMIENTO AUTOMÁTICO
CREATE OR REPLACE FUNCTION public.process_premium_purchase(p_user_id uuid, p_product_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_prod RECORD;
    v_meta jsonb;
    v_username text;
BEGIN
    -- 1. Validar producto
    SELECT * INTO v_prod FROM public.premium_products WHERE id = p_product_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'reason', 'product_not_found'); END IF;
    
    SELECT username INTO v_username FROM public.profiles WHERE id = p_user_id;
    v_meta := v_prod.metadata;

    -- 2. Registrar la compra
    INSERT INTO public.user_purchases (user_id, product_id, amount_paid, status)
    VALUES (p_user_id, p_product_id, v_prod.price, 'completed');

    -- 3. ACTIVACIÓN AUTOMÁTICA SEGÚN METADATA
    
    -- A. Recompensa en Starlys (vía AwardCoins para Ledger)
    IF v_prod.reward_starlys > 0 THEN
        PERFORM public.award_coins(p_user_id, v_prod.reward_starlys::integer, 'admin_grant', p_product_id, 'Premio por compra: ' || v_prod.name);
    END IF;

    -- B. Gestión de Suscripciones (Tiers)
    IF v_meta ? 'tier' THEN
        UPDATE public.profiles SET 
            sub_tier = (v_meta->>'tier')::integer,
            sub_expires_at = COALESCE(sub_expires_at, now()) + interval '30 days',
            is_stellar_citizen = true -- Retrocompatibilidad
        WHERE id = p_user_id;

        -- Logs de historial/logros
        IF (v_meta->>'tier')::integer >= 2 THEN
           UPDATE public.profiles SET redemption_tickets = redemption_tickets + 1 WHERE id = p_user_id;
        END IF;
    END IF;

    -- C. Escudo Anti-Robo
    IF v_meta ? 'anti_rob_days' THEN
        UPDATE public.profiles SET 
            anti_rob_until = COALESCE(anti_rob_until, now()) + (v_meta->>'anti_rob_days' || ' days')::interval
        WHERE id = p_user_id;
    END IF;

    -- D. Asistente Bot
    IF v_meta ? 'assistant' THEN
        UPDATE public.profiles SET bot_assistant = true WHERE id = p_user_id;
    END IF;

    -- E. EVENTOS GLOBALES (Pulso Cósmico)
    IF v_meta ? 'event' AND v_meta->>'event' = 'cosmic_pulse' THEN
        PERFORM public.trigger_cosmic_event(
            'Pulso de ' || v_username, 
            (v_meta->>'multiplier')::float, 
            (v_meta->>'duration')::integer, 
            'Energía liberada por ' || v_username || '. ¡Ganancias potenciadas para todos!'
        );
        
        -- Log en el feed global
        PERFORM public.log_feed_activity(p_user_id, 'global_booster', jsonb_build_object(
            'buyer', v_username,
            'description', 'Ha activado un Pulso Cósmico Global x2'
        ));
    END IF;

    -- Registrar efecto activo para UI
    INSERT INTO public.active_effects (user_id, effect_type, expires_at)
    VALUES (p_user_id, p_product_id, now() + interval '30 days')
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object('success', true, 'product', v_prod.name);
END;
$$;
