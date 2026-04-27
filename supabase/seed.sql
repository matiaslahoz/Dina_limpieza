-- Datos demo para Dina Limpieza.
-- Idempotente: podés correrlo varias veces sin duplicar nada.
--
-- Estructura que crea:
--   Cliente Demo SA
--   ├── Edificio A · Pisos 1, 2, 3
--   ├── Edificio B · Pisos 1, 2, 3
--   ├── Edificio C · Pisos 1, 2, 3
--   └── Edificio D · Pisos 1, 2, 3
--   Cada piso tiene: Baño 1, Baño 2, Cocina, Salón,
--                    Sala de reuniones, Oficina 1, Oficina 2, Oficina 3

do $$
declare
  v_client uuid := '11111111-1111-1111-1111-111111111111';
  v_building uuid;
  v_floor uuid;
  building_name text;
  floor_ord int;
  room_count int;
begin
  -- Cliente
  if not exists (select 1 from client_orgs where id = v_client) then
    insert into client_orgs (id, name) values (v_client, 'Cliente Demo SA');
  end if;

  -- Edificios (idempotente)
  foreach building_name in array array['Edificio A', 'Edificio B', 'Edificio C', 'Edificio D']
  loop
    select id into v_building
      from buildings
     where client_org_id = v_client and name = building_name;

    if v_building is null then
      insert into buildings (client_org_id, name)
      values (v_client, building_name)
      returning id into v_building;
    end if;

    -- 3 pisos por edificio (idempotente)
    for floor_ord in 1..3 loop
      select id into v_floor
        from floors
       where building_id = v_building and ordinal = floor_ord;

      if v_floor is null then
        insert into floors (building_id, name, ordinal)
        values (v_building, floor_ord::text, floor_ord)
        returning id into v_floor;
      end if;

      -- Habitaciones (sólo si el piso está vacío, para no duplicar)
      select count(*) into room_count from rooms where floor_id = v_floor;
      if room_count = 0 then
        insert into rooms (floor_id, name, kind) values
          (v_floor, 'Baño 1',           'bathroom'),
          (v_floor, 'Baño 2',           'bathroom'),
          (v_floor, 'Cocina',           'kitchen'),
          (v_floor, 'Salón',            'living'),
          (v_floor, 'Sala de reuniones','other'),
          (v_floor, 'Oficina 1',        'office'),
          (v_floor, 'Oficina 2',        'office'),
          (v_floor, 'Oficina 3',        'office');
      end if;
    end loop;
  end loop;
end $$;

-- Resumen rápido para verificar
select
  b.name as edificio,
  count(distinct f.id) as pisos,
  count(r.id) as habitaciones
from buildings b
left join floors f on f.building_id = b.id
left join rooms  r on r.floor_id = f.id
where b.client_org_id = '11111111-1111-1111-1111-111111111111'
group by b.id, b.name
order by b.name;
