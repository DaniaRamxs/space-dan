-- ============================================================
-- identity_system.sql :: Professional Identity Architecture (Refactored)
-- ============================================================

-- 1. CLEANUP OLD LOGIC (IF EXISTS)
-- Eliminamos los triggers conflictivos (Schema V1 y Identity V2)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_v2 ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. CORE TABLES & ALTERATIONS
-- Asegurar que la tabla existe
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text,
    avatar_url text,
    bio text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Añadir columnas y constraints de identidad si no existen
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='username_normalized') THEN
        ALTER TABLE public.profiles ADD COLUMN username_normalized text UNIQUE;
        ALTER TABLE public.profiles ADD CONSTRAINT username_normalized_regex CHECK (username_normalized ~* '^[a-z0-9_]+$');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='username_changed_at') THEN
        ALTER TABLE public.profiles ADD COLUMN username_changed_at timestamptz;
    END IF;

    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS username_length;
    ALTER TABLE public.profiles ADD CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 20);
END $$;

-- Mapeo de proveedores OAuth
CREATE TABLE IF NOT EXISTS public.user_providers (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider          text NOT NULL,
    provider_user_id  text NOT NULL,
    created_at        timestamptz DEFAULT now(),
    UNIQUE(provider, provider_user_id)
);

-- Historial de nombres
CREATE TABLE IF NOT EXISTS public.username_history (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    old_username text,
    new_username text NOT NULL,
    changed_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username_normalized ON public.profiles (username_normalized);

-- 3. UNIFIED FLOW FOR NEW USERS (Triggers)

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_provider text;
    v_provider_id text;
    v_avatar text;
BEGIN
    -- Capturar avatar del proveedor
    v_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'avatar',
        '/default-avatar.png'
    );

    -- Insertar perfil inicial SIN username (esto forzará el onboarding)
    -- On conflict update para sincronizar avatar si el perfil ya existía por algún motivo
    INSERT INTO public.profiles (id, username, avatar_url)
    VALUES (
        NEW.id,
        NULL, -- IMPORTANTE: NULL para disparar /onboarding en el frontend
        v_avatar
    )
    ON CONFLICT (id) DO UPDATE SET
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        updated_at = now();

    -- Guardar proveedor inicial
    v_provider := NEW.raw_app_meta_data->>'provider';
    v_provider_id := NEW.raw_user_meta_data->>'sub';

    IF v_provider IS NOT NULL AND v_provider_id IS NOT NULL THEN
        INSERT INTO public.user_providers (user_id, provider, provider_user_id)
        VALUES (NEW.id, v_provider, v_provider_id)
        ON CONFLICT (provider, provider_user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_unified ON auth.users;
CREATE TRIGGER on_auth_user_created_unified
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- 4. BUSINESS LOGIC: USERNAME MANAGEMENT

-- Función para establecer o cambiar el username (Atomic & Secure)
CREATE OR REPLACE FUNCTION public.claim_username(p_username text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_normalized text;
    v_last_change timestamptz;
    v_cooldown_days int := 30;
    v_old_username text;
BEGIN
    -- 1. Autenticación básica
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'No autorizado';
    END IF;

    -- 2. Validación de formato
    p_username := trim(p_username);
    v_normalized := lower(p_username);

    IF v_normalized !~ '^[a-z0-9_]{3,20}$' THEN
        RAISE EXCEPTION 'Formato de username inválido. Use 3-20 caracteres alfanuméricos o underscore.';
    END IF;

    -- 3. Verificación de cooldown
    SELECT username_changed_at, username INTO v_last_change, v_old_username
    FROM public.profiles WHERE id = auth.uid();

    IF v_last_change IS NOT NULL AND v_last_change > (now() - (v_cooldown_days || ' days')::interval) THEN
        RAISE EXCEPTION 'Debes esperar % días entre cambios de username. Próximo cambio disponible en %.', 
            v_cooldown_days, (v_last_change + (v_cooldown_days || ' days')::interval);
    END IF;

    -- 4. Verificación de disponibilidad (Race condition prevention by Unique Constraint)
    BEGIN
        -- Actualizar perfil
        UPDATE public.profiles
        SET 
            username = p_username,
            username_normalized = v_normalized,
            username_changed_at = now(),
            updated_at = now()
        WHERE id = auth.uid();

        -- Guardar en historial
        INSERT INTO public.username_history (user_id, old_username, new_username)
        VALUES (auth.uid(), v_old_username, p_username);

        RETURN jsonb_build_object(
            'success', true,
            'username', p_username,
            'message', 'Username reclamado con éxito'
        );
    EXCEPTION WHEN unique_violation THEN
        RAISE EXCEPTION 'El username "%" ya está en uso.', p_username;
    END;
END;
$$;


-- 5. ROW LEVEL SECURITY (RLS)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.username_history ENABLE ROW LEVEL SECURITY;

-- Profiles: Lectura pública, escritura privada
DROP POLICY IF EXISTS "Profiles: Read access is public" ON public.profiles;
CREATE POLICY "Profiles: Read access is public" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Profiles: Users can update their own profile" ON public.profiles;
CREATE POLICY "Profiles: Users can update their own profile" ON public.profiles 
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- User Providers: Solo el dueño puede ver su vinculación
DROP POLICY IF EXISTS "Providers: Users can see their own links" ON public.user_providers;
CREATE POLICY "Providers: Users can see their own links" ON public.user_providers
    FOR SELECT USING (auth.uid() = user_id);

-- Username History: Solo el dueño puede ver su rastro
DROP POLICY IF EXISTS "History: Users can see their own history" ON public.username_history;
CREATE POLICY "History: Users can see their own history" ON public.username_history
    FOR SELECT USING (auth.uid() = user_id);


-- 6. AUDIT TRIGGER FOR UPDATED_AT
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
