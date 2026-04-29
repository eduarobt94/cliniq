-- Allow clinic owners and active members to delete conversations
CREATE POLICY "conversations_delete"
  ON conversations FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM clinics      WHERE id = conversations.clinic_id AND owner_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM clinic_members WHERE clinic_id = conversations.clinic_id AND user_id = auth.uid() AND status = 'active')
  );
