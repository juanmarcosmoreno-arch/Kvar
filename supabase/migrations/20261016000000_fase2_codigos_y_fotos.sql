-- =============================================================================
-- Kvar — Fase 2: códigos de barras y fotos de productos
-- Solo agrega (regla de compatibilidad: ver README).
-- =============================================================================

-- Por si la base se creó con una versión anterior de la migración inicial
alter table public.products add column if not exists image_path text;

-- Aprender una equivalencia (código de barras, línea de ticket, frase → producto).
-- Si ya existía para otro producto, gana la corrección del usuario.
-- security invoker: la RLS de product_aliases aplica a quien llama.
create or replace function public.learn_alias(
  p_household_id uuid,
  p_product_id   uuid,
  p_kind         public.alias_kind,
  p_alias        text,
  p_normalized   text,
  p_id           uuid default gen_random_uuid()
)
returns public.product_aliases
language plpgsql
security invoker
set search_path = public
as $$
declare
  row public.product_aliases;
begin
  insert into public.product_aliases (id, household_id, product_id, kind, alias, normalized, created_by)
  values (p_id, p_household_id, p_product_id, p_kind, p_alias, p_normalized, auth.uid())
  on conflict (household_id, kind, normalized) do update
    set hits = case when product_aliases.product_id = excluded.product_id
                    then product_aliases.hits + 1 else 1 end,
        alias = case when product_aliases.product_id = excluded.product_id
                     then product_aliases.alias else excluded.alias end,
        product_id = excluded.product_id,
        last_used_at = now()
  returning * into row;
  return row;
end;
$$;
grant execute on function public.learn_alias(uuid, uuid, public.alias_kind, text, text, uuid) to authenticated;

-- Los códigos aprendidos por un miembro le sirven al instante al otro
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and tablename = 'product_aliases') then
    alter publication supabase_realtime add table public.product_aliases;
  end if;
end;
$$;

-- Bucket de fotos (idempotente: la migración inicial ya lo crea en bases nuevas)
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('product-images', 'product-images', false, 2097152, array['image/png', 'image/webp', 'image/jpeg'])
    on conflict (id) do update set allowed_mime_types = excluded.allowed_mime_types;

    execute 'drop policy if exists product_images_member on storage.objects';
    execute $p$
      create policy product_images_member on storage.objects for all to authenticated
      using (bucket_id = 'product-images' and public.is_member(((storage.foldername(name))[1])::uuid))
      with check (bucket_id = 'product-images' and public.is_member(((storage.foldername(name))[1])::uuid))
    $p$;
  end if;
end;
$$;
