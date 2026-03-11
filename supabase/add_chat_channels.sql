
-- 📢 Categorías de Chat al estilo Discord
-- Ejecuta esto en el SQL Editor de Supabase para habilitar canales

ALTER TABLE global_chat 
ADD COLUMN IF NOT EXISTS channel_id TEXT DEFAULT 'global';

CREATE INDEX IF NOT EXISTS idx_global_chat_channel ON global_chat(channel_id);

-- Comentario para la tabla
COMMENT ON COLUMN global_chat.channel_id IS 'ID del canal (ej: global, comandos, avisos)';
