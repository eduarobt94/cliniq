-- Agrega 'video' al CHECK constraint de message_type
-- PostgreSQL no soporta ALTER CHECK directamente; hay que drop + add constraint

ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_message_type_check;

ALTER TABLE messages
  ADD CONSTRAINT messages_message_type_check
    CHECK (message_type IN ('text', 'audio', 'image', 'document', 'sticker', 'video', 'unknown'));
