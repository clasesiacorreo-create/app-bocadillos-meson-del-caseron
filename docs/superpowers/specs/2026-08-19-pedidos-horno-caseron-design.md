# El Horno del Caserón — Pedidos a domicilio y gestión interna

**Fecha:** 2026-08-19
**Estado:** aprobado, pendiente de plan de implementación

## 1. Contexto y objetivo

El Horno del Caserón es un asador y casa de comidas que vende bocadillos, hamburguesas
y sándwiches. Hoy no tiene canal de pedidos propio.

Se construye una web app con dos caras:

- Una **web pública**, pensada para el móvil, donde un cliente ve la carta, monta su
  pedido, pide una franja de entrega, paga y sigue el estado de lo que pidió.
- Una **plataforma interna** desde la que el restaurante opera esos pedidos, mantiene la
  carta y reparte, también desde el móvil: la cocina no tiene ordenador ni tablet.

El MVP usa Stripe en modo sandbox. No se manejan cobros reales todavía.

## 2. Alcance

### Dentro

- Carta pública con categorías, artículos, tamaños variables por artículo y complementos.
- Carrito con complementos, cantidades, nota por línea y nota general del pedido.
- Datos de contacto en el propio pedido, sin cuenta de cliente.
- Reparto a domicilio o recogida en local.
- Petición de franja horaria de entrega, con confirmación por parte del restaurante.
- Coste de envío fijo y pedido mínimo, ambos configurables.
- Pago online con Stripe Checkout (sandbox).
- Página de seguimiento del pedido por enlace no adivinable.
- Panel de cocina con las fases del pedido y confirmación de artículos preparados.
- Aviso sonoro y vibración al entrar un pedido nuevo.
- Aviso por WhatsApp al responsable mediante CallMeBot.
- Administración de carta, disponibilidad rápida, ajustes del restaurante y equipo.
- Historial de pedidos entregados y caja del día.
- Perfil de repartidor con sus entregas.
- Tres roles: admin, cocina, repartidor.

### Fuera

- Rechazo o cancelación de pedidos por parte del restaurante. La válvula de escape es
  ajustar la franja de entrega. Si hay que anular, se hace por teléfono y el reembolso
  se emite a mano desde el panel de Stripe.
- Reembolsos automáticos.
- Cuentas de cliente, historial de cliente entre dispositivos, direcciones guardadas
  en servidor.
- Pago en efectivo o al recibir.
- Zonas de reparto y tarifas por zona.
- Notificaciones al cliente por WhatsApp o SMS. CallMeBot solo escribe a números que
  hayan autorizado previamente al bot, así que no sirve para clientes.
- Asignación de repartos y optimización de rutas.
- Control de stock por ingrediente. La disponibilidad es un interruptor por artículo.

## 3. Decisiones y por qué

| Decisión | Motivo |
|---|---|
| Un solo proyecto Next.js para web y panel | Comparten modelo de datos y tipos; un cambio de precio se refleja en ambos sin sincronizar nada. |
| Sin cuenta de cliente | Cero fricción antes del primer pedido. El teléfono identifica al cliente para atención. |
| Stripe Checkout alojado | Stripe se ocupa del formulario de tarjeta, 3D Secure y wallets. No tocamos datos de tarjeta. |
| El pedido nace `pendiente_pago` y lo confirma el webhook | La cocina solo ve pedidos cobrados. Los carritos abandonados no molestan. |
| Totales calculados en el servidor | El importe que envía el navegador es manipulable. |
| Importes en céntimos enteros | Evita el error de coma flotante que descuadra el total contra lo cobrado. |
| Tamaños en tabla, no dos columnas fijas | Hamburguesas y sándwiches tienen precio único; los extras cuestan según el tamaño. |
| Copia del nombre y precio en cada línea del pedido | Un cambio de precio no puede reescribir lo que ya se cobró. |
| Confirmación de franja como atributo, no como fase | Confirmar la hora y empezar a cocinar son momentos distintos en un pedido programado. |
| Estado `en_reparto` | Con repartidor, "pendiente de envío" mezclaba lo que está en el mostrador con lo que va en la moto. |
| Panel como PWA instalable | Javier lo abre como una app desde el icono, a pantalla completa. |
| Sin nombres propios en la web pública | Se habla de "el restaurante" o "El Horno del Caserón". |

