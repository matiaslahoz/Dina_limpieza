-- Dina Limpieza · features 02
--   * Geofence opcional por edificio
--   * Push notifications (token + threshold de habitación sin limpiar)
--   * Función para detectar habitaciones con limpieza vencida
--   * RPC check_in con validación de geofence

alter table profiles
  add column if not exists expo_push_token text,
  add column if not exists last_seen_at timestamptz;

alter table buildings
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists geofence_radius_m int,
  add column if not exists stale_threshold_hours int;
-- geofence_radius_m null/0 ⇒ sin geofence
-- stale_threshold_hours null ⇒ no notificar por este edificio

-- Distancia haversine entre dos puntos (en metros)
create or replace function haversine_m(
  lat1 double precision, lon1 double precision,
  lat2 double precision, lon2 double precision
) returns double precision language sql immutable as $$
  select 6371000 * 2 * asin(sqrt(
    pow(sin(radians((lat2 - lat1) / 2)), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    pow(sin(radians((lon2 - lon1) / 2)), 2)
  ))
$$;

-- Reemplazo de check_in con validación de geofence opcional
create or replace function check_in(
  p_qr_token text,
  p_lat double precision default null,
  p_lng double precision default null
)
returns cleaning_sessions language plpgsql security invoker as $$
declare
  v_room rooms;
  v_floor floors;
  v_building buildings;
  v_profile profiles;
  v_session cleaning_sessions;
  v_dist double precision;
begin
  select * into v_profile from profiles where auth0_sub = auth_sub() and role = 'cleaner';
  if v_profile.id is null then
    raise exception 'forbidden: solo cleaners pueden hacer check-in';
  end if;

  select * into v_room from rooms where qr_token = p_qr_token and active;
  if v_room.id is null then
    raise exception 'qr inválido o habitación inactiva';
  end if;

  select * into v_floor from floors where id = v_room.floor_id;
  select * into v_building from buildings where id = v_floor.building_id;

  if v_building.geofence_radius_m is not null
     and v_building.geofence_radius_m > 0
     and v_building.latitude is not null
     and v_building.longitude is not null
  then
    if p_lat is null or p_lng is null then
      raise exception 'geofence: ubicación requerida para check-in en este edificio';
    end if;
    v_dist := haversine_m(v_building.latitude, v_building.longitude, p_lat, p_lng);
    if v_dist > v_building.geofence_radius_m then
      raise exception 'geofence: estás a % m del edificio (máximo %)',
        round(v_dist), v_building.geofence_radius_m;
    end if;
  end if;

  update cleaning_sessions
     set check_out_at = now()
   where cleaner_id = v_profile.id and check_out_at is null;

  insert into cleaning_sessions (room_id, cleaner_id)
  values (v_room.id, v_profile.id)
  returning * into v_session;

  update profiles set last_seen_at = now() where id = v_profile.id;

  return v_session;
end
$$;

-- Habitaciones cuya última limpieza supera el threshold del edificio.
-- Si una habitación nunca fue limpiada, se considera vencida.
create or replace view stale_rooms as
with last_per_room as (
  select
    r.id          as room_id,
    r.name        as room_name,
    f.id          as floor_id,
    f.name        as floor_name,
    b.id          as building_id,
    b.name        as building_name,
    b.client_org_id,
    b.stale_threshold_hours,
    max(cs.check_out_at) as last_clean_at
  from rooms r
  join floors f on f.id = r.floor_id
  join buildings b on b.id = f.building_id
  left join cleaning_sessions cs
    on cs.room_id = r.id and cs.check_out_at is not null
  where r.active
    and b.stale_threshold_hours is not null
  group by r.id, r.name, f.id, f.name, b.id, b.name, b.client_org_id, b.stale_threshold_hours
)
select *,
  extract(epoch from (now() - coalesce(last_clean_at, '1970-01-01'::timestamptz))) / 3600 as hours_since_clean
from last_per_room
where last_clean_at is null
   or now() - last_clean_at > make_interval(hours => stale_threshold_hours);

-- Notificaciones enviadas (para no spamear)
create table if not exists stale_notifications (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  notified_at timestamptz not null default now(),
  recipients int not null
);
create index if not exists stale_notifications_room_idx
  on stale_notifications(room_id, notified_at desc);

alter table stale_notifications enable row level security;
create policy stale_notifications_admin
  on stale_notifications for all
  using (has_role('admin')) with check (has_role('admin'));

-- Permiso al usuario para escribir su propio push token
create policy profiles_self_update_push on profiles for update
  using (auth0_sub = auth_sub())
  with check (auth0_sub = auth_sub());
