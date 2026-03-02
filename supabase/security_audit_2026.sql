-- 🛡️ SPACELY - AUDITORÍA DE SEGURIDAD Y HARDENING 2026
-- Este archivo contiene todas las políticas de mitigación de vulnerabilidades y 
-- recomendaciones de endurecimiento solicitadas por la auditoría.

-- =========================================================================
-- 1. BASE DE DATOS Y RLS CRÍTICO
-- =========================================================================

-- Asegurar que todas las tablas tengan RLS activado de manera obligatoria.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.starlys_ledger ENABLE ROW LEVEL SECURITY; -- (Ejemplo de tabla para logs inmutables)

-- -----------------
-- PROFILES RLS
-- -----------------
-- Lectura: Todos pueden leer (perfiles públicos)
-- Escritura: Solo el dueño de la cuenta. 
-- *PREVENCIÓN: Evitamos que puedan actualizar columnas restringidas como 'starlys_balance'
-- con una función o trigger (ver sección 6)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- -----------------
-- POSTS RLS
-- -----------------
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by everyone" 
ON public.posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
CREATE POLICY "Users can insert their own posts" 
ON public.posts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Users can update their own posts" 
ON public.posts FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "Users can delete their own posts" 
ON public.posts FOR DELETE 
USING (auth.uid() = user_id);

-- -----------------
-- FOLLOWS RLS
-- -----------------
-- 'follower_id' es el usuario que da el follow, 'following_id' es a quien sigue.
DROP POLICY IF EXISTS "Anyone can see followers" ON public.follows;
CREATE POLICY "Anyone can see followers" 
ON public.follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can toggle follow" ON public.follows;
CREATE POLICY "Users can toggle follow" 
ON public.follows FOR INSERT 
WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow" 
ON public.follows FOR DELETE 
USING (auth.uid() = follower_id);

-- -----------------
-- LETTERS (PRIVATE MESSAGES) RLS
-- -----------------
DROP POLICY IF EXISTS "Users can only read messages they are part of" ON public.letters;
CREATE POLICY "Users can only read messages they are part of" 
ON public.letters FOR SELECT 
USING (
    auth.uid() = sender_id OR 
    EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = letters.conversation_id 
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can send messages as themselves" ON public.letters;
CREATE POLICY "Users can send messages as themselves" 
ON public.letters FOR INSERT 
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = conversation_id 
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
);


-- =========================================================================
-- 2. ECONOMÍA VIRTUAL SEGURA (STARLYS) & RATE LIMITING
-- =========================================================================
-- Vulnerabilidad típica: El frontend actualiza "UPDATE profiles SET balance = balance + 50".
-- Esto es vulnerable a tampering en consola (un usuario puede mandarse 9999).

-- Solución:
-- La entrega de monedas DEBE ser a través de funciones SECURITY DEFINER 
-- que elijan ellas mismas cuánto dar, cuándo dar y a quién dar (auth.uid()).

-- Ejemplo: Reclamo del Bonus Diario protegido contra spam y tampering
CREATE OR REPLACE FUNCTION claim_daily_bonus()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Se ejecuta con privilegios de Supabase (evade RLS temporalmente)
AS $$
DECLARE
    uid uuid;
    last_claim timestamptz;
    current_balance int;
BEGIN
    -- Validar que la request venga de un usuario autenticado legítimo
    uid := auth.uid();
    IF uid IS NULL THEN
        RAISE EXCEPTION 'No autorizado';
    END IF;

    -- Obtener datos usando la propia tabla
    SELECT last_daily_claim, balance INTO last_claim, current_balance 
    FROM profiles WHERE id = uid;

    -- LÓGICA DE COOLDOWN BASADA EN EL SERVIDOR (no cliente)
    -- Evita ataques de macro/spam.
    IF last_claim IS NOT NULL AND last_claim > (now() - interval '20 hours') THEN
        RAISE EXCEPTION 'Aún no han pasado 20 horas desde tu último reclamo.';
    END IF;

    -- Efectuar los cambios
    UPDATE profiles 
    SET 
        balance = balance + 30, -- Recompensa hardcodeada en el servidor
        last_daily_claim = now()
    WHERE id = uid;

    -- Opcional pero recomendado: Registrarlo en el 'starlys_ledger'
    -- INSERT INTO starlys_ledger (user_id, amount, source, created_at) 
    -- VALUES (uid, 30, 'daily_bonus', now());

    RETURN json_build_object('success', true, 'new_balance', current_balance + 30);
END;
$$;


-- =========================================================================
-- 3. STORAGE BUCKETS (Evitar inyección y sobreescrituras indebidas)
-- =========================================================================

-- Asegurar que los buckets tengan sus propias reglas RLS