## 4. Arquitectura

Next.js (App Router, TypeScript) desplegado en Vercel, con Supabase Cloud como base de
datos, autenticación de personal, almacenamiento de imágenes y canal de tiempo real.
Stripe en modo test para el cobro.

```
src/
  app/
    (publico)/
      page.tsx                  carta
      checkout/page.tsx         datos, franja, revisión
      pedido/[codigo]/page.tsx  seguimiento
    panel/
      page.tsx                  tablero de pedidos
      carta/                    administración del catálogo
      historial/                pedidos entregados y caja
      ajustes/                  datos del restaurante y reglas
      equipo/                   usuarios y roles
    reparto/
      page.tsx                  para repartir / mis entregas
    api/stripe/webhook/route.ts
  lib/
    precios/     cálculo de totales            (puro, sin BD ni red)
    horario/     generación de franjas         (puro, sin BD ni red)
    estados/     máquina de estados y permisos (puro, sin BD ni red)
    carta/       lectura y escritura del catálogo
    pedidos/     creación y transiciones
    pagos/       sesión de Stripe y webhook
    avisos/      CallMeBot
    supabase/    clientes de navegador, servidor y servicio
  components/
```

`precios`, `horario` y `estados` no dependen de la base de datos ni de la red. Contienen
la lógica que puede hacer perder dinero o pedidos, y por eso viven aislados: se prueban
enteros con tests unitarios rápidos.

Zona horaria de referencia: **Europe/Madrid**. Las marcas de tiempo se guardan como
`timestamptz` y las franjas se calculan siempre en esa zona.

## 5. Modelo de datos

```sql
categorias        id, nombre, orden, activa
tamanos           id, nombre, orden                    -- 'Bocadillo' | 'Montado' | 'Único'
articulos         id, categoria_id, nombre, descripcion, imagen_url,
                  disponible, orden, creado_en
articulo_tamanos  id, articulo_id, tamano_id, precio_centimos, disponible
extras            id, nombre, descripcion, disponible, orden
extra_precios     id, extra_id, tamano_id, precio_centimos
articulo_extras   articulo_id, extra_id                -- complementos que ofrece el artículo

pedidos           id uuid, codigo_publico text unique,
                  estado, modo_entrega,                -- 'domicilio' | 'recogida'
                  cliente_nombre, cliente_apellidos, cliente_telefono,
                  direccion_calle, direccion_numero, direccion_piso,
                  direccion_cp, direccion_ciudad, direccion_indicaciones,
                  notas,
                  franja_solicitada_inicio, franja_solicitada_fin,
                  franja_confirmada_inicio, franja_confirmada_fin, confirmado_en,
                  subtotal_centimos, envio_centimos, total_centimos,
                  stripe_session_id unique, stripe_payment_intent,
                  repartidor_id,
                  creado_en, pagado_en, entregado_en
pedido_lineas     id, pedido_id, articulo_id, tamano_id,
                  nombre_articulo, nombre_tamano, precio_unitario_centimos,
                  cantidad, notas_linea, preparada
pedido_extras     id, linea_id, extra_id, nombre_extra, precio_centimos

ajustes           id (fila única), nombre_restaurante, telefono, direccion,
                  horario jsonb, envio_centimos, pedido_minimo_centimos,
                  envio_gratis_desde_centimos, antelacion_minima_min,
                  duracion_franja_min
perfiles_staff    user_id (auth.users), nombre, rol   -- 'admin' | 'cocina' | 'repartidor'
avisos_log        id, pedido_id, canal, resultado, error, creado_en
```

`pedido_lineas` y `pedido_extras` guardan copia del nombre y del precio además de la
referencia al catálogo. La referencia sirve para agrupar y contar; la copia es lo que se
muestra y lo que cuadra con el cobro.

Formato de `ajustes.horario`:

```json
{
  "lunes":   [{ "desde": "13:00", "hasta": "16:00" },
              { "desde": "20:00", "hasta": "23:30" }],
  "martes":  [],
  "...":     []
}
```

