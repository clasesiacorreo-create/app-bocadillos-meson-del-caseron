-- Bucket público para las fotos de los artículos. Público de lectura: las
-- imágenes se muestran en la carta pública sin autenticación. La escritura
-- solo ocurre desde el servidor con la clave de servicio (endpoint de subida
-- del panel), que se salta cualquier política de storage.objects, así que no
-- hace falta declarar ninguna aquí.
insert into storage.buckets (id, name, public)
values ('carta', 'carta', true)
on conflict (id) do nothing;
