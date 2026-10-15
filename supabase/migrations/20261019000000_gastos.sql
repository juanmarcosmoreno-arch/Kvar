-- =============================================================================
-- Stoka — Gastos: los precios de cada línea de ticket
-- Solo agrega (regla de compatibilidad: ver README).
-- =============================================================================

create table if not exists public.purchase_lines (
  id           uuid primary key,  -- estable por ticket y línea: cargar el mismo ticket dos veces no duplica
  household_id uuid not null references public.households (id) on delete cascade,
  product_id   uuid references public.products (id) on delete set null,
  name         text not null,
  quantity     numeric not null default 1 check (quantity > 0),
  unit_price   numeric check (unit_price is null or unit_price >= 0),
  total        numeric not null check (total >= 0),
  store        text,
  bought_at    timestamptz not null default now(),
  receipt_key  text,
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now()
);
create index if not exists purchase_lines_household_idx on public.purchase_lines (household_id, bought_at desc);
create index if not exists purchase_lines_product_idx on public.purchase_lines (product_id, bought_at desc);

alter table public.purchase_lines enable row level security;
drop policy if exists purchase_lines_member_all on public.purchase_lines;
create policy purchase_lines_member_all on public.purchase_lines for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
grant select, insert, update, delete on public.purchase_lines to authenticated;

-- Unir productos también pasa los precios (misma función que antes, más purchase_lines)
create or replace function public.merge_products(p_source uuid, p_target uuid)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  src public.products;
  dst public.products;
  rank_src integer;
  rank_dst integer;
begin
  select * into dst from public.products where id = p_target for update;
  if not found then
    raise exception 'Producto no encontrado' using errcode = 'P0002';
  end if;
  if not public.is_member(dst.household_id) then
    raise exception 'No sos miembro de este hogar' using errcode = '42501';
  end if;
  select * into src from public.products where id = p_source for update;
  if not found or p_source = p_target then
    return dst;
  end if;
  if src.household_id <> dst.household_id then
    raise exception 'Los productos son de hogares distintos' using errcode = '42501';
  end if;

  update public.product_aliases set product_id = dst.id where product_id = src.id;
  update public.product_events set product_id = dst.id where product_id = src.id;
  update public.recipe_ingredients set product_id = dst.id where product_id = src.id;
  update public.product_lots set product_id = dst.id where product_id = src.id;
  update public.purchase_lines set product_id = dst.id where product_id = src.id;

  if exists (select 1 from public.shopping_list_items where product_id = dst.id and checked_at is null) then
    delete from public.shopping_list_items where product_id = src.id and checked_at is null;
  end if;
  update public.shopping_list_items set product_id = dst.id where product_id = src.id;

  rank_src := case src.status when 'ok' then 0 when 'low' then 1 else 2 end;
  rank_dst := case dst.status when 'ok' then 0 when 'low' then 1 else 2 end;
  if dst.track_quantity and src.track_quantity then
    update public.products
       set quantity = coalesce(dst.quantity, 0) + coalesce(src.quantity, 0),
           status = public.status_from_quantity(coalesce(dst.quantity, 0) + coalesce(src.quantity, 0), dst.low_threshold),
           is_staple = dst.is_staple or src.is_staple,
           updated_by = auth.uid()
     where id = dst.id
    returning * into dst;
  else
    update public.products
       set status = case when rank_src < rank_dst then src.status else dst.status end,
           is_staple = dst.is_staple or src.is_staple,
           image_path = coalesce(dst.image_path, src.image_path),
           image_url = coalesce(dst.image_url, src.image_url),
           updated_by = auth.uid()
     where id = dst.id
    returning * into dst;
  end if;

  delete from public.products where id = src.id;
  return dst;
end;
$$;
revoke all on function public.merge_products(uuid, uuid) from public, anon;
grant execute on function public.merge_products(uuid, uuid) to authenticated;
