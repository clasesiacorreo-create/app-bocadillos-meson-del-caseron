insert into tamanos (nombre, orden) values
  ('Bocadillo', 1), ('Montado', 2), ('Único', 3);

insert into categorias (nombre, orden) values
  ('Clásicos a la plancha', 1),
  ('Ibéricos & embutidos',  2),
  ('Huevos & tortilla',     3),
  ('Del mar',               4),
  ('Gourmet Caserón',       5),
  ('Hamburguesas',          6),
  ('Sándwiches',            7);

insert into articulos (categoria_id, nombre, descripcion, imagen_url, orden)
select c.id, v.nombre, v.descripcion, v.imagen, v.orden
from (values
  ('Clásicos a la plancha','Lomo','Lomo jugoso marcado al punto con pan crujiente','/carta/lomo.jpg',1),
  ('Clásicos a la plancha','Panceta','Crujiente por fuera, tierna por dentro... y muy adictiva',null,2),
  ('Clásicos a la plancha','Pepito de ternera','Filete de ternera dorado, con carácter y sabor profundo',null,3),
  ('Clásicos a la plancha','Pollo a la plancha','Pollo jugoso, fuego vivo y pan recién horneado','/carta/pollo-a-la-plancha.jpg',4),
  ('Clásicos a la plancha','Beicon','Crujiente, jugoso y sabe a puro vicio en cada mordisco','/carta/beicon.jpg',5),
  ('Ibéricos & embutidos','Jamón serrano','Tradición pura, sabor que no necesita adornos',null,1),
  ('Ibéricos & embutidos','Jamón ibérico','Profundidad y elegancia entre pan artesano',null,2),
  ('Ibéricos & embutidos','Chorizo frito','Poderosas especias y textura irresistible',null,3),
  ('Ibéricos & embutidos','Chorizo / salchichón','Aroma delicado, matices suaves en un bocadillo fino',null,4),
  ('Ibéricos & embutidos','Queso curado','Carácter lácteo, crema firme y equilibrio perfecto',null,5),
  ('Huevos & tortilla','Tortilla española','Patata y huevo, jugosa y con sabor casero',null,1),
  ('Huevos & tortilla','Tortilla francesa','Minimalista, esponjosa y elegante en su sencillez',null,2),
  ('Del mar','Calamares a la andaluza','Crujientes y tiernos, el sur de cada bocado',null,1),
  ('Del mar','Rejos fritos','Fritura ligera, sabor auténtico y mucha personalidad',null,2),
  ('Gourmet Caserón','De la casa','Tortilla, lomo, queso, tomate, lechuga, mahonesa trufada',null,1),
  ('Gourmet Caserón','Vegetal de pollo','Pollo plancha, mezclun de lechugas, tomate, queso, césar','/carta/vegetal-de-pollo.jpg',2),
  ('Gourmet Caserón','El Caserón','Pollo plancha, beicon, pimientos, salsa caserón','/carta/el-caseron.jpg',3),
  ('Gourmet Caserón','Pulled Pork Caserón','Cerdo desmechado, salsa barbacoa, queso, lechuga, tomate y cebolla encurtida, salsa chipotle','/carta/pulled-pork-caseron.jpg',4),
  ('Gourmet Caserón','Tex Mex Caserón','Ternera mechada, rodaja de tomate, cebolla encurtida, queso, salsa caserón, cebolla frita',null,5),
  ('Hamburguesas','La Caserona','Carne madurada, salsa caserón, tomate, lechuga, beicon, queso, cebolla encurtida','/carta/la-caserona.jpg',1),
  ('Hamburguesas','La Montañesa','Carne madurada, salsa caserón, tomate, lechuga, queso de cabra, beicon, cebolla caramelizada','/carta/la-montanesa.jpg',2),
  ('Sándwiches','Sándwich mixto','Pan crujiente, jamón del bueno y queso fundido que sabe a casa y a ganas',null,1),
  ('Sándwiches','Sándwich Breakfast Caserón','Tortilla francesa, beicon crujiente, queso fundido, tomate y salsa caserón',null,2)
) as v(categoria, nombre, descripcion, imagen, orden)
join categorias c on c.nombre = v.categoria;

