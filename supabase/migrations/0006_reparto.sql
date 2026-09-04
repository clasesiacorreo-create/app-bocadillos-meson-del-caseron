-- Referencia formal al miembro del personal que lleva el pedido. `on delete
-- set null` porque un pedido ya entregado debe seguir existiendo en el
-- historial aunque la cuenta del repartidor se dé de baja más adelante.
alter table pedidos
  add constraint pedidos_repartidor_id_fkey
  foreign key (repartidor_id) references perfiles_staff(user_id) on delete set null;

create index pedidos_repartidor_idx on pedidos(repartidor_id);

-- El repartidor ve los pedidos a domicilio listos para recoger —siempre,
-- sea quien sea el que acabe recogiéndolos, porque hasta que alguien pulsa
-- "Recojo este" no hay repartidor asignado— y los que él mismo lleva ahora
-- mismo. Es una política adicional a la de la migración 0004 ("el personal
-- lee pedidos segun su rol"): Postgres combina varias políticas permisivas
-- del mismo tipo con OR, así que no hace falta tocar esa migración.
create policy "el repartidor lee pedidos para repartir y los suyos" on pedidos
  for select
  using (
    rol_del_usuario_actual() = 'repartidor'
    and modo_entrega = 'domicilio'
    and (
      estado = 'pendiente_envio'
      or (estado = 'en_reparto' and repartidor_id = auth.uid())
    )
  );

create policy "el repartidor lee lineas de sus pedidos" on pedido_lineas
  for select
  using (
    exists (
      select 1 from pedidos p
      where p.id = pedido_lineas.pedido_id
        and rol_del_usuario_actual() = 'repartidor'
        and p.modo_entrega = 'domicilio'
        and (
          p.estado = 'pendiente_envio'
          or (p.estado = 'en_reparto' and p.repartidor_id = auth.uid())
        )
    )
  );

create policy "el repartidor lee extras de sus pedidos" on pedido_extras
  for select
  using (
    exists (
      select 1
      from pedido_lineas l
      join pedidos p on p.id = l.pedido_id
      where l.id = pedido_extras.linea_id
        and rol_del_usuario_actual() = 'repartidor'
        and p.modo_entrega = 'domicilio'
        and (
          p.estado = 'pendiente_envio'
          or (p.estado = 'en_reparto' and p.repartidor_id = auth.uid())
        )
    )
  );