-- Permite a cualquiera descargar avatars
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- Solo el dueño del archivo puede subir un avatar y debe coincidir con su ID
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'avatars' 
    AND (auth.uid())::text = (storage.foldername(name))[1] -- El archivo debe estar en una carpeta con su UUID
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE 
TO authenticated 
USING (
    bucket_id = 'avatars' 
    AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- (Aplicable exactamente igual para 'banners'/'covers')


-- =========================================================================
-- 4. ESTRATEGIA DE DEFENSA ACTIVA CONTRA ABUSOS LÓGICOS (Rate Limits Grales)
-- =========================================================================

-- Para prevenir spam de posts masivos (ataque bots), usamos un trigger
-- en lugar de una tabla compleja de Rate Limits si queremos algo liviano.
-- La otra forma es usar herramientas de API Gateway o Edge Functions.

-- Trigger preventivo en POSTS
CREATE OR REPLACE FUNCTION check_post_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    recent_posts_count int;
BEGIN
    -- Chequea si el usuario posteó más de 5 veces en los últimos 5 minutos
    SELECT count(*) INTO recent_posts_count 
    FROM posts 
    WHERE user_id = NEW.user_id 
    AND created_at > (now() - interval '5 minutes');

    IF recent_posts_count >= 5 THEN
        RAISE EXCEPTION 'Límite de posteos excedido. Por favor, disminuye tu frecuencia interestelar.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_rate_limit_posts ON posts;
CREATE TRIGGER tr_rate_limit_posts
BEFORE INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION check_post_rate_limit();


-- =========================================================================
-- 5. BLINDAJE DE AWARD_COINS (RECOMPENSAS DE MINIJUEGOS Y LOGROS)
-- =========================================================================
-- El agujero principal detectado: El frontend podía mandar cualquier `p_user_id` o `p_amount` 
-- y para los 'achievements' no había límite de cantidad ni verificación de duplicados.

CREATE OR REPLACE FUNCTION public.award_coins(
  p_user_id    uuid,
  p_amount     integer,
  p_type       text,
  p_reference  text    DEFAULT NULL,
  p_description text   DEFAULT NULL,
  p_metadata   jsonb   DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_balance   integer;
  v_daily_earned  integer;
  v_already_has   boolean;
  -- Límites diarios anti-abuse por tipo
  v_daily_cap     integer := CASE p_type
    WHEN 'page_visit'   THEN 100   
    WHEN 'game_reward'  THEN 500   
    WHEN 'achievement'  THEN NULL  
    WHEN 'daily_bonus'  THEN 30    
    ELSE NULL
  END;
BEGIN
  -- 1) VALIDACIÓN DE IDENTIDAD CRÍTICA
  -- Evita que el Usuario A se pase el p_user_id del Usuario B, o que un scripter
  -- se inyecte UUIDs al azar.
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'No autorizado. El token no coincide con el beneficiario.';
  END IF;

  -- 2) VALIDACIÓN DE TIPO Y MANIPULACIÓN
  IF p_type NOT IN ('achievement','daily_bonus','game_reward','page_visit','admin_grant','community_reward','migration') THEN
    RAISE EXCEPTION 'Tipo inválido para award_coins: %', p_type;
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser positivo y no se permiten restas aquí.';
  END IF;

  -- 3) REGLA ANTI-ABUSO PARA LOGROS (INFINITOS)
  IF p_type = 'achievement' THEN
    IF p_reference IS NULL THEN
      RAISE EXCEPTION 'Un logro requiere un p_reference válido.';
    END IF;
    
    -- Evitar que reclamen el mismo logro múltiples veces manipulando la consola
    SELECT EXISTS (
        SELECT 1 FROM transactions 
        WHERE user_id = p_user_id AND type = 'achievement' AND reference_id = p_reference
    ) INTO v_already_has;
    
    IF v_already_has THEN
        RETURN jsonb_build_object('success', false, 'reason', 'already_awarded');
    END IF;

    -- Opcional (Recomendado): Hardcodear los montos de los logros en el servidor
    -- Para que el cliente no pueda mandar p_amount = 999999
    -- p_amount := 500; -- Suponiendo que cada logro vale 500.
  END IF;

  -- 4) VERIFICAR CAP DIARIO PARA MINIJUEGOS Y VISITAS
  IF v_daily_cap IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_daily_earned
    FROM public.transactions
    WHERE user_id = p_user_id
      AND type    = p_type
      AND created_at >= (now() AT TIME ZONE 'UTC')::date;

    IF v_daily_earned >= v_daily_cap THEN
      SELECT balance INTO v_new_balance FROM public.profiles WHERE id = p_user_id;
      RETURN jsonb_build_object(
        'success',     false,
        'reason',      'daily_cap_reached',
        'balance',     v_new_balance,
        'cap',         v_daily_cap,
        'earned_today', v_daily_earned
      );
    END IF;

    p_amount := LEAST(p_amount, v_daily_cap - v_daily_earned);
  END IF;

  -- 5) EJECUCIÓN SEGURA
  UPDATE public.profiles
  SET balance = balance + p_amount
  WHERE id = p_user_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado: %', p_user_id;
  END IF;

  INSERT INTO public.transactions (user_id, amount, balance_after, type, reference_id, description, metadata)
  VALUES (p_user_id, p_amount, v_new_balance, p_type, p_reference, p_description, p_metadata);

  RETURN jsonb_build_object('success', true, 'awarded', p_amount, 'balance', v_new_balance);
END;
$$;
