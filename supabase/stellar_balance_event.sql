-- ============================================================
-- EVENTO: EQUILIBRIO ESTELAR
-- Redistribución de riqueza de los imperios estelares.
-- Reducción de la concentración extrema de riqueza.
-- ============================================================

CREATE OR REPLACE FUNCTION public.execute_stellar_balance_event()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_users int;
    v_top_user record;
    v_total_fund bigint := 0;
    v_share_per_user bigint;
    v_last_event_date timestamptz;
    v_event_id uuid;
    v_user_count_threshold int := 50;
BEGIN
    -- 1. Regla: Máximo una vez por semana (7 días)
    SELECT created_at INTO v_last_event_date
    FROM public.universe_events
    WHERE event_name = 'Equilibrio Estelar'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_last_event_date IS NOT NULL AND v_last_event_date > NOW() - INTERVAL '7 days' THEN
        RETURN jsonb_build_object('success', false, 'reason', 'cooldown_active');
    END IF;

    -- 2. Regla: Solo si hay más de 50 usuarios con perfil completo
    SELECT COUNT(*) INTO v_total_users FROM public.profiles WHERE username IS NOT NULL;
    
    IF v_total_users < v_user_count_threshold THEN
        -- Para propósitos de testing/demo, podríamos bajar este límite, 
        -- pero cumpliremos el requerimiento del usuario.
        RETURN jsonb_build_object('success', false, 'reason', 'not_enough_users', 'count', v_total_users);
    END IF;

    -- 3. Identificar los 3 más ricos y calcular fondo (15% de su balance)
    -- FOR UPDATE para evitar race conditions durante la transferencia masiva
    FOR v_top_user IN (
        SELECT id, username, balance 
        FROM public.profiles 
        WHERE username IS NOT NULL 
        ORDER BY balance DESC 
        LIMIT 3
        FOR UPDATE
    ) LOOP
        DECLARE
            v_contribution bigint;
        BEGIN
            v_contribution := floor(v_top_user.balance * 0.15);
            
            IF v_contribution > 0 THEN
                v_total_fund := v_total_fund + v_contribution;
                
                -- Detraer saldo de los imperios
                UPDATE public.profiles 
                SET balance = balance - v_contribution 
                WHERE id = v_top_user.id;

                -- Registrar transacción de aporte (auditoría)
                INSERT INTO public.transactions (user_id, amount, balance_after, type, description, metadata)
                VALUES (
                    v_top_user.id, 
                    -v_contribution, 
                    v_top_user.balance - v_contribution, 
                    'event_tax', 
                    'Aporte al Equilibrio Estelar (15%)',
                    jsonb_build_object('event', 'Equilibrio Estelar', 'imperio', v_top_user.username)
                );
            END IF;
        END;
    END LOOP;

    -- Si no hubo aporte (balances en 0), abortar
    IF v_total_fund <= 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'no_fund_generated');
    END IF;

    -- 4. Calcular reparto igualitario
    v_share_per_user := floor(v_total_fund / v_total_users);

    -- 5. Distribuir a TODOS los exploradores
    IF v_share_per_user > 0 THEN
        -- Actualizar balances de todos en una sola operación optimizada
        UPDATE public.profiles 
        SET balance = balance + v_share_per_user
        WHERE username IS NOT NULL;

        -- Registrar transacciones masivas para auditoría
        INSERT INTO public.transactions (user_id, amount, balance_after, type, description, metadata)
        SELECT 
            id, 
            v_share_per_user, 
            balance, 
            'event_reward', 
            'Recibido por Equilibrio Estelar',
            jsonb_build_object('event', 'Equilibrio Estelar', 'share', v_share_per_user)
        FROM public.profiles
        WHERE username IS NOT NULL;
    END IF;

    -- 6. Disparar el Evento Cósmico Global (Banner superior)
    v_event_id := public.trigger_cosmic_event(
        'Equilibrio Estelar', 
        1.0, 
        10, -- 10 minutos de visibilidad en el banner
        'El universo busca armonía. Una fracción de la energía de los imperios estelares se redistribuye entre todos los exploradores.'
    );

    -- 7. Registrar mensaje automático en el feed (Activity Feed)
    PERFORM public.log_feed_activity(
        NULL, -- Evento de sistema/global
        'stellar_rebalance',
        jsonb_build_object(
            'title', '🌌 El universo se equilibra',
            'description', 'Los imperios estelares liberaron energía. Todos los exploradores recibieron Starlys.',
            'fund_total', v_total_fund,
            'share_per_user', v_share_per_user,
            'icon', '🌍'
        )
    );

    RETURN jsonb_build_object(
        'success', true, 
        'event_id', v_event_id, 
        'total_fund', v_total_fund, 
        'share_per_user', v_share_per_user,
        'users_affected', v_total_users
    );
END;
$$;
