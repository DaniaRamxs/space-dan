-- ==========================================
-- SPACELY: EMOTIONAL MUSIC RADAR
-- ==========================================
-- La música como catalizador de conexión profunda.

-- 1. Configuraciones de privacidad en perfiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS share_music_state BOOLEAN DEFAULT true;

-- 2. Estado Sonoro del Usuario
CREATE TABLE IF NOT EXISTS public.user_sound_state (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    track_id TEXT NOT NULL,
    track_name TEXT NOT NULL,
    artist_id TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    valence NUMERIC,
    energy NUMERIC,
    tempo NUMERIC,
    emotional_label TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_playing BOOLEAN DEFAULT true
);

ALTER TABLE public.user_sound_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles can read sound state if privacy allowed"
    ON public.user_sound_state FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = user_sound_state.user_id AND profiles.share_music_state = true
        )
        OR auth.uid() = user_id
    );

CREATE POLICY "Users can update their own sound state"
    ON public.user_sound_state FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Tabla de Coincidencias Musicales (Overlaps)
CREATE TABLE IF NOT EXISTS public.music_overlap (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_a UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_b UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    overlap_type TEXT CHECK (overlap_type IN ('track', 'artist')),
    reference_id TEXT NOT NULL,
    reference_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_a, user_b, overlap_type, reference_id)
);

-- Index para búsquedas rápidas (últimas 24h)
CREATE INDEX IF NOT EXISTS idx_music_overlap_users ON public.music_overlap(user_a, user_b);
CREATE INDEX IF NOT EXISTS idx_music_overlap_time ON public.music_overlap(created_at);

ALTER TABLE public.music_overlap ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own overlaps"
    ON public.music_overlap FOR SELECT
    USING (auth.uid() = user_a OR auth.uid() = user_b);

-- 4. Función Analítica: Interpretar Audios Features
-- (Esta lógica suele calcularse en el cliente/módulo Edge, pero la dejamos
-- documentada e implementada como helper si se necesita puramente en SQL).
CREATE OR REPLACE FUNCTION public.get_emotional_label(p_valence NUMERIC, p_energy NUMERIC) RETURNS TEXT AS $$
BEGIN
    IF p_valence IS NULL OR p_energy IS NULL THEN
        RETURN 'Sintonizando';
    END IF;

    IF p_valence > 0.6 AND p_energy > 0.6 THEN
        RETURN 'Euforia Activa';
    ELSIF p_valence > 0.6 AND p_energy <= 0.6 THEN
        RETURN 'Calma Luminosa';
    ELSIF p_valence <= 0.4 AND p_energy > 0.6 THEN
        RETURN 'Intensidad Melancólica';
    ELSIF p_valence <= 0.4 AND p_energy <= 0.4 THEN
        RETURN 'Introspección Profunda';
    ELSIF p_energy > 0.8 THEN
        RETURN 'Sobrecarga de Energía';
    ELSE
        RETURN 'Frecuencia Estable';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. RPC para sincronizar estado musical y calcular overlaps
CREATE OR REPLACE FUNCTION public.sync_user_sound_state(
    p_track_id TEXT,
    p_track_name TEXT,
    p_artist_id TEXT,
    p_artist_name TEXT,
    p_valence NUMERIC,
    p_energy NUMERIC,
    p_tempo NUMERIC,
    p_emotional_label TEXT,
    p_is_playing BOOLEAN
) RETURNS void AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_share_music BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado';
    END IF;

    -- Verificar privacidad
    SELECT share_music_state INTO v_share_music FROM public.profiles WHERE id = v_user_id;
    IF v_share_music = false THEN
        UPDATE public.user_sound_state SET is_playing = false, updated_at = NOW() WHERE user_id = v_user_id;
        RETURN;
    END IF;

    -- Actualizar estado sonoro actual
    INSERT INTO public.user_sound_state (
        user_id, track_id, track_name, artist_id, artist_name, valence, energy, tempo, emotional_label, updated_at, is_playing
    ) VALUES (
        v_user_id, p_track_id, p_track_name, p_artist_id, p_artist_name, p_valence, p_energy, p_tempo, p_emotional_label, NOW(), p_is_playing
    )
    ON CONFLICT (user_id) DO UPDATE SET
        track_id = EXCLUDED.track_id,
        track_name = EXCLUDED.track_name,
        artist_id = EXCLUDED.artist_id,
        artist_name = EXCLUDED.artist_name,
        valence = EXCLUDED.valence,
        energy = EXCLUDED.energy,
        tempo = EXCLUDED.tempo,
        emotional_label = EXCLUDED.emotional_label,
        updated_at = NOW(),
        is_playing = EXCLUDED.is_playing;

    -- Lógica de Overlap (Puentes): buscar usuarios que hayan escuchado esto en las últimas 24h
    IF p_is_playing = true THEN
        -- Overlap por Track
        INSERT INTO public.music_overlap (user_a, user_b, overlap_type, reference_id, reference_name)
        SELECT v_user_id, other.user_id, 'track', p_track_id, p_track_name
        FROM public.user_sound_state other
        WHERE other.user_id != v_user_id
          AND other.track_id = p_track_id
          AND other.updated_at >= NOW() - INTERVAL '24 hours'
          AND NOT EXISTS (
              SELECT 1 FROM public.music_overlap mo 
              WHERE (mo.user_a = v_user_id AND mo.user_b = other.user_id AND mo.overlap_type = 'track' AND mo.reference_id = p_track_id)
                 OR (mo.user_b = v_user_id AND mo.user_a = other.user_id AND mo.overlap_type = 'track' AND mo.reference_id = p_track_id)
          );

        -- Overlap por Artist (para no flood, se hace uno u otro o ambos)
        INSERT INTO public.music_overlap (user_a, user_b, overlap_type, reference_id, reference_name)
        SELECT v_user_id, other.user_id, 'artist', p_artist_id, p_artist_name
        FROM public.user_sound_state other
        WHERE other.user_id != v_user_id
          AND other.artist_id = p_artist_id
          AND other.updated_at >= NOW() - INTERVAL '24 hours'
          AND NOT EXISTS (
              SELECT 1 FROM public.music_overlap mo 
              WHERE (mo.user_a = v_user_id AND mo.user_b = other.user_id AND mo.overlap_type = 'artist' AND mo.reference_id = p_artist_id)
                 OR (mo.user_b = v_user_id AND mo.user_a = other.user_id AND mo.overlap_type = 'artist' AND mo.reference_id = p_artist_id)
          );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC para borrar overlaps viejos (cleanup task a implementar o llamada manual ocasional)
CREATE OR REPLACE FUNCTION public.cleanup_music_overlaps() RETURNS void AS $$
BEGIN
    DELETE FROM public.music_overlap WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
