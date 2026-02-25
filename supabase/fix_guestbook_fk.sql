-- Asegurar que la tabla guestbook existe y tiene la relación con profiles
CREATE TABLE IF NOT EXISTS public.guestbook (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  text       text NOT NULL,
  user_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Asegurar que existe la FK si la tabla ya existía sin ella
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'guestbook_user_id_fkey'
  ) THEN
    ALTER TABLE public.guestbook 
    ADD CONSTRAINT guestbook_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;
