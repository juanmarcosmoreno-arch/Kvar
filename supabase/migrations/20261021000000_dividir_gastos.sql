-- =============================================================================
-- Stoka — Dividir gastos: quién pagó cada ticket, cómo se reparte y «Saldar»
-- Solo agrega (regla de compatibilidad: ver README).
-- =============================================================================

-- Quién pagó (por defecto, quien cargó el ticket)
alter table public.purchase_lines add column if not exists paid_by uuid references auth.users (id) on delete set null;
update public.purchase_lines set paid_by = created_by where paid_by is null and created_by is not null;

-- Cómo se reparte: { "<user_id>": peso } (0 = no participa). Sin datos: partes iguales.
alter table public.households add column if not exists expense_split jsonb;

-- «Saldar»: desde acá las cuentas vuelven a cero (se guarda cómo estaban, para el historial)
create table if not exists public.expense_settlements (
  id          uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  settled_at  timestamptz not null default now(),
  settled_by  uuid references auth.users (id) on delete set null default auth.uid(),
  balances    jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists expense_settlements_household_idx on public.expense_settlements (household_id, settled_at desc);

alter table public.expense_settlements enable row level security;
drop policy if exists expense_settlements_member_all on public.expense_settlements;
create policy expense_settlements_member_all on public.expense_settlements for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
grant select, insert, update, delete on public.expense_settlements to authenticated;
