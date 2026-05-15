-- ─────────────────────────────────────────────────────────────────────────────
-- Soporte de mensajes de audio (notas de voz) en el inbox de WhatsApp
-- El webhook transcribe el audio con Whisper y lo guarda como content.
-- message_type distingue 'text' | 'audio' | 'image' | 'document' para la UI.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'audio', 'image', 'document', 'sticker', 'video', 'unknown'));

-- Índice útil para filtrar por tipo si se necesita en el futuro
CREATE INDEX IF NOT EXISTS idx_messages_type
  ON messages(conversation_id, message_type)
  WHERE message_type <> 'text';

COMMENT ON COLUMN messages.message_type IS
  'Tipo de medio original del mensaje de WhatsApp. '
  '"audio" = nota de voz transcripta por Whisper. '
  'El campo content siempre contiene el texto legible (transcripción si es audio).';