Un día sin tramos es un día cerrado. Valores iniciales: envío 2,00 €, pedido mínimo
10,00 €, envío gratis a partir de 20,00 €, antelación mínima 30 minutos, franjas de 30
minutos. Todos editables desde ajustes.

`envio_gratis_desde_centimos` a null desactiva el envío gratuito por importe: entonces el
envío se cobra siempre.

### Permisos

La carta (`categorias`, `tamanos`, `articulos`, `articulo_tamanos`, `extras`,
`extra_precios`, `articulo_extras`) y `ajustes` son de **lectura pública**. La escritura
queda restringida al rol admin.

Las tablas de pedidos **no son accesibles desde el navegador anónimo**, ni con el código
público. Toda lectura y escritura de pedidos pasa por el servidor. El personal accede
según su rol:

| Rol | Pedidos | Carta | Disponibilidad | Ajustes | Equipo |
|---|---|---|---|---|---|
| admin | todos | edita | edita | edita | edita |
| cocina | todos salvo `pendiente_pago` | lee | edita | lee | — |
| repartidor | solo `pendiente_envio` y `en_reparto` a domicilio, sin importes | — | — | lee teléfono y dirección | — |

## 6. Reglas de negocio

### Precio de una línea

```
precio_linea = (precio_del_tamaño + suma de precios de los extras elegidos
                                    para ese tamaño) × cantidad
```

El precio de un extra depende del tamaño al que se añade: 1,00 € sobre bocadillo y
0,50 € sobre montado, según `extra_precios`.

Un extra **solo se ofrece para los tamaños en los que tiene precio definido**. Los extras
de la carta actual tienen precio para bocadillo y montado, pero no para el tamaño Único,
así que las hamburguesas y los sándwiches no ofrecen complementos. Si el restaurante
quiere ofrecerlos ahí, basta con darles precio para ese tamaño desde el panel; no hace
falta tocar código. La interfaz nunca muestra un complemento cuyo precio no exista para
el tamaño elegido.

### Total del pedido

```
subtotal = suma de las líneas
envio    = 0 si es recogida
           0 si envio_gratis_desde_centimos existe y subtotal >= ese umbral
           en cualquier otro caso, ajustes.envio_centimos
total    = subtotal + envio
```

Hay **dos umbrales sobre el subtotal, y son independientes**:

- `pedido_minimo_centimos` — por debajo no se puede pedir a domicilio.
- `envio_gratis_desde_centimos` — a partir de ahí el envío no se cobra.

Ambos se comprueban contra el **subtotal**, no contra el total: el cliente no debe
alcanzar un umbral pagando gastos de envío, y el umbral de envío gratis no puede
depender de un envío que él mismo anula. El segundo umbral debe ser mayor que el primero;
si se configurara al revés, el envío sería gratis en todo pedido válido, y el panel lo
advierte al guardar.

En recogida en local no aplica ninguno de los dos: no hay envío que cobrar ni mínimo que
exigir.

Todo esto se calcula en el servidor releyendo precios de la base de datos en el momento
de crear la sesión de pago. Los importes que llegan del navegador se ignoran.

### Franjas de entrega

Se generan a partir de `ajustes.horario`, en tramos de `duracion_franja_min`, para hoy y
mañana, descartando las que empiecen antes de `ahora + antelacion_minima_min`. La opción
"lo antes posible" se ofrece únicamente si el restaurante está abierto en este momento.

Se puede pedir a cualquier hora del día, esté el restaurante abierto o no. La franja es
una **petición**, y la interfaz lo dice con esas palabras: *"Es una petición. El
restaurante la confirmará al aceptar el pedido."* Nada en la interfaz puede sugerir que
la hora esté garantizada.

### Disponibilidad

La disponibilidad se controla a tres niveles, con el mismo interruptor y el mismo efecto:

- **Artículo** (`articulos.disponible`) — se acabó el lomo.
- **Tamaño de un artículo** (`articulo_tamanos.disponible`) — queda pan de montado pero
  no de bocadillo. Si un artículo se queda sin ningún tamaño disponible, se comporta
  como no disponible.
- **Complemento** (`extras.disponible`) — se acabó la cebolla caramelizada.

Un artículo no disponible se muestra atenuado y con la etiqueta "Hoy no disponible", no
se oculta: desaparecer sin explicación hace pensar que la web falla. No se puede añadir
al carrito.

