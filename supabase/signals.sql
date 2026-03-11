-- supabase/signals.sql

CREATE TABLE IF NOT EXISTS public.space_profile_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    visited_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- No foreign key to avoid circular deps for simple visits
    CHECK (visitor_id != visited_id)
);

ALTER TABLE public.space_profile_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden registrar sus visitas" ON public.space_profile_visits
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = visitor_id);

CREATE POLICY "Solo el visitado y visitante pueden ver las visitas" ON public.space_profile_visits
    FOR SELECT TO authenticated
    USING (auth.uid() = visitor_id OR auth.uid() = visited_id);

-- Tabla de Señales Misteriosas (Generadas cuando hay visitas repetidas)
CREATE TABLE IF NOT EXISTS public.space_mystery_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    visitor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    visit_count INT DEFAULT 3,
    signal_status TEXT DEFAULT 'encrypted', -- 'encrypted', 'decrypting', 'decrypted_1', 'decrypted_2', 'fully_decrypted'
    unlocked_clues JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.space_mystery_signals ENABLE ROW LEVEL SECURITY;

-- Solo el dueño del perfil puede ver sus señales
CREATE POLICY "Dueño puede ver sus señales" ON public.space_mystery_signals
    FOR SELECT TO authenticated
    USING (auth.uid() = receiver_id);

CREATE POLICY "Dueño puede actualizar sus señales" ON public.space_mystery_signals
    FOR UPDATE TO authenticated
    USING (auth.uid() = receiver_id);

-- Función para rastrear visita y generar señal
CREATE OR REPLACE FUNCTION public.track_profile_visit(viewer UUID, target UUID)
RETURNS void AS $$
DECLARE
    recent_visits INT;
    existing_signal UUID;
BEGIN
    IF viewer IS NULL OR target IS NULL OR viewer = target THEN
        RETURN;
    END IF;

    -- Registrar visita
    INSERT INTO public.space_profile_visits (visitor_id, visited_id, created_at)
    VALUES (viewer, target, NOW());

    -- Contar visitas en las últimas 24 horas
    SELECT COUNT(*) INTO recent_visits 
    FROM public.space_profile_visits 
    WHERE visitor_id = viewer AND visited_id = target AND created_at > NOW() - INTERVAL '24 hours';

    -- Si hay 3 o más visitas, procesar señal
    IF recent_visits >= 3 THEN
        -- Revisar si ya existe una señal reciente de este visitor al target
        SELECT id INTO existing_signal 
        FROM public.space_mystery_signals 
        WHERE receiver_id = target AND visitor_id = viewer AND created_at > NOW() - INTERVAL '24 hours'
        LIMIT 1;

        IF existing_signal IS NULL THEN
            -- Generar nueva señal misteriosa para que Target la vea
            INSERT INTO public.space_mystery_signals (receiver_id, visitor_id, visit_count)
            VALUES (target, viewer, recent_visits);
        ELSE
            -- Si ya existía, se podría actualizar un timestamp o un contador
            UPDATE public.space_mystery_signals
            SET visit_count = recent_visits, updated_at = NOW()
            WHERE id = existing_signal;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
