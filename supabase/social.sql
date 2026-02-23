-- ============================================================
-- space-dan :: Social Layer
-- Cartas en Órbita · Cofre Privado · Salas Privadas
-- Actividad Discreta · Logros Sociales
-- ============================================================
-- Ejecutar DESPUÉS de economy.sql
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- SECCIÓN 1: ACTIVIDAD DISCRETA
-- Extiende profiles con last_seen para estados suaves
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at  timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS show_activity boolean     NOT NULL DEFAULT true;

-- Actualizar last_seen (llamar en acciones significativas del frontend)
CREATE OR REPLACE FUNCTION public.ping_activity()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.profiles
  SET last_seen_at = now()
  WHERE id = auth.uid();
$$;

-- Devuelve etiqueta discreta sin exponer la hora exacta
CREATE OR REPLACE FUNCTION public.get_activity_label(
  p_last_seen    timestamptz,
  p_show_activity boolean
)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN NOT p_show_activity OR p_last_seen IS NULL THEN NULL
    WHEN p_last_seen > now() - interval  '2 hours' THEN 'En órbita recientemente'
    WHEN p_last_seen > now() - interval '24 hours' THEN 'Activo hoy'
    WHEN p_last_seen > now() - interval  '7 days'  THEN 'En órbita esta semana'
    ELSE NULL
  END;
$$;


