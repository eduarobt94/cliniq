-- ─────────────────────────────────────────────────────────────────────────────
-- Cleanup: remove duplicate RLS policies on waiting_list
--
-- Context: migration 20260507000000 created waiting_list_select/insert/update
-- and migration 20260507000004 created members_read/insert/update/delete_waiting_list.
-- Both sets are permissive so the table works, but duplicate policies are redundant.
--
-- Keep:   members_read_waiting_list, members_insert_waiting_list,
--         members_update_waiting_list, members_delete_waiting_list
-- Remove: waiting_list_select, waiting_list_insert, waiting_list_update,
--         clinic_delete_waiting_list (superseded by members_delete_waiting_list)
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "waiting_list_select"        ON public.waiting_list;
DROP POLICY IF EXISTS "waiting_list_insert"        ON public.waiting_list;
DROP POLICY IF EXISTS "waiting_list_update"        ON public.waiting_list;
DROP POLICY IF EXISTS "clinic_delete_waiting_list" ON public.waiting_list;