Un complemento no disponible **no se puede añadir a ningún artículo** mientras esté
desactivado. En la ficha del artículo aparece atenuado y sin casilla, con la misma
etiqueta "Hoy no disponible", en lugar de desaparecer: el cliente que buscaba justo ese
complemento entiende que hoy no lo hay en vez de pensar que la carta cambió. Al
reactivarlo vuelve a ofrecerse de inmediato, sin tocar los artículos que lo usan.

La disponibilidad se revalida antes de crear la sesión de pago, y cubre los tres niveles.
Si algo cayó mientras el cliente rellenaba sus datos, se le indica **qué artículo o qué
complemento concreto** y se le devuelve al carrito sin cobrarle. Un complemento caído no
tira el pedido entero: se le ofrece quitarlo de las líneas afectadas y seguir.

## 7. Estados del pedido

```
pendiente_pago → nuevo → en_preparacion → pendiente_envio → en_reparto → entregado
```

- `pendiente_pago` — creado, aún no cobrado. Solo lo ve el sistema.
- `nuevo` — cobrado. Entra en cocina. Puede estar con la franja confirmada o sin
  confirmar; es un atributo de la tarjeta, no una fase.
- `en_preparacion` — se está haciendo. Las líneas se van marcando como preparadas.
- `pendiente_envio` — terminado. En recogida en local, aquí se lee "listo para recoger".
- `en_reparto` — un repartidor lo lleva encima. Solo aplica a domicilio.
- `entregado` — cerrado. En recogida en local se pasa directamente desde
  `pendiente_envio`.

Transiciones permitidas por rol:

| Transición | admin | cocina | repartidor |
|---|---|---|---|
| confirmar o ajustar franja | sí | sí | no |
| nuevo → en_preparacion | sí | sí | no |
| en_preparacion → pendiente_envio | sí | sí | no |
| pendiente_envio → en_reparto | sí | no | sí |
| en_reparto → entregado | sí | no | sí |
| pendiente_envio → entregado (recogida) | sí | sí | no |

Cada transición se ejecuta condicionada al estado anterior, de modo que dos personas
pulsando a la vez no hagan retroceder el pedido ni dupliquen la entrega.

## 8. Web pública

**Carta (`/`)** — categorías en pestañas fijas en la parte superior. Tarjetas con foto,
descripción y precios por tamaño. Los artículos no disponibles salen atenuados.

**Ficha del artículo** — hoja inferior, no página nueva: tamaño, complementos, cantidad y
nota de línea, con el precio recalculándose en vivo. Al cerrarla, el cliente vuelve al
punto de la carta donde estaba.

**Carrito** — barra fija inferior con total y número de artículos. Si el subtotal no
llega al mínimo, indica cuánto falta en lugar de limitarse a desactivar el botón. Si ya
lo supera pero no llega al umbral de envío gratuito, indica cuánto falta para no pagar
envío; y cuando lo alcanza, lo dice. En recogida en local no se muestra ninguno de los
dos avisos.

**Checkout (`/checkout`)** — una sola página con tres bloques, sin asistente por pasos:

1. Domicilio o recogida. En recogida desaparece la dirección y el envío deja de sumar.
2. Datos de contacto: nombre, apellidos, teléfono y dirección, precargados desde el
   almacenamiento local del navegador si ya pidió antes.
3. Franja de entrega, con el aviso de que es una petición.

Debajo, la revisión completa: líneas, complementos, notas, envío, total y franja pedida.
De ahí a Stripe Checkout.

**Seguimiento (`/pedido/<codigo>`)** — código no adivinable en la URL. Muestra el estado,
la franja pedida y la confirmada, el resumen del pedido y el teléfono del restaurante.
Se refresca consultando al servidor cada 15 segundos.

Estados tal como los lee el cliente:

- Recibido — has pedido las 14:00–14:30, pendiente de confirmar
- Confirmado para las 14:00–14:30
- En preparación
- Listo — sale en breve / Listo para recoger
- En reparto — tu pedido va de camino
- Entregado

## 9. Plataforma interna

### Tablero de cocina (`/panel`)

