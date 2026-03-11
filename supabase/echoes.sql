-- supabase/echoes.sql
-- Tabla para los nuevos "Ecos" (reemplaza a los comentarios/muro tradicionales)

DROP TABLE IF EXISTS public.space_echo_stars CASCADE;
DROP TABLE IF EXISTS public.space_echoes CASCADE;

CREATE TABLE IF NOT EXISTS public.space_echoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Owner del perfil
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Quien dejó el eco
    echo_type TEXT NOT NULL CHECK (echo_type IN ('star', 'thought', 'song', 'image')),
    content TEXT, 
    metadata JSONB DEFAULT '{}'::jsonb, 
    is_pinned BOOLEAN DEFAULT FALSE,
    is_fleeting BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    parent_id UUID REFERENCES public.space_echoes(id) ON DELETE CASCADE, 
    quoted_id UUID REFERENCES public.space_echoes(id) ON DELETE SET NULL, 
    stars_count INT DEFAULT 0
);

ALTER TABLE public.space_echoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los ecos son visibles por todos" ON public.space_echoes
    FOR SELECT TO authenticated, anon
    USING (
        (is_fleeting = FALSE) OR (is_fleeting = TRUE AND expires_at > NOW())
    );

CREATE POLICY "Autores pueden insertar metas" ON public.space_echoes
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Solo el dueño puede fijar en su perfil" ON public.space_echoes
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = author_id);

CREATE POLICY "Autor o dueño pueden borrar" ON public.space_echoes
    FOR DELETE TO authenticated
    USING (auth.uid() = author_id OR auth.uid() = user_id);

-- Tabla para rastear quién le dio estrella al eco
CREATE TABLE IF NOT EXISTS public.space_echo_stars (
    echo_id UUID REFERENCES public.space_echoes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (echo_id, user_id)
);

ALTER TABLE public.space_echo_stars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reacciones visibles para todos" ON public.space_echo_stars
    FOR SELECT TO authenticated, anon
    USING (true);

CREATE POLICY "Usuarios pueden reaccionar" ON public.space_echo_stars
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden quitar su reaccion" ON public.space_echo_stars
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Trigger para mantener el contador de stars_count sincronizado
CREATE OR REPLACE FUNCTION public.update_echo_stars_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.space_echoes SET stars_count = stars_count + 1 WHERE id = NEW.echo_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.space_echoes SET stars_count = stars_count - 1 WHERE id = OLD.echo_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_echo_star_changed ON public.space_echo_stars;
CREATE TRIGGER on_echo_star_changed
AFTER INSERT OR DELETE ON public.space_echo_stars
FOR EACH ROW EXECUTE FUNCTION public.update_echo_stars_count();
