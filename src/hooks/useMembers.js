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
      const { data: rows, error: sbError } = await supabase
        .from('clinic_members')
        .select('id, user_id, email, role, status, created_at')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: true });

      if (sbError) throw sbError;

      const members = rows ?? [];

      // Batch-fetch profiles for active members
      const userIds = members.flatMap((m) => m.user_id ? [m.user_id] : []);
      let profilesById = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);
        profilesById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
      }

      setMembers(
        members.map((m) => {
          const profile = profilesById[m.user_id] ?? null;
          const displayName =
            profile?.first_name
              ? `${profile.first_name} ${profile.last_name ?? ''}`.trim()
              : m.email;
          return { ...m, profile, displayName };
        })
      );
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

  const addMember = useCallback(async (userId, role) => {
    if (!clinicId) return { data: null, error: new Error('clinicId is required') };
    try {
      const { data, error: sbError } = await supabase
        .from('clinic_members')
        .insert({ clinic_id: clinicId, user_id: userId, role })
        .select('id, user_id, email, role, status, created_at')
        .single();
      if (sbError) throw sbError;
      setMembers((prev) => [...prev, { ...data, displayName: data.email }]);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }, [clinicId]);

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

  return { members, loading, error, addMember, removeMember, refetch: fetchMembers };
}