Cuatro pestañas con contador —Nuevos, En marcha, Pendientes de envío, Entregados— en
lugar de columnas horizontales: cuatro columnas no caben en un móvil en vertical y
obligan a hacer scroll lateral con las manos ocupadas.

Dentro de cada pestaña, los pedidos se ordenan por franja. Una tarjeta cuya franja se
acerca pasa a ámbar, de modo que los pedidos programados para más tarde no compiten por
atención con los inmediatos.

**Tarjeta de pedido:** código, hora de entrada, franja, modo de entrega y teléfono como
enlace de llamada directa. Debajo, las líneas con casilla para marcar lo preparado, los
complementos, las notas destacadas en un bloque aparte —una nota de alergia perdida entre
texto gris es un accidente esperando— y el total. Las acciones son botones grandes en la
zona baja, al alcance del pulgar. Cuando el pedido va en reparto, la tarjeta muestra
quién lo lleva.

**Confirmación de franja:** un pedido recién pagado llega sin confirmar y muestra
**"Confirmar 14:00–14:30"** o **"Proponer otra hora"**, que abre la lista de franjas
disponibles. Al confirmar, la tarjeta se marca en verde y permanece en Nuevos hasta que
alguien pulse "Empezar". En los pedidos de "lo antes posible" ambas acciones se fusionan
en un único botón **"Aceptar y empezar"**.

**Aviso de entrada:** con el panel abierto, un pedido nuevo suena, vibra y actualiza el
contador al instante mediante Supabase Realtime.

### Administración (`/panel/carta`, `/panel/ajustes`, `/panel/equipo`, `/panel/historial`)

**Carta** — alta, edición y baja de artículos: nombre, descripción, foto, categoría,
tamaños con su precio y complementos aplicables. Las fotos se suben a Supabase Storage.

**Disponibilidad** — separada de la edición, porque es lo único que se usa a diario: una
lista compacta con un interruptor por **artículo**, por **tamaño** y por **complemento**.
Quitar de la carta el lomo, solo el montado de lomo, o la cebolla caramelizada, son dos
segundos cada uno, no entrar a editar una ficha. Es la pantalla que más se usa del panel
y por eso es la primera de la sección de carta.

**Ajustes** — teléfono, dirección, horario semanal, coste de envío, pedido mínimo,
umbral de envío gratuito y antelación mínima. El teléfono y la dirección los lee también
la web pública.

**Equipo** — el admin invita por email y asigna rol. No hay registro público: nadie se da
de alta por su cuenta.

**Historial** — pedidos entregados, búsqueda por teléfono y total facturado del día.

### Reparto (`/reparto`)

Dos pestañas y nada más:

- **Para repartir** — pedidos en `pendiente_envio` a domicilio. La dirección es el
  elemento principal de la tarjeta, en grande, con las indicaciones del portal; un botón
  la abre en el mapa del móvil; el teléfono es llamada directa. El botón **"Recojo este"**
  pasa el pedido a `en_reparto` y lo marca con su nombre, de modo que dos personas no
  salgan con el mismo pedido.
- **Mis entregas** — lo que lleva encima, con el botón **"Entregado"**.

El repartidor **no ve precios, totales ni desglose de cobro**. En su lugar, un distintivo
de **"Pagado online — no cobrar"**. Sí ve los artículos, para comprobar lo que entrega.
Esto no es solo ocultar botones: el servidor únicamente le permite leer pedidos en esas
dos fases y ejecutar esas dos transiciones.

## 10. Integraciones

### Stripe

Modo test en el MVP. Flujo:

1. El servidor recalcula el pedido, valida disponibilidad, mínimo y franja, y guarda el
   pedido en `pendiente_pago`.
2. Crea una sesión de Stripe Checkout con las líneas y el `codigo_publico` en los
   metadatos, y redirige.
3. `checkout.session.completed` llega al webhook, que verifica la firma, pasa el pedido a
   `nuevo`, registra `pagado_en` y `stripe_payment_intent`, y dispara el aviso.
4. El cliente vuelve a `/pedido/<codigo>`.

El webhook es **idempotente**: `stripe_session_id` es único y la transición solo se
aplica si el pedido sigue en `pendiente_pago`. Stripe reintenta los webhooks, y procesar
dos veces el mismo pago no puede generar dos pedidos ni dos avisos.

