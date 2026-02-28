-- TABLA DE SALAS DE VOZ
CREATE TABLE IF NOT EXISTS public.voice_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    max_participants INT DEFAULT 5,
    current_participants INT DEFAULT 0
);

-- RLS (SEGURIDAD)
ALTER TABLE public.voice_rooms ENABLE ROW LEVEL SECURITY;

-- Los usuarios autenticados pueden ver salas activas
CREATE POLICY "Users can view active voice rooms" 
ON public.voice_rooms FOR SELECT 
USING (auth.role() = 'authenticated' AND is_active = true);

-- Los usuarios autenticados pueden crear sus propias salas
CREATE POLICY "Users can create voice rooms" 
ON public.voice_rooms FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Solo el creador puede desactivar su sala
CREATE POLICY "Creators can update their voice rooms" 
ON public.voice_rooms FOR UPDATE 
USING (auth.uid() = created_by);

-- ÍNDICES PARA BÚSQUEDA RÁPIDA
CREATE INDEX IF NOT EXISTS idx_voice_rooms_active ON public.voice_rooms(is_active);
