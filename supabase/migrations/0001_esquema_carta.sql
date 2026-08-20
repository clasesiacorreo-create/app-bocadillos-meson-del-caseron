create table categorias (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  orden      int  not null default 0,
  activa     boolean not null default true,
  creado_en  timestamptz not null default now()
);

create table tamanos (
  id      uuid primary key default gen_random_uuid(),
  nombre  text not null unique,
  orden   int  not null default 0
);

create table articulos (
  id            uuid primary key default gen_random_uuid(),
  categoria_id  uuid not null references categorias(id) on delete restrict,
  nombre        text not null unique,
  descripcion   text not null default '',
  imagen_url    text,
  disponible    boolean not null default true,
  orden         int  not null default 0,
  creado_en     timestamptz not null default now()
);

create table articulo_tamanos (
  id                uuid primary key default gen_random_uuid(),
  articulo_id       uuid not null references articulos(id) on delete cascade,
  tamano_id         uuid not null references tamanos(id) on delete restrict,
  precio_centimos   int  not null check (precio_centimos >= 0),
  disponible        boolean not null default true,
  unique (articulo_id, tamano_id)
);

create table extras (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null unique,
  descripcion  text not null default '',
  disponible   boolean not null default true,
  orden        int  not null default 0
);

create table extra_precios (
  id               uuid primary key default gen_random_uuid(),
  extra_id         uuid not null references extras(id) on delete cascade,
  tamano_id        uuid not null references tamanos(id) on delete restrict,
  precio_centimos  int  not null check (precio_centimos >= 0),
  unique (extra_id, tamano_id)
);

create table articulo_extras (
  articulo_id  uuid not null references articulos(id) on delete cascade,
  extra_id     uuid not null references extras(id) on delete cascade,
  primary key (articulo_id, extra_id)
);

-- Fila única: la columna id es booleana y solo admite true.
create table ajustes (
  id                           boolean primary key default true check (id),
  nombre_restaurante           text not null,
  telefono                     text not null,
  direccion                    text not null,
  horario                      jsonb not null default '{}'::jsonb,
  envio_centimos               int not null default 200  check (envio_centimos >= 0),
  pedido_minimo_centimos       int not null default 1000 check (pedido_minimo_centimos >= 0),
  envio_gratis_desde_centimos  int check (envio_gratis_desde_centimos >= 0),
  antelacion_minima_min        int not null default 30 check (antelacion_minima_min >= 0),
  duracion_franja_min          int not null default 30 check (duracion_franja_min > 0)
);

create index articulos_categoria_idx        on articulos(categoria_id);
create index articulo_tamanos_articulo_idx  on articulo_tamanos(articulo_id);
create index extra_precios_extra_idx        on extra_precios(extra_id);

-- La carta y los ajustes son de lectura pública. No se define ninguna política
-- de escritura: sin política, la escritura queda denegada para anon y para
-- authenticated. Las políticas del personal llegan con el plan del panel.
alter table categorias       enable row level security;
alter table tamanos          enable row level security;
alter table articulos        enable row level security;
alter table articulo_tamanos enable row level security;
alter table extras           enable row level security;
alter table extra_precios    enable row level security;
alter table articulo_extras  enable row level security;
alter table ajustes          enable row level security;

create policy "lectura publica" on categorias       for select using (true);
create policy "lectura publica" on tamanos          for select using (true);
create policy "lectura publica" on articulos        for select using (true);
create policy "lectura publica" on articulo_tamanos for select using (true);
create policy "lectura publica" on extras           for select using (true);
create policy "lectura publica" on extra_precios    for select using (true);
create policy "lectura publica" on articulo_extras  for select using (true);
create policy "lectura publica" on ajustes          for select using (true);
