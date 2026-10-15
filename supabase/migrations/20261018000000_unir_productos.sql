-- =============================================================================
-- Stoka — Unir dos productos que son lo mismo (dos marcas de azúcar, un duplicado)
-- Solo agrega (regla de compatibilidad: ver README).
-- =============================================================================

-- El producto `p_source` pasa a ser `p_target`: códigos, historial, lista, recetas y lotes se mueven,
-- y `p_source` se borra. Queda lo mejor de los dos estados (si una marca hay, hay) y, si los dos se
-- cuentan, se suman las unidades.
-- security definer: el historial (product_events) no se puede editar desde la app; esta función lo
-- reasigna después de comprobar que quien llama es miembro del hogar. Reintentar no hace daño.
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
    return dst; -- ya se unió (reintento)
  end if;
  if src.household_id <> dst.household_id then
    raise exception 'Los productos son de hogares distintos' using errcode = '42501';
  end if;

  update public.product_aliases set product_id = dst.id where product_id = src.id;
  update public.product_events set product_id = dst.id where product_id = src.id;
  update public.recipe_ingredients set product_id = dst.id where product_id = src.id;
  update public.product_lots set product_id = dst.id where product_id = src.id;

  -- Lista: si los dos estaban, queda uno solo
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