-- ────────────────────────────────────────────────────────────
-- SECCIÓN 2: BLOCKLIST
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.blocklist (
  blocker_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocklist_blocker ON public.blocklist (blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocklist_blocked ON public.blocklist (blocked_id);

-- ¿Pueden interactuar estos dos usuarios? (ninguno bloqueó al otro)
CREATE OR REPLACE FUNCTION public.users_can_interact(p_user_a uuid, p_user_b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.blocklist
    WHERE (blocker_id = p_user_a AND blocked_id = p_user_b)
       OR (blocker_id = p_user_b AND blocked_id = p_user_a)
  );
$$;


-- ────────────────────────────────────────────────────────────
-- SECCIÓN 3: REPORTES DE ABUSO
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reports (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  letter_id   uuid        DEFAULT NULL,   -- FK se añade tras crear letters
  reason      text        NOT NULL CHECK (reason IN ('spam','harassment','inappropriate','other')),
  details     text        CHECK (char_length(details) <= 500),
  status      text        NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','reviewed','resolved')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_report CHECK (reporter_id != reported_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_reported ON public.reports (reported_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_pending  ON public.reports (status) WHERE status = 'pending';


-- ────────────────────────────────────────────────────────────
-- SECCIÓN 4: CONVERSACIONES (Cartas en Órbita)
-- Orden canónico (user_a < user_b) garantiza sin duplicados
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conversations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a          uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b          uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_letter_at  timestamptz DEFAULT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT canonical_order     CHECK (user_a < user_b),
  CONSTRAINT no_self_conversation CHECK (user_a != user_b),
  UNIQUE (user_a, user_b)
);

CREATE INDEX IF NOT EXISTS idx_conv_user_a ON public.conversations (user_a, last_letter_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_user_b ON public.conversations (user_b, last_letter_at DESC);


-- ────────────────────────────────────────────────────────────
-- SECCIÓN 5: CARTAS (Mensajes asíncronos tipo carta)
-- is_read / read_at son INTERNOS — se ocultan al remitente
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.letters (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     uuid        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id           uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content             text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  -- Internos: nunca expuestos al remitente en get_letters()
  is_read             boolean     NOT NULL DEFAULT false,
  read_at             timestamptz DEFAULT NULL,
  -- Soft-delete por participante (ninguno ve la carta del otro si la borró)
  deleted_by_sender   boolean     NOT NULL DEFAULT false,
  deleted_by_receiver boolean     NOT NULL DEFAULT false,
  sent_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_letters_conv   ON public.letters (conversation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_letters_sender ON public.letters (sender_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_letters_unread ON public.letters (conversation_id) WHERE NOT is_read;

-- FK reports → letters (ahora que letters existe)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_report_letter'
  ) THEN
    ALTER TABLE public.reports
      ADD CONSTRAINT fk_report_letter
        FOREIGN KEY (letter_id) REFERENCES public.letters(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- SECCIÓN 6: ESTRELLAS DE CARTAS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.letter_stars (
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  letter_id  uuid        NOT NULL REFERENCES public.letters(id)  ON DELETE CASCADE,
  starred_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, letter_id)
);

CREATE INDEX IF NOT EXISTS idx_stars_user ON public.letter_stars (user_id, starred_at DESC);


-- ────────────────────────────────────────────────────────────
-- SECCIÓN 7: RATE LIMITING (anti-spam, ventana por minuto)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.letter_rate_limits (
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  count        integer     NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, window_start)
);


-- ────────────────────────────────────────────────────────────
-- SECCIÓN 8: FUNCIÓN send_letter
-- Valida bloqueos, rate limit, crea/reutiliza conversación
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.send_letter(p_to_user_id uuid, p_content text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_from_id    uuid    := auth.uid();
  v_conv_id    uuid;
  v_letter_id  uuid;
  v_rate_count integer;
  v_day_count  bigint;
  v_window     timestamptz := date_trunc('minute', now());
BEGIN
  -- Autenticación y validaciones básicas
  IF v_from_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF p_to_user_id = v_from_id THEN
    RAISE EXCEPTION 'No puedes enviarte cartas a ti mismo';
  END IF;
  IF char_length(p_content) < 1 OR char_length(p_content) > 2000 THEN
    RAISE EXCEPTION 'La carta debe tener entre 1 y 2000 caracteres';
  END IF;

  -- Verificar bloqueo bilateral
  IF NOT public.users_can_interact(v_from_id, p_to_user_id) THEN
    RAISE EXCEPTION 'No puedes enviar una carta a este usuario';
  END IF;

  -- Rate limit por minuto (máx 10 cartas/minuto)
  INSERT INTO public.letter_rate_limits (user_id, window_start, count)
  VALUES (v_from_id, v_window, 1)
  ON CONFLICT (user_id, window_start) DO UPDATE
    SET count = letter_rate_limits.count + 1
  RETURNING count INTO v_rate_count;

  IF v_rate_count > 10 THEN
    RAISE EXCEPTION 'Demasiadas cartas en poco tiempo. Espera un momento.';
  END IF;

  -- Rate limit diario (máx 50 cartas/día)
  SELECT COUNT(*) INTO v_day_count
  FROM public.letters l
  JOIN public.conversations c ON c.id = l.conversation_id
  WHERE l.sender_id = v_from_id
    AND l.sent_at  >= current_date::timestamptz;

  IF v_day_count >= 50 THEN
    RAISE EXCEPTION 'Límite diario de 50 cartas alcanzado';
  END IF;

  -- Obtener o crear conversación (LEAST/GREATEST para orden canónico)
  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE user_a = LEAST(v_from_id, p_to_user_id)
    AND user_b = GREATEST(v_from_id, p_to_user_id);

  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations (user_a, user_b)
    VALUES (LEAST(v_from_id, p_to_user_id), GREATEST(v_from_id, p_to_user_id))
    RETURNING id INTO v_conv_id;
  END IF;

  -- Insertar carta
  INSERT INTO public.letters (conversation_id, sender_id, content)
  VALUES (v_conv_id, v_from_id, p_content)
  RETURNING id INTO v_letter_id;

  -- Actualizar timestamp de actividad de la conversación
  UPDATE public.conversations SET last_letter_at = now() WHERE id = v_conv_id;

  -- Ping actividad del remitente
  UPDATE public.profiles SET last_seen_at = now() WHERE id = v_from_id;

  -- Notificación al destinatario (falla silenciosamente si no existe la función)
  BEGIN
    PERFORM public.create_notification(
      p_to_user_id, 'letter', 'Tienes una nueva carta en órbita ✉️'
    );
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  -- Comprobar logros sociales (falla silenciosamente)
  BEGIN
    PERFORM public.check_social_achievement('letter_sent');
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success',    true,
    'letter_id',  v_letter_id,
    'conv_id',    v_conv_id
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- SECCIÓN 9: FUNCIÓN get_my_conversations
-- Devuelve lista de conversaciones con snippet y no-leídas
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_conversations()
RETURNS TABLE (
  conv_id        uuid,
  other_user_id  uuid,
  other_username text,
  other_avatar   text,
  last_letter_at timestamptz,
  unread_count   bigint,
  last_snippet   text
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    c.id                                                          AS conv_id,
    CASE WHEN c.user_a = auth.uid() THEN c.user_b ELSE c.user_a END AS other_user_id,
    p.username,
    p.avatar_url,
    c.last_letter_at,
    (
      SELECT COUNT(*)
      FROM public.letters l
      WHERE l.conversation_id = c.id
        AND l.sender_id != auth.uid()
        AND NOT l.is_read
        AND NOT l.deleted_by_receiver
    )                                                             AS unread_count,
    (
      SELECT LEFT(l.content, 80)
      FROM public.letters l
      WHERE l.conversation_id = c.id
      ORDER BY l.sent_at DESC
      LIMIT 1
    )                                                             AS last_snippet
  FROM public.conversations c
  JOIN public.profiles p
    ON p.id = CASE WHEN c.user_a = auth.uid() THEN c.user_b ELSE c.user_a END
  WHERE c.user_a = auth.uid() OR c.user_b = auth.uid()
  ORDER BY c.last_letter_at DESC NULLS LAST;
$$;


-- ────────────────────────────────────────────────────────────
-- SECCIÓN 10: FUNCIÓN get_letters
-- Oculta is_read al remitente (nunca sabe si fue leída)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_letters(p_conv_id uuid)
RETURNS TABLE (
  id         uuid,
  sender_id  uuid,
  content    text,
  sent_at    timestamptz,
  is_mine    boolean,
  is_read    boolean,     -- NULL si eres el remitente
  is_starred boolean
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    l.id,
    l.sender_id,
    l.content,
    l.sent_at,
    l.sender_id = auth.uid()                                             AS is_mine,
    CASE WHEN l.sender_id = auth.uid() THEN NULL ELSE l.is_read END     AS is_read,
    (SELECT true FROM public.letter_stars ls
     WHERE ls.user_id = auth.uid() AND ls.letter_id = l.id)             AS is_starred
  FROM public.letters l
  WHERE l.conversation_id = p_conv_id
    -- Solo participantes de la conversación
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = p_conv_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
    -- Soft-delete: cada uno ve solo las que no borró
    AND CASE
      WHEN l.sender_id = auth.uid() THEN NOT l.deleted_by_sender
      ELSE NOT l.deleted_by_receiver
    END
  ORDER BY l.sent_at ASC;
$$;


-- ────────────────────────────────────────────────────────────
-- SECCIÓN 11: FUNCIÓN mark_letter_read (solo el receptor)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.mark_letter_read(p_letter_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.letters
  SET    is_read = true, read_at = now()
  WHERE  id = p_letter_id
    AND  NOT is_read
    AND  sender_id != auth.uid()   -- solo el receptor puede marcar
    AND  EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.letters l2 ON l2.id = p_letter_id AND l2.conversation_id = c.id
      WHERE c.user_a = auth.uid() OR c.user_b = auth.uid()
    );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- SECCIÓN 12: COFRE PRIVADO
-- Notas personales e ítems guardados (solo visible al propietario)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vault_notes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      text        CHECK (char_length(title) <= 100),
  content    text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  label      text        CHECK (label IN ('personal','idea','recuerdo','inspiración') OR label IS NULL),
  pinned     boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vault_notes_user ON public.vault_notes (user_id, updated_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS vault_notes_updated_at ON public.vault_notes;
CREATE TRIGGER vault_notes_updated_at
  BEFORE UPDATE ON public.vault_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Colección de ítems guardados: cartas con estrella + notas
CREATE TABLE IF NOT EXISTS public.vault_items (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  item_type  text        NOT NULL CHECK (item_type IN ('letter','note')),
  letter_id  uuid        REFERENCES public.letters(id)     ON DELETE CASCADE,
  note_id    uuid        REFERENCES public.vault_notes(id) ON DELETE CASCADE,
  pinned     boolean     NOT NULL DEFAULT false,
  saved_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_ref_only CHECK (
    (item_type = 'letter' AND letter_id IS NOT NULL AND note_id IS NULL) OR
    (item_type = 'note'   AND note_id  IS NOT NULL AND letter_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_vault_items_user ON public.vault_items (user_id, saved_at DESC);


-- ────────────────────────────────────────────────────────────
-- SECCIÓN 13: SALAS PRIVADAS TEMPORALES
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.private_rooms (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','active','expired','declined')),
  duration_min integer     NOT NULL DEFAULT 60 CHECK (duration_min BETWEEN 15 AND 480),
  expires_at   timestamptz NOT NULL,
  is_ephemeral boolean     NOT NULL DEFAULT true,   -- borrar mensajes al expirar
  purpose      text        CHECK (purpose IN ('focus','chat','game','other') OR purpose IS NULL),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_room CHECK (creator_id != invited_id)
);

CREATE INDEX IF NOT EXISTS idx_rooms_creator ON public.private_rooms (creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rooms_invited ON public.private_rooms (invited_id, status);
CREATE INDEX IF NOT EXISTS idx_rooms_active  ON public.private_rooms (expires_at) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.room_messages (
  id       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id  uuid        NOT NULL REFERENCES public.private_rooms(id) ON DELETE CASCADE,
  user_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content  text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  sent_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_msgs_room ON public.room_messages (room_id, sent_at DESC);


-- ────────────────────────────────────────────────────────────
-- SECCIÓN 14: FUNCIONES DE SALAS
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_private_room(
  p_invited_id  uuid,
  p_duration    integer DEFAULT 60,
  p_ephemeral   boolean DEFAULT true,
  p_purpose     text    DEFAULT 'chat'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_creator uuid := auth.uid();
  v_room_id uuid;
BEGIN
  IF v_creator IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF p_invited_id = v_creator THEN RAISE EXCEPTION 'No puedes invitarte a ti mismo'; END IF;
  IF p_duration NOT BETWEEN 15 AND 480 THEN RAISE EXCEPTION 'Duración inválida (15-480 min)'; END IF;

  IF NOT public.users_can_interact(v_creator, p_invited_id) THEN
    RAISE EXCEPTION 'No puedes crear una sala con este usuario';
  END IF;

  INSERT INTO public.private_rooms
    (creator_id, invited_id, duration_min, expires_at, is_ephemeral, purpose)
  VALUES
    (v_creator, p_invited_id, p_duration,
     now() + (p_duration || ' minutes')::interval,
     p_ephemeral, p_purpose)
  RETURNING id INTO v_room_id;

  BEGIN
    PERFORM public.create_notification(p_invited_id, 'room_invite',
      'Te invitaron a una sala privada 🚪');
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  RETURN jsonb_build_object('success', true, 'room_id', v_room_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_room_invite(p_room_id uuid, p_accept boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.private_rooms
  SET    status = CASE WHEN p_accept THEN 'active' ELSE 'declined' END
  WHERE  id        = p_room_id
    AND  invited_id = auth.uid()
    AND  status    = 'pending'
    AND  expires_at > now();

  IF NOT FOUND THEN RAISE EXCEPTION 'Sala no encontrada o ya procesada'; END IF;

  RETURN jsonb_build_object('success', true, 'accepted', p_accept);
END;
$$;

CREATE OR REPLACE FUNCTION public.send_room_message(p_room_id uuid, p_content text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user   uuid := auth.uid();
  v_msg_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.private_rooms
    WHERE  id        = p_room_id
      AND  status    = 'active'
      AND  expires_at > now()
      AND  (creator_id = v_user OR invited_id = v_user)
  ) THEN
    RAISE EXCEPTION 'Sala no disponible o expirada';
  END IF;

  INSERT INTO public.room_messages (room_id, user_id, content)
  VALUES (p_room_id, v_user, p_content)
  RETURNING id INTO v_msg_id;

  RETURN jsonb_build_object('success', true, 'msg_id', v_msg_id);
END;
$$;

-- Expirar salas y limpiar mensajes efímeros
-- Llamar periódicamente con pg_cron o Supabase Edge Function (cron)
CREATE OR REPLACE FUNCTION public.expire_rooms()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_expired integer;
BEGIN
  UPDATE public.private_rooms SET status = 'expired'
  WHERE  status = 'active' AND expires_at <= now();
  GET DIAGNOSTICS v_expired = ROW_COUNT;

  -- Borrar mensajes efímeros de salas ya expiradas (con 5 min de gracia)
  DELETE FROM public.room_messages
  WHERE room_id IN (
    SELECT id FROM public.private_rooms
    WHERE  status = 'expired'
      AND  is_ephemeral = true
      AND  expires_at <= now() - interval '5 minutes'
  );

  -- Limpiar rate limits viejos
  DELETE FROM public.letter_rate_limits
  WHERE window_start < now() - interval '1 hour';

  RETURN v_expired;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- SECCIÓN 15: LOGROS SOCIALES
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.social_achievements (
  id          text        PRIMARY KEY,
  title       text        NOT NULL,
  description text        NOT NULL,
  icon        text        NOT NULL,
  trigger_on  text        NOT NULL,  -- evento que lo activa
  threshold   integer     NOT NULL DEFAULT 1,
  coins       integer     NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_social_achievements (
  user_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id text        NOT NULL REFERENCES public.social_achievements(id),
  unlocked_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_social_ach_user
  ON public.user_social_achievements (user_id, unlocked_at DESC);

-- Seed de logros iniciales
INSERT INTO public.social_achievements
  (id, title, description, icon, trigger_on, threshold, coins)
VALUES
  ('first_letter',    'Primera Carta',       'Enviaste tu primera carta en órbita',        '✉️',  'letter_sent',  1,  10),
  ('letters_10',      'Corresponsal',        '10 cartas intercambiadas',                   '📬',  'letter_sent',  10, 25),
  ('letters_50',      'Escritor Orbital',    '50 cartas en órbita',                        '🖊️',  'letter_sent',  50, 50),
  ('first_star',      'Primera Estrella',    'Guardaste tu primera carta con estrella',    '⭐',  'star_saved',   1,  10),
  ('vault_5',         'Guardián del Cofre',  '5 ítems guardados en el cofre',              '🔒',  'vault_saved',  5,  15),
  ('first_room',      'Primera Sala',        'Creaste tu primera sala privada',            '🚪',  'room_created', 1,  15),
  ('rooms_3',         'Anfitrión Espacial',  '3 salas privadas creadas',                   '🪐',  'room_created', 3,  30),
  ('first_note',      'Pensamiento Propio',  'Escribiste tu primera nota en el cofre',     '📓',  'note_created', 1,  10),
  ('vault_letter',    'Tesoro Guardado',     'Guardaste una carta en tu cofre',            '💌',  'vault_letter', 1,  10),
  ('focus_room',      'En Sintonía',         'Sala de focus compartida completada',        '🎯',  'focus_room',   1,  20),
  ('focus_rooms_3',   'Ritmo Orbital',       '3 sesiones de focus compartidas',            '🌀',  'focus_room',   3,  40)
ON CONFLICT (id) DO NOTHING;

-- Función de desbloqueo automático (llamar desde send_letter, etc.)
CREATE OR REPLACE FUNCTION public.check_social_achievement(p_trigger text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user  uuid := auth.uid();
  v_count bigint;
  rec     RECORD;
BEGIN
  FOR rec IN
    SELECT sa.*
    FROM public.social_achievements sa
    WHERE sa.trigger_on = p_trigger
      AND sa.is_active  = true
      AND NOT EXISTS (
        SELECT 1 FROM public.user_social_achievements usa
        WHERE usa.user_id = v_user AND usa.achievement_id = sa.id
      )
  LOOP
    v_count := CASE rec.trigger_on
      WHEN 'letter_sent'  THEN (
        SELECT COUNT(*) FROM public.letters l
        JOIN public.conversations c ON c.id = l.conversation_id
        WHERE l.sender_id = v_user)
      WHEN 'star_saved'   THEN (SELECT COUNT(*) FROM public.letter_stars  WHERE user_id = v_user)
      WHEN 'vault_saved'  THEN (SELECT COUNT(*) FROM public.vault_items   WHERE user_id = v_user)
      WHEN 'vault_letter' THEN (SELECT COUNT(*) FROM public.vault_items   WHERE user_id = v_user AND item_type = 'letter')
      WHEN 'room_created' THEN (SELECT COUNT(*) FROM public.private_rooms WHERE creator_id = v_user)
      WHEN 'note_created' THEN (SELECT COUNT(*) FROM public.vault_notes   WHERE user_id = v_user)
      WHEN 'focus_room'   THEN (
        SELECT COUNT(*) FROM public.private_rooms
        WHERE (creator_id = v_user OR invited_id = v_user)
          AND status  = 'expired'
          AND purpose = 'focus')
      ELSE 0
    END;

    IF v_count >= rec.threshold THEN
      INSERT INTO public.user_social_achievements (user_id, achievement_id)
      VALUES (v_user, rec.id)
      ON CONFLICT DO NOTHING;

      IF rec.coins > 0 THEN
        BEGIN
          PERFORM public.award_coins(v_user, rec.coins, 'achievement', rec.id, rec.title);
        EXCEPTION WHEN undefined_function THEN NULL;
        END;
      END IF;
    END IF;
  END LOOP;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- SECCIÓN 16: ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.blocklist                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letters                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letter_stars             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letter_rate_limits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_notes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_rooms            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_achievements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_social_achievements ENABLE ROW LEVEL SECURITY;

-- BLOCKLIST: solo el que bloqueó gestiona su lista
DROP POLICY IF EXISTS "blocklist_owner" ON public.blocklist;
CREATE POLICY "blocklist_owner" ON public.blocklist
  FOR ALL USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);

-- REPORTS: solo el reportador puede insertar/ver su reporte
DROP POLICY IF EXISTS "reports_insert" ON public.reports;
CREATE POLICY "reports_insert" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_own_read" ON public.reports;
CREATE POLICY "reports_own_read" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- CONVERSATIONS: solo participantes (INSERT vía send_letter SECURITY DEFINER)
DROP POLICY IF EXISTS "conversations_participants" ON public.conversations;
CREATE POLICY "conversations_participants" ON public.conversations
  FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

-- LETTERS: solo participantes de la conversación; INSERT vía send_letter
DROP POLICY IF EXISTS "letters_participants" ON public.letters;
CREATE POLICY "letters_participants" ON public.letters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE  c.id = conversation_id
        AND  (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

-- LETTER_STARS: propietario total
DROP POLICY IF EXISTS "stars_owner" ON public.letter_stars;
CREATE POLICY "stars_owner" ON public.letter_stars
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RATE LIMITS: nunca directo desde el frontend
DROP POLICY IF EXISTS "rate_limits_deny" ON public.letter_rate_limits;
CREATE POLICY "rate_limits_deny" ON public.letter_rate_limits
  FOR ALL USING (false);

-- VAULT_NOTES: solo el propietario
DROP POLICY IF EXISTS "vault_notes_owner" ON public.vault_notes;
CREATE POLICY "vault_notes_owner" ON public.vault_notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- VAULT_ITEMS: solo el propietario
DROP POLICY IF EXISTS "vault_items_owner" ON public.vault_items;
CREATE POLICY "vault_items_owner" ON public.vault_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PRIVATE_ROOMS: solo participantes; INSERT vía create_private_room
DROP POLICY IF EXISTS "rooms_participants" ON public.private_rooms;
CREATE POLICY "rooms_participants" ON public.private_rooms
  FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = invited_id);

-- ROOM_MESSAGES: participantes de sala activa y no expirada
DROP POLICY IF EXISTS "room_msgs_participants" ON public.room_messages;
CREATE POLICY "room_msgs_participants" ON public.room_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.private_rooms r
      WHERE  r.id = room_id
        AND  (r.creator_id = auth.uid() OR r.invited_id = auth.uid())
        AND  r.status    = 'active'
        AND  r.expires_at > now()
    )
  );

-- SOCIAL_ACHIEVEMENTS: solo lectura pública de definiciones activas
DROP POLICY IF EXISTS "social_ach_public_read" ON public.social_achievements;
CREATE POLICY "social_ach_public_read" ON public.social_achievements
  FOR SELECT USING (is_active = true);

-- USER_SOCIAL_ACHIEVEMENTS: lectura pública, escritura solo vía funciones
DROP POLICY IF EXISTS "user_social_ach_read" ON public.user_social_achievements;
CREATE POLICY "user_social_ach_read" ON public.user_social_achievements
  FOR SELECT USING (true);


-- ────────────────────────────────────────────────────────────
-- SECCIÓN 17: REALTIME (habilitar en dashboard de Supabase)
-- ────────────────────────────────────────────────────────────
-- En el Dashboard de Supabase > Database > Replication:
-- Habilitar Realtime para:
--   room_messages   → salas privadas en tiempo real
--   conversations   → actualizar badge de no-leídas (opcional)
-- NO habilitar Realtime para:
--   letters         → son cartas asíncronas, no chat en tiempo real
--   vault_*         → privado puro, sin necesidad de Realtime
--   letter_rate_limits, blocklist, reports → nunca
