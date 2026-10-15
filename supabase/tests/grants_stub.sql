-- En Supabase estos permisos los da la plataforma por defecto.
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