**Red de seguridad:** al abrir la página de seguimiento, si el pedido sigue en
`pendiente_pago`, el servidor consulta el estado de la sesión en Stripe y confirma si
procede. Un cliente que ha pagado y un pedido que nadie prepara es el peor fallo posible
del sistema, así que la confirmación tiene dos caminos.

### CallMeBot

Petición HTTP desde el servidor al recibir el webhook. El número de destino y la clave
viven en variables de entorno, nunca en la base de datos ni en el cliente.

El mensaje incluye código de pedido, franja solicitada, modo de entrega, nombre y
teléfono del cliente, artículos y total.

Es un servicio gratuito de terceros sin garantías. El envío no bloquea la respuesta al
webhook, se reintenta una vez y el resultado se registra en `avisos_log`. Que falle un
WhatsApp no puede tumbar un pedido ya cobrado: la fuente de verdad es el panel.

### Supabase

- **Postgres** con permisos por fila según lo descrito en la sección 5.
- **Auth** para el personal, sin registro público.
- **Storage** para las fotos de los artículos, con límite de tamaño y recompresión en la
  subida.
- **Realtime** para el tablero de cocina. La página de seguimiento del cliente no usa
  Realtime: consulta al servidor cada 15 segundos, porque los pedidos no son legibles
  desde el navegador anónimo.

## 11. Seguridad

- Los importes se calculan siempre en el servidor a partir de la base de datos.
- La firma del webhook de Stripe se verifica en todas las peticiones. Sin ello,
  cualquiera podría enviar un POST y darse un pedido por pagado.
- Los pedidos no son accesibles desde el navegador anónimo. El código público solo se
  resuelve en el servidor.
- El código público es un identificador aleatorio, no un número correlativo: un
  correlativo permitiría leer los pedidos de los demás sumando uno.
- Las claves de Stripe y CallMeBot viven en variables de entorno del servidor.
- El personal no se registra solo; el admin invita.
- Cada rol tiene restringido en el servidor tanto lo que lee como las transiciones que
  puede ejecutar.

## 12. Casos límite

| Caso | Comportamiento |
|---|---|
| El cliente abandona el pago | El pedido se queda en `pendiente_pago` y no aparece en cocina. |
| El webhook no llega | Al volver a la página de seguimiento, el servidor consulta Stripe y confirma. |
| Stripe envía el webhook dos veces | La segunda no hace nada: la transición exige estado `pendiente_pago`. |
| Un artículo se agota durante el checkout | Se bloquea el pago y se indica qué artículo, devolviendo al carrito. |
| Un complemento se agota durante el checkout | Se bloquea el pago, se indica cuál y se ofrece quitarlo de las líneas afectadas. |
| Un artículo se queda sin ningún tamaño disponible | Se comporta como artículo no disponible. |
| El subtotal alcanza el umbral de envío gratuito | El envío pasa a 0 y el carrito lo indica. |
| CallMeBot falla | Se registra en `avisos_log` y el pedido sigue su curso. |
| Dos personas pulsan la misma acción | La transición condicionada al estado anterior descarta la segunda. |
| Restaurante cerrado | Se puede pedir igual; solo se ofrecen franjas futuras dentro del horario. |
| No quedan franjas hoy | Se ofrecen las de mañana. |
| Recogida en local | Sin dirección, sin envío, y de `pendiente_envio` pasa directo a `entregado`. |
| Artículo sin foto | Tarjeta con color de marca, nunca una imagen rota. |
| Cambio de precio en la carta | Los pedidos anteriores conservan el precio cobrado. |

## 13. Pruebas

**Unitarias (Vitest)** sobre los módulos puros:

- `precios`: extras según tamaño, cantidades, envío, recogida, pedido mínimo contra
  subtotal, umbral de envío gratuito (justo por debajo, justo encima y desactivado),
  independencia de los dos umbrales, aritmética en céntimos.
- `disponibilidad`: artículo, tamaño y complemento caídos; artículo sin ningún tamaño
  disponible; revalidación en el momento de pagar.
- `horario`: generación de franjas, antelación mínima, salto al día siguiente, día
  cerrado, "lo antes posible" solo con el restaurante abierto, zona horaria.
