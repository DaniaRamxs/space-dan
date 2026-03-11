-- 📢 Habilitar respuestas en el Chat Global
-- Ejecuta esto en el SQL Editor de Supabase para añadir el soporte de respuestas

ALTER TABLE global_chat 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES global_chat(id) ON DELETE SET NULL;

-- Comentario para la tabla
COMMENT ON COLUMN global_chat.reply_to_id IS 'ID del mensaje al que se está respondiendo (estilo WhatsApp)';
