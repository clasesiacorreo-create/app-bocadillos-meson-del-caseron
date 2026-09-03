create table perfiles_staff (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  nombre   text not null,
  rol      text not null check (rol in ('admin', 'cocina', 'repartidor'))
);

alter table perfiles_staff enable row level security;

create policy "el personal lee su propio perfil" on perfiles_staff
  for select
  using (user_id = auth.uid());

-- `security definer` para poder leer `perfiles_staff` desde las políticas de
-- otras tablas sin depender de que la propia política de "lee su propio
-- perfil" se cumpla en ese contexto: es una función de solo lectura sobre
-- una fila que ya pertenece al usuario que la llama (auth.uid()).
create or replace function rol_del_usuario_actual()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select rol from perfiles_staff where user_id = auth.uid()
$$;

-- El personal lee pedidos según su rol: admin los ve todos, cocina todos
-- salvo los que aún no se han cobrado. No se concede ninguna política de
-- escritura: las transiciones siguen pasando por el servidor con la clave
-- de servicio, condicionadas al estado anterior.
create policy "el personal lee pedidos segun su rol" on pedidos
  for select
  using (
    rol_del_usuario_actual() = 'admin'
    or (rol_del_usuario_actual() = 'cocina' and estado <> 'pendiente_pago')
  );

create policy "el personal lee lineas segun el pedido" on pedido_lineas
  for select
  using (
    exists (
      select 1 from pedidos p
      where p.id = pedido_lineas.pedido_id
        and (
          rol_del_usuario_actual() = 'admin'
          or (rol_del_usuario_actual() = 'cocina' and p.estado <> 'pendiente_pago')
        )
    )
  );

create policy "el personal lee extras segun el pedido" on pedido_extras
  for select
  using (
    exists (
      select 1
      from pedido_lineas l
      join pedidos p on p.id = l.pedido_id
      where l.id = pedido_extras.linea_id
        and (
          rol_del_usuario_actual() = 'admin'
          or (rol_del_usuario_actual() = 'cocina' and p.estado <> 'pendiente_pago')
        )
    )
  );

-- Realtime autoriza cada cambio contra las políticas de RLS de la tabla, así
-- que el tablero de cocina solo recibe los pedidos y líneas que el usuario
-- ya podría leer por su cuenta.
alter publication supabase_realtime add table pedidos, pedido_lineas;