- `estados`: transiciones válidas e inválidas para cada uno de los tres roles.

**De extremo a extremo (Playwright)**:

- Pedir, pagar con la tarjeta de prueba, ver el pedido aparecer en cocina, confirmarlo,
  prepararlo, repartirlo y entregarlo.
- Recogida en local.
- Artículo agotado durante el checkout.
- Pedido por debajo del mínimo.

El CLI de Stripe reenvía webhooks en local.

## 14. Datos iniciales

La carta se carga desde el PDF `Recursos/CARTA BOCADILLOS actual 2026.pdf`, ya extraída.
Precios en formato bocadillo / montado.

**Clásicos a la plancha:** Lomo 5,00/4,00 · Panceta 5,00/4,00 · Pepito de ternera 6,50 ·
Pollo a la plancha 5,00/4,00 · Beicon 4,50/3,50

**Ibéricos & embutidos:** Jamón serrano 4,50/3,50 · Jamón ibérico 6,50/5,00 · Chorizo
frito 5,50/4,50 · Chorizo / salchichón 4,00/3,00 · Queso curado 4,00/3,00

**Huevos & tortilla:** Tortilla española 4,50/3,00 · Tortilla francesa 4,00/3,00

**Del mar:** Calamares a la andaluza 7,00/5,50 · Rejos fritos 7,00/5,50

**Gourmet Caserón:** De la casa 7,00/5,50 · Vegetal de pollo 6,50/5,00 · El Caserón
7,00/6,00 · Pulled Pork Caserón 6,50/5,00 · Tex Mex Caserón 6,50/5,00

**Hamburguesas (precio único):** La Caserona 10,50 · La Montañesa 11,50

**Sándwiches (precio único):** Sándwich mixto 4,00 · Sándwich Breakfast Caserón 5,00

**Extras (bocadillo / montado, 1,00 / 0,50):** Queso · Cebolla caramelizada · Pimientos
fritos · Salsa (mayonesa, césar, caserón) · Rodaja de tomate

Tres puntos que el PDF no resuelve y que se cargan con el criterio siguiente, corregibles
desde el panel en segundos:

- **Pepito de ternera** se carga solo con tamaño Bocadillo, porque el PDF no imprime
  precio de montado.
- **Chorizo / salchichón** se carga con ese nombre. El PDF lo imprime en una sola línea
  sin separador; se escribe con barra por ser la lectura que tiene sentido en una carta.
- **Rejos fritos** es la lectura más probable de un nombre cuyo PDF perdió parte de los
  glifos.

Las ocho fotografías de `Recursos/` se asignan a los artículos que correspondan. El resto
queda sin foto hasta que el restaurante las suba.

Datos del restaurante, cargados en `ajustes` y editables desde el panel:

- **Dirección:** C. Hierro, 73, LOC, 28850 Torrejón de Ardoz, Madrid
- **Teléfono:** 916 78 04 35

## 15. Fases

Cada fase deja el sistema en un estado utilizable.

1. **Cimientos** — proyecto Next.js, Supabase Cloud, esquema, permisos y carta cargada.
2. **Carta y carrito** — se navega la carta y se monta un pedido.
3. **Checkout, Stripe y seguimiento** — se paga en sandbox, llega el WhatsApp y el
   cliente sigue su pedido.
4. **Panel de cocina** — se opera el pedido desde el móvil.
5. **Administración** — carta, disponibilidad, ajustes, equipo e historial.
6. **Reparto** — perfil del repartidor.
7. **Despliegue** en Vercel.

Las fases 1 a 4 son el sistema mínimo con el que ya se puede vender. De la 5 en adelante
es lo que lo hace mantenible sin tocar código.

## 16. Notas de ejecución

- El gestor de paquetes es **pnpm**. No se usa npm ni npx en ningún comando, script,
  documento ni configuración de despliegue.
- Las integraciones nativas de Supabase y Vercel de esta sesión **no se utilizan sin
  avisar antes**: están conectadas a cuentas distintas de las del proyecto. Antes de
  crear el proyecto de Supabase o desplegar en Vercel hay que confirmar qué cuenta está
  conectada.
- Supabase se usa en su versión **Cloud**, no local.
