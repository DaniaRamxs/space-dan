-- TABLA DE REACTORES DE SALA DE VOZ (COOPERATIVO)
CREATE TABLE IF NOT EXISTS public.voice_room_reactors (
    room_name TEXT PRIMARY KEY,
    energy INT DEFAULT 0,
    level INT DEFAULT 1,
    target INT DEFAULT 1000,
    bonus_expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Comentario descriptivo
COMMENT ON TABLE public.voice_room_reactors IS 'Almacena el estado de los reactores de energía colectiva en las salas de voz.';

-- Habilitar RLS
ALTER TABLE public.voice_room_reactors ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas previas por si ya existen para evitar el error 42710
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.voice_room_reactors;
DROP POLICY IF EXISTS "Enable insert/update for authenticated users" ON public.voice_room_reactors;

-- Políticas de Seguridad
CREATE POLICY "Enable read for authenticated users" 
ON public.voice_room_reactors FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert/update for authenticated users" 
ON public.voice_room_reactors FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- FUNCION RPC PARA INYECTAR ENERGIA ATOMICAMENTE
CREATE OR REPLACE FUNCTION public.inject_reactor_energy(
    p_room_name TEXT,
    p_amount INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_energy INT;
    v_target INT;
    v_level INT;
    v_result JSONB;
BEGIN
    -- Obtener estado actual
    SELECT energy, target, level INTO v_current_energy, v_target, v_level 
    FROM public.voice_room_reactors 
    WHERE room_name = p_room_name;

    -- Si no existe, crear uno
    IF NOT FOUND THEN
        INSERT INTO public.voice_room_reactors (room_name, energy, target, level)
        VALUES (p_room_name, p_amount, 1000, 1)
        RETURNING energy, target, level INTO v_current_energy, v_target, v_level;
    ELSE
        -- Incrementar energía
        v_current_energy := v_current_energy + p_amount;

        -- Subir de nivel si alcanza el objetivo
        IF v_current_energy >= v_target THEN
            UPDATE public.voice_room_reactors 
            SET 
                energy = 0,
                level = level + 1,
                target = FLOOR(target * 1.5),
                bonus_expires_at = NOW() + INTERVAL '30 minutes',
                updated_at = NOW()
            WHERE room_name = p_room_name
            RETURNING energy, target, level INTO v_current_energy, v_target, v_level;
        ELSE
            UPDATE public.voice_room_reactors 
            SET 
                energy = v_current_energy,
                updated_at = NOW()
            WHERE room_name = p_room_name;
        END IF;
    END IF;

    SELECT jsonb_build_object(
        'energy', v_current_energy,
        'target', v_target,
        'level', v_level
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Añadir a la publicación de tiempo real de forma segura
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'voice_room_reactors'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_room_reactors;
    END IF;
END;
$$;
