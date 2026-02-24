-- Habilitar "social" en notifications preservando lo anterior
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('achievement', 'record', 'system', 'letter', 'room_invite', 'social'));

-- Crear tabla post_likes
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON public.post_likes(user_id);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_likes_read" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "post_likes_insert" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_likes_delete" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- Función para contar likes en post de forma robusta
CREATE OR REPLACE FUNCTION public.get_post_likes(p_post_id uuid)
RETURNS int LANGUAGE sql STABLE AS $$
  SELECT count(*)::int FROM public.post_likes WHERE post_id = p_post_id;
$$;

-- Triggers para notificaciones sociales
CREATE OR REPLACE FUNCTION public.trg_social_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_TABLE_NAME = 'follows' THEN
    INSERT INTO public.notifications(user_id, type, message)
    VALUES (NEW.following_id, 'social', '¡Alguien nuevo te está siguiendo en órbita!');
  ELSIF TG_TABLE_NAME = 'profile_comments' THEN
    IF NEW.profile_id != NEW.author_id THEN
      INSERT INTO public.notifications(user_id, type, message)
      VALUES (NEW.profile_id, 'social', 'Alguien dejó un mensaje nuevo en tu perfil.');
    END IF;
  ELSIF TG_TABLE_NAME = 'post_likes' THEN
    INSERT INTO public.notifications(user_id, type, message)
    SELECT user_id, 'social', '¡A alguien le gustó tu post!'
    FROM public.posts WHERE id = NEW.post_id AND user_id != NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_follows ON public.follows;
CREATE TRIGGER trg_notify_follows
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.trg_social_notifications();

DROP TRIGGER IF EXISTS trg_notify_comments ON public.profile_comments;
CREATE TRIGGER trg_notify_comments
  AFTER INSERT ON public.profile_comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_social_notifications();

DROP TRIGGER IF EXISTS trg_notify_likes ON public.post_likes;
CREATE TRIGGER trg_notify_likes
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.trg_social_notifications();

-- Enable RLS on follows and profile_comments
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_comments ENABLE ROW LEVEL SECURITY;

-- Añadir políticas si no existían (se ignorará el ON CONFLICT DO NOTHING de create policy en postgre <= 12, asumiendo pg15+).
-- Reemplazo de sintaxis CREATE POLICY condicional no existe en PG nativo fácilmente sin bloque plpgsql. Asumiré que no estaban o las borraré primero:

DROP POLICY IF EXISTS "follows_insert" ON public.follows;
DROP POLICY IF EXISTS "follows_delete" ON public.follows;
DROP POLICY IF EXISTS "follows_select" ON public.follows;
CREATE POLICY "follows_insert" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete" ON public.follows FOR DELETE USING (auth.uid() = follower_id);
CREATE POLICY "follows_select" ON public.follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "comments_insert" ON public.profile_comments;
DROP POLICY IF EXISTS "comments_delete" ON public.profile_comments;
DROP POLICY IF EXISTS "comments_select" ON public.profile_comments;
CREATE POLICY "comments_insert" ON public.profile_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments_select" ON public.profile_comments FOR SELECT USING (true);
CREATE POLICY "comments_delete" ON public.profile_comments FOR DELETE USING (auth.uid() = author_id OR auth.uid() = profile_id);
