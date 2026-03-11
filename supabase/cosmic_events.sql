-- ============================================================
-- COSMIC EVENTS — Eventos del sistema para el Feed Global
-- Solo eventos épicos, legendarios y míticos se registran.
-- Anti-spam: máximo 1 evento por usuario cada 10 minutos.
-- La mezcla con posts se hace en el cliente (ActivityFeed.jsx).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cosmic_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type   text        NOT NULL CHECK (event_type IN (
                  'chest_open',
                  'rare_character',
                  'frame_unlock',
                  'cosmetic_rare',
                  'collection_complete',
                  'community'
               )),
  rarity       text        NOT NULL DEFAULT 'epic' CHECK (rarity IN ('epic', 'legendary', 'mythic')),
  title        text        NOT NULL,
  description  text        NOT NULL,
  icon         text        DEFAULT '✨',
  metadata     jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cosmic_events_created ON public.cosmic_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cosmic_events_user    ON public.cosmic_events (user_id, created_at DESC);

-- RLS
ALTER TABLE public.cosmic_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cosmic events are public" ON public.cosmic_events;
CREATE POLICY "Cosmic events are public"
  ON public.cosmic_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can insert cosmic events" ON public.cosmic_events;
CREATE POLICY "Authenticated can insert cosmic events"
  ON public.cosmic_events FOR INSERT TO authenticated WITH CHECK (true);

-- ─── Función para registrar eventos (versión que funciona en producción) ─────
CREATE OR REPLACE FUNCTION public.register_cosmic_event(
  p_user_id uuid,
  p_event_type text,
  p_rarity text,
  p_title text,
  p_description text,
  p_icon text DEFAULT '✨',
  p_metadata jsonb DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_event timestamptz;
  v_event_id uuid;
BEGIN

  SELECT MAX(created_at)
  INTO v_last_event
  FROM public.cosmic_events
  WHERE user_id = p_user_id;

  IF v_last_event IS NOT NULL
     AND v_last_event > now() - interval '10 minutes' THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'cooldown'
    );
  END IF;

  IF p_rarity NOT IN ('epic','legendary','mythic') THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'not_rare_enough'
    );
  END IF;

  INSERT INTO public.cosmic_events
  (user_id, event_type, rarity, title, description, icon, metadata)
  VALUES
  (p_user_id, p_event_type, p_rarity, p_title, p_description, p_icon, p_metadata)
  RETURNING id INTO v_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_event_id
  );

END;
$$;
