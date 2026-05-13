import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useClinicServices(clinicId) {
  const [services, setServices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const refetch = useCallback(async () => {
    if (!clinicId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('clinic_services')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: true });
      if (err) throw err;
      setServices(data ?? []);
    } catch (err) {
      setError(err?.message ?? 'Error al cargar servicios');
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => { refetch(); }, [refetch]);

  /** Crea un servicio nuevo. Lanza si hay error. */
  async function createService(fields) {
    const { error: err } = await supabase
      .from('clinic_services')
      .insert({ ...sanitize(fields), clinic_id: clinicId });
    if (err) throw err;
    await refetch();
  }

  /** Actualiza un servicio existente. Lanza si hay error. */
  async function updateService(id, fields) {
    const { error: err } = await supabase
      .from('clinic_services')
      .update(sanitize(fields))
      .eq('id', id);
    if (err) throw err;
    await refetch();
  }

  /** Activa o desactiva sin borrar. */
  async function toggleActive(id, is_active) {
    const { error: err } = await supabase
      .from('clinic_services')
      .update({ is_active })
      .eq('id', id);
    if (err) throw err;
    setServices(prev => prev.map(s => s.id === id ? { ...s, is_active } : s));
  }

  /** Elimina permanentemente. */
  async function deleteService(id) {
    const { error: err } = await supabase
      .from('clinic_services')
      .delete()
      .eq('id', id);
    if (err) throw err;
    setServices(prev => prev.filter(s => s.id !== id));
  }

  return { services, loading, error, refetch, createService, updateService, toggleActive, deleteService };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convierte strings vacíos a null y normaliza tipos numéricos. */
function sanitize(fields) {
  return {
    name:             fields.name?.trim() ?? '',
    duration_minutes: toIntOrNull(fields.duration_minutes),
    price:            toFloatOrNull(fields.price),
    discount_type:    fields.discount_type || null,
    discount_value:   toFloatOrNull(fields.discount_value),
    is_active:        fields.is_active ?? true,
  };
}

function toIntOrNull(v) {
  const n = parseInt(v, 10);
  return isNaN(n) || n <= 0 ? null : n;
}

function toFloatOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(v);
  return isNaN(n) || n < 0 ? null : n;
}
