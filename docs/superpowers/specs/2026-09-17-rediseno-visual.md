# El Horno del Caserón — Rediseño visual

**Fecha:** 2026-09-17
**Estado:** aprobado por el usuario en un lienzo de diseño, pendiente de plan de implementación

## 1. Contexto y objetivo

La interfaz actual (cliente y panel interno) usa un tema oscuro genérico: fondo
`neutral-950`, acento `amber-500`, tipografía Geist por defecto — sin identidad de marca
propia. La navegación de categorías de la carta es una barra horizontal de pestañas que
solo muestra una categoría a la vez.

Se aprobó un rediseño completo, cliente y panel interno, con dos objetivos:

1. Navegación de categorías **vertical** en vez de horizontal, para ver todas las
   categorías de un vistazo sin scroll horizontal.
2. Una identidad visual **cálida, elegante y profesional** ("mesón artesanal") que
   sustituya el tema oscuro genérico.

El rediseño se validó completo en un lienzo de diseño (19 pantallas, móvil + desktop
donde aplica) con datos y lógica de negocio reales — no maquetas con contenido
inventado. Este documento traduce ese lienzo a un lenguaje que un plan de
implementación pueda ejecutar contra el código React/Tailwind real; el lienzo en sí
sigue siendo la referencia pixel a pixel para cualquier duda de detalle visual
(el propietario del proyecto conserva el enlace).

## 2. Sistema de diseño

### Paleta

Sustituye por completo la paleta oscura `neutral-*` / `amber-*` de Tailwind. Todos los
valores son cálidos (nunca grises fríos).

| Token | Hex / valor | Uso |
|---|---|---|
| `--ground` | `#F7EFDF` | Fondo de página (pergamino cálido). Nunca blanco puro. |
| `--rail-bg` | `#EFE1C6` | Fondo del riel de categorías (más oscuro que `ground`, para diferenciarlo). |
| `--surface` | `#FFFCF5` | Tarjetas, paneles, inputs — casi blanco cálido, sobre `ground`. |
| `--ink` | `#2B2015` | Texto principal (espresso, no negro puro). |
| `--ink-soft` | `#7C6B52` | Texto secundario / metadatos. |
| `--border` | `rgba(43,32,21,0.14)` | Bordes finos, en vez de bordes de color. |
| `--accent` | `#B8481F` | Acento principal (terracota/pimentón) — botones de acción, categoría activa. |
| `--accent-dark` | `#93381A` | Estado pulsado/hover del acento, texto sobre `--accent-soft`. |
| `--accent-soft` | `rgba(184,72,31,0.10)` | Fondos de aviso tenues, fondo de opción seleccionada. |
| `--success` | `#4D6B3A` | Envío gratis conseguido, confirmaciones (sustituye `emerald-*`). |
| `--success-soft` | `rgba(77,107,58,0.12)` | Fondo de aviso de éxito. |
| `--urgente` | `#B8862E` | Solo panel de cocina: pedido con franja inminente (≤15 min). Deliberadamente distinto de `--accent` para no confundir "urgente" con "acción". |
| `--peligro` | `#9A3B2E` | Solo acciones destructivas ("Dar de baja" en los formularios de carta). |

### Tipografía

- **Display** (nombres de platos, títulos de sección, cabeceras): `'Instrument Serif'`,
  cursiva (`font-style: italic`), Google Fonts. Sustituye a Geist Sans en estos usos.
- **Interfaz** (botones, formularios, cuerpo de texto, listas): `'Work Sans'`, pesos 400/500/600/700.
- Cargar con un único `<link>` de Google Fonts:
  `family=Instrument+Serif:ital@0;1&family=Work+Sans:wght@400;500;600;700`.
- Nunca Geist, Inter, Roboto ni Arial en el resultado final.

### Patrón: riel vertical de categorías

Sustituye `PestanasCategorias.tsx` (pestañas horizontales con scroll). El riel:

- Columna fija de ancho ~92px (icono + etiqueta en 2 líneas) en móvil; en escritorio,
  ~264px con icono y etiqueta en línea.
- `position: sticky; top: 0` dentro de un contenedor de scroll natural de página — **no**
  `overflow-y: auto` anidado dentro de un marco de altura fija (ver "lección de scroll"
  más abajo).
- Categoría activa: fondo `--surface`, barra izquierda de 3px en `--accent`, icono y
  texto en `--accent`. Inactiva: fondo transparente, icono/texto en `--ink-soft`.
- Un icono de línea (stroke, sin relleno excepto detalles puntuales) por categoría,
  dibujado a mano — nunca emoji. Los 7 iconos reales (plancha, jamón, huevo, pez,
  estrella, hamburguesa, sándwich) están en el lienzo, artboard `Main.dc.html`.
- El fondo del riel (`--rail-bg`) debe cubrir la columna completa aunque el riel en sí
  sea más corto que la lista de artículos: el contenedor fila lleva `--rail-bg` y la
  columna de contenido lleva un `--ground` opaco encima, para que no quede una costura
  al hacer scroll más allá de la altura del riel.

### Patrón: tarjeta de artículo

Vertical, no horizontal: **foto arriba a todo el ancho (no un cuadrado pequeño a la
izquierda), texto debajo**. Esta es una corrección deliberada sobre un primer intento
horizontal que cortaba el texto — no reintroducir el layout horizontal.

- Imagen: 100% del ancho de la tarjeta, alto fijo (~138px móvil / ~168px escritorio),
  `object-fit: cover`, esquinas superiores redondeadas (la tarjeta usa
  `overflow: hidden` para recortarla).
- Sin foto real todavía: banner del mismo tamaño con fondo `--accent-soft` e icono de
  cubiertos centrado al 55% de opacidad — nunca un color plano sin explicación, para que
  se note a simple vista qué artículos necesitan foto.
