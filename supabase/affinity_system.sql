-- ============================================================
-- Spacely :: Affinity System
-- ============================================================

-- 1. Actualizar tabla profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS affinity_completed BOOLEAN DEFAULT false;

-- 2. Tabla de preguntas de afinidad
CREATE TABLE IF NOT EXISTS public.affinity_questions (
    id TEXT PRIMARY KEY,
    question_text TEXT NOT NULL,
    category TEXT,
    weight INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de respuestas de usuarios
CREATE TABLE IF NOT EXISTS public.user_affinity_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES public.affinity_questions(id) ON DELETE CASCADE,
    answer_value INTEGER NOT NULL CHECK (answer_value BETWEEN 1 AND 5), -- Escala 1-5 (ej. Muy en desacuerdo -> Muy de acuerdo)
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, question_id)
);

-- 4. Seguridad (RLS) e Índices
CREATE INDEX IF NOT EXISTS idx_affinity_user ON public.user_affinity_answers(user_id);

-- affinity_questions: Lectura pública
ALTER TABLE public.affinity_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Questions: Public read" ON public.affinity_questions;
CREATE POLICY "Questions: Public read" ON public.affinity_questions FOR SELECT USING (true);

-- user_affinity_answers: Dueño puede ver/insertar
ALTER TABLE public.user_affinity_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Answers: User can see own" ON public.user_affinity_answers;
CREATE POLICY "Answers: User can see own" ON public.user_affinity_answers FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Answers: User can insert own" ON public.user_affinity_answers;
CREATE POLICY "Answers: User can insert own" ON public.user_affinity_answers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. RPC para guardar todas las respuestas y marcar como completado
CREATE OR REPLACE FUNCTION public.submit_affinity_test(p_answers JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_answer RECORD;
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Bloquear si ya completó el test anteriormente
    IF EXISTS (
       SELECT 1 FROM public.profiles 
       WHERE id = v_user_id AND affinity_completed = true
    ) THEN
       RAISE EXCEPTION 'Affinity test already completed and locked';
    END IF;

    -- Iterar sobre el JSONB de respuestas
    FOR v_answer IN SELECT * FROM jsonb_to_recordset(p_answers) AS x(question_id TEXT, answer_value INTEGER)
    LOOP
        -- Validación de rango estricta
        IF v_answer.answer_value < 1 OR v_answer.answer_value > 5 THEN
            RAISE EXCEPTION 'Invalid answer value for question %: %', v_answer.question_id, v_answer.answer_value;
        END IF;

        INSERT INTO public.user_affinity_answers (user_id, question_id, answer_value)
        VALUES (v_user_id, v_answer.question_id, v_answer.answer_value)
        ON CONFLICT (user_id, question_id) 
        DO UPDATE SET answer_value = EXCLUDED.answer_value, created_at = now();
    END LOOP;

    -- Marcar perfil como completado (Irreversible)
    UPDATE public.profiles
    SET affinity_completed = true
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Restringir permisos del RPC
REVOKE ALL ON FUNCTION public.submit_affinity_test(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_affinity_test(JSONB) TO authenticated;

-- 6. Insertar preguntas iniciales (versión más humana y menos genérica)
INSERT INTO public.affinity_questions (id, question_text, category, weight) VALUES
('social_energy', 'Después de socializar, normalmente necesito tiempo a solas para recargar.', 'social', 2),
('conflict_style', 'Cuando algo me molesta, prefiero hablarlo aunque incomode antes que guardármelo.', 'personality', 2),
('emotional_depth', 'Disfruto conversaciones que van más allá de lo superficial, incluso si se vuelven intensas.', 'emotional', 3),
('uncertainty', 'Me siento cómodo cuestionando mis propias creencias y cambiando de opinión.', 'outlook', 2),
('risk_emotional', 'Prefiero arriesgarme a sentir demasiado que no sentir nada.', 'emotional', 3),
('structure_vs_flow', 'Trabajo mejor cuando tengo libertad para improvisar en lugar de seguir reglas estrictas.', 'work', 1),
('connection_value', 'Valoro más una conversación honesta con pocos que la atención de muchos.', 'social', 3)
ON CONFLICT (id) DO UPDATE SET 
    question_text = EXCLUDED.question_text,
    category = EXCLUDED.category,
    weight = EXCLUDED.weight;
