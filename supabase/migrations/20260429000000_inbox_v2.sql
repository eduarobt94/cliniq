-- ============================================================
-- CLINIQ — Inbox v2: conversations + messages
-- Replaces the flat whatsapp_message_log as primary inbox source.
-- whatsapp_message_log is kept for automation audit trail.
-- ============================================================

-- ─── 1. conversations ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id      UUID        REFERENCES patients(id) ON DELETE SET NULL,
  phone_number    TEXT        NOT NULL,
  last_message    TEXT,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT conversations_unique_phone UNIQUE (clinic_id, phone_number)
);

CREATE INDEX idx_conversations_clinic     ON conversations(clinic_id);
CREATE INDEX idx_conversations_patient    ON conversations(patient_id);
CREATE INDEX idx_conversations_last_msg   ON conversations(clinic_id, last_message_at DESC);

-- ─── 2. messages ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  clinic_id       UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id      UUID        REFERENCES patients(id) ON DELETE SET NULL,
  direction       TEXT        NOT NULL CHECK (direction IN ('inbound', 'outbound', 'system_template')),
  content         TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'sent'
                    CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'received')),
  meta_message_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_clinic       ON messages(clinic_id);
CREATE INDEX idx_messages_meta_id      ON messages(meta_message_id) WHERE meta_message_id IS NOT NULL;

-- ─── 3. Trigger: keep last_message updated ────────────────────
CREATE OR REPLACE FUNCTION fn_sync_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversations
  SET
    last_message    = NEW.content,
    last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_messages_sync_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION fn_sync_conversation_last_message();

-- ─── 4. RLS — conversations ───────────────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select"
  ON conversations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM clinics      WHERE id = conversations.clinic_id AND owner_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM clinic_members WHERE clinic_id = conversations.clinic_id AND user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "conversations_service_all"
  ON conversations FOR ALL
  USING (auth.role() = 'service_role');

-- ─── 5. RLS — messages ────────────────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select"
  ON messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM clinics        WHERE id = messages.clinic_id AND owner_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM clinic_members WHERE clinic_id = messages.clinic_id AND user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "messages_service_all"
  ON messages FOR ALL
  USING (auth.role() = 'service_role');

-- ─── 6. Realtime ──────────────────────────────────────────────
-- Run in Supabase Dashboard → Database → Replication if not auto-enabled:
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- ─── 7. Backfill from whatsapp_message_log (optional) ─────────
-- Run manually if you want to import existing messages:
--
-- INSERT INTO conversations (clinic_id, patient_id, phone_number, last_message, last_message_at)
-- SELECT DISTINCT ON (clinic_id, phone_number)
--   clinic_id, patient_id, phone_number, message AS last_message, created_at AS last_message_at
-- FROM whatsapp_message_log
-- ORDER BY clinic_id, phone_number, created_at DESC
-- ON CONFLICT (clinic_id, phone_number) DO NOTHING;
--
-- INSERT INTO messages (conversation_id, clinic_id, patient_id, direction, content, status, meta_message_id, created_at)
-- SELECT
--   c.id AS conversation_id,
--   l.clinic_id, l.patient_id,
--   l.direction,
--   l.message AS content,
--   l.status,
--   l.wa_message_id AS meta_message_id,
--   l.created_at
-- FROM whatsapp_message_log l
-- JOIN conversations c ON c.clinic_id = l.clinic_id AND c.phone_number = l.phone_number;
