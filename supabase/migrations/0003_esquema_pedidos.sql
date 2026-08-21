create table pedidos (
  id                          uuid primary key default gen_random_uuid(),
  codigo_publico              text not null unique,
  estado                      text not null default 'pendiente_pago'
                                 check (estado in
                                   ('pendiente_pago', 'nuevo', 'en_preparacion',
                                    'pendiente_envio', 'en_reparto', 'entregado')),
  modo_entrega                text not null check (modo_entrega in ('domicilio', 'recogida')),

  cliente_nombre              text not null,
  cliente_apellidos           text not null,
  cliente_telefono            text not null,

  direccion_calle             text,
  direccion_numero            text,
  direccion_piso              text,
  direccion_cp                text,
  direccion_ciudad            text,
  direccion_indicaciones      text,

  notas                       text not null default '',

  franja_solicitada_inicio    timestamptz not null,
  franja_solicitada_fin       timestamptz not null,
  franja_solicitada_asap      boolean not null default false,
  franja_confirmada_inicio    timestamptz,
  franja_confirmada_fin       timestamptz,
  confirmado_en               timestamptz,

  subtotal_centimos           int not null check (subtotal_centimos >= 0),
  envio_centimos               int not null check (envio_centimos >= 0),
  total_centimos               int not null check (total_centimos >= 0),

  stripe_session_id           text unique,
  stripe_payment_intent       text,

  repartidor_id                uuid,

  creado_en                    timestamptz not null default now(),
  pagado_en                    timestamptz,
  entregado_en                  timestamptz
);

create table pedido_lineas (
  id                          uuid primary key default gen_random_uuid(),
  pedido_id                   uuid not null references pedidos(id) on delete cascade,
  -- Referencia al catálogo, solo para agrupar y contar. `on delete set null`
  -- porque el pedido conserva la copia del nombre y el precio aunque el
  -- artículo cambie o se borre más adelante.
  articulo_id                  uuid references articulos(id) on delete set null,
  tamano_id                    uuid references tamanos(id) on delete set null,
  nombre_articulo              text not null,
  nombre_tamano                text not null,
  precio_unitario_centimos     int not null check (precio_unitario_centimos >= 0),
  cantidad                     int not null check (cantidad > 0),
  notas_linea                  text not null default '',
  preparada                    boolean not null default false
);

create table pedido_extras (
  id               uuid primary key default gen_random_uuid(),
  linea_id         uuid not null references pedido_lineas(id) on delete cascade,
  extra_id         uuid references extras(id) on delete set null,
  nombre_extra     text not null,
  precio_centimos  int not null check (precio_centimos >= 0)
);

create table avisos_log (
  id          uuid primary key default gen_random_uuid(),
  pedido_id   uuid not null references pedidos(id) on delete cascade,
  canal       text not null,
  resultado   text not null check (resultado in ('enviado', 'fallido')),
  error       text,
  creado_en   timestamptz not null default now()
);

create index pedidos_estado_idx       on pedidos(estado);
create index pedido_lineas_pedido_idx on pedido_lineas(pedido_id);
create index pedido_extras_linea_idx  on pedido_extras(linea_id);
create index avisos_log_pedido_idx    on avisos_log(pedido_id);

-- Los pedidos no son accesibles desde el navegador anónimo ni con el código
-- público: toda lectura y escritura pasa por el servidor con la clave de
-- servicio, que salta RLS. No se define ninguna política de lectura o
-- escritura para anon/authenticated; las políticas del personal llegan con
-- el plan del panel.
alter table pedidos       enable row level security;
alter table pedido_lineas enable row level security;
alter table pedido_extras enable row level security;
alter table avisos_log    enable row level security;
