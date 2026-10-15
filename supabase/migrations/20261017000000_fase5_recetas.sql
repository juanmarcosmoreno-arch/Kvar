-- =============================================================================
-- Stoka — Fase 5: «¿Qué cocino?»
-- Solo agrega (regla de compatibilidad: ver README).
-- =============================================================================

-- Feedback de las recetas que trae la app (no tienen fila en recipes): «catalog:fideos-con-tuco»
alter table public.recipe_feedback add column if not exists catalog_key text;

-- Guarda una receta propia con todos sus ingredientes, de una sola vez.
-- security invoker: la RLS de recipes y recipe_ingredients aplica a quien llama.
-- Idempotente: reenviar la misma receta (cola offline) deja el mismo resultado.
create or replace function public.save_recipe(p_recipe jsonb, p_ingredients jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid := (p_recipe->>'id')::uuid;
  v_hh uuid := (p_recipe->>'household_id')::uuid;
begin
  if not public.is_member(v_hh) then
    raise exception 'No sos miembro de este hogar' using errcode = '42501';
  end if;

  insert into public.recipes as r (
    id, household_id, title, source, source_url, servings, total_minutes,
    meal_types, constraints, tags, steps, image_url
  ) values (
    v_id, v_hh,
    left(trim(p_recipe->>'title'), 200),
    coalesce(nullif(p_recipe->>'source', ''), 'own'),
    nullif(p_recipe->>'source_url', ''),
    (p_recipe->>'servings')::integer,
    (p_recipe->>'total_minutes')::integer,
    coalesce(array(select jsonb_array_elements_text(p_recipe->'meal_types')), '{}'),
    coalesce(array(select jsonb_array_elements_text(p_recipe->'constraints')), '{}'),
    coalesce(array(select jsonb_array_elements_text(p_recipe->'tags')), '{}'),
    p_recipe->>'steps',
    nullif(p_recipe->>'image_url', '')
  )
  on conflict (id) do update set
    title = excluded.title, source = excluded.source, source_url = excluded.source_url,
    servings = excluded.servings, total_minutes = excluded.total_minutes,
    meal_types = excluded.meal_types, constraints = excluded.constraints, tags = excluded.tags,
    steps = excluded.steps, image_url = excluded.image_url, updated_at = now()
  where r.household_id = v_hh;

  delete from public.recipe_ingredients where recipe_id = v_id;

  insert into public.recipe_ingredients (
    id, recipe_id, household_id, product_id, name, quantity, unit, amount, optional, sort_order
  )
  select
    coalesce(i.id, gen_random_uuid()), v_id, v_hh,
    -- solo productos del mismo hogar
    (select p.id from public.products p where p.id = i.product_id and p.household_id = v_hh),
    left(trim(i.name), 200), nullif(i.quantity, 0), i.unit, i.amount,
    coalesce(i.optional, false), coalesce(i.sort_order, 0)
  from jsonb_to_recordset(coalesce(p_ingredients, '[]'::jsonb)) as i(
    id uuid, product_id uuid, name text, quantity numeric, unit text, amount text, optional boolean, sort_order integer
  )
  where coalesce(trim(i.name), '') <> '';
end;
$$;
revoke all on function public.save_recipe(jsonb, jsonb) from public, anon;
grant execute on function public.save_recipe(jsonb, jsonb) to authenticated;

-- Las recetas que carga un miembro le aparecen al otro al instante
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['recipes', 'recipe_ingredients', 'recipe_feedback'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end;
$$;
