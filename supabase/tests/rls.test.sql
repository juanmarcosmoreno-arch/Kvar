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

-- Fase 2: aprender un código de barras
select 1 as x from public.learn_alias(current_setting('kvar.hh')::uuid,
  (select id from public.products where name = 'Leche'), 'barcode', '7730123456789', '7730123456789') \gset ignored_
select 1 as x from public.learn_alias(current_setting('kvar.hh')::uuid,
  (select id from public.products where name = 'Leche'), 'barcode', '7730123456789', '7730123456789') \gset ignored_
do $$ begin
  assert (select hits from public.product_aliases where normalized = '7730123456789') = 2, 'suma usos';
end $$;
-- Corrección: el mismo código era del Café
select 1 as x from public.learn_alias(current_setting('kvar.hh')::uuid,
  (select id from public.products where name = 'Café'), 'barcode', '7730123456789', '7730123456789') \gset ignored_
do $$ begin
  assert (select count(*) from public.product_aliases) = 1, 'no duplica';
  assert (select p.name from public.product_aliases a join public.products p on p.id = a.product_id) = 'Café', 'gana la corrección';
end $$;

-- Carla (otro hogar) no ve nada
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select 1 as x from public.create_household('Casa de Carla', 'Carla') \gset ignored_
do $$ begin
  assert (select count(*) from public.products) = 0, 'Carla no ve productos ajenos';
  assert (select count(*) from public.shopping_list_items) = 0, 'Carla no ve listas ajenas';
  assert (select count(*) from public.product_events) = 0, 'Carla no ve eventos ajenos';
  assert (select count(*) from public.households) = 1, 'Carla solo ve su hogar';
  assert (select count(*) from public.product_aliases) = 0, 'Carla no ve códigos ajenos';
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

-- Carla no puede enseñarle códigos al hogar de Ana
do $$ begin
  begin
    perform public.learn_alias(current_setting('kvar.hh')::uuid, gen_random_uuid(), 'barcode', '1', '1');
    raise exception 'debería haber fallado';
  exception when insufficient_privilege or foreign_key_violation then null;
  end;
end $$;

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

-- Borrar cuenta: Bruno se va del hogar compartido (el hogar de Ana sigue)
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select public.delete_my_account();
-- Carla era la única de su hogar: se borra el hogar entero
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select public.delete_my_account();
reset role;
do $$ begin
  assert (select count(*) from auth.users) = 1, 'quedan solo los datos de Ana';
  assert (select count(*) from public.households) = 1, 'el hogar de Carla se borró';
  assert (select count(*) from public.household_members) = 1, 'Bruno salió del hogar de Ana';
  assert (select count(*) from public.products) = 3, 'los productos de Ana siguen';
  assert (select count(*) from public.product_events where user_id is null) > 0, 'eventos de Bruno anonimizados';
end $$;

-- Recetas (Fase 5): Ana guarda una receta con ingredientes; reenviarla no duplica
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select 1 as x from public.save_recipe(
  jsonb_build_object('id', '20000000-0000-0000-0000-000000000001', 'household_id', current_setting('kvar.hh'),
    'title', 'Tuco', 'servings', 4, 'meal_types', jsonb_build_array('cena')),
  jsonb_build_array(
    jsonb_build_object('name', 'fideos', 'quantity', 400, 'unit', 'g', 'sort_order', 0),
    jsonb_build_object('name', 'leche', 'product_id', (select id from public.products where name = 'Leche'), 'sort_order', 1),
    jsonb_build_object('name', '  ', 'sort_order', 2))) \gset ignored_
select 1 as x from public.save_recipe(
  jsonb_build_object('id', '20000000-0000-0000-0000-000000000001', 'household_id', current_setting('kvar.hh'),
    'title', 'Tuco de la abuela', 'servings', 4),
  jsonb_build_array(jsonb_build_object('name', 'fideos', 'quantity', 400, 'unit', 'g'))) \gset ignored_
do $$ begin
  assert (select count(*) from public.recipes) = 1, 'una receta';
  assert (select title from public.recipes) = 'Tuco de la abuela', 'se actualiza';
  assert (select count(*) from public.recipe_ingredients) = 1, 'ingredientes reemplazados';
end $$;
-- Unir productos: «Azúcar Bella Unión» pasa a ser «Azúcar» con su código y su historial
insert into public.products (household_id, name, status) values
  (current_setting('kvar.hh')::uuid, 'Azúcar', 'out'),
  (current_setting('kvar.hh')::uuid, 'Azúcar Bella Unión', 'ok');
select 1 as x from public.learn_alias(current_setting('kvar.hh')::uuid,
  (select id from public.products where name = 'Azúcar Bella Unión'), 'barcode', '7730000000999', '7730000000999') \gset ignored_
select 1 as x from public.merge_products(
  (select id from public.products where name = 'Azúcar Bella Unión'),
  (select id from public.products where name = 'Azúcar')) \gset ignored_
do $$ begin
  assert (select count(*) from public.products where name like 'Azúcar%') = 1, 'queda uno';
  assert (select status from public.products where name = 'Azúcar') = 'ok', 'si una marca hay, hay';
  assert (select p.name from public.product_aliases a join public.products p on p.id = a.product_id
          where a.normalized = '7730000000999') = 'Azúcar', 'el código pasa al que queda';
  assert (select count(*) from public.product_events e join public.products p on p.id = e.product_id
          where p.name = 'Azúcar') >= 2, 'el historial también';
end $$;

-- Gastos: una línea de ticket; cargarla de nuevo no duplica
insert into public.purchase_lines (id, household_id, product_id, name, quantity, unit_price, total, receipt_key)
values ('30000000-0000-0000-0000-000000000001', current_setting('kvar.hh')::uuid,
        (select id from public.products where name = 'Azúcar'), 'Azúcar 1 kg', 2, 60, 120, 't1')
on conflict (id) do nothing;
insert into public.purchase_lines (id, household_id, name, total)
values ('30000000-0000-0000-0000-000000000001', current_setting('kvar.hh')::uuid, 'Azúcar 1 kg', 120)
on conflict (id) do nothing;
do $$ begin
  assert (select count(*) from public.purchase_lines) = 1, 'una sola línea';
end $$;

insert into public.recipe_feedback (household_id, catalog_key, recipe_title, action)
values (current_setting('kvar.hh')::uuid, 'catalog:fideos-con-tuco', 'Fideos con tuco', 'cooked');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

-- Ana se va: era la única que quedaba, el hogar se borra
select public.delete_my_account();
reset role;
do $$ begin
  assert (select count(*) from public.households) = 0, 'sin miembros no queda hogar';
  assert (select count(*) from public.product_events) = 0, 'ni sus datos';
end $$;

-- La versión mínima se lee sin sesión
set local role anon;
do $$ begin
  assert (select value from public.app_config where key = 'min_client_version') is not null, 'anon lee app_config';
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