insert into articulo_tamanos (articulo_id, tamano_id, precio_centimos)
select a.id, t.id, v.precio
from (values
  ('Lomo','Bocadillo',500),                      ('Lomo','Montado',400),
  ('Panceta','Bocadillo',500),                   ('Panceta','Montado',400),
  ('Pepito de ternera','Bocadillo',650),
  ('Pollo a la plancha','Bocadillo',500),        ('Pollo a la plancha','Montado',400),
  ('Beicon','Bocadillo',450),                    ('Beicon','Montado',350),
  ('Jamón serrano','Bocadillo',450),             ('Jamón serrano','Montado',350),
  ('Jamón ibérico','Bocadillo',650),             ('Jamón ibérico','Montado',500),
  ('Chorizo frito','Bocadillo',550),             ('Chorizo frito','Montado',450),
  ('Chorizo / salchichón','Bocadillo',400),      ('Chorizo / salchichón','Montado',300),
  ('Queso curado','Bocadillo',400),              ('Queso curado','Montado',300),
  ('Tortilla española','Bocadillo',450),         ('Tortilla española','Montado',300),
  ('Tortilla francesa','Bocadillo',400),         ('Tortilla francesa','Montado',300),
  ('Calamares a la andaluza','Bocadillo',700),   ('Calamares a la andaluza','Montado',550),
  ('Rejos fritos','Bocadillo',700),              ('Rejos fritos','Montado',550),
  ('De la casa','Bocadillo',700),                ('De la casa','Montado',550),
  ('Vegetal de pollo','Bocadillo',650),          ('Vegetal de pollo','Montado',500),
  ('El Caserón','Bocadillo',700),                ('El Caserón','Montado',600),
  ('Pulled Pork Caserón','Bocadillo',650),       ('Pulled Pork Caserón','Montado',500),
  ('Tex Mex Caserón','Bocadillo',650),           ('Tex Mex Caserón','Montado',500),
  ('La Caserona','Único',1050),
  ('La Montañesa','Único',1150),
  ('Sándwich mixto','Único',400),
  ('Sándwich Breakfast Caserón','Único',500)
) as v(articulo, tamano, precio)
join articulos a on a.nombre = v.articulo
join tamanos   t on t.nombre = v.tamano;

insert into extras (nombre, descripcion, orden) values
  ('Queso',                 'Derretido y sabroso', 1),
  ('Cebolla caramelizada',  'Dulzor equilibrado', 2),
  ('Pimientos fritos',      'Acompañamiento clásico con esencia de cocina casera', 3),
  ('Salsa',                 'Mayonesa, césar o caserón', 4),
  ('Rodaja de tomate',      'Fresco y vibrante', 5);

-- Los extras solo tienen precio en bocadillo y montado. Al no tener precio para
-- el tamaño Único, las hamburguesas y los sándwiches no ofrecen complementos.
insert into extra_precios (extra_id, tamano_id, precio_centimos)
select e.id, t.id, case t.nombre when 'Bocadillo' then 100 else 50 end
from extras e
cross join tamanos t
where t.nombre in ('Bocadillo', 'Montado');

-- Cada artículo con bocadillo o montado ofrece todos los complementos.
insert into articulo_extras (articulo_id, extra_id)
select a.id, e.id
from articulos a
cross join extras e
where exists (
  select 1 from articulo_tamanos at
  join tamanos t on t.id = at.tamano_id
  where at.articulo_id = a.id and t.nombre in ('Bocadillo', 'Montado')
);

insert into ajustes (
  id, nombre_restaurante, telefono, direccion, horario,
  envio_centimos, pedido_minimo_centimos, envio_gratis_desde_centimos,
  antelacion_minima_min, duracion_franja_min
) values (
  true,
  'El Horno del Caserón',
  '916 78 04 35',
  'C. Hierro, 73, LOC, 28850 Torrejón de Ardoz, Madrid',
  '{
     "lunes":     [{"desde":"13:00","hasta":"16:00"},{"desde":"20:00","hasta":"23:30"}],
     "martes":    [{"desde":"13:00","hasta":"16:00"},{"desde":"20:00","hasta":"23:30"}],
     "miercoles": [{"desde":"13:00","hasta":"16:00"},{"desde":"20:00","hasta":"23:30"}],
     "jueves":    [{"desde":"13:00","hasta":"16:00"},{"desde":"20:00","hasta":"23:30"}],
     "viernes":   [{"desde":"13:00","hasta":"16:00"},{"desde":"20:00","hasta":"23:30"}],
     "sabado":    [{"desde":"13:00","hasta":"16:00"},{"desde":"20:00","hasta":"23:30"}],
     "domingo":   []
   }'::jsonb,
  200, 1000, 2000, 30, 30
);
