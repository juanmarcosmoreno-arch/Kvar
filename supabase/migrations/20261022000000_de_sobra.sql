-- «Hay de sobra»: hay tanto que por ahora no hace falta comprar. No es un estado más (sigue en «Hay»): es una
-- marca del producto que la app usa para no sugerirlo ni ponerlo en la lista. Se quita sola cuando el producto
-- pasa a «Queda poco» o «No hay».

alter table public.products add column if not exists surplus boolean not null default false;

create or replace function public.clear_surplus_on_status()
returns trigger
language plpgsql
as $$
begin
  if new.status <> 'ok' then
    new.surplus := false;
  end if;
  return new;
end;
$$;

drop trigger if exists products_clear_surplus on public.products;
create trigger products_clear_surplus
  before insert or update of status on public.products
  for each row execute function public.clear_surplus_on_status();
