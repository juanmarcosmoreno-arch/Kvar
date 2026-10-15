-- =============================================================================
-- Kvar — esquema inicial
-- Diseñado para todas las fases (ver docs/SPEC.md). Las tablas de fases futuras
-- se crean ya, con RLS, para no tener que rehacer el modelo.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.stock_status as enum ('ok', 'low', 'out');

create type public.event_type as enum (
  'created',          -- alta del producto
  'status_changed',   -- cambio de estado (Hay / Queda poco / No hay)
  'quantity_changed', -- cambio de conteo de unidades
  'purchased',        -- marcado como comprado desde la lista
  'consumed',         -- usado en una receta ("La hice", Fase 5)
  'expired',          -- vencido (Fase 4)
  'deleted'
);

create type public.event_source as enum (
  'manual', 'swipe', 'quick_out', 'shopping', 'barcode', 'voice',
  'receipt', 'photo', 'email', 'recipe', 'system'
);

create type public.list_reason as enum (
  'out',      -- pasó a No hay
  'low',      -- pasó a Queda poco (básico o preferencia del hogar)
  'manual',   -- agregado a mano
  'recipe',   -- falta para una receta (Fase 5)
  'plan',     -- plan semanal (Fase 6)
  'predicted' -- predicción de consumo (Fase 4)
);

create type public.alias_kind as enum ('barcode', 'receipt', 'voice', 'photo', 'email');

create type public.import_kind as enum ('receipt', 'photo', 'voice', 'email', 'barcode');
create type public.import_status as enum ('pending', 'processing', 'review', 'confirmed', 'discarded', 'failed');

create type public.member_role as enum ('owner', 'member');

-- -----------------------------------------------------------------------------
-- Hogares y miembros
-- -----------------------------------------------------------------------------
create table public.households (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 80),
  invite_code  text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  -- Preferencias del hogar
  list_on_low  boolean not null default false, -- agregar a la lista al pasar a "Queda poco"
  default_servings integer not null default 2 check (default_servings between 1 and 20), -- personas a comer (Fase 5)
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         public.member_role not null default 'member',
  display_name text,
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index household_members_user_idx on public.household_members (user_id);

-- Función auxiliar usada por todas las políticas RLS.
-- security definer para evitar recursión de RLS sobre household_members.
create or replace function public.is_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- Organización: lugares y categorías (editables por hogar)
-- -----------------------------------------------------------------------------
create table public.locations (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 40),
  icon         text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index locations_household_idx on public.locations (household_id);

create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 40),
  icon         text,
  sort_order   integer not null default 0, -- también ordena la lista de compras
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index categories_household_idx on public.categories (household_id);

