-- ============================================================
-- UNIVERSE EVENTS V2 — Arquitectura unificada de Spacely
-- Separa: Actividad de Usuarios, Eventos Cósmicos y Sistema.
-- ============================================================

-- 1. Tabla Unificada de Eventos
CREATE TABLE IF NOT EXISTS public.universe_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type         text        NOT NULL CHECK (type IN ('feed_activity', 'cosmic_event', 'system_event')),
  event_name   text        NOT NULL, -- e.g. 'legendary_purchase', 'supernova', 'maintenance'
  user_id      uuid        REFERENCES public.profiles(id) ON DELETE CASCADE, -- opcional (para feed_activity)
  
  -- Metadata unificada (ítem, raridad, multiplicador, duración, descripción)
  metadata     jsonb       NOT NULL DEFAULT '{}', 
  
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz -- Solo para cosmic_events
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_universe_events_type ON public.universe_events(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_universe_events_active ON public.universe_events(type, expires_at) WHERE type = 'cosmic_event';

-- RLS
ALTER TABLE public.universe_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Universe events are public" ON public.universe_events;
CREATE POLICY "Universe events are public"
  ON public.universe_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can insert events" ON public.universe_events;
CREATE POLICY "Authenticated can insert events"
  ON public.universe_events FOR INSERT TO authenticated WITH CHECK (true);

-- 2. Función para registrar actividad del feed (Usuarios)
-- Reemplaza el uso de cosmic_events para compras y logros.
CREATE OR REPLACE FUNCTION public.log_feed_activity(
    p_user_id uuid,
    p_event_name text,
    p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id uuid;
BEGIN
    INSERT INTO public.universe_events (type, event_name, user_id, metadata)
    VALUES ('feed_activity', p_event_name, p_user_id, p_metadata)
    RETURNING id INTO v_event_id;
    RETURN v_event_id;
END;
$$;

-- 3. Función para disparar Eventos Cósmicos (Sistema)
CREATE OR REPLACE FUNCTION public.trigger_cosmic_event(
    p_name text,
    p_multiplier float DEFAULT 1.0,
    p_duration_minutes int DEFAULT 10,
    p_description text DEFAULT 'Un evento altera el equilibrio del cosmos.'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id uuid;
BEGIN
    -- Desactivar eventos previos del mismo tipo si se desea (opcional)
    -- UPDATE public.universe_events SET expires_at = NOW() WHERE type = 'cosmic_event' AND expires_at > NOW();

    INSERT INTO public.universe_events (type, event_name, metadata, expires_at)
    VALUES (
        'cosmic_event', 
        p_name, 
        jsonb_build_object(
            'name', p_name,
            'multiplier', p_multiplier,
            'duration_minutes', p_duration_minutes,
            'description', p_description
        ),
        NOW() + (p_duration_minutes || ' minutes')::interval
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$;

-- 4. Scheduler de Eventos Aleatorios (Simulado/Invocable)
-- Esta función puede ser llamada por un cron o por la UI para "mantener vivo" el sistema.
CREATE OR REPLACE FUNCTION public.generate_random_cosmic_event()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rand float;
    v_is_weekend boolean;
    v_event_data record;
    v_event_id uuid;
BEGIN
    -- Verificar si es fin de semana (Viernes tarde a Domingo)
    -- 0=Domingo, 6=Sábado, 5=Viernes
    v_is_weekend := extract(dow from now()) IN (0, 6) OR (extract(dow from now()) = 5 AND extract(hour from now()) >= 18);
    
    v_rand := random();
    
    -- Lógica de probabilidades
    IF v_rand < 0.02 THEN -- 2% Equilibrio Estelar (Muy Raro / Redistribución)
        -- Esta función tiene sus propias reglas de cooldown (mínimo 7 días) y usuarios activos (>50)
        v_event_data := public.execute_stellar_balance_event();
        IF (v_event_data->>'success')::boolean THEN
            v_event_id := (v_event_data->>'event_id')::uuid;
        ELSE
            -- Si falla por cooldown o falta de usuarios, lanzamos un evento común
             v_event_id := public.trigger_cosmic_event('Viento Solar', 1.2, 45, 'Una tormenta solar ligera recorre el sistema.');
        END IF;

    ELSIF v_rand < 0.04 THEN -- 2% Galaxy Collision (Ultra Raro)
        v_event_id := public.trigger_cosmic_event('Colisión de Galaxias', 5.0, 15, 'Dos galaxias chocan. Multiplicador x5 y drops exclusivos activos.');
    ELSIF v_is_weekend AND v_rand < 0.15 THEN -- 15% Eventos de Fin de Semana
        v_event_id := public.trigger_cosmic_event('Casino Galáctico', 2.0, 60, 'Todos los juegos tienen recompensas duplicadas.');
    ELSIF v_is_weekend AND v_rand < 0.30 THEN
        v_event_id := public.trigger_cosmic_event('Mercado Estelar', 1.0, 120, 'Ofertas raras y cosméticos exclusivos disponibles en la tienda.');
    ELSIF v_rand < 0.15 THEN -- 11% Supernova (Raro)
        v_event_id := public.trigger_cosmic_event('Supernova', 3.0, 10, 'Explosión estelar masiva. Recompensas x3.');
    ELSIF v_rand < 0.35 THEN -- 20% Meteor Shower / Nebula
        v_event_id := public.trigger_cosmic_event('Lluvia de Meteoritos', 1.5, 20, 'Fragmentos cósmicos otorgan Starlys extra.');
    ELSIF v_rand < 0.55 THEN 
        v_event_id := public.trigger_cosmic_event('Nebulosa Energética', 1.5, 30, 'Una nube cósmica potencia los juegos x1.5.');
    ELSE -- Común
        v_event_id := public.trigger_cosmic_event('Viento Solar', 1.2, 45, 'Una tormenta solar ligera recorre el sistema.');
    END IF;

    RETURN jsonb_build_object('success', true, 'event_id', v_event_id);
END;
$$;
