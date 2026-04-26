-- Datos de prueba: cliente con 4 edificios.
-- Reemplazar los auth0_sub por subs reales después de logueos de prueba.

insert into client_orgs (id, name)
values ('11111111-1111-1111-1111-111111111111', 'Cliente Demo SA');

insert into buildings (client_org_id, name, address) values
  ('11111111-1111-1111-1111-111111111111', 'Edificio A', 'Calle 1 100'),
  ('11111111-1111-1111-1111-111111111111', 'Edificio B', 'Calle 2 200'),
  ('11111111-1111-1111-1111-111111111111', 'Edificio C', 'Calle 3 300'),
  ('11111111-1111-1111-1111-111111111111', 'Edificio D', 'Calle 4 400');
