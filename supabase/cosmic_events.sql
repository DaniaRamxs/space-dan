-- ============================================================
-- COSMIC EVENTS — Eventos del sistema para el Feed Global
-- Solo eventos épicos, legendarios y míticos se registran.
-- Anti-spam: máximo 1 evento por usuario cada 10 minutos.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cosmic_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type   text        NOT NULL CHECK (event_type IN (
                  'chest_open',      -- Apertura de cofre con resultado épico+
                  'rare_character',  -- Personaje raro/legendario descubierto
                  'frame_unlock',    -- Marco de avatar desbloqueado
                  'cosmetic_rare',   -- Cosmético raro obtenido
                  'collection_complete', -- Colección completada
                  'community'        -- Evento comunitario importante
               )),
  rarity       text        NOT NULL DEFAULT 'epic' CHECK (rarity IN ('epic', 'legendary', 'mythic')),
  title        text        NOT NULL,           -- "Dan abrió un Cofre Magnate"
  description  text        NOT NULL,           -- "y obtuvo a Gojo (Legendario)"
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

-- ─── Función para registrar un evento (con anti-spam) ───────────────────────
CREATE OR REPLACE FUNCTION public.register_cosmic_event(
  p_user_id    uuid,
  p_event_type text,
  p_rarity     text,
  p_title      text,
  p_description text,
  p_icon       text    DEFAULT '✨',
  p_metadata   jsonb   DEFAULT '{}'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_last_event timestamptz;
  v_event_id   uuid;
BEGIN
  -- Anti-spam: Solo permitir 1 evento por usuario cada 10 minutos
  SELECT MAX(ce.created_at) INTO v_last_event
  FROM public.cosmic_events ce
  WHERE ce.user_id = p_user_id;

  IF v_last_event IS NOT NULL AND v_last_event > now() - interval '10 minutes' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'cooldown');
  END IF;

  -- Solo registrar eventos épicos, legendarios o míticos
  IF p_rarity NOT IN ('epic', 'legendary', 'mythic') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_rare_enough');
  END IF;

  INSERT INTO public.cosmic_events (user_id, event_type, rarity, title, description, icon, metadata)
  VALUES (p_user_id, p_event_type, p_rarity, p_title, p_description, p_icon, p_metadata)
  RETURNING id INTO v_event_id;

  RETURN jsonb_build_object('success', true, 'event_id', v_event_id);
END;
$$;

-- ─── Función para el feed mezclado (posts + eventos) ───────────────────────
DROP FUNCTION IF EXISTS public.get_global_feed_mixed(integer, integer);
CREATE OR REPLACE FUNCTION public.get_global_feed_mixed(
  p_limit  integer DEFAULT 30,
  p_offset integer DEFAULT 0
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(item ORDER BY (item->>'created_at') DESC)
  INTO v_result
  FROM (
    -- Posts normales (envueltos en subquery para permitir ORDER BY + LIMIT)
    SELECT item FROM (
      SELECT jsonb_build_object(
        'id',         p.id,
        'kind',       'post',
        'created_at', p.created_at,
        'author_id',  p.author_id,
        'content',    p.content,
        'category',   p.category,
        'type',       p.type,
        'metadata',   p.metadata,
        'author', jsonb_build_object(
          'id',         u.id,
          'username',   u.username,
          'avatar_url', u.avatar_url,
          'equipped_nickname_style', u.equipped_nickname_style
        )
      ) AS item
      FROM public.activity_posts p
      JOIN public.profiles u ON u.id = p.author_id
      WHERE p.type = 'post'
      ORDER BY p.created_at DESC
      LIMIT p_limit
    ) posts_sub

    UNION ALL

    -- Eventos cósmicos (últimas 24h solamente)
    SELECT item FROM (
      SELECT jsonb_build_object(
        'id',           e.id,
        'kind',         'cosmic_event',
        'created_at',   e.created_at,
        'event_type',   e.event_type,
        'rarity',       e.rarity,
        'title',        e.title,
        'description',  e.description,
        'icon',         e.icon,
        'metadata',     e.metadata,
        'author', jsonb_build_object(
          'id',         u.id,
          'username',   u.username,
          'avatar_url', u.avatar_url,
          'equipped_nickname_style', u.equipped_nickname_style
        )
      ) AS item
      FROM public.cosmic_events e
      JOIN public.profiles u ON u.id = e.user_id
      WHERE e.created_at > now() - interval '24 hours'
      ORDER BY e.created_at DESC
      LIMIT 20
    ) events_sub
  ) combined
  LIMIT p_limit
  OFFSET p_offset;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
