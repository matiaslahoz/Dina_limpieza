import { supabase } from './supabase';
import type { CleaningSession } from '@/types';

export const getOpenSession = async () => {
  const { data, error } = await supabase
    .rpc('open_session_for_current_cleaner')
    .maybeSingle();
  if (error) throw error;
  return (data as CleaningSession | null) ?? null;
};

export const checkIn = async (
  qrToken: string,
  coords?: { lat: number; lng: number },
) => {
  const { data, error } = await supabase.rpc('check_in', {
    p_qr_token: qrToken,
    p_lat: coords?.lat ?? null,
    p_lng: coords?.lng ?? null,
  });
  if (error) throw error;
  return data as CleaningSession;
};

export const checkOut = async (qrToken: string, notes?: string) => {
  const { data, error } = await supabase.rpc('check_out', {
    p_qr_token: qrToken,
    p_notes: notes ?? null,
  });
  if (error) throw error;
  return data as CleaningSession;
};

export const fetchRoomByQr = async (qrToken: string) => {
  const { data, error } = await supabase
    .from('rooms')
    .select(
      'id, name, kind, floor:floors(id, name, ordinal, building:buildings(id, name, latitude, longitude, geofence_radius_m))',
    )
    .eq('qr_token', qrToken)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const fetchMyRecentSessions = async (limit = 20) => {
  const { data, error } = await supabase
    .from('cleaning_history')
    .select('*')
    .order('check_in_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
};
