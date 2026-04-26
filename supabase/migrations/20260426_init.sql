-- Dina Limpieza · esquema inicial
-- Roles se manejan en Auth0 (claim configurable, ver .env). Acá guardamos
-- una tabla de profiles para asociar al user de Auth0 con su client_org y
-- almacenar metadata (nombre, foto, etc.).

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create type user_role as enum ('admin', 'cleaner', 'client');

-- Cliente de Dina (el dueño de los edificios). Dina mismo se modela como una
-- organización aparte (is_provider = true) si en el futuro se multi-tenant.
create table client_orgs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Mapping Auth0 sub -> profile interno
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  auth0_sub text unique not null,
  email text,
  full_name text,
  role user_role not null,
  client_org_id uuid references client_orgs(id) on delete set null,
  created_at timestamptz not null default now()
);

create index profiles_role_idx on profiles(role);
create index profiles_client_org_idx on profiles(client_org_id);

create table buildings (
  id uuid primary key default uuid_generate_v4(),
  client_org_id uuid not null references client_orgs(id) on delete cascade,
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

create index buildings_client_idx on buildings(client_org_id);

create table floors (
  id uuid primary key default uuid_generate_v4(),
  building_id uuid not null references buildings(id) on delete cascade,
  name text not null,            -- "PB", "1", "2"...
  ordinal int not null,
  created_at timestamptz not null default now(),
  unique (building_id, ordinal)
);

create type room_kind as enum ('bathroom', 'kitchen', 'dining', 'living', 'bedroom', 'office', 'hall', 'other');

create table rooms (
  id uuid primary key default uuid_generate_v4(),
  floor_id uuid not null references floors(id) on delete cascade,
  name text not null,
  kind room_kind not null default 'other',
  qr_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index rooms_floor_idx on rooms(floor_id);
create index rooms_qr_idx on rooms(qr_token);

-- Una sesión de limpieza = un par check_in / check_out hecho por un cleaner
-- en una room. check_out_at puede ser null si está en curso.
create table cleaning_sessions (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete restrict,
  cleaner_id uuid not null references profiles(id) on delete restrict,
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index sessions_room_idx on cleaning_sessions(room_id, check_in_at desc);
create index sessions_cleaner_idx on cleaning_sessions(cleaner_id, check_in_at desc);
create index sessions_open_idx on cleaning_sessions(cleaner_id) where check_out_at is null;

-- Vista cómoda para los reports del cliente.
create view cleaning_history as
select
  cs.id              as session_id,
  cs.check_in_at,
  cs.check_out_at,
  cs.notes,
  r.id               as room_id,
  r.name             as room_name,
  r.kind             as room_kind,
  r.qr_token,
  f.id               as floor_id,
  f.name             as floor_name,
  f.ordinal          as floor_ordinal,
  b.id               as building_id,
  b.name             as building_name,
  b.client_org_id,
  p.id               as cleaner_profile_id,
  p.full_name        as cleaner_name,
  p.email            as cleaner_email
from cleaning_sessions cs
join rooms r       on r.id = cs.room_id
join floors f      on f.id = r.floor_id
join buildings b   on b.id = f.building_id
join profiles p    on p.id = cs.cleaner_id;

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
-- Convención: cuando Supabase recibe el JWT de Auth0, exponemos auth.jwt() ->>
-- 'sub' y un claim custom de roles. Helper functions para no repetir.

alter table client_orgs        enable row level security;
alter table profiles           enable row level security;
alter table buildings          enable row level security;
alter table floors             enable row level security;
alter table rooms              enable row level security;
alter table cleaning_sessions  enable row level security;

create or replace function auth_sub() returns text language sql stable as $$
  select coalesce(auth.jwt() ->> 'sub', '')
$$;

create or replace function current_profile() returns profiles language sql stable as $$
  select * from profiles where auth0_sub = auth_sub() limit 1
$$;

create or replace function has_role(target user_role) returns boolean language sql stable as $$
  select exists (select 1 from profiles where auth0_sub = auth_sub() and role = target)
$$;

-- profiles: cada uno ve el suyo; admin ve todo
create policy profiles_self on profiles for select
  using (auth0_sub = auth_sub() or has_role('admin'));
create policy profiles_admin_write on profiles for all
  using (has_role('admin')) with check (has_role('admin'));

-- client_orgs: admin lee/escribe; client lee la suya
create policy client_orgs_admin on client_orgs for all
  using (has_role('admin')) with check (has_role('admin'));
create policy client_orgs_member_read on client_orgs for select
  using (id = (select client_org_id from profiles where auth0_sub = auth_sub()));

-- buildings: admin todo; client solo los de su org; cleaner los puede ver para tomar trabajo
create policy buildings_admin on buildings for all
  using (has_role('admin')) with check (has_role('admin'));
create policy buildings_client_read on buildings for select
  using (
    has_role('client')
    and client_org_id = (select client_org_id from profiles where auth0_sub = auth_sub())
  );
create policy buildings_cleaner_read on buildings for select
  using (has_role('cleaner'));

-- floors / rooms: misma lógica que buildings via join
create policy floors_admin on floors for all using (has_role('admin')) with check (has_role('admin'));
create policy floors_read on floors for select using (
  has_role('cleaner')
  or exists (
    select 1 from buildings b
    where b.id = floors.building_id
      and b.client_org_id = (select client_org_id from profiles where auth0_sub = auth_sub())
      and has_role('client')
  )
);

create policy rooms_admin on rooms for all using (has_role('admin')) with check (has_role('admin'));
create policy rooms_read on rooms for select using (
  has_role('cleaner')
  or exists (
    select 1
    from floors f
    join buildings b on b.id = f.building_id
    where f.id = rooms.floor_id
      and b.client_org_id = (select client_org_id from profiles where auth0_sub = auth_sub())
      and has_role('client')
  )
);

-- cleaning_sessions:
--   cleaner: insert/update sólo de las propias
--   client : select de las que estén en su org
--   admin  : todo
create policy sessions_admin on cleaning_sessions for all
  using (has_role('admin')) with check (has_role('admin'));

create policy sessions_cleaner_insert on cleaning_sessions for insert
  with check (
    has_role('cleaner')
    and cleaner_id = (select id from profiles where auth0_sub = auth_sub())
  );

create policy sessions_cleaner_update on cleaning_sessions for update
  using (
    has_role('cleaner')
    and cleaner_id = (select id from profiles where auth0_sub = auth_sub())
  )
  with check (
    has_role('cleaner')
    and cleaner_id = (select id from profiles where auth0_sub = auth_sub())
  );

create policy sessions_cleaner_select on cleaning_sessions for select
  using (
    has_role('cleaner')
    and cleaner_id = (select id from profiles where auth0_sub = auth_sub())
  );

create policy sessions_client_select on cleaning_sessions for select
  using (
    has_role('client')
    and exists (
      select 1
      from rooms r
      join floors f on f.id = r.floor_id
      join buildings b on b.id = f.building_id
      where r.id = cleaning_sessions.room_id
        and b.client_org_id = (select client_org_id from profiles where auth0_sub = auth_sub())
    )
  );

-- ===========================================================================
-- RPCs usadas por la app
-- ===========================================================================

-- Devuelve sesión abierta (check-in sin check-out) para el cleaner actual.
create or replace function open_session_for_current_cleaner()
returns cleaning_sessions language sql stable as $$
  select cs.*
  from cleaning_sessions cs
  join profiles p on p.id = cs.cleaner_id
  where p.auth0_sub = auth_sub()
    and cs.check_out_at is null
  order by cs.check_in_at desc
  limit 1
$$;

-- Check-in: si hay otra sesión abierta del mismo cleaner, la cierra primero.
create or replace function check_in(p_qr_token text)
returns cleaning_sessions language plpgsql security invoker as $$
declare
  v_room rooms;
  v_profile profiles;
  v_session cleaning_sessions;
begin
  select * into v_profile from profiles where auth0_sub = auth_sub() and role = 'cleaner';
  if v_profile.id is null then
    raise exception 'forbidden: solo cleaners pueden hacer check-in';
  end if;

  select * into v_room from rooms where qr_token = p_qr_token and active;
  if v_room.id is null then
    raise exception 'qr inválido o habitación inactiva';
  end if;

  update cleaning_sessions
     set check_out_at = now()
   where cleaner_id = v_profile.id and check_out_at is null;

  insert into cleaning_sessions (room_id, cleaner_id)
  values (v_room.id, v_profile.id)
  returning * into v_session;

  return v_session;
end
$$;

-- Check-out: cierra la sesión abierta del cleaner actual sobre esa habitación.
create or replace function check_out(p_qr_token text, p_notes text default null)
returns cleaning_sessions language plpgsql security invoker as $$
declare
  v_room rooms;
  v_profile profiles;
  v_session cleaning_sessions;
begin
  select * into v_profile from profiles where auth0_sub = auth_sub() and role = 'cleaner';
  if v_profile.id is null then
    raise exception 'forbidden: solo cleaners pueden hacer check-out';
  end if;

  select * into v_room from rooms where qr_token = p_qr_token;
  if v_room.id is null then
    raise exception 'qr inválido';
  end if;

  update cleaning_sessions
     set check_out_at = now(),
         notes = coalesce(p_notes, notes)
   where cleaner_id = v_profile.id
     and room_id = v_room.id
     and check_out_at is null
   returning * into v_session;

  if v_session.id is null then
    raise exception 'no hay sesión abierta para esta habitación';
  end if;

  return v_session;
end
$$;
