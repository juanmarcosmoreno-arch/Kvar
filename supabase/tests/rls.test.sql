-- Prueba de aislamiento entre hogares y de la lógica de stock en SQL.
-- Corre con: npm run test:db   (requiere Postgres 15+ local)
\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@ejemplo.com'),
  ('00000000-0000-0000-0000-00000000000b', 'bruno@ejemplo.com'),
  ('00000000-0000-0000-0000-00000000000c', 'carla@ejemplo.com');

set local role authenticated;

-- Ana crea un hogar
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select id as hh, invite_code as code from public.create_household('Casa de Ana', 'Ana') \gset
select set_config('kvar.hh', :'hh', true) as x \gset ignored_
select set_config('kvar.code', :'code', true) as x \gset ignored_

insert into public.products (household_id, name, location_id, category_id)
select current_setting('kvar.hh')::uuid, 'Leche',
       (select id from public.locations where name = 'Heladera'),
       (select id from public.categories where name = 'Lácteos y huevos');
insert into public.products (household_id, name, is_staple)
values (current_setting('kvar.hh')::uuid, 'Café', true);

-- Bruno se une con el código
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select 1 as x from public.join_household(current_setting('kvar.code'), 'Bruno') \gset ignored_
do $$ begin
  assert (select count(*) from public.products) = 2, 'Bruno debería ver 2 productos';
end $$;

-- Bruno marca "No hay leche" -> aparece en la lista
select 1 as x from public.set_product_status((select id from public.products where name = 'Leche'), 'out', null, 'manual',
  '10000000-0000-0000-0000-000000000001', now()) \gset ignored_
do $$ begin
  assert (select count(*) from public.shopping_list_items where checked_at is null) = 1, 'Leche en la lista';
  assert (select count(*) from public.product_events where type = 'status_changed') = 1, 'evento registrado';
end $$;

-- Reintento idempotente (mismo event id) no duplica
select 1 as x from public.set_product_status((select id from public.products where name = 'Leche'), 'out', null, 'manual',
  '10000000-0000-0000-0000-000000000001', now()) \gset ignored_
do $$ begin
  assert (select count(*) from public.product_events where type = 'status_changed') = 1, 'idempotente';
end $$;

-- Café es básico: con "Queda poco" entra a la lista
select 1 as x from public.set_product_status((select id from public.products where name = 'Café'), 'low', null, 'manual',
  '10000000-0000-0000-0000-000000000002', now()) \gset ignored_
do $$ begin
  assert (select count(*) from public.shopping_list_items where checked_at is null) = 2, 'básico en lista';
end $$;

-- Cambio offline viejo no pisa el estado actual
select 1 as x from public.set_product_status((select id from public.products where name = 'Café'), 'ok', null, 'manual',
  '10000000-0000-0000-0000-000000000003', now() - interval '1 hour') \gset ignored_
do $$ begin
  assert (select status from public.products where name = 'Café') = 'low', 'LWW por hora del dispositivo';
end $$;

-- Comprar leche -> Hay
select 1 as x from public.purchase_list_item((select i.id from public.shopping_list_items i
  join public.products p on p.id = i.product_id where p.name = 'Leche' and i.checked_at is null)) \gset ignored_
do $$ begin
  assert (select status from public.products where name = 'Leche') = 'ok', 'comprado pasa a Hay';
  assert (select count(*) from public.shopping_list_items where checked_at is null) = 1, 'queda solo café';
end $$;

-- Conteo de unidades: pañales
insert into public.products (household_id, name, track_quantity, quantity, low_threshold)
values (current_setting('kvar.hh')::uuid, 'Pañales', true, 10, 3);
select 1 as x from public.set_product_status((select id from public.products where name = 'Pañales'), 'ok', 2, 'manual',
  '10000000-0000-0000-0000-000000000004', now()) \gset ignored_
do $$ begin
  assert (select status from public.products where name = 'Pañales') = 'low', '2 <= 3 queda poco';
end $$;

-- Carla (otro hogar) no ve nada
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select 1 as x from public.create_household('Casa de Carla', 'Carla') \gset ignored_
do $$ begin
  assert (select count(*) from public.products) = 0, 'Carla no ve productos ajenos';
  assert (select count(*) from public.shopping_list_items) = 0, 'Carla no ve listas ajenas';
  assert (select count(*) from public.product_events) = 0, 'Carla no ve eventos ajenos';
  assert (select count(*) from public.households) = 1, 'Carla solo ve su hogar';
  assert (select count(*) from public.household_members) = 1, 'Carla solo ve sus miembros';
end $$;

-- Carla no puede escribir en el hogar de Ana
do $$ begin
  begin
    insert into public.products (household_id, name) values (current_setting('kvar.hh')::uuid, 'Intruso');
    raise exception 'debería haber fallado';
  exception when insufficient_privilege then null;
  end;
end $$;
update public.products set name = 'hackeado';

-- Carla no puede cambiar estado de un producto ajeno vía RPC
do $$ begin
  begin
    perform public.set_product_status(
      (select id from public.products where false), 'out');
    raise exception 'debería haber fallado';
  exception when sqlstate 'P0002' then null;
  end;
end $$;

-- Volvemos a Ana: el nombre no cambió
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from public.products where name = 'hackeado') = 0, 'update ajeno sin efecto';
end $$;

-- anon no ve nada
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from public.products;
    raise exception 'anon no debería poder leer';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
\echo 'RLS y lógica de stock: OK'
