import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useMembers(clinicId) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMembers = useCallback(async () => {
    if (!clinicId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from('clinic_members')
        .select('id, user_id, role, created_at')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: true });

      if (sbError) throw sbError;
      setMembers(data ?? []);
    } catch (err) {
      setError(err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  /**
   * Add a member to the clinic by userId and role.
   * Note: supabase.auth.admin is not available on the client.
   * The caller is responsible for resolving the user UUID beforehand
   * (e.g., from the Supabase Dashboard or a secure server-side route).
   *
   * @param {string} userId - UUID of the user to add
   * @param {string} role - 'owner' | 'staff' | 'viewer'
   * @returns {{ data, error }}
   */
  const addMember = useCallback(async (userId, role) => {
    if (!clinicId) return { data: null, error: new Error('clinicId is required') };

    try {
      const { data, error: sbError } = await supabase
        .from('clinic_members')
        .insert({ clinic_id: clinicId, user_id: userId, role })
        .select('id, user_id, role, created_at')
        .single();

      if (sbError) throw sbError;

      setMembers((prev) => [...prev, data]);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }, [clinicId]);

  /**
   * Remove a member from the clinic by their clinic_members record id.
   *
   * @param {string} memberId - id of the clinic_members row
   * @returns {{ error }}
   */
  const removeMember = useCallback(async (memberId) => {
    try {
      const { error: sbError } = await supabase
        .from('clinic_members')
        .delete()
        .eq('id', memberId);

      if (sbError) throw sbError;

      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }, []);

  return { members, loading, error, addMember, removeMember };
}