-- -----------------------------------------------------------------------------
-- Productos
-- -----------------------------------------------------------------------------
create table public.products (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references public.households (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 120),
  category_id       uuid references public.categories (id) on delete set null,
  location_id       uuid references public.locations (id) on delete set null,
  status            public.stock_status not null default 'ok',
  -- Conteo opcional (pañales, latas, freezer)
  track_quantity    boolean not null default false,
  quantity          integer check (quantity is null or quantity >= 0),
  low_threshold     integer not null default 1 check (low_threshold >= 0),
  unit              text, -- "unidades", "latas", "paquetes"…
  -- Básicos: avisan siempre antes de quedarse sin ellos
  is_staple         boolean not null default false,
  -- Producto cargado sin identificar (escaneo/ticket/foto): se completa después
  unidentified      boolean not null default false,
  -- Fase 2: datos de Open Food Facts
  brand             text,
  image_url         text,  -- imagen externa (Open Food Facts)
  -- Fase 2: foto propia recortada sin fondo, en Storage: product-images/<household_id>/<product_id>.png
  image_path        text,
  off_data          jsonb,
  -- Fase 4: vencimiento "principal" (los lotes viven en product_lots)
  expires_on        date,
  -- Fase 4: predicción de consumo (calculada por una Edge Function)
  avg_days_to_low   numeric,
  avg_days_to_out   numeric,
  predicted_low_at  timestamptz,
  -- Fase 5: etiquetas de ingrediente para cruzar con recetas ("arroz", "cebolla")
  ingredient_tags   text[] not null default '{}',
  notes             text,
  status_changed_at timestamptz not null default now(),
  created_by        uuid references auth.users (id) on delete set null default auth.uid(),
  updated_by        uuid references auth.users (id) on delete set null default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index products_household_idx on public.products (household_id);
create index products_status_idx on public.products (household_id, status);

-- Lotes con vencimiento / fecha de ingreso al freezer (Fase 4, usado en Fase 5)
create table public.product_lots (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  product_id   uuid not null references public.products (id) on delete cascade,
  quantity     integer check (quantity is null or quantity >= 0),
  expires_on   date,
  stored_at    timestamptz not null default now(),
  consumed_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index product_lots_product_idx on public.product_lots (product_id);
create index product_lots_expiry_idx on public.product_lots (household_id, expires_on) where consumed_at is null;

-- -----------------------------------------------------------------------------
-- Eventos: cada cambio queda registrado (base para aprender el consumo)
-- El id lo genera el cliente => idempotente al reintentar sincronizaciones.
-- -----------------------------------------------------------------------------
create table public.product_events (
  id                uuid primary key,
  household_id      uuid not null references public.households (id) on delete cascade,
  product_id        uuid references public.products (id) on delete set null,
  user_id           uuid references auth.users (id) on delete set null default auth.uid(),
  type              public.event_type not null,
  source            public.event_source not null default 'manual',
  from_status       public.stock_status,
  to_status         public.stock_status,
  from_quantity     integer,
  to_quantity       integer,
  metadata          jsonb,
  client_created_at timestamptz,  -- cuándo ocurrió en el dispositivo (offline)
  created_at        timestamptz not null default now()
);
create index product_events_product_idx on public.product_events (product_id, created_at desc);
create index product_events_household_idx on public.product_events (household_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Lista de compras
-- -----------------------------------------------------------------------------
create table public.shopping_list_items (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  product_id    uuid references public.products (id) on delete cascade,
  name          text, -- texto libre cuando no hay producto ("velas de cumpleaños")
  quantity      integer check (quantity is null or quantity > 0),
  note          text,
  reason        public.list_reason not null default 'manual',
  checked_at    timestamptz,
  checked_by    uuid references auth.users (id) on delete set null,
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (product_id is not null or name is not null)
);
create index shopping_list_household_idx on public.shopping_list_items (household_id);
-- Un producto solo puede estar una vez en la lista abierta
create unique index shopping_list_open_product_uidx
  on public.shopping_list_items (product_id) where checked_at is null and product_id is not null;

-- -----------------------------------------------------------------------------
-- Alias / equivalencias aprendidas (Fases 2–3, 6)
-- código de barras, texto de ticket, texto de voz, etc. → producto
-- -----------------------------------------------------------------------------
create table public.product_aliases (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  product_id   uuid not null references public.products (id) on delete cascade,
  kind         public.alias_kind not null,
  alias        text not null,       -- texto original ("LECHE CNP ENT 1L")
  normalized   text not null,       -- normalizado (ver src/domain/aliases.ts)
  hits         integer not null default 1,
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  unique (household_id, kind, normalized)
);
create index product_aliases_product_idx on public.product_aliases (product_id);

-- Caché global de códigos de barras de Open Food Facts (Fase 2), sin datos del hogar
create table public.barcode_cache (
  barcode    text primary key,
  found      boolean not null,
  name       text,
  brand      text,
  category   text,
  image_url  text,
  raw        jsonb,
  fetched_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Importaciones con IA (ticket, foto, voz, correo) — Fases 2, 3 y 6
-- -----------------------------------------------------------------------------
create table public.imports (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  kind         public.import_kind not null,
  status       public.import_status not null default 'pending',
  storage_path text,   -- imagen en Supabase Storage
  raw_text     text,   -- transcripción / cuerpo del correo
  result       jsonb,  -- líneas detectadas y sugerencias de producto
  error        text,
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index imports_household_idx on public.imports (household_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Notificaciones push (Fase 4)
-- -----------------------------------------------------------------------------
create table public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade default auth.uid(),
  household_id uuid not null references public.households (id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  created_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Recetas (Fase 5)
-- -----------------------------------------------------------------------------
create table public.recipes (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  title         text not null,
  source        text not null default 'own' check (source in ('own', 'imported', 'ai')),
  source_url    text,
  servings      integer check (servings is null or servings between 1 and 50), -- porciones de la receta original
  total_minutes integer,
  meal_types    text[] not null default '{}', -- almuerzo, cena, vianda, dulce
  constraints   text[] not null default '{}', -- sin_horno, una_olla
  tags          text[] not null default '{}', -- para aprender preferencias
  steps         text,
  image_url     text,
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index recipes_household_idx on public.recipes (household_id);

create table public.recipe_ingredients (
  id           uuid primary key default gen_random_uuid(),
  recipe_id    uuid not null references public.recipes (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  product_id   uuid references public.products (id) on delete set null,
  name         text not null,
  -- Cantidad estructurada para escalar según las personas ("200 g" → quantity 200, unit 'g').
  -- amount guarda el texto original o lo que no se escala ("a gusto", "1 pizca").
  quantity     numeric check (quantity is null or quantity > 0),
  unit         text,
  amount       text,
  optional     boolean not null default false,
  sort_order   integer not null default 0
);
create index recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id);

-- Feedback para aprender preferencias ("descartó", "la hice", "me gustó")
create table public.recipe_feedback (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id      uuid references auth.users (id) on delete set null default auth.uid(),
  recipe_id    uuid references public.recipes (id) on delete set null,
  recipe_title text,
  tags         text[] not null default '{}',
  action       text not null check (action in ('dismissed', 'cooked', 'liked')),
  created_at   timestamptz not null default now()
);
create index recipe_feedback_household_idx on public.recipe_feedback (household_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Plan semanal (Fase 6)
-- -----------------------------------------------------------------------------
create table public.meal_plans (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  week_start   date not null,
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  unique (household_id, week_start)
);

create table public.meal_plan_entries (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references public.meal_plans (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  day          date not null,
  meal         text not null check (meal in ('almuerzo', 'cena', 'vianda', 'dulce')),
  recipe_id    uuid references public.recipes (id) on delete set null,
  servings     integer check (servings is null or servings between 1 and 50), -- personas para esa comida
  title        text not null,
  done         boolean not null default false
);
create index meal_plan_entries_plan_idx on public.meal_plan_entries (plan_id);

-- =============================================================================
-- updated_at automático
-- =============================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger locations_touch before update on public.locations
  for each row execute function public.touch_updated_at();
create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
create trigger shopping_touch before update on public.shopping_list_items
  for each row execute function public.touch_updated_at();
create trigger imports_touch before update on public.imports
  for each row execute function public.touch_updated_at();
create trigger recipes_touch before update on public.recipes
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- Row Level Security: todo se aísla por hogar
-- =============================================================================
alter table public.households          enable row level security;
alter table public.household_members   enable row level security;
alter table public.locations           enable row level security;
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.product_lots        enable row level security;
alter table public.product_events      enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.product_aliases     enable row level security;
alter table public.barcode_cache       enable row level security;
alter table public.imports             enable row level security;
alter table public.push_subscriptions  enable row level security;
alter table public.recipes             enable row level security;
alter table public.recipe_ingredients  enable row level security;
alter table public.recipe_feedback     enable row level security;
alter table public.meal_plans          enable row level security;
alter table public.meal_plan_entries   enable row level security;

-- Hogares: se ven y editan solo si sos miembro. Se crean vía RPC create_household.
create policy households_select on public.households
  for select to authenticated using (public.is_member(id));
create policy households_update on public.households
  for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

-- Miembros: ves a los miembros de tus hogares; podés salir de un hogar (borrarte).
-- Las altas se hacen vía RPC (create_household / join_household).
create policy members_select on public.household_members
  for select to authenticated using (public.is_member(household_id));
create policy members_update_self on public.household_members
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy members_delete_self on public.household_members
  for delete to authenticated using (user_id = auth.uid());

-- Tablas con household_id: acceso completo para miembros del hogar.
do $$
declare
  t text;
begin
  foreach t in array array[
    'locations', 'categories', 'products', 'product_lots', 'shopping_list_items',
    'product_aliases', 'imports', 'recipes', 'recipe_ingredients', 'recipe_feedback',
    'meal_plans', 'meal_plan_entries'
  ] loop
    execute format(
      'create policy %1$s_member_all on public.%1$I for all to authenticated
         using (public.is_member(household_id)) with check (public.is_member(household_id))',
      t
    );
  end loop;
end;
$$;

-- Eventos: se leen y se agregan, nunca se editan ni borran (historial).
create policy events_select on public.product_events
  for select to authenticated using (public.is_member(household_id));
create policy events_insert on public.product_events
  for insert to authenticated
  with check (public.is_member(household_id) and user_id = auth.uid());

-- Push: cada usuario maneja sus suscripciones, en hogares donde es miembro.
create policy push_own on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_member(household_id));

-- barcode_cache: lectura para autenticados; escritura solo desde Edge Functions (service role).
create policy barcode_cache_read on public.barcode_cache
  for select to authenticated using (true);

-- =============================================================================
-- Lógica de stock en el servidor (idéntica a src/domain/*.ts)
-- =============================================================================

-- Estado derivado del conteo de unidades.
create or replace function public.status_from_quantity(qty integer, threshold integer)
returns public.stock_status
language sql immutable as $$
  select case
    when qty is null then null
    when qty <= 0 then 'out'::public.stock_status
    when qty <= threshold then 'low'::public.stock_status
    else 'ok'::public.stock_status
  end;
$$;

-- Mantiene la lista de compras según el nuevo estado de un producto.
-- security invoker: la RLS de shopping_list_items aplica a quien llama.
create or replace function public.sync_list_for_product(p public.products)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  hh_list_on_low boolean;
  wants boolean;
  new_reason public.list_reason;
begin
  select list_on_low into hh_list_on_low from public.households where id = p.household_id;

  if p.status = 'out' then
    wants := true; new_reason := 'out';
  elsif p.status = 'low' and (p.is_staple or coalesce(hh_list_on_low, false)) then
    wants := true; new_reason := 'low';
  else
    wants := false;
  end if;

  if wants then
    insert into public.shopping_list_items (household_id, product_id, reason, created_by)
    values (p.household_id, p.id, new_reason, auth.uid())
    on conflict (product_id) where checked_at is null and product_id is not null
    do update set reason = case
        when shopping_list_items.reason in ('low', 'predicted') then excluded.reason
        else shopping_list_items.reason
      end;
  elsif p.status = 'ok' then
    -- Si vuelve a haber, se quitan los ítems que agregó la app (no los manuales).
    delete from public.shopping_list_items
    where product_id = p.id and checked_at is null
      and reason in ('out', 'low', 'predicted');
  end if;
end;
$$;

-- Cambiar estado / cantidad de un producto. Idempotente por p_event_id.
-- Last-write-wins por hora del dispositivo: si llega un cambio offline más viejo
-- que el último aplicado, se registra el evento pero no pisa el estado actual.
create or replace function public.set_product_status(
  p_product_id  uuid,
  p_status      public.stock_status,
  p_quantity    integer default null,
  p_source      public.event_source default 'manual',
  p_event_id    uuid default gen_random_uuid(),
  p_client_time timestamptz default now()
)
returns public.products
language plpgsql
security invoker
set search_path = public
as $$
declare
  cur public.products;
  next_status public.stock_status := p_status;
  next_qty integer;
  ev_type public.event_type;
begin
  if exists (select 1 from public.product_events where id = p_event_id) then
    select * into cur from public.products where id = p_product_id;
    return cur; -- ya procesado
  end if;

  select * into cur from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Producto no encontrado' using errcode = 'P0002';
  end if;

  next_qty := cur.quantity;
  if cur.track_quantity and p_quantity is not null then
    next_qty := greatest(p_quantity, 0);
    next_status := public.status_from_quantity(next_qty, cur.low_threshold);
  elsif cur.track_quantity then
    next_qty := case p_status
      when 'out' then 0
      when 'low' then case when coalesce(cur.quantity, 0) between 1 and cur.low_threshold
                           then cur.quantity else greatest(cur.low_threshold, 1) end
      else greatest(coalesce(cur.quantity, 0), cur.low_threshold + 1)
    end;
    next_status := public.status_from_quantity(next_qty, cur.low_threshold);
  end if;

  ev_type := case when cur.track_quantity and p_quantity is not null
                  then 'quantity_changed'::public.event_type
                  else 'status_changed'::public.event_type end;

  insert into public.product_events (
    id, household_id, product_id, user_id, type, source,
    from_status, to_status, from_quantity, to_quantity, client_created_at
  ) values (
    p_event_id, cur.household_id, cur.id, auth.uid(), ev_type, p_source,
    cur.status, next_status, cur.quantity, next_qty, p_client_time
  );

  if p_client_time < cur.status_changed_at then
    return cur; -- cambio viejo: queda en el historial pero no pisa el estado
  end if;

  update public.products
     set status = next_status,
         quantity = next_qty,
         status_changed_at = p_client_time,
         updated_by = auth.uid()
   where id = cur.id
  returning * into cur;

  perform public.sync_list_for_product(cur);
  return cur;
end;
$$;

-- Marcar un ítem de la lista como comprado: el producto pasa a "Hay".
create or replace function public.purchase_list_item(
  p_item_id     uuid,
  p_event_id    uuid default gen_random_uuid(),
  p_client_time timestamptz default now()
)
returns public.shopping_list_items
language plpgsql
security invoker
set search_path = public
as $$
declare
  item public.shopping_list_items;
  prod public.products;
  next_qty integer;
begin
  select * into item from public.shopping_list_items where id = p_item_id for update;
  if not found then
    raise exception 'Ítem no encontrado' using errcode = 'P0002';
  end if;
  if item.checked_at is not null then
    return item; -- ya comprado (reintento)
  end if;

  update public.shopping_list_items
     set checked_at = p_client_time, checked_by = auth.uid()
   where id = item.id
  returning * into item;

  if item.product_id is not null then
    select * into prod from public.products where id = item.product_id for update;
    next_qty := case when prod.track_quantity
                     then coalesce(prod.quantity, 0) + coalesce(item.quantity, 1)
                     else prod.quantity end;

    if not exists (select 1 from public.product_events where id = p_event_id) then
      insert into public.product_events (
        id, household_id, product_id, user_id, type, source,
        from_status, to_status, from_quantity, to_quantity, client_created_at
      ) values (
        p_event_id, prod.household_id, prod.id, auth.uid(), 'purchased', 'shopping',
        prod.status,
        case when prod.track_quantity then public.status_from_quantity(next_qty, prod.low_threshold) else 'ok' end,
        prod.quantity, next_qty, p_client_time
      );
    end if;

    update public.products
       set status = case when prod.track_quantity
                         then public.status_from_quantity(next_qty, prod.low_threshold)
                         else 'ok' end,
           quantity = next_qty,
           status_changed_at = greatest(prod.status_changed_at, p_client_time),
           updated_by = auth.uid()
     where id = prod.id;
  end if;

  return item;
end;
$$;

-- Deshacer "comprado" (toque por error en el súper).
create or replace function public.unpurchase_list_item(p_item_id uuid)
returns public.shopping_list_items
language plpgsql
security invoker
set search_path = public
as $$
declare
  item public.shopping_list_items;
  ev public.product_events;
begin
  select * into item from public.shopping_list_items where id = p_item_id for update;
  if not found or item.checked_at is null then
    return item;
  end if;

  if item.product_id is not null then
    select * into ev from public.product_events
     where product_id = item.product_id and type = 'purchased'
     order by created_at desc limit 1;
    if found then
      update public.products
         set status = coalesce(ev.from_status, status),
             quantity = case when track_quantity then ev.from_quantity else quantity end,
             updated_by = auth.uid()
       where id = item.product_id;
    end if;
    -- Si mientras tanto se creó otro ítem abierto para el producto, se borra el viejo.
    if exists (select 1 from public.shopping_list_items
                where product_id = item.product_id and checked_at is null) then
      delete from public.shopping_list_items where id = item.id;
      return item;
    end if;
  end if;

  update public.shopping_list_items
     set checked_at = null, checked_by = null
   where id = item.id
  returning * into item;
  return item;
end;
$$;

-- Al crear un producto: registrar evento y agregarlo a la lista si corresponde.
create or replace function public.on_product_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.product_events (id, household_id, product_id, user_id, type, source, to_status, to_quantity)
  values (gen_random_uuid(), new.household_id, new.id, auth.uid(), 'created', 'manual', new.status, new.quantity);
  perform public.sync_list_for_product(new);
  return new;
end;
$$;
create trigger products_after_insert after insert on public.products
  for each row execute function public.on_product_created();

-- Si se edita el producto (básico, umbral) se recalcula la lista.
create or replace function public.on_product_flags_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_list_for_product(new);
  return new;
end;
$$;
create trigger products_after_flags after update of is_staple on public.products
  for each row when (old.is_staple is distinct from new.is_staple)
  execute function public.on_product_flags_changed();

-- =============================================================================
-- Hogar: crear, unirse, regenerar código
-- =============================================================================
create or replace function public.create_household(p_name text, p_display_name text default null)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  hh public.households;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  insert into public.households (name, created_by) values (p_name, uid) returning * into hh;
  insert into public.household_members (household_id, user_id, role, display_name)
  values (hh.id, uid, 'owner', p_display_name);

  insert into public.locations (household_id, name, icon, sort_order) values
    (hh.id, 'Heladera', 'fridge', 1),
    (hh.id, 'Freezer',  'snow',   2),
    (hh.id, 'Alacena',  'shelf',  3),
    (hh.id, 'Baño',     'drop',   4),
    (hh.id, 'Limpieza', 'spark',  5);

  insert into public.categories (household_id, name, sort_order) values
    (hh.id, 'Frutas y verduras', 1),
    (hh.id, 'Panadería',         2),
    (hh.id, 'Carnes y pescados', 3),
    (hh.id, 'Lácteos y huevos',  4),
    (hh.id, 'Almacén',           5),
    (hh.id, 'Congelados',        6),
    (hh.id, 'Bebidas',           7),
    (hh.id, 'Limpieza',          8),
    (hh.id, 'Higiene',           9),
    (hh.id, 'Bebé',             10),
    (hh.id, 'Mascotas',         11),
    (hh.id, 'Otros',            12);

  return hh;
end;
$$;

create or replace function public.join_household(p_code text, p_display_name text default null)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  hh public.households;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  select * into hh from public.households where invite_code = upper(trim(p_code));
  if not found then
    raise exception 'Código inválido' using errcode = 'P0002';
  end if;

  insert into public.household_members (household_id, user_id, role, display_name)
  values (hh.id, uid, 'member', p_display_name)
  on conflict (household_id, user_id) do nothing;

  return hh;
end;
$$;

create or replace function public.regenerate_invite_code(p_household_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
begin
  if not public.is_member(p_household_id) then
    raise exception 'Sin permiso' using errcode = '42501';
  end if;
  code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
  update public.households set invite_code = code where id = p_household_id;
  return code;
end;
$$;

revoke all on function public.create_household(text, text) from public, anon;
revoke all on function public.join_household(text, text) from public, anon;
revoke all on function public.regenerate_invite_code(uuid) from public, anon;
grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.join_household(text, text) to authenticated;
grant execute on function public.regenerate_invite_code(uuid) to authenticated;

-- =============================================================================
-- Configuración global de la app (lectura pública)
-- min_client_version: las versiones de la app más viejas que esta piden actualizar.
-- Se sube solo cuando un cambio de la base deja de ser compatible con apps viejas
-- (las apps del App Store no se actualizan todas al mismo tiempo).
-- =============================================================================
create table public.app_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
create policy app_config_read on public.app_config for select to anon, authenticated using (true);
insert into public.app_config (key, value) values ('min_client_version', '0.1.0');

-- =============================================================================
-- Borrar la cuenta desde la app (requisito del App Store)
-- - Los hogares donde sos el único miembro se borran con todos sus datos.
-- - En los hogares compartidos te vas; si eras quien lo creó, pasa al miembro más antiguo.
-- - El historial de eventos queda, sin tu usuario (user_id pasa a null).
-- =============================================================================
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  delete from public.households h
   where exists (select 1 from public.household_members m where m.household_id = h.id and m.user_id = uid)
     and not exists (select 1 from public.household_members m where m.household_id = h.id and m.user_id <> uid);

  update public.household_members m
     set role = 'owner'
   where (m.household_id, m.user_id) in (
     select distinct on (o.household_id) o.household_id, o.user_id
       from public.household_members o
      where o.user_id <> uid
        and o.household_id in (
          select household_id from public.household_members where user_id = uid and role = 'owner'
        )
      order by o.household_id, o.joined_at
   );

  delete from auth.users where id = uid; -- en cascada: membresías, suscripciones push
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- =============================================================================
-- Storage: fotos de productos recortadas (Fase 2). Bucket privado por hogar:
-- la primera carpeta del path es el household_id.
-- =============================================================================
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('product-images', 'product-images', false, 2097152, array['image/png', 'image/webp'])
    on conflict (id) do nothing;

    execute $p$
      create policy product_images_member on storage.objects for all to authenticated
      using (bucket_id = 'product-images' and public.is_member(((storage.foldername(name))[1])::uuid))
      with check (bucket_id = 'product-images' and public.is_member(((storage.foldername(name))[1])::uuid))
    $p$;
  end if;
end;
$$;

-- =============================================================================
-- Realtime
-- =============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.products, public.shopping_list_items, public.locations,
      public.categories, public.households, public.household_members;
  end if;
end;
$$;
-- Nota: Realtime respeta RLS para INSERT/UPDATE. Los DELETE no se pueden filtrar y
-- solo exponen la clave primaria; el cliente ignora ids que no conoce.