- Debajo: nombre (`--font-display`, no cursiva aquí), descripción (1 línea en móvil, 2
  en escritorio con `-webkit-line-clamp`), precio y botón "+" circular en `--accent`.
- Pedido no disponible hoy: opacidad 0.55 en toda la tarjeta + etiqueta "Hoy no
  disponible" superpuesta en la esquina de la foto (no una línea de texto suelta).

### Lección de scroll (aplica a cualquier pantalla larga)

La primera versión de las pantallas largas (carta, carrito) metía el scroll en un
`overflow-y: auto` anidado dentro de un marco de altura fija — no funcionaba de forma
fiable. La solución que sí funciona y que hay que replicar en React: la página entera
hace scroll de forma natural (sin altura fija ni `overflow: hidden` en el contenedor
raíz), y los elementos que deben quedarse fijos (el riel de categorías, la barra de
carrito, la cabecera del panel) usan `position: sticky`, no contenedores de scroll
propios. Si una pantalla nueva parece necesitar un scroll interno anidado, es señal de
que hay que replantear el layout con `sticky` en su lugar.

### Componentes reutilizados sin cambio de patrón, solo de piel

- El patrón de hoja inferior (`HojaInferior.tsx`) se mantiene tal cual funcionalmente
  (overlay + panel que sube desde abajo, cierre con Escape/click fuera) — solo cambia su
  piel visual a los tokens de arriba.
- Selectores tipo pastilla (tamaño en la ficha, franja horaria, entrega a
  domicilio/recogida): borde 1.5px, fondo `--accent-soft` y texto `--accent-dark`
  cuando están seleccionados; borde `--border` y fondo `--surface` cuando no.
- Interruptores on/off (disponibilidad): pista de 42×24px (24×... en las anidadas de
  tamaño, 34×20px), pulgar blanco de 20px, `--accent` cuando está activo,
  `rgba(43,32,21,0.18)` cuando no.

## 3. Inventario de pantallas

Cada pantalla existe ya validada en el lienzo de diseño (artboard `.dc.html` indicado).
El plan de implementación debe cubrir todas; se referencia también el componente React
real que hay que tocar.

### Cliente

| Pantalla | Artboard | Componente(s) reales |
|---|---|---|
| Carta (móvil) | `Main.dc.html` | `src/app/page.tsx`, `PestanasCategorias.tsx` → nuevo riel vertical, `TarjetaArticulo.tsx` |
| Carta (escritorio) | `MainDesktop.dc.html` | Los mismos + layout responsive nuevo (sidebar + grid) |
| Ficha de artículo | `Ficha.dc.html` | `FichaArticulo.tsx` |
| Carrito | `Carrito.dc.html` | `HojaCarrito.tsx`, `BarraCarrito.tsx` |
| Carrito (escritorio) | `CarritoDesktop.dc.html` | Igual, variante de layout de escritorio (drawer lateral) |
| Checkout | `Checkout.dc.html` | `FormularioCheckout.tsx` — el bloqueo de "A domicilio" bajo mínimo ya existe en el código (commit `bf2e10b`); aquí solo cambia la piel visual |
| Checkout (escritorio) | `CheckoutDesktop.dc.html` | Igual, layout a dos columnas (formulario + resumen fijo) |
| Seguimiento del pedido | `Seguimiento.dc.html` | `EstadoPedido.tsx` — **añade** un timeline vertical de fases que no existe hoy (hoy es solo texto plano) |
| Seguimiento (escritorio) | `SeguimientoDesktop.dc.html` | Igual, layout a dos columnas |

### Panel interno (solo versión móvil — es lo único que usa el personal)

| Pantalla | Artboard | Componente(s) reales |
|---|---|---|
| Cocina (tablero de pedidos) | `Cocina.dc.html` | `TableroPedidos.tsx`, `TarjetaPedido.tsx`, `NavPanel.tsx` |
| Administración — Disponibilidad | `Disponibilidad.dc.html` | `VistaDisponibilidad.tsx` |
| Administración — Ajustes | `Ajustes.dc.html` | `FormularioAjustes.tsx`, `VistaAjustesSoloLectura.tsx` |
| Administración — Equipo | `Equipo.dc.html` | `VistaEquipo.tsx` |
| Administración — Historial | `Historial.dc.html` | `VistaHistorial.tsx` |
| Administración — Editar artículo | `FormularioArticulo.dc.html` | `FormularioArticulo.tsx` |
| Administración — Editar complemento | `FormularioComplemento.dc.html` | `FormularioComplemento.tsx` |
| Repartidor | `Repartidor.dc.html` | `VistaReparto.tsx`, `TarjetaReparto.tsx` |
| Iniciar sesión | `Login.dc.html` | `FormularioLogin.tsx` (o equivalente en `src/app/panel/iniciar-sesion/page.tsx`) |
| Aceptar invitación | `Invitacion.dc.html` | `src/app/panel/invitacion/page.tsx` |

## 4. Fuera de alcance de este rediseño

- No cambia ninguna lógica de negocio, validación, endpoint ni esquema de base de
  datos — es un cambio de piel visual y de estructura de layout (vertical en vez de
  horizontal), nunca de comportamiento. La única excepción es el timeline de fases de
  Seguimiento, que es contenido nuevo puramente visual (no añade estados nuevos, solo
  visualiza los 5 estados reales que ya existen).
- No incluye versión de escritorio del panel interno (Cocina/Administración/Repartidor):
  el personal solo lo usa desde el móvil.
- No sustituye Tailwind: los tokens de arriba se implementan como utilidades/variables
  Tailwind, no como una librería de CSS nueva.
