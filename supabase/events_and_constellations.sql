-- supabase/events_and_constellations.sql

-- 1. EVENTOS CÓSMICOS
CREATE TABLE IF NOT EXISTS public.cosmic_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'star_shower', 'black_hole', 'galactic_alignment', 'wandering_comet'
    name TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ NOT NULL,
    multiplier NUMERIC DEFAULT 1.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cosmic_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eventos visibles por todos" ON public.cosmic_events;
CREATE POLICY "Eventos visibles por todos" ON public.cosmic_events
    FOR SELECT TO authenticated, anon
    USING (true);

-- Insertamos un evento de prueba con caducidad larga para testeo local
INSERT INTO public.cosmic_events (event_type, name, description, start_time, end_time, multiplier)
VALUES (
    'star_shower', 
    'Lluvia de estrellas', 
    'Durante este evento cada ⭐ recibida vale el doble de Starlys.', 
    NOW(), 
    NOW() + INTERVAL '1 day', 
    2.0
) ON CONFLICT DO NOTHING;
-- 2. CONSTELACIONES
CREATE TABLE IF NOT EXISTS public.space_constellations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.space_constellations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Constelaciones visibles por todos" ON public.space_constellations;
CREATE POLICY "Constelaciones visibles por todos" ON public.space_constellations
    FOR SELECT TO authenticated, anon
    USING (true);

CREATE TABLE IF NOT EXISTS public.space_constellation_members (
    constellation_id UUID REFERENCES public.space_constellations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (constellation_id, user_id)
);

ALTER TABLE public.space_constellation_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Miembros de constelaciones visibles por todos" ON public.space_constellation_members;
CREATE POLICY "Miembros de constelaciones visibles por todos" ON public.space_constellation_members
    FOR SELECT TO authenticated, anon
    USING (true);

-- Tabla para rastrear la fuerza del vínculo entre 2 usuarios (score)
CREATE TABLE IF NOT EXISTS public.user_bonds (
    user_a UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_b UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    bond_score INT DEFAULT 0,
    last_interaction TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_a, user_b),
    CHECK (user_a < user_b) -- Para evitar duplicados cruzados
);

ALTER TABLE public.user_bonds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vínculos visibles por todos" ON public.user_bonds;
CREATE POLICY "Vínculos visibles por todos" ON public.user_bonds
    FOR SELECT TO authenticated, anon
    USING (true);

-- Función para incrementar el vínculo y posiblemente crear constelación
CREATE OR REPLACE FUNCTION public.increment_user_bond(u1 UUID, u2 UUID, points INT)
RETURNS void AS $$
DECLARE
    min_u UUID := LEAST(u1, u2);
    max_u UUID := GREATEST(u1, u2);
    current_score INT;
BEGIN
    INSERT INTO public.user_bonds (user_a, user_b, bond_score, last_interaction)
    VALUES (min_u, max_u, points, NOW())
    ON CONFLICT (user_a, user_b) 
    DO UPDATE SET 
        bond_score = public.user_bonds.bond_score + EXCLUDED.bond_score,
        last_interaction = NOW()
    RETURNING bond_score INTO current_score;

    -- Lógica simple: Si score >= 100 y no están en constelación mutua, crear constelación.
    IF current_score >= 100 THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.space_constellation_members m1
            JOIN public.space_constellation_members m2 ON m1.constellation_id = m2.constellation_id
            WHERE m1.user_id = min_u AND m2.user_id = max_u
        ) THEN
            -- No comparten constelacion: Crear una nueva Constelación Binaria
            DECLARE
                new_constellation_id UUID;
                username1 TEXT;
                username2 TEXT;
                new_name TEXT;
            BEGIN
                SELECT username INTO username1 FROM public.profiles WHERE id = min_u;
                SELECT username INTO username2 FROM public.profiles WHERE id = max_u;

                -- Array de nombres bonitos
                new_name := 'Constelación ' || substr(md5(random()::text), 1, 6);

                INSERT INTO public.space_constellations (name, description)
                VALUES (new_name, 'Un fuerte vínculo detectado entre ' || username1 || ' y ' || username2)
                RETURNING id INTO new_constellation_id;

                INSERT INTO public.space_constellation_members (constellation_id, user_id)
                VALUES (new_constellation_id, min_u), (new_constellation_id, max_u);
            END;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
