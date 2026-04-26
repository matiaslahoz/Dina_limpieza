import { supabase } from './supabase';
import type { Building, CleaningHistoryRow, Floor, Room, RoomKind } from '@/types';

export const listClientOrgs = async () => {
  const { data, error } = await supabase
    .from('client_orgs')
    .select('id, name')
    .order('name');
  if (error) throw error;
  return data ?? [];
};

export const listAllBuildings = async () => {
  const { data, error } = await supabase
    .from('buildings')
    .select('id, name, address, client_org_id, client_orgs(name)')
    .order('name');
  if (error) throw error;
  return data ?? [];
};

export const createBuilding = async (input: {
  client_org_id: string;
  name: string;
  address?: string;
}) => {
  const { data, error } = await supabase.from('buildings').insert(input).select().single();
  if (error) throw error;
  return data as Building;
};

export const fetchBuildingTree = async (buildingId: string) => {
  const [{ data: building, error: e1 }, { data: floors, error: e2 }] = await Promise.all([
    supabase.from('buildings').select('*').eq('id', buildingId).maybeSingle(),
    supabase
      .from('floors')
      .select('id, name, ordinal, building_id, rooms(id, name, kind, qr_token, active)')
      .eq('building_id', buildingId)
      .order('ordinal'),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return {
    building: building as Building | null,
    floors: (floors ?? []) as (Floor & { rooms: Room[] })[],
  };
};

export const createFloor = async (input: { building_id: string; name: string; ordinal: number }) => {
  const { data, error } = await supabase.from('floors').insert(input).select().single();
  if (error) throw error;
  return data as Floor;
};

export const createRoom = async (input: { floor_id: string; name: string; kind: RoomKind }) => {
  const { data, error } = await supabase.from('rooms').insert(input).select().single();
  if (error) throw error;
  return data as Room;
};

export const fetchRoom = async (roomId: string) => {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, name, kind, qr_token, active, floor:floors(name, ordinal, building:buildings(name))')
    .eq('id', roomId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const setRoomActive = async (roomId: string, active: boolean) => {
  const { error } = await supabase.from('rooms').update({ active }).eq('id', roomId);
  if (error) throw error;
};

export const fetchRecentSessions = async (limit = 50) => {
  const { data, error } = await supabase
    .from('cleaning_history')
    .select('*')
    .order('check_in_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as CleaningHistoryRow[]) ?? [];
};
