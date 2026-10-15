-- =============================================================================
-- Stoka — Menú de la semana
-- Solo agrega (regla de compatibilidad: ver README).
-- =============================================================================

-- Las recetas del recetario de la app no tienen fila en recipes: se guardan por su clave («catalog:…»)
alter table public.meal_plan_entries add column if not exists recipe_key text;

-- Guarda el menú de una semana entero (reemplaza el anterior de esa semana). Idempotente.
create or replace function public.save_meal_plan(p_plan jsonb, p_entries jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_hh uuid := (p_plan->>'household_id')::uuid;
  v_week date := (p_plan->>'week_start')::date;
  v_id uuid;
begin
  if not public.is_member(v_hh) then
    raise exception 'No sos miembro de este hogar' using errcode = '42501';
  end if;
  insert into public.meal_plans (id, household_id, week_start)
  values (coalesce((p_plan->>'id')::uuid, gen_random_uuid()), v_hh, v_week)
  on conflict (household_id, week_start) do update set week_start = excluded.week_start
  returning id into v_id;

  delete from public.meal_plan_entries where plan_id = v_id;
  insert into public.meal_plan_entries (plan_id, household_id, day, meal, recipe_id, recipe_key, servings, title)
  select v_id, v_hh, e.day, e.meal,
         (select r.id from public.recipes r where r.id::text = e.recipe_key and r.household_id = v_hh),
         e.recipe_key, e.servings, left(e.title, 200)
  from jsonb_to_recordset(coalesce(p_entries, '[]'::jsonb))
       as e(day date, meal text, recipe_key text, servings integer, title text)
  where e.day is not null and coalesce(e.title, '') <> '';
  return v_id;
end;
$$;
revoke all on function public.save_meal_plan(jsonb, jsonb) from public, anon;
grant execute on function public.save_meal_plan(jsonb, jsonb) to authenticated;

do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['meal_plans', 'meal_plan_entries'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end;
$$;
