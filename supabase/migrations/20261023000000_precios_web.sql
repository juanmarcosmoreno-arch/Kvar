-- Precios de las webs de los súper (función precios-web): cada búsqueda se guarda unas horas, compartida entre
-- todos los hogares, para consultar cada web lo menos posible. Son precios públicos, no datos de nadie.
-- Solo la usa la función con la clave de servicio: sin políticas, la app no la puede leer ni escribir.

create table if not exists public.web_prices (
  chain text not null,
  -- Zona (Ta-Ta: departamento; las demás cadenas: '')
  region text not null default '',
  -- La búsqueda normalizada («dulce de leche»)
  query text not null,
  items jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now(),
  primary key (chain, region, query)
);

alter table public.web_prices enable row level security;

create index if not exists web_prices_fetched_at on public.web_prices (fetched_at);
