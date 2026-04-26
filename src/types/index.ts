export type UserRole = 'admin' | 'cleaner' | 'client';

export type RoomKind =
  | 'bathroom'
  | 'kitchen'
  | 'dining'
  | 'living'
  | 'bedroom'
  | 'office'
  | 'hall'
  | 'other';

export interface Profile {
  id: string;
  auth0_sub: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  client_org_id: string | null;
}

export interface Building {
  id: string;
  client_org_id: string;
  name: string;
  address: string | null;
}

export interface Floor {
  id: string;
  building_id: string;
  name: string;
  ordinal: number;
}

export interface Room {
  id: string;
  floor_id: string;
  name: string;
  kind: RoomKind;
  qr_token: string;
  active: boolean;
}

export interface CleaningSession {
  id: string;
  room_id: string;
  cleaner_id: string;
  check_in_at: string;
  check_out_at: string | null;
  notes: string | null;
}

export interface CleaningHistoryRow {
  session_id: string;
  check_in_at: string;
  check_out_at: string | null;
  notes: string | null;
  room_id: string;
  room_name: string;
  room_kind: RoomKind;
  qr_token: string;
  floor_id: string;
  floor_name: string;
  floor_ordinal: number;
  building_id: string;
  building_name: string;
  client_org_id: string;
  cleaner_profile_id: string;
  cleaner_name: string | null;
  cleaner_email: string | null;
}
