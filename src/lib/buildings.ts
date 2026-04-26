import { supabase } from './supabase';
import type { Building, CleaningHistoryRow, Floor, Room } from '@/types';

export const fetchMyBuildings = async () => {
  const { data, error } = await supabase
    .from('buildings')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data as Building[]) ?? [];
};

export const fetchBuildingDetail = async (buildingId: string) => {
  const { data, error } = await supabase
    .from('floors')
    .select('id, name, ordinal, rooms(id, name, kind, qr_token, active)')
    .eq('building_id', buildingId)
    .order('ordinal');
  if (error) throw error;
  return data as (Floor & { rooms: Room[] })[];
};

export const fetchRoomHistory = async (roomId: string, limit = 50) => {
  const { data, error } = await supabase
    .from('cleaning_history')
    .select('*')
    .eq('room_id', roomId)
    .order('check_in_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as CleaningHistoryRow[]) ?? [];
};

export const findRoomByQr = async (qrToken: string) => {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, name, kind, floor:floors(name, ordinal, building:buildings(name))')
    .eq('qr_token', qrToken)
    .maybeSingle();
  if (error) throw error;
  return data;
};
