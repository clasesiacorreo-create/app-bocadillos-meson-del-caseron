# Checkout, Stripe y seguimiento — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un cliente que ya montó su pedido en el carrito pide una franja de entrega, paga con Stripe en modo sandbox, recibe confirmación por WhatsApp al restaurante, y sigue el estado de su pedido por un enlace no adivinable.

**Architecture:** Sobre el proyecto ya en pie (carta, carrito), se añade una tabla de pedidos accesible solo con la clave de servicio de Supabase —los pedidos no son legibles desde el navegador anónimo—. El checkout revalida disponibilidad y recalcula el total en el servidor antes de crear la sesión de Stripe: los importes que llegan del navegador nunca son la fuente de verdad. El pedido nace en `pendiente_pago` y solo el webhook de Stripe (idempotente, con una red de seguridad al abrir el seguimiento) lo pasa a `nuevo`. Las franjas de entrega y el texto de estado que ve el cliente son módulos puros sin base de datos ni red, probados con Vitest.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Supabase (Postgres), Stripe (modo test), Zustand, Vitest, Testing Library, Playwright, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-19-pedidos-horno-caseron-design.md`

**Plan anterior:** `docs/superpowers/plans/2026-08-19-cimientos-carta-y-carrito.md` (proyecto, esquema de la carta, carta pública y carrito — completado).

## Global Constraints

- **Gestor de paquetes: pnpm.** Nunca `npm` ni `npx`. En su lugar `pnpm` y `pnpx`. Aplica también a scripts de `package.json`, documentación y CI.
- **Importes siempre en céntimos enteros.** Nunca euros en coma flotante. La conversión a texto ocurre solo al pintar.
- **Zona horaria de referencia: `Europe/Madrid`.**
- **Idioma de la interfaz y del código de dominio: español.** Nombres de variables, tablas y funciones en español, sin acentos en identificadores.
- **En la web pública no aparecen nombres propios.** Se dice "El Horno del Caserón" o "el restaurante", nunca "Javier".
- **Los artículos y complementos no disponibles se muestran atenuados, nunca se ocultan.**
- **Datos del restaurante:** C. Hierro, 73, LOC, 28850 Torrejón de Ardoz, Madrid · 916 78 04 35.
- **Las integraciones nativas (MCP) de Supabase, Vercel y Stripe no se usan.** Están conectadas a cuentas distintas. Todo se hace por CLI y código, y cualquier paso que dé de alta una cuenta o clave nueva se detiene a preguntar primero.
- **Los totales se calculan siempre en el servidor**, releyendo precios y disponibilidad de la base de datos en el momento de pagar. Los importes que llegan del navegador se ignoran.
- **Stripe en modo test/sandbox.** No se manejan cobros reales en este plan.
- **CallMeBot es un servicio gratuito de terceros sin garantías.** Que falle el aviso por WhatsApp no puede tumbar ni bloquear un pedido ya cobrado.
- **El webhook de Stripe es idempotente.** La transición de `pendiente_pago` a `nuevo` solo se aplica una vez, condicionada al estado anterior.

## Estructura de ficheros

| Fichero | Responsabilidad |
|---|---|
| `src/lib/horario/tipos.ts` | Tipos: tramo, horario semanal, reglas de horario y franja. |
| `src/lib/horario/index.ts` | `restauranteAbierto`, `generarFranjas`, `formatearHoraFranja`. Puro. |
| `supabase/migrations/0003_esquema_pedidos.sql` | Tablas de pedidos, líneas, extras y log de avisos. Sin acceso anónimo. |
| `src/lib/supabase/cliente-servicio.ts` | Cliente de Supabase con la clave de servicio. Salta RLS. Solo en servidor. |
| `src/lib/pedidos/tipos.ts` | Tipos de la solicitud de pedido, errores de validación y filas unidas. |
| `src/lib/pedidos/validacion.ts` | `validarLineas`: revalida disponibilidad contra la carta. Puro. |
| `src/lib/pedidos/crear.ts` | `crearPedidoPendiente`, `asociarSesionPago`. |
| `src/lib/pagos/index.ts` | `crearSesionCheckout`, `obtenerEstadoSesion`, `verificarEventoWebhook`. |
| `src/lib/carrito/datosContacto.ts` | Persistencia local de nombre, apellidos, teléfono y dirección. |
| `src/lib/carrito/store.ts` (modificado) | Añade `quitarExtraDeLinea`. |
| `src/lib/carta/consultas.ts` (modificado) | Añade `obtenerAjustesHorario`. |
| `src/app/api/pedidos/route.ts` | Crea el pedido pendiente y la sesión de Stripe. |
| `src/app/checkout/page.tsx` | Página de checkout: lee reglas, ajustes y franjas. |
| `src/components/checkout/FormularioCheckout.tsx` | Formulario, franjas y revisión del pedido. |
| `src/lib/avisos/index.ts` | `avisarNuevoPedido`: CallMeBot con reintento y registro en `avisos_log`. |
| `src/lib/pedidos/confirmar.ts` | `confirmarPagoDePedido`, transición idempotente. |
| `src/app/api/stripe/webhook/route.ts` | Webhook de Stripe. |
| `src/lib/pedidos/textoEstado.ts` | `textoEstadoCliente`: copia del estado tal como la lee el cliente. Puro. |
| `src/lib/pedidos/seguimiento.ts` | `obtenerEstadoPedido`, con la red de seguridad contra Stripe. |
| `src/app/api/pedidos/[codigo]/route.ts` | Estado del pedido en JSON, para el sondeo cada 15 s. |
| `src/app/pedido/[codigo]/page.tsx` | Página de seguimiento. |
| `src/components/pedido/EstadoPedido.tsx` | Sondeo cada 15 s y pintado del estado. |
| `e2e/checkout.spec.ts` | Recorrido de extremo a extremo del checkout. |

---

### Tarea 1: Franjas de entrega

**Files:**
- Create: `src/lib/horario/tipos.ts`
- Create: `src/lib/horario/index.ts`
- Test: `src/lib/horario/horario.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: tipos `TramoHorario`, `HorarioSemanal`, `ReglasHorario`, `Franja`; funciones `restauranteAbierto(reglas, ahora): boolean`, `generarFranjas(reglas, ahora): Franja[]`, `formatearHoraFranja(iso): string`.

- [ ] **Step 1: Escribir los tipos**

Crear `src/lib/horario/tipos.ts`:

```ts
export type TramoHorario = { desde: string; hasta: string } // 'HH:MM'

export type HorarioSemanal = {
  lunes: TramoHorario[]
  martes: TramoHorario[]
  miercoles: TramoHorario[]
  jueves: TramoHorario[]
  viernes: TramoHorario[]
  sabado: TramoHorario[]
  domingo: TramoHorario[]
}

export type ReglasHorario = {
  horario: HorarioSemanal
  antelacionMinimaMin: number
  duracionFranjaMin: number
}

/** `loAntesPosible` marca la franja especial que no tiene inicio ni fin reales. */
export type Franja = {
  inicio: string // ISO 8601
  fin: string
  loAntesPosible: boolean
}
```

- [ ] **Step 2: Escribir los tests que fallan**

Crear `src/lib/horario/horario.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatearHoraFranja, generarFranjas, restauranteAbierto } from '.'
import type { HorarioSemanal, ReglasHorario } from './tipos'

const SIN_TRAMOS: HorarioSemanal = {
  lunes: [], martes: [], miercoles: [], jueves: [], viernes: [], sabado: [], domingo: [],
}

function reglas(parcial: Partial<ReglasHorario> = {}): ReglasHorario {
  return {
    horario: SIN_TRAMOS,
    antelacionMinimaMin: 0,
    duracionFranjaMin: 30,
    ...parcial,
  }
}

describe('generarFranjas', () => {
  it('genera franjas de la duración configurada dentro de un tramo', () => {
    // 2026-01-15 es jueves. Tramo 13:00-14:00 en Madrid (invierno, UTC+1) = 12:00-13:00 UTC.
    const r = reglas({ horario: { ...SIN_TRAMOS, jueves: [{ desde: '13:00', hasta: '14:00' }] } })
    const ahora = new Date('2026-01-15T08:00:00Z')
    const franjas = generarFranjas(r, ahora).filter((f) => !f.loAntesPosible)
    expect(franjas).toEqual([
      { inicio: '2026-01-15T12:00:00.000Z', fin: '2026-01-15T12:30:00.000Z', loAntesPosible: false },
      { inicio: '2026-01-15T12:30:00.000Z', fin: '2026-01-15T13:00:00.000Z', loAntesPosible: false },
    ])
  })

  it('descarta franjas anteriores a ahora + antelación mínima', () => {
    const r = reglas({
      horario: { ...SIN_TRAMOS, jueves: [{ desde: '13:00', hasta: '15:00' }] },
      antelacionMinimaMin: 90,
    })
    // 11:00 UTC = 12:00 Madrid. +90 min = 13:30 Madrid = 12:30 UTC.
    const ahora = new Date('2026-01-15T11:00:00Z')
    const franjas = generarFranjas(r, ahora).filter((f) => !f.loAntesPosible)
    expect(franjas[0]).toEqual({
      inicio: '2026-01-15T12:30:00.000Z',
      fin: '2026-01-15T13:00:00.000Z',
      loAntesPosible: false,
    })
  })

  it('ofrece franjas de mañana si hoy ya no quedan', () => {
    // 2026-01-16 es viernes.
    const r = reglas({
      horario: {
        ...SIN_TRAMOS,
        jueves: [{ desde: '13:00', hasta: '14:00' }],
        viernes: [{ desde: '13:00', hasta: '14:00' }],
      },
    })
    const ahora = new Date('2026-01-15T20:00:00Z') // 21:00 Madrid, el tramo de hoy ya pasó
    const franjas = generarFranjas(r, ahora).filter((f) => !f.loAntesPosible)
    expect(franjas).toEqual([
      { inicio: '2026-01-16T12:00:00.000Z', fin: '2026-01-16T12:30:00.000Z', loAntesPosible: false },
      { inicio: '2026-01-16T12:30:00.000Z', fin: '2026-01-16T13:00:00.000Z', loAntesPosible: false },
    ])
  })

  it('un día sin tramos no ofrece franjas: es un día cerrado', () => {
    const ahora = new Date('2026-01-15T08:00:00Z')
    expect(generarFranjas(reglas(), ahora)).toEqual([])
  })

  it('"lo antes posible" solo aparece si el restaurante está abierto ahora', () => {
    const r = reglas({ horario: { ...SIN_TRAMOS, jueves: [{ desde: '13:00', hasta: '16:00' }] } })

    const abierto = generarFranjas(r, new Date('2026-01-15T13:00:00Z')) // 14:00 Madrid
    expect(abierto[0]).toMatchObject({ loAntesPosible: true })

    const cerrado = generarFranjas(r, new Date('2026-01-15T08:00:00Z')) // 09:00 Madrid
    expect(cerrado.some((f) => f.loAntesPosible)).toBe(false)
  })

  it('convierte la hora local de Madrid a UTC según la época del año', () => {
    const r = reglas({
      horario: {
        ...SIN_TRAMOS,
        jueves: [{ desde: '13:00', hasta: '13:30' }], // 2026-01-15
        miercoles: [{ desde: '13:00', hasta: '13:30' }], // 2026-07-15
      },
    })

    const invierno = generarFranjas(r, new Date('2026-01-15T00:00:00Z')).filter((f) => !f.loAntesPosible)
    expect(invierno[0].inicio).toBe('2026-01-15T12:00:00.000Z') // CET = UTC+1

    const verano = generarFranjas(r, new Date('2026-07-15T00:00:00Z')).filter((f) => !f.loAntesPosible)
    expect(verano[0].inicio).toBe('2026-07-15T11:00:00.000Z') // CEST = UTC+2
  })
})

describe('restauranteAbierto', () => {
  const r = reglas({ horario: { ...SIN_TRAMOS, jueves: [{ desde: '13:00', hasta: '16:00' }] } })

  it('está abierto dentro de un tramo', () => {
    expect(restauranteAbierto(r, new Date('2026-01-15T13:00:00Z'))).toBe(true) // 14:00 Madrid
  })

  it('está cerrado fuera de los tramos', () => {
    expect(restauranteAbierto(r, new Date('2026-01-15T08:00:00Z'))).toBe(false) // 09:00 Madrid
  })
})

describe('formatearHoraFranja', () => {
  it('pinta la hora en Europe/Madrid con dos dígitos, según la época del año', () => {
    expect(formatearHoraFranja('2026-01-15T12:30:00.000Z')).toBe('13:30')
    expect(formatearHoraFranja('2026-07-15T11:00:00.000Z')).toBe('13:00')
  })
})
```

- [ ] **Step 3: Ejecutar los tests y comprobar que fallan**

Run: `pnpm test horario`
Expected: FAIL — no existe `src/lib/horario/index.ts`.

- [ ] **Step 4: Implementar el módulo**

Crear `src/lib/horario/index.ts`:

```ts
import type { Franja, HorarioSemanal, ReglasHorario } from './tipos'

export type * from './tipos'

const ZONA = 'Europe/Madrid'

const DIA_SEMANA_POR_NOMBRE: Record<string, keyof HorarioSemanal> = {
  Monday: 'lunes',
  Tuesday: 'martes',
  Wednesday: 'miercoles',
  Thursday: 'jueves',
  Friday: 'viernes',
  Saturday: 'sabado',
  Sunday: 'domingo',
}

/**
 * Madrid siempre está por delante de UTC (+1 en invierno, +2 en verano), así
 * que la medianoche UTC cae siempre en el mismo día natural en Madrid. Esto
 * simplifica calcular a qué día de la semana corresponde una fecha.
 */
function desplazamientoMinutos(fecha: Date): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA,
    timeZoneName: 'shortOffset',
  }).formatToParts(fecha)
  const nombre = partes.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+0'
  const coincidencia = /GMT([+-]\d+)/.exec(nombre)
  return coincidencia ? Number(coincidencia[1]) * 60 : 0
}

function partesEnZona(fecha: Date) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23', // con hour12:false, Intl pinta la medianoche como "24"
    weekday: 'long',
  }).formatToParts(fecha)
  const obtener = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? ''
  return {
    anio: Number(obtener('year')),
    mes: Number(obtener('month')),
    dia: Number(obtener('day')),
    hora: Number(obtener('hour')),
    minuto: Number(obtener('minute')),
    diaSemana: DIA_SEMANA_POR_NOMBRE[obtener('weekday')],
  }
}

function fechaEnZona(
  anio: number,
  mes: number,
  dia: number,
  hora: number,
  minuto: number,
  desplazamientoMin: number,
): Date {
  return new Date(Date.UTC(anio, mes - 1, dia, hora, minuto) - desplazamientoMin * 60000)
}

export function restauranteAbierto(reglas: ReglasHorario, ahora: Date): boolean {
  const partes = partesEnZona(ahora)
  const minutosAhora = partes.hora * 60 + partes.minuto
  return reglas.horario[partes.diaSemana].some((tramo) => {
    const [hDesde, mDesde] = tramo.desde.split(':').map(Number)
    const [hHasta, mHasta] = tramo.hasta.split(':').map(Number)
    return minutosAhora >= hDesde * 60 + mDesde && minutosAhora < hHasta * 60 + mHasta
  })
}

/**
 * Franjas de hoy y mañana, en tramos de `duracionFranjaMin`, descartando las
 * que empiecen antes de `ahora + antelacionMinimaMin`. Un día sin tramos no
 * aporta franjas: es un día cerrado. "Lo antes posible" se añade al
 * principio solo si el restaurante está abierto en este instante.
 */
export function generarFranjas(reglas: ReglasHorario, ahora: Date): Franja[] {
  const desplazamiento = desplazamientoMinutos(ahora)
  const limiteInicio = ahora.getTime() + reglas.antelacionMinimaMin * 60000
  const franjas: Franja[] = []

  for (const diasAdelante of [0, 1]) {
    const partesDia = partesEnZona(new Date(ahora.getTime() + diasAdelante * 24 * 60 * 60000))

    for (const tramo of reglas.horario[partesDia.diaSemana]) {
      const [hDesde, mDesde] = tramo.desde.split(':').map(Number)
      const [hHasta, mHasta] = tramo.hasta.split(':').map(Number)
      const inicioTramo = fechaEnZona(partesDia.anio, partesDia.mes, partesDia.dia, hDesde, mDesde, desplazamiento)
      const finTramo = fechaEnZona(partesDia.anio, partesDia.mes, partesDia.dia, hHasta, mHasta, desplazamiento)

      let cursor = inicioTramo.getTime()
      while (cursor + reglas.duracionFranjaMin * 60000 <= finTramo.getTime()) {
        const finFranja = cursor + reglas.duracionFranjaMin * 60000
        if (cursor >= limiteInicio) {
          franjas.push({
            inicio: new Date(cursor).toISOString(),
            fin: new Date(finFranja).toISOString(),
            loAntesPosible: false,
          })
        }
        cursor = finFranja
      }
    }
  }

  if (restauranteAbierto(reglas, ahora)) {
    franjas.unshift({ inicio: ahora.toISOString(), fin: ahora.toISOString(), loAntesPosible: true })
  }

  return franjas
}

export function formatearHoraFranja(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: ZONA,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
}
```

- [ ] **Step 5: Ejecutar los tests y comprobar que pasan**

Run: `pnpm test horario`
Expected: PASS, todos los tests en verde.

- [ ] **Step 6: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/lib/horario
git commit -m "Añade el módulo de franjas de entrega"
```

---

### Tarea 2: Esquema de pedidos en Supabase

**Files:**
- Create: `supabase/migrations/0003_esquema_pedidos.sql`
- Create: `src/lib/supabase/cliente-servicio.ts`
- Modify: `src/lib/supabase/tipos-bd.ts` (regenerado)

**Interfaces:**
- Consumes: `BaseDeDatos` (de `src/lib/supabase/cliente-servidor.ts`, ya existente).
- Produces: `crearClienteServicio(): SupabaseClient<BaseDeDatos>`.

- [ ] **Step 1: Escribir la migración**

Crear `supabase/migrations/0003_esquema_pedidos.sql`:

```sql
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
```

- [ ] **Step 2: Aplicar la migración**

```bash
pnpx supabase db push
```

Expected: la migración se aplica sin errores.

- [ ] **Step 3: Regenerar los tipos**

```bash
pnpx supabase gen types typescript --linked > src/lib/supabase/tipos-bd.ts
```

Comprobar que el fichero contiene `pedidos`, `pedido_lineas`, `pedido_extras` y `avisos_log`. No se edita a mano.

- [ ] **Step 4: Crear el cliente de servicio**

Crear `src/lib/supabase/cliente-servicio.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import type { BaseDeDatos } from './cliente-servidor'

/**
 * Cliente con la clave de servicio: salta RLS. Solo se usa en código de
 * servidor que gestiona pedidos (crear, transicionar, leer para el
 * seguimiento). Nunca se expone al navegador.
 */
export function crearClienteServicio() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !clave) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Revisa .env.local.',
    )
  }

  return createClient<BaseDeDatos>(url, clave, { auth: { persistSession: false } })
}
```

- [ ] **Step 5: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores.

- [ ] **Step 6: Commit**

```bash
git add supabase src/lib/supabase
git commit -m "Añade el esquema de pedidos en Supabase y el cliente de servicio"
```

---

### Tarea 3: Tipos y validación de disponibilidad del pedido

**Files:**
- Create: `src/lib/pedidos/tipos.ts`
- Create: `src/lib/pedidos/validacion.ts`
- Test: `src/lib/pedidos/validacion.test.ts`

**Interfaces:**
- Consumes: `Carta`, `ArticuloCarta` (de `@/lib/carta/tipos`), `articuloDisponible`, `extrasParaTamano` (de `@/lib/carta/reglas`), `LineaParaCarrito` (de `@/lib/carrito/tipos`), `ModoEntrega` (de `@/lib/precios/tipos`), `Tables` (de `@/lib/supabase/tipos-bd`).
- Produces: tipos `DatosContacto`, `DireccionEntrega`, `FranjaSolicitada`, `SolicitudPedido`, `ErrorValidacionPedido`, `EstadoPedido`, `PedidoCreado`, `PedidoExtraFila`, `PedidoLineaFila`, `PedidoConLineas`; función `validarLineas(carta, lineas): ErrorValidacionPedido | null`.

- [ ] **Step 1: Escribir los tipos**

Crear `src/lib/pedidos/tipos.ts`:

```ts
import type { LineaParaCarrito } from '@/lib/carrito/tipos'
import type { ModoEntrega } from '@/lib/precios/tipos'
import type { Tables } from '@/lib/supabase/tipos-bd'

export type DatosContacto = {
  nombre: string
  apellidos: string
  telefono: string
}

export type DireccionEntrega = {
  calle: string
  numero: string
  piso: string
  cp: string
  ciudad: string
  indicaciones: string
}

export type FranjaSolicitada = {
  inicio: string // ISO 8601
  fin: string
  loAntesPosible: boolean
}

export type SolicitudPedido = {
  lineas: LineaParaCarrito[]
  modoEntrega: ModoEntrega
  contacto: DatosContacto
  direccion: DireccionEntrega | null // null en recogida
  franjaSolicitada: FranjaSolicitada
  notas: string
}

export type ErrorValidacionPedido =
  | { tipo: 'articulo_no_disponible'; articuloId: string; nombreArticulo: string }
  | {
      tipo: 'extra_no_disponible'
      articuloId: string
      tamanoId: string
      extraId: string
      nombreExtra: string
    }
  | { tipo: 'bajo_minimo'; faltaCentimos: number }

/**
 * Los tipos generados por Supabase no conocen la restricción `check` de
 * Postgres sobre `pedidos.estado`: lo tipan como `string` a secas. Este tipo
 * explícito es el que usa la capa de cliente (seguimiento, texto de estado)
 * para poder hacer un `switch` exhaustivo.
 */
export type EstadoPedido =
  | 'pendiente_pago'
  | 'nuevo'
  | 'en_preparacion'
  | 'pendiente_envio'
  | 'en_reparto'
  | 'entregado'

export type PedidoCreado = {
  id: string
  codigoPublico: string
  subtotalCentimos: number
  envioCentimos: number
  totalCentimos: number
}

export type PedidoExtraFila = Tables<'pedido_extras'>
export type PedidoLineaFila = Tables<'pedido_lineas'> & { pedido_extras: PedidoExtraFila[] }
export type PedidoConLineas = Tables<'pedidos'> & { pedido_lineas: PedidoLineaFila[] }
```

- [ ] **Step 2: Escribir el test que falla**

Crear `src/lib/pedidos/validacion.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { validarLineas } from './validacion'
import type { Carta } from '@/lib/carta/tipos'
import type { LineaParaCarrito } from '@/lib/carrito/tipos'

function carta(parcial: Partial<Carta['categorias'][number]['articulos'][number]> = {}): Carta {
  return {
    categorias: [
      {
        id: 'cat-1',
        nombre: 'Clásicos',
        articulos: [
          {
            id: 'a-lomo',
            nombre: 'Lomo',
            descripcion: '',
            imagenUrl: null,
            disponible: true,
            tamanos: [
              { id: 'tam-bocadillo', nombre: 'Bocadillo', precioCentimos: 500, disponible: true },
              { id: 'tam-montado', nombre: 'Montado', precioCentimos: 400, disponible: false },
            ],
            extras: [
              {
                id: 'e-queso',
                nombre: 'Queso',
                descripcion: '',
                disponible: false,
                precioPorTamanoId: { 'tam-bocadillo': 100, 'tam-montado': 50 },
              },
            ],
            ...parcial,
          },
        ],
      },
    ],
  }
}

function linea(parcial: Partial<LineaParaCarrito> = {}): LineaParaCarrito {
  return {
    articuloId: 'a-lomo',
    nombreArticulo: 'Lomo',
    imagenUrl: null,
    tamanoId: 'tam-bocadillo',
    nombreTamano: 'Bocadillo',
    precioUnitarioCentimos: 500,
    extras: [],
    cantidad: 1,
    notasLinea: '',
    ...parcial,
  }
}

describe('validarLineas', () => {
  it('no encuentra ningún error si todo sigue disponible', () => {
    expect(validarLineas(carta(), [linea()])).toBeNull()
  })

  it('rechaza un artículo desactivado', () => {
    const c = carta({ disponible: false })
    expect(validarLineas(c, [linea()])).toEqual({
      tipo: 'articulo_no_disponible',
      articuloId: 'a-lomo',
      nombreArticulo: 'Lomo',
    })
  })

  it('rechaza un tamaño caído', () => {
    const resultado = validarLineas(carta(), [linea({ tamanoId: 'tam-montado', nombreTamano: 'Montado' })])
    expect(resultado).toEqual({
      tipo: 'articulo_no_disponible',
      articuloId: 'a-lomo',
      nombreArticulo: 'Lomo',
    })
  })

  it('rechaza un complemento caído, identificando cuál', () => {
    const resultado = validarLineas(
      carta(),
      [linea({ extras: [{ extraId: 'e-queso', nombre: 'Queso', precioCentimos: 100 }] })],
    )
    expect(resultado).toEqual({
      tipo: 'extra_no_disponible',
      articuloId: 'a-lomo',
      tamanoId: 'tam-bocadillo',
      extraId: 'e-queso',
      nombreExtra: 'Queso',
    })
  })

  it('rechaza un complemento que ya no existe en la carta', () => {
    const resultado = validarLineas(
      carta(),
      [linea({ extras: [{ extraId: 'e-fantasma', nombre: 'Fantasma', precioCentimos: 100 }] })],
    )
    expect(resultado?.tipo).toBe('extra_no_disponible')
  })

  it('rechaza un artículo que ya no existe en la carta', () => {
    const resultado = validarLineas(carta(), [linea({ articuloId: 'a-fantasma' })])
    expect(resultado).toEqual({
      tipo: 'articulo_no_disponible',
      articuloId: 'a-fantasma',
      nombreArticulo: 'Lomo',
    })
  })

  it('para en la primera línea con problema', () => {
    const resultado = validarLineas(carta({ disponible: false }), [
      linea(),
      linea({ tamanoId: 'tam-montado', nombreTamano: 'Montado' }),
    ])
    expect(resultado?.tipo).toBe('articulo_no_disponible')
  })
})
```

- [ ] **Step 3: Ejecutar el test y comprobar que falla**

Run: `pnpm test validacion`
Expected: FAIL — no existe `src/lib/pedidos/validacion.ts`.

- [ ] **Step 4: Implementar la validación**

Crear `src/lib/pedidos/validacion.ts`:

```ts
import { articuloDisponible, extrasParaTamano } from '@/lib/carta/reglas'
import type { Carta } from '@/lib/carta/tipos'
import type { LineaParaCarrito } from '@/lib/carrito/tipos'
import type { ErrorValidacionPedido } from './tipos'

/**
 * Revalida cada línea contra la carta recién leída de la base de datos. Se
 * comprueba justo antes de crear la sesión de pago porque la disponibilidad
 * puede haber cambiado mientras el cliente rellenaba el formulario.
 */
export function validarLineas(carta: Carta, lineas: LineaParaCarrito[]): ErrorValidacionPedido | null {
  const articulos = new Map(
    carta.categorias.flatMap((categoria) => categoria.articulos.map((articulo) => [articulo.id, articulo])),
  )

  for (const linea of lineas) {
    const articulo = articulos.get(linea.articuloId)

    if (!articulo || !articuloDisponible(articulo)) {
      return {
        tipo: 'articulo_no_disponible',
        articuloId: linea.articuloId,
        nombreArticulo: linea.nombreArticulo,
      }
    }

    const tamano = articulo.tamanos.find((t) => t.id === linea.tamanoId)
    if (!tamano || !tamano.disponible) {
      return {
        tipo: 'articulo_no_disponible',
        articuloId: linea.articuloId,
        nombreArticulo: linea.nombreArticulo,
      }
    }

    const extrasDelTamano = extrasParaTamano(articulo, linea.tamanoId)
    for (const extra of linea.extras) {
      const extraDeCarta = extrasDelTamano.find((e) => e.id === extra.extraId)
      if (!extraDeCarta || !extraDeCarta.disponible) {
        return {
          tipo: 'extra_no_disponible',
          articuloId: linea.articuloId,
          tamanoId: linea.tamanoId,
          extraId: extra.extraId,
          nombreExtra: extra.nombre,
        }
      }
    }
  }

  return null
}
```

- [ ] **Step 5: Ejecutar el test y comprobar que pasa**

Run: `pnpm test validacion`
Expected: PASS.

- [ ] **Step 6: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/lib/pedidos
git commit -m "Añade la validación de disponibilidad del pedido"
```

---

### Tarea 4: Creación de pedidos pendientes

**Files:**
- Create: `src/lib/pedidos/crear.ts`

**Interfaces:**
- Consumes: `crearClienteServicio` (de `@/lib/supabase/cliente-servicio`), `obtenerCarta`, `obtenerReglas` (de `@/lib/carta/consultas`), `calcularResumen` (de `@/lib/precios`), `validarLineas` (de `./validacion`), `SolicitudPedido`, `ErrorValidacionPedido`, `PedidoCreado` (de `./tipos`).
- Produces: `crearPedidoPendiente(solicitud): Promise<{ ok: true; pedido: PedidoCreado } | { ok: false; error: ErrorValidacionPedido }>`, `asociarSesionPago(pedidoId, stripeSessionId): Promise<void>`.

- [ ] **Step 1: Implementar la creación del pedido**

Crear `src/lib/pedidos/crear.ts`:

```ts
import { randomBytes } from 'node:crypto'
import { obtenerCarta, obtenerReglas } from '@/lib/carta/consultas'
import { calcularResumen } from '@/lib/precios'
import type { LineaCarrito } from '@/lib/precios/tipos'
import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'
import type { ErrorValidacionPedido, PedidoCreado, SolicitudPedido } from './tipos'
import { validarLineas } from './validacion'

function generarCodigoPublico(): string {
  // Aleatorio, no correlativo: un correlativo permitiría leer los pedidos de
  // los demás sumando uno al propio.
  return randomBytes(6).toString('base64url')
}

export async function crearPedidoPendiente(
  solicitud: SolicitudPedido,
): Promise<{ ok: true; pedido: PedidoCreado } | { ok: false; error: ErrorValidacionPedido }> {
  const carta = await obtenerCarta()
  const errorDisponibilidad = validarLineas(carta, solicitud.lineas)
  if (errorDisponibilidad) return { ok: false, error: errorDisponibilidad }

  const reglas = await obtenerReglas()
  const lineasParaResumen: LineaCarrito[] = solicitud.lineas.map((linea) => ({
    articuloId: linea.articuloId,
    tamanoId: linea.tamanoId,
    precioUnitarioCentimos: linea.precioUnitarioCentimos,
    extras: linea.extras,
    cantidad: linea.cantidad,
  }))
  const resumen = calcularResumen(lineasParaResumen, solicitud.modoEntrega, reglas)

  if (!resumen.alcanzaMinimo) {
    return { ok: false, error: { tipo: 'bajo_minimo', faltaCentimos: resumen.faltaParaMinimoCentimos } }
  }

  const supabase = crearClienteServicio()

  // El código público es único; en la práctica nunca colisiona, pero se
  // reintenta un par de veces por si acaso en lugar de dejar caer el pedido.
  for (let intento = 0; intento < 3; intento++) {
    const codigoPublico = generarCodigoPublico()
    const { data: pedido, error } = await supabase
      .from('pedidos')
      .insert({
        codigo_publico: codigoPublico,
        estado: 'pendiente_pago',
        modo_entrega: solicitud.modoEntrega,
        cliente_nombre: solicitud.contacto.nombre,
        cliente_apellidos: solicitud.contacto.apellidos,
        cliente_telefono: solicitud.contacto.telefono,
        direccion_calle: solicitud.direccion?.calle ?? null,
        direccion_numero: solicitud.direccion?.numero ?? null,
        direccion_piso: solicitud.direccion?.piso ?? null,
        direccion_cp: solicitud.direccion?.cp ?? null,
        direccion_ciudad: solicitud.direccion?.ciudad ?? null,
        direccion_indicaciones: solicitud.direccion?.indicaciones ?? null,
        notas: solicitud.notas,
        franja_solicitada_inicio: solicitud.franjaSolicitada.inicio,
        franja_solicitada_fin: solicitud.franjaSolicitada.fin,
        franja_solicitada_asap: solicitud.franjaSolicitada.loAntesPosible,
        subtotal_centimos: resumen.subtotalCentimos,
        envio_centimos: resumen.envioCentimos,
        total_centimos: resumen.totalCentimos,
      })
      .select('id')
      .single()

    if (error?.code === '23505') continue // codigo_publico colisionó, reintenta
    if (error) throw error

    for (const linea of solicitud.lineas) {
      const { data: lineaFila, error: errorLinea } = await supabase
        .from('pedido_lineas')
        .insert({
          pedido_id: pedido.id,
          articulo_id: linea.articuloId,
          tamano_id: linea.tamanoId,
          nombre_articulo: linea.nombreArticulo,
          nombre_tamano: linea.nombreTamano,
          precio_unitario_centimos: linea.precioUnitarioCentimos,
          cantidad: linea.cantidad,
          notas_linea: linea.notasLinea,
        })
        .select('id')
        .single()
      if (errorLinea) throw errorLinea

      if (linea.extras.length > 0) {
        const { error: errorExtras } = await supabase.from('pedido_extras').insert(
          linea.extras.map((extra) => ({
            linea_id: lineaFila.id,
            extra_id: extra.extraId,
            nombre_extra: extra.nombre,
            precio_centimos: extra.precioCentimos,
          })),
        )
        if (errorExtras) throw errorExtras
      }
    }

    return {
      ok: true,
      pedido: {
        id: pedido.id,
        codigoPublico,
        subtotalCentimos: resumen.subtotalCentimos,
        envioCentimos: resumen.envioCentimos,
        totalCentimos: resumen.totalCentimos,
      },
    }
  }

  throw new Error('No se pudo generar un código de pedido único tras varios intentos.')
}

export async function asociarSesionPago(pedidoId: string, stripeSessionId: string): Promise<void> {
  const supabase = crearClienteServicio()
  const { error } = await supabase
    .from('pedidos')
    .update({ stripe_session_id: stripeSessionId })
    .eq('id', pedidoId)
  if (error) throw error
}
```

- [ ] **Step 2: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores. Esta función se ejerce de extremo a extremo en la Tarea 11: escribe en la base de datos real y no tiene sentido simularla con mocks.

- [ ] **Step 3: Commit**

```bash
git add src/lib/pedidos/crear.ts
git commit -m "Añade la creación de pedidos pendientes"
```

---

### Tarea 5: Integración con Stripe — sesión de pago

**Files:**
- Modify: `.env.example`
- Create: `src/lib/pagos/index.ts`

**Interfaces:**
- Consumes: `LineaParaCarrito` (de `@/lib/carrito/tipos`).
- Produces: `crearSesionCheckout({ codigoPublico, lineas, envioCentimos, origen }): Promise<{ id: string; url: string }>`, `obtenerEstadoSesion(sessionId): Promise<{ pagada: boolean; paymentIntent: string | null }>`, `verificarEventoWebhook(cuerpo, firma): Stripe.Event`.

- [ ] **Step 1: PARADA — confirmar la cuenta de Stripe**

**No continúes sin respuesta del usuario.** Pregúntale:

> Necesito una cuenta de Stripe en **modo test** para el checkout en sandbox. ¿Creas tú la cuenta (o usas una que ya tengas) y me pasas la clave secreta de test (`sk_test_...`), o prefieres que te guíe paso a paso? También hará falta el secreto del webhook (`whsec_...`), que se obtiene del CLI de Stripe en desarrollo o del dashboard en producción.

Las integraciones nativas de Stripe de esta sesión apuntan a una cuenta distinta y no se usan.

- [ ] **Step 2: Instalar el CLI de Stripe para desarrollo local**

```bash
brew install stripe/stripe-cli/stripe
stripe login
```

El CLI reenvía los webhooks de Stripe al servidor local durante el desarrollo y los tests de extremo a extremo (Tarea 11).

- [ ] **Step 3: Guardar las credenciales**

Añadir a `.env.local` (no se versiona):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Añadir las mismas claves, vacías, a `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

- [ ] **Step 4: Instalar el SDK de Stripe**

```bash
pnpm add stripe
```

- [ ] **Step 5: Implementar el módulo de pagos**

Crear `src/lib/pagos/index.ts`:

```ts
import Stripe from 'stripe'
import type { LineaParaCarrito } from '@/lib/carrito/tipos'

function clienteStripe(): Stripe {
  const clave = process.env.STRIPE_SECRET_KEY
  if (!clave) throw new Error('Falta STRIPE_SECRET_KEY. Revisa .env.local.')
  return new Stripe(clave)
  // Si TypeScript exige `apiVersion`, añade la que indique el error de
  // compilación: la fija el SDK instalado, no este plan.
}

type ParaSesion = {
  codigoPublico: string
  lineas: LineaParaCarrito[]
  envioCentimos: number
  origen: string
}

export async function crearSesionCheckout({
  codigoPublico,
  lineas,
  envioCentimos,
  origen,
}: ParaSesion): Promise<{ id: string; url: string }> {
  const stripe = clienteStripe()

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = lineas.map((linea) => {
    const nombreExtras = linea.extras.map((extra) => extra.nombre).join(', ')
    const precioLinea =
      linea.precioUnitarioCentimos + linea.extras.reduce((total, extra) => total + extra.precioCentimos, 0)

    return {
      quantity: linea.cantidad,
      price_data: {
        currency: 'eur',
        unit_amount: precioLinea,
        product_data: {
          name: `${linea.nombreArticulo} · ${linea.nombreTamano}`,
          ...(nombreExtras ? { description: nombreExtras } : {}),
        },
      },
    }
  })

  if (envioCentimos > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: 'eur',
        unit_amount: envioCentimos,
        product_data: { name: 'Envío a domicilio' },
      },
    })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    metadata: { codigo_publico: codigoPublico },
    success_url: `${origen}/pedido/${codigoPublico}`,
    cancel_url: `${origen}/checkout`,
  })

  if (!session.url) throw new Error('Stripe no devolvió una URL de pago.')
  return { id: session.id, url: session.url }
}

export async function obtenerEstadoSesion(
  sessionId: string,
): Promise<{ pagada: boolean; paymentIntent: string | null }> {
  const stripe = clienteStripe()
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  return {
    pagada: session.payment_status === 'paid',
    paymentIntent:
      typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null),
  }
}

export function verificarEventoWebhook(cuerpo: string, firma: string): Stripe.Event {
  const secreto = process.env.STRIPE_WEBHOOK_SECRET
  if (!secreto) throw new Error('Falta STRIPE_WEBHOOK_SECRET. Revisa .env.local.')
  return clienteStripe().webhooks.constructEvent(cuerpo, firma, secreto)
}
```

- [ ] **Step 6: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores.

- [ ] **Step 7: Commit**

```bash
git add .env.example src/lib/pagos
git commit -m "Añade la integración con Stripe Checkout"
```

---

### Tarea 6: Endpoint que crea el pedido y redirige a Stripe

**Files:**
- Create: `src/app/api/pedidos/route.ts`

**Interfaces:**
- Consumes: `crearPedidoPendiente`, `asociarSesionPago` (de `@/lib/pedidos/crear`), `crearSesionCheckout` (de `@/lib/pagos`), `SolicitudPedido` (de `@/lib/pedidos/tipos`).
- Produces: `POST /api/pedidos` — responde `{ ok: true; urlPago: string }` o `{ ok: false; error: ErrorValidacionPedido }` con estado 422.

- [ ] **Step 1: Implementar el endpoint**

Crear `src/app/api/pedidos/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { asociarSesionPago, crearPedidoPendiente } from '@/lib/pedidos/crear'
import type { SolicitudPedido } from '@/lib/pedidos/tipos'
import { crearSesionCheckout } from '@/lib/pagos'

export async function POST(req: NextRequest) {
  const solicitud = (await req.json()) as SolicitudPedido

  const resultado = await crearPedidoPendiente(solicitud)
  if (!resultado.ok) {
    return NextResponse.json({ ok: false, error: resultado.error }, { status: 422 })
  }

  const sesion = await crearSesionCheckout({
    codigoPublico: resultado.pedido.codigoPublico,
    lineas: solicitud.lineas,
    envioCentimos: resultado.pedido.envioCentimos,
    origen: req.nextUrl.origin,
  })
  await asociarSesionPago(resultado.pedido.id, sesion.id)

  return NextResponse.json({ ok: true, urlPago: sesion.url })
}
```

- [ ] **Step 2: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores. El endpoint completo (creación + Stripe + Supabase) se ejerce de extremo a extremo en la Tarea 11.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/pedidos
git commit -m "Añade el endpoint que crea el pedido y la sesión de pago"
```

---

### Tarea 7: Formulario de checkout

**Files:**
- Modify: `src/lib/carta/consultas.ts` (añade `obtenerAjustesHorario`)
- Modify: `src/lib/carrito/store.ts` (añade `quitarExtraDeLinea`)
- Modify: `src/lib/carrito/store.test.ts`
- Create: `src/lib/carrito/datosContacto.ts`
- Modify: `src/components/carrito/HojaCarrito.tsx`
- Create: `src/app/checkout/page.tsx`
- Create: `src/components/checkout/FormularioCheckout.tsx`
- Test: `src/components/checkout/FormularioCheckout.test.tsx`

**Interfaces:**
- Consumes: `ReglasHorario`, `Franja`, `generarFranjas`, `formatearHoraFranja` (de `@/lib/horario`), `ReglasPedido`, `ModoEntrega`, `calcularResumen` (de `@/lib/precios`), `LineaEnCarrito`, `useCarrito` (de `@/lib/carrito/store`), `ErrorValidacionPedido` (de `@/lib/pedidos/tipos`).
- Produces: `obtenerAjustesHorario(): Promise<ReglasHorario>`; mutación `quitarExtraDeLinea(id, extraId)` en el carrito; `useDatosContacto()`; página `/checkout`.

- [ ] **Step 1: Añadir la consulta de ajustes para el horario**

Modificar `src/lib/carta/consultas.ts`, añadiendo al final:

```ts
import type { ReglasHorario } from '@/lib/horario/tipos'

export async function obtenerAjustesHorario(): Promise<ReglasHorario> {
  const supabase = crearClienteServidor()
  const { data, error } = await supabase
    .from('ajustes')
    .select('horario, antelacion_minima_min, duracion_franja_min')
    .single()

  if (error) throw error

  return {
    horario: data.horario as unknown as ReglasHorario['horario'],
    antelacionMinimaMin: data.antelacion_minima_min,
    duracionFranjaMin: data.duracion_franja_min,
  }
}
```

(El `import` se añade junto a los demás imports del fichero, no repetido al final.)

- [ ] **Step 2: Escribir el test que falla para `quitarExtraDeLinea`**

Añadir a `src/lib/carrito/store.test.ts`, dentro del `describe('carrito', ...)`:

```ts
it('quita un extra concreto de una línea sin afectar a las demás', () => {
  useCarrito.getState().anadir(
    nueva({
      extras: [
        { extraId: 'e-1', nombre: 'Queso', precioCentimos: 100 },
        { extraId: 'e-2', nombre: 'Rodaja de tomate', precioCentimos: 100 },
      ],
    }),
  )
  const { id } = useCarrito.getState().lineas[0]
  useCarrito.getState().quitarExtraDeLinea(id, 'e-1')
  expect(useCarrito.getState().lineas[0].extras.map((e) => e.extraId)).toEqual(['e-2'])
})

it('elimina la línea si se queda sin ningún extra y era el único diferenciador', () => {
  useCarrito.getState().anadir(nueva({ extras: [{ extraId: 'e-1', nombre: 'Queso', precioCentimos: 100 }] }))
  useCarrito.getState().anadir(nueva({ extras: [] }))
  const conExtra = useCarrito.getState().lineas.find((l) => l.extras.length > 0)!
  useCarrito.getState().quitarExtraDeLinea(conExtra.id, 'e-1')
  // Las dos líneas ahora son iguales, pero quitarExtraDeLinea no fusiona:
  // solo vacía los extras de esa línea concreta.
  expect(useCarrito.getState().lineas).toHaveLength(2)
})
```

- [ ] **Step 3: Ejecutar el test y comprobar que falla**

Run: `pnpm test carrito/store`
Expected: FAIL — `quitarExtraDeLinea` no existe.

- [ ] **Step 4: Implementar `quitarExtraDeLinea`**

Modificar `src/lib/carrito/store.ts`:

```ts
type EstadoCarrito = {
  lineas: LineaEnCarrito[]
  anadir: (linea: LineaParaCarrito) => void
  cambiarCantidad: (id: string, cantidad: number) => void
  quitarExtraDeLinea: (id: string, extraId: string) => void
  eliminar: (id: string) => void
  vaciar: () => void
}
```

Y dentro de `create<EstadoCarrito>()(persist((set) => ({ ... }))`, junto a `eliminar`:

```ts
      quitarExtraDeLinea: (id, extraId) =>
        set((estado) => ({
          lineas: estado.lineas.map((linea) =>
            linea.id === id
              ? { ...linea, extras: linea.extras.filter((extra) => extra.extraId !== extraId) }
              : linea,
          ),
        })),

```

- [ ] **Step 5: Ejecutar el test y comprobar que pasa**

Run: `pnpm test carrito/store`
Expected: PASS.

- [ ] **Step 6: Crear la persistencia de datos de contacto**

Crear `src/lib/carrito/datosContacto.ts`:

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DatosContacto, DireccionEntrega } from '@/lib/pedidos/tipos'

type EstadoDatosContacto = {
  contacto: DatosContacto
  direccion: DireccionEntrega
  guardar: (contacto: DatosContacto, direccion: DireccionEntrega) => void
}

const VACIO_CONTACTO: DatosContacto = { nombre: '', apellidos: '', telefono: '' }
const VACIA_DIRECCION: DireccionEntrega = {
  calle: '', numero: '', piso: '', cp: '', ciudad: '', indicaciones: '',
}

export const useDatosContacto = create<EstadoDatosContacto>()(
  persist(
    (set) => ({
      contacto: VACIO_CONTACTO,
      direccion: VACIA_DIRECCION,
      guardar: (contacto, direccion) => set({ contacto, direccion }),
    }),
    {
      name: 'datos-contacto-horno-caseron',
      version: 1,
      skipHydration: true,
    },
  ),
)
```

- [ ] **Step 7: Conectar el botón «Continuar» del carrito**

Modificar `src/components/carrito/HojaCarrito.tsx`: añadir `'use client'` ya está presente; añadir el import y el `onClick`:

```ts
import { useRouter } from 'next/navigation'
```

Dentro de `HojaCarrito`, tras `const resumen = ...`:

```ts
  const router = useRouter()
```

Y el botón final pasa de:

```tsx
          <button
            type="button"
            disabled={!resumen.alcanzaMinimo}
            className="mt-6 h-14 w-full rounded-xl bg-amber-500 text-lg font-bold text-neutral-950 disabled:opacity-40"
          >
            Continuar
          </button>
```

a:

```tsx
          <button
            type="button"
            disabled={!resumen.alcanzaMinimo}
            onClick={() => router.push('/checkout')}
            className="mt-6 h-14 w-full rounded-xl bg-amber-500 text-lg font-bold text-neutral-950 disabled:opacity-40"
          >
            Continuar
          </button>
```

- [ ] **Step 8: Crear la página de checkout**

Crear `src/app/checkout/page.tsx`:

```tsx
import { obtenerAjustesHorario, obtenerReglas } from '@/lib/carta/consultas'
import { generarFranjas } from '@/lib/horario'
import { FormularioCheckout } from '@/components/checkout/FormularioCheckout'

export default async function PaginaCheckout() {
  const [reglas, ajustesHorario] = await Promise.all([obtenerReglas(), obtenerAjustesHorario()])
  const franjas = generarFranjas(ajustesHorario, new Date())

  return (
    <main className="mx-auto max-w-lg px-4 pb-24">
      <header className="py-6">
        <a href="/" className="text-sm text-neutral-400">
          ‹ Volver a la carta
        </a>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Finalizar pedido</h1>
      </header>
      <FormularioCheckout reglas={reglas} franjas={franjas} />
    </main>
  )
}
```

- [ ] **Step 9: Escribir el test del formulario que falla**

Crear `src/components/checkout/FormularioCheckout.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FormularioCheckout } from './FormularioCheckout'
import { useCarrito } from '@/lib/carrito/store'
import type { ReglasPedido } from '@/lib/precios/tipos'
import type { Franja } from '@/lib/horario/tipos'

const REGLAS: ReglasPedido = {
  envioCentimos: 200,
  pedidoMinimoCentimos: 1000,
  envioGratisDesdeCentimos: 2000,
}

const FRANJAS: Franja[] = [
  { inicio: '2026-01-15T12:00:00.000Z', fin: '2026-01-15T12:30:00.000Z', loAntesPosible: false },
]

function anadirLineaValida() {
  useCarrito.getState().anadir({
    articuloId: 'a-1',
    nombreArticulo: 'Lomo',
    imagenUrl: null,
    tamanoId: 't-b',
    nombreTamano: 'Bocadillo',
    precioUnitarioCentimos: 1200,
    extras: [],
    cantidad: 1,
    notasLinea: '',
  })
}

beforeEach(() => {
  useCarrito.getState().vaciar()
  vi.restoreAllMocks()
})

describe('FormularioCheckout', () => {
  it('oculta los campos de dirección en recogida', async () => {
    anadirLineaValida()
    render(<FormularioCheckout reglas={REGLAS} franjas={FRANJAS} />)

    await userEvent.click(screen.getByRole('button', { name: 'Recogida en el local' }))
    expect(screen.queryByLabelText('Calle')).not.toBeInTheDocument()
  })

  it('avisa de un artículo agotado y ofrece quitarlo del pedido', async () => {
    anadirLineaValida()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            ok: false,
            error: { tipo: 'articulo_no_disponible', articuloId: 'a-1', nombreArticulo: 'Lomo' },
          }),
      }),
    )

    render(<FormularioCheckout reglas={REGLAS} franjas={FRANJAS} />)
    await userEvent.click(screen.getByRole('button', { name: 'Recogida en el local' }))
    await userEvent.type(screen.getByLabelText('Nombre'), 'Ana')
    await userEvent.type(screen.getByLabelText('Apellidos'), 'García')
    await userEvent.type(screen.getByLabelText('Teléfono'), '600111222')
    await userEvent.click(screen.getByRole('button', { name: /Pagar/ }))

    expect(await screen.findByText(/Lomo.*ya no está disponible/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quitar del pedido' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 10: Ejecutar el test y comprobar que falla**

Run: `pnpm test FormularioCheckout`
Expected: FAIL — no existe `src/components/checkout/FormularioCheckout.tsx`.

- [ ] **Step 11: Implementar el formulario**

Crear `src/components/checkout/FormularioCheckout.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { formatearHoraFranja } from '@/lib/horario'
import type { Franja } from '@/lib/horario/tipos'
import { calcularResumen, precioLinea } from '@/lib/precios'
import type { ReglasPedido } from '@/lib/precios/tipos'
import { formatearPrecio } from '@/lib/dinero'
import { useCarrito } from '@/lib/carrito/store'
import { useDatosContacto } from '@/lib/carrito/datosContacto'
import type { ErrorValidacionPedido } from '@/lib/pedidos/tipos'
import type { ModoEntrega } from '@/lib/precios/tipos'

type Props = {
  reglas: ReglasPedido
  franjas: Franja[]
}

export function FormularioCheckout({ reglas, franjas }: Props) {
  const lineas = useCarrito((estado) => estado.lineas)
  const eliminar = useCarrito((estado) => estado.eliminar)
  const quitarExtraDeLinea = useCarrito((estado) => estado.quitarExtraDeLinea)
  const { contacto: contactoGuardado, direccion: direccionGuardada, guardar } = useDatosContacto()

  const [modoEntrega, setModoEntrega] = useState<ModoEntrega>('domicilio')
  const [nombre, setNombre] = useState(contactoGuardado.nombre)
  const [apellidos, setApellidos] = useState(contactoGuardado.apellidos)
  const [telefono, setTelefono] = useState(contactoGuardado.telefono)
  const [calle, setCalle] = useState(direccionGuardada.calle)
  const [numero, setNumero] = useState(direccionGuardada.numero)
  const [piso, setPiso] = useState(direccionGuardada.piso)
  const [cp, setCp] = useState(direccionGuardada.cp)
  const [ciudad, setCiudad] = useState(direccionGuardada.ciudad)
  const [indicaciones, setIndicaciones] = useState(direccionGuardada.indicaciones)
  const [franjaElegida, setFranjaElegida] = useState(franjas[0])
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<ErrorValidacionPedido | null>(null)

  const resumen = calcularResumen(lineas, modoEntrega, reglas)

  async function enviarPedido() {
    setEnviando(true)
    setError(null)

    const contacto = { nombre, apellidos, telefono }
    const direccion = modoEntrega === 'domicilio' ? { calle, numero, piso, cp, ciudad, indicaciones } : null
    guardar(contacto, direccion ?? { calle: '', numero: '', piso: '', cp: '', ciudad: '', indicaciones: '' })

    const respuesta = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lineas,
        modoEntrega,
        contacto,
        direccion,
        franjaSolicitada: {
          inicio: franjaElegida.inicio,
          fin: franjaElegida.fin,
          loAntesPosible: franjaElegida.loAntesPosible,
        },
        notas,
      }),
    })
    const cuerpo = await respuesta.json()

    if (!cuerpo.ok) {
      setError(cuerpo.error)
      setEnviando(false)
      return
    }

    window.location.href = cuerpo.urlPago
  }

  function quitarArticuloAfectado(articuloId: string) {
    for (const linea of lineas) {
      if (linea.articuloId === articuloId) eliminar(linea.id)
    }
    setError(null)
  }

  function quitarExtraAfectado(tamanoId: string, extraId: string) {
    for (const linea of lineas) {
      if (linea.tamanoId === tamanoId) quitarExtraDeLinea(linea.id, extraId)
    }
    setError(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wide">Entrega</legend>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModoEntrega('domicilio')}
            className={`flex-1 rounded-lg border p-3 ${
              modoEntrega === 'domicilio' ? 'border-amber-500 bg-amber-500/10' : 'border-neutral-700'
            }`}
          >
            A domicilio
          </button>
          <button
            type="button"
            onClick={() => setModoEntrega('recogida')}
            className={`flex-1 rounded-lg border p-3 ${
              modoEntrega === 'recogida' ? 'border-amber-500 bg-amber-500/10' : 'border-neutral-700'
            }`}
          >
            Recogida en el local
          </button>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide">Tus datos</legend>
        <label className="flex flex-col gap-1">
          <span>Nombre</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Apellidos</span>
          <input
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Teléfono</span>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
          />
        </label>
      </fieldset>

      {modoEntrega === 'domicilio' && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-semibold uppercase tracking-wide">Dirección</legend>
          <label className="flex flex-col gap-1">
            <span>Calle</span>
            <input
              value={calle}
              onChange={(e) => setCalle(e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
            />
          </label>
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span>Número</span>
              <input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span>Piso</span>
              <input
                value={piso}
                onChange={(e) => setPiso(e.target.value)}
                className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
              />
            </label>
          </div>
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span>Código postal</span>
              <input
                value={cp}
                onChange={(e) => setCp(e.target.value)}
                className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span>Ciudad</span>
              <input
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span>Indicaciones para el portal (opcional)</span>
            <input
              value={indicaciones}
              onChange={(e) => setIndicaciones(e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
            />
          </label>
        </fieldset>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wide">Franja de entrega</legend>
        <p className="mb-2 text-sm text-neutral-400">
          Es una petición. El restaurante la confirmará al aceptar el pedido.
        </p>
        <div className="flex flex-col gap-2">
          {franjas.map((franja) => (
            <label
              key={franja.inicio + franja.fin + String(franja.loAntesPosible)}
              className="flex items-center gap-3 rounded-lg border border-neutral-700 p-3"
            >
              <input
                type="radio"
                name="franja"
                checked={franja === franjaElegida}
                onChange={() => setFranjaElegida(franja)}
              />
              {franja.loAntesPosible
                ? 'Lo antes posible'
                : `${formatearHoraFranja(franja.inicio)}–${formatearHoraFranja(franja.fin)}`}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold uppercase tracking-wide">Notas del pedido (opcional)</span>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
        />
      </label>

      <dl className="flex flex-col gap-1 border-t border-neutral-800 pt-4 text-sm">
        {lineas.map((linea) => (
          <div key={linea.id} className="flex justify-between">
            <dt>
              {linea.cantidad}× {linea.nombreArticulo} · {linea.nombreTamano}
            </dt>
            <dd>{formatearPrecio(precioLinea(linea))}</dd>
          </div>
        ))}
        <div className="mt-2 flex justify-between font-bold">
          <dt>Total</dt>
          <dd>{formatearPrecio(resumen.totalCentimos)}</dd>
        </div>
      </dl>

      {error?.tipo === 'articulo_no_disponible' && (
        <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">
          <p>«{error.nombreArticulo}» ya no está disponible.</p>
          <button
            type="button"
            onClick={() => quitarArticuloAfectado(error.articuloId)}
            className="mt-2 rounded-lg border border-amber-500 px-3 py-2"
          >
            Quitar del pedido
          </button>
        </div>
      )}

      {error?.tipo === 'extra_no_disponible' && (
        <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">
          <p>El complemento «{error.nombreExtra}» ya no está disponible.</p>
          <button
            type="button"
            onClick={() => quitarExtraAfectado(error.tamanoId, error.extraId)}
            className="mt-2 rounded-lg border border-amber-500 px-3 py-2"
          >
            Quitar «{error.nombreExtra}» y continuar
          </button>
        </div>
      )}

      {error?.tipo === 'bajo_minimo' && (
        <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">
          Te faltan {formatearPrecio(error.faltaCentimos)} para llegar al pedido mínimo a domicilio.
        </p>
      )}

      <button
        type="button"
        disabled={enviando || lineas.length === 0}
        onClick={enviarPedido}
        className="h-14 w-full rounded-xl bg-amber-500 text-lg font-bold text-neutral-950 disabled:opacity-40"
      >
        Pagar {formatearPrecio(resumen.totalCentimos)}
      </button>
    </div>
  )
}
```

- [ ] **Step 12: Ejecutar el test y comprobar que pasa**

Run: `pnpm test FormularioCheckout`
Expected: PASS.

- [ ] **Step 13: Ejecutar toda la suite y comprobar que compila**

Run: `pnpm test && pnpm build`
Expected: todos los tests en verde, compilación sin errores.

- [ ] **Step 14: Commit**

```bash
git add src/lib/carta/consultas.ts src/lib/carrito src/components/carrito/HojaCarrito.tsx \
  src/app/checkout src/components/checkout
git commit -m "Añade el formulario de checkout"
```

---

### Tarea 8: Aviso por WhatsApp con CallMeBot

**Files:**
- Modify: `.env.example`
- Create: `src/lib/avisos/index.ts`

**Interfaces:**
- Consumes: `crearClienteServicio` (de `@/lib/supabase/cliente-servicio`), `formatearPrecio` (de `@/lib/dinero`), `formatearHoraFranja` (de `@/lib/horario`), `PedidoConLineas` (de `@/lib/pedidos/tipos`).
- Produces: `avisarNuevoPedido(pedido: PedidoConLineas): Promise<void>` — nunca lanza; registra el resultado en `avisos_log`.

- [ ] **Step 1: PARADA — confirmar el número y la clave de CallMeBot**

**No continúes sin respuesta del usuario.** Pregúntale:

> Para avisar por WhatsApp necesito el número de teléfono que va a recibir los avisos y su clave de API de CallMeBot. Se obtiene enviando `I allow callmebot to send me messages` al contacto de CallMeBot en WhatsApp (+34 644 51 71 41); el bot responde con la clave. ¿Me pasas el número (con prefijo internacional) y la clave una vez la tengas?

- [ ] **Step 2: Guardar las credenciales**

Añadir a `.env.local`:

```
CALLMEBOT_TELEFONO=34600000000
CALLMEBOT_CLAVE=...
```

Añadir a `.env.example`:

```
CALLMEBOT_TELEFONO=
CALLMEBOT_CLAVE=
```

- [ ] **Step 3: Implementar el aviso**

Crear `src/lib/avisos/index.ts`:

```ts
import { formatearHoraFranja } from '@/lib/horario'
import { formatearPrecio } from '@/lib/dinero'
import type { PedidoConLineas } from '@/lib/pedidos/tipos'
import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'

function construirMensaje(pedido: PedidoConLineas): string {
  const lineas = pedido.pedido_lineas
    .map((linea) => `${linea.cantidad}× ${linea.nombre_articulo} (${linea.nombre_tamano})`)
    .join('\n')

  const franja = pedido.franja_solicitada_asap
    ? 'lo antes posible'
    : `${formatearHoraFranja(pedido.franja_solicitada_inicio)}–${formatearHoraFranja(pedido.franja_solicitada_fin)}`

  return [
    `Pedido ${pedido.codigo_publico}`,
    `${pedido.modo_entrega === 'domicilio' ? 'Domicilio' : 'Recogida'} · franja ${franja}`,
    `${pedido.cliente_nombre} ${pedido.cliente_apellidos} · ${pedido.cliente_telefono}`,
    lineas,
    `Total: ${formatearPrecio(pedido.total_centimos)}`,
  ].join('\n')
}

async function llamarCallMeBot(mensaje: string): Promise<void> {
  const telefono = process.env.CALLMEBOT_TELEFONO
  const clave = process.env.CALLMEBOT_CLAVE
  if (!telefono || !clave) throw new Error('Faltan CALLMEBOT_TELEFONO o CALLMEBOT_CLAVE.')

  const url =
    `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(telefono)}` +
    `&text=${encodeURIComponent(mensaje)}&apikey=${encodeURIComponent(clave)}`
  const respuesta = await fetch(url)
  if (!respuesta.ok) throw new Error(`CallMeBot respondió ${respuesta.status}`)
}

/**
 * Nunca lanza: un fallo de CallMeBot no puede tumbar un pedido ya cobrado.
 * Se reintenta una vez y el resultado, éxito o fracaso, queda en
 * `avisos_log` para que el panel pueda mostrarlo más adelante.
 */
export async function avisarNuevoPedido(pedido: PedidoConLineas): Promise<void> {
  const mensaje = construirMensaje(pedido)
  const supabase = crearClienteServicio()

  for (let intento = 0; intento < 2; intento++) {
    try {
      await llamarCallMeBot(mensaje)
      await supabase.from('avisos_log').insert({ pedido_id: pedido.id, canal: 'whatsapp', resultado: 'enviado' })
      return
    } catch (error) {
      if (intento === 1) {
        await supabase.from('avisos_log').insert({
          pedido_id: pedido.id,
          canal: 'whatsapp',
          resultado: 'fallido',
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }
}
```

- [ ] **Step 4: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores.

- [ ] **Step 5: Commit**

```bash
git add .env.example src/lib/avisos
git commit -m "Añade el aviso por WhatsApp con CallMeBot"
```

---

### Tarea 9: Webhook de Stripe idempotente

**Files:**
- Create: `src/lib/pedidos/confirmar.ts`
- Create: `src/app/api/stripe/webhook/route.ts`

**Interfaces:**
- Consumes: `crearClienteServicio` (de `@/lib/supabase/cliente-servicio`), `verificarEventoWebhook` (de `@/lib/pagos`), `avisarNuevoPedido` (de `@/lib/avisos`), `PedidoConLineas` (de `@/lib/pedidos/tipos`).
- Produces: `confirmarPagoDePedido(stripeSessionId, paymentIntent): Promise<PedidoConLineas | null>` (null si ya estaba confirmado); `POST /api/stripe/webhook`.

- [ ] **Step 1: Implementar la transición idempotente**

Crear `src/lib/pedidos/confirmar.ts`:

```ts
import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'
import type { PedidoConLineas } from './tipos'

const SELECT_CON_LINEAS = '*, pedido_lineas(*, pedido_extras(*))'

/**
 * Pasa el pedido de `pendiente_pago` a `nuevo`, condicionado al estado
 * anterior. Devuelve `null` si el pedido ya estaba confirmado: así el
 * webhook (que Stripe puede reenviar) y la red de seguridad del seguimiento
 * pueden llamar a esta misma función sin arriesgarse a duplicar el aviso.
 */
export async function confirmarPagoDePedido(
  stripeSessionId: string,
  paymentIntent: string,
): Promise<PedidoConLineas | null> {
  const supabase = crearClienteServicio()
  const { data, error } = await supabase
    .from('pedidos')
    .update({ estado: 'nuevo', pagado_en: new Date().toISOString(), stripe_payment_intent: paymentIntent })
    .eq('stripe_session_id', stripeSessionId)
    .eq('estado', 'pendiente_pago')
    .select(SELECT_CON_LINEAS)
    .maybeSingle()

  if (error) throw error
  return data as PedidoConLineas | null
}
```

- [ ] **Step 2: Implementar el webhook**

Crear `src/app/api/stripe/webhook/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { avisarNuevoPedido } from '@/lib/avisos'
import { confirmarPagoDePedido } from '@/lib/pedidos/confirmar'
import { verificarEventoWebhook } from '@/lib/pagos'
import type Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const cuerpo = await req.text()
  const firma = req.headers.get('stripe-signature')

  if (!firma) {
    return NextResponse.json({ error: 'Falta la firma de Stripe.' }, { status: 400 })
  }

  let evento: Stripe.Event
  try {
    evento = verificarEventoWebhook(cuerpo, firma)
  } catch {
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 400 })
  }

  if (evento.type === 'checkout.session.completed') {
    const session = evento.data.object as Stripe.Checkout.Session
    const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : ''
    const pedidoConfirmado = await confirmarPagoDePedido(session.id, paymentIntent)

    // Si es null, ya estaba confirmado (Stripe reintentó el webhook, o la red
    // de seguridad del seguimiento llegó primero): no se vuelve a avisar.
    if (pedidoConfirmado) {
      await avisarNuevoPedido(pedidoConfirmado)
    }
  }

  return NextResponse.json({ received: true })
}
```

- [ ] **Step 3: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores. El webhook se ejerce de extremo a extremo en la Tarea 11, con el CLI de Stripe reenviando eventos reales.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pedidos/confirmar.ts src/app/api/stripe/webhook
git commit -m "Añade el webhook idempotente de Stripe"
```

---

### Tarea 10: Página de seguimiento del pedido

**Files:**
- Create: `src/lib/pedidos/textoEstado.ts`
- Test: `src/lib/pedidos/textoEstado.test.ts`
- Create: `src/lib/pedidos/seguimiento.ts`
- Create: `src/app/api/pedidos/[codigo]/route.ts`
- Create: `src/app/pedido/[codigo]/page.tsx`
- Create: `src/components/pedido/EstadoPedido.tsx`

**Interfaces:**
- Consumes: `PedidoConLineas`, `EstadoPedido` (de `@/lib/pedidos/tipos`), `obtenerEstadoSesion` (de `@/lib/pagos`), `confirmarPagoDePedido` (de `@/lib/pedidos/confirmar`), `crearClienteServicio`, `formatearHoraFranja`, `formatearPrecio`.
- Produces: `textoEstadoCliente(pedido): string`; `EstadoSeguimiento` (tipo); `obtenerEstadoPedido(codigo): Promise<EstadoSeguimiento | null>`; `GET /api/pedidos/[codigo]`; página `/pedido/[codigo]`.

- [ ] **Step 1: Escribir el test que falla para el texto de estado**

Crear `src/lib/pedidos/textoEstado.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { textoEstadoCliente } from './textoEstado'
import type { EstadoSeguimiento } from './seguimiento'

function pedido(parcial: Partial<EstadoSeguimiento> = {}): EstadoSeguimiento {
  return {
    codigoPublico: 'abc123',
    estado: 'nuevo',
    modoEntrega: 'domicilio',
    franjaSolicitada: { inicio: '2026-01-15T12:00:00.000Z', fin: '2026-01-15T12:30:00.000Z', asap: false },
    franjaConfirmada: null,
    lineas: [],
    totalCentimos: 0,
    telefonoRestaurante: '916780435',
    ...parcial,
  }
}

describe('textoEstadoCliente', () => {
  it('recién pagado y sin confirmar: pide franja pendiente de confirmar', () => {
    expect(textoEstadoCliente(pedido())).toBe(
      'Recibido — has pedido las 13:00–13:30, pendiente de confirmar',
    )
  })

  it('recién pagado con "lo antes posible" y sin confirmar', () => {
    expect(
      textoEstadoCliente(pedido({ franjaSolicitada: { ...pedido().franjaSolicitada, asap: true } })),
    ).toBe('Recibido — pediste lo antes posible, pendiente de confirmar')
  })

  it('confirmado, muestra la franja confirmada', () => {
    expect(
      textoEstadoCliente(
        pedido({
          franjaConfirmada: { inicio: '2026-01-15T12:00:00.000Z', fin: '2026-01-15T12:30:00.000Z' },
        }),
      ),
    ).toBe('Confirmado para las 13:00–13:30')
  })

  it('en preparación', () => {
    expect(textoEstadoCliente(pedido({ estado: 'en_preparacion' }))).toBe('En preparación')
  })

  it('listo, a domicilio', () => {
    expect(textoEstadoCliente(pedido({ estado: 'pendiente_envio', modoEntrega: 'domicilio' }))).toBe(
      'Listo — sale en breve',
    )
  })

  it('listo, en recogida', () => {
    expect(textoEstadoCliente(pedido({ estado: 'pendiente_envio', modoEntrega: 'recogida' }))).toBe(
      'Listo para recoger',
    )
  })

  it('en reparto', () => {
    expect(textoEstadoCliente(pedido({ estado: 'en_reparto' }))).toBe('En reparto — tu pedido va de camino')
  })

  it('entregado', () => {
    expect(textoEstadoCliente(pedido({ estado: 'entregado' }))).toBe('Entregado')
  })

  it('pendiente de pago: mensaje de espera, nunca visible en un flujo normal', () => {
    expect(textoEstadoCliente(pedido({ estado: 'pendiente_pago' }))).toBe('Confirmando tu pago…')
  })
})
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `pnpm test textoEstado`
Expected: FAIL — no existen `textoEstado.ts` ni `seguimiento.ts`.

- [ ] **Step 3: Implementar el tipo `EstadoSeguimiento` y `obtenerEstadoPedido`**

Crear `src/lib/pedidos/seguimiento.ts`:

```ts
import { obtenerEstadoSesion } from '@/lib/pagos'
import type { ModoEntrega } from '@/lib/precios/tipos'
import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'
import { confirmarPagoDePedido } from './confirmar'
import type { EstadoPedido, PedidoConLineas } from './tipos'

export type EstadoSeguimiento = {
  codigoPublico: string
  estado: EstadoPedido
  modoEntrega: ModoEntrega
  franjaSolicitada: { inicio: string; fin: string; asap: boolean }
  franjaConfirmada: { inicio: string; fin: string } | null
  lineas: { nombreArticulo: string; nombreTamano: string; cantidad: number; extras: string[] }[]
  totalCentimos: number
  telefonoRestaurante: string
}

const SELECT_CON_LINEAS = '*, pedido_lineas(*, pedido_extras(*))'

function mapearParaCliente(pedido: PedidoConLineas, telefonoRestaurante: string): EstadoSeguimiento {
  return {
    codigoPublico: pedido.codigo_publico,
    estado: pedido.estado as EstadoPedido,
    modoEntrega: pedido.modo_entrega as ModoEntrega,
    franjaSolicitada: {
      inicio: pedido.franja_solicitada_inicio,
      fin: pedido.franja_solicitada_fin,
      asap: pedido.franja_solicitada_asap,
    },
    franjaConfirmada:
      pedido.franja_confirmada_inicio && pedido.franja_confirmada_fin
        ? { inicio: pedido.franja_confirmada_inicio, fin: pedido.franja_confirmada_fin }
        : null,
    lineas: pedido.pedido_lineas.map((linea) => ({
      nombreArticulo: linea.nombre_articulo,
      nombreTamano: linea.nombre_tamano,
      cantidad: linea.cantidad,
      extras: linea.pedido_extras.map((extra) => extra.nombre_extra),
    })),
    totalCentimos: pedido.total_centimos,
    telefonoRestaurante,
  }
}

/**
 * Lee el pedido por su código público. Si sigue en `pendiente_pago`, es la
 * red de seguridad: consulta a Stripe directamente por si el webhook no ha
 * llegado todavía. Un cliente que ha pagado y un pedido que nadie prepara es
 * el peor fallo posible, así que la confirmación tiene dos caminos.
 */
export async function obtenerEstadoPedido(codigo: string): Promise<EstadoSeguimiento | null> {
  const supabase = crearClienteServicio()

  const [{ data: pedido, error }, { data: ajustes, error: errorAjustes }] = await Promise.all([
    supabase.from('pedidos').select(SELECT_CON_LINEAS).eq('codigo_publico', codigo).maybeSingle(),
    supabase.from('ajustes').select('telefono').single(),
  ])

  if (error) throw error
  if (errorAjustes) throw errorAjustes
  if (!pedido) return null

  let pedidoActual = pedido as PedidoConLineas

  if (pedidoActual.estado === 'pendiente_pago' && pedidoActual.stripe_session_id) {
    const estadoSesion = await obtenerEstadoSesion(pedidoActual.stripe_session_id)
    if (estadoSesion.pagada && estadoSesion.paymentIntent) {
      const confirmado = await confirmarPagoDePedido(pedidoActual.stripe_session_id, estadoSesion.paymentIntent)
      if (confirmado) pedidoActual = confirmado
    }
  }

  return mapearParaCliente(pedidoActual, ajustes.telefono)
}
```

- [ ] **Step 4: Implementar `textoEstadoCliente`**

Crear `src/lib/pedidos/textoEstado.ts`:

```ts
import { formatearHoraFranja } from '@/lib/horario'
import type { EstadoSeguimiento } from './seguimiento'

function rangoFranja(inicio: string, fin: string): string {
  return `${formatearHoraFranja(inicio)}–${formatearHoraFranja(fin)}`
}

/** Copia el texto del estado tal como se especifica que lo lea el cliente. */
export function textoEstadoCliente(pedido: EstadoSeguimiento): string {
  switch (pedido.estado) {
    case 'pendiente_pago':
      return 'Confirmando tu pago…'

    case 'nuevo':
      if (pedido.franjaConfirmada) {
        return `Confirmado para las ${rangoFranja(pedido.franjaConfirmada.inicio, pedido.franjaConfirmada.fin)}`
      }
      return pedido.franjaSolicitada.asap
        ? 'Recibido — pediste lo antes posible, pendiente de confirmar'
        : `Recibido — has pedido las ${rangoFranja(pedido.franjaSolicitada.inicio, pedido.franjaSolicitada.fin)}, pendiente de confirmar`

    case 'en_preparacion':
      return 'En preparación'

    case 'pendiente_envio':
      return pedido.modoEntrega === 'recogida' ? 'Listo para recoger' : 'Listo — sale en breve'

    case 'en_reparto':
      return 'En reparto — tu pedido va de camino'

    case 'entregado':
      return 'Entregado'
  }
}
```

- [ ] **Step 5: Ejecutar el test y comprobar que pasa**

Run: `pnpm test textoEstado`
Expected: PASS.

- [ ] **Step 6: Crear el endpoint de sondeo**

Crear `src/app/api/pedidos/[codigo]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { obtenerEstadoPedido } from '@/lib/pedidos/seguimiento'

export async function GET(_req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const estado = await obtenerEstadoPedido(codigo)
  if (!estado) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(estado)
}
```

- [ ] **Step 7: Crear el componente de sondeo**

Crear `src/components/pedido/EstadoPedido.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { formatearPrecio } from '@/lib/dinero'
import { textoEstadoCliente } from '@/lib/pedidos/textoEstado'
import type { EstadoSeguimiento } from '@/lib/pedidos/seguimiento'

export function EstadoPedido({ estadoInicial }: { estadoInicial: EstadoSeguimiento }) {
  const [estado, setEstado] = useState(estadoInicial)

  useEffect(() => {
    const id = setInterval(async () => {
      const respuesta = await fetch(`/api/pedidos/${estado.codigoPublico}`)
      if (respuesta.ok) setEstado(await respuesta.json())
    }, 15000)
    return () => clearInterval(id)
  }, [estado.codigoPublico])

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl bg-neutral-900 p-4">
        <p className="text-xs uppercase tracking-wide text-neutral-400">Pedido {estado.codigoPublico}</p>
        <p className="mt-1 text-xl font-bold">{textoEstadoCliente(estado)}</p>
      </div>

      <dl className="flex flex-col gap-1 text-sm">
        {estado.lineas.map((linea, indice) => (
          <div key={indice} className="flex justify-between">
            <dt>
              {linea.cantidad}× {linea.nombreArticulo} · {linea.nombreTamano}
              {linea.extras.length > 0 && (
                <span className="text-neutral-400"> ({linea.extras.join(', ')})</span>
              )}
            </dt>
          </div>
        ))}
        <div className="mt-2 flex justify-between font-bold">
          <dt>Total</dt>
          <dd>{formatearPrecio(estado.totalCentimos)}</dd>
        </div>
      </dl>

      <p className="text-sm text-neutral-400">
        ¿Alguna duda? Llama al restaurante: {estado.telefonoRestaurante}
      </p>
    </div>
  )
}
```

- [ ] **Step 8: Crear la página de seguimiento**

Crear `src/app/pedido/[codigo]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { obtenerEstadoPedido } from '@/lib/pedidos/seguimiento'
import { EstadoPedido } from '@/components/pedido/EstadoPedido'

export default async function PaginaSeguimiento({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const estado = await obtenerEstadoPedido(codigo)
  if (!estado) notFound()

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <EstadoPedido estadoInicial={estado} />
    </main>
  )
}
```

- [ ] **Step 9: Ejecutar toda la suite y comprobar que compila**

Run: `pnpm test && pnpm build`
Expected: todos los tests en verde, compilación sin errores.

- [ ] **Step 10: Commit**

```bash
git add src/lib/pedidos/textoEstado.ts src/lib/pedidos/textoEstado.test.ts \
  src/lib/pedidos/seguimiento.ts src/app/api/pedidos/\[codigo\] \
  src/app/pedido src/components/pedido
git commit -m "Añade la página de seguimiento del pedido"
```

---

### Tarea 11: Recorrido de extremo a extremo

**Files:**
- Create: `e2e/checkout.spec.ts`

**Interfaces:**
- Consumes: toda la pila de esta fase, contra el proyecto real de Supabase (dev) y Stripe en modo test.

- [ ] **Step 1: Arrancar el reenvío de webhooks de Stripe**

En una terminal aparte, mientras se ejecutan estos tests:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copiar el `whsec_...` que imprime a `STRIPE_WEBHOOK_SECRET` en `.env.local` si difiere del usado hasta ahora.

- [ ] **Step 2: Escribir el recorrido completo**

Crear `e2e/checkout.spec.ts`:

```ts
import { config } from 'dotenv'
config({ path: '.env.local' }) // el test habla con Supabase directamente, fuera del servidor de Next
import { expect, test } from '@playwright/test'
import { crearClienteServicio } from '../src/lib/supabase/cliente-servicio'

test('un cliente completa el pedido y paga con la tarjeta de prueba', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Lomo' }).click()
  // Dos unidades (2 × 5,00 €) para alcanzar el pedido mínimo de 10,00 €: la
  // barra de carrito comprueba el mínimo asumiendo domicilio, aunque más
  // tarde en el checkout se elija recogida.
  await page.getByRole('button', { name: /Aumentar cantidad/ }).click()
  await page.getByRole('button', { name: /Añadir/ }).click()
  await page.getByRole('button', { name: /Ver pedido/ }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()

  await expect(page).toHaveURL(/\/checkout$/)
  await page.getByRole('button', { name: 'Recogida en el local' }).click()
  await page.getByLabel('Nombre').fill('Ana')
  await page.getByLabel('Apellidos').fill('García')
  await page.getByLabel('Teléfono').fill('600111222')
  await page.getByRole('button', { name: /Pagar/ }).click()

  await page.waitForURL(/checkout\.stripe\.com/)
  await page.locator('#email').fill('ana@example.com')
  await page.locator('#cardNumber').fill('4242424242424242')
  await page.locator('#cardExpiry').fill('12/34')
  await page.locator('#cardCvc').fill('123')
  await page.locator('#billingName').fill('Ana García')
  await page.getByTestId('hosted-payment-submit-button').click()

  await page.waitForURL(/\/pedido\//)
  await expect(page.getByText(/Recibido|Confirmado/)).toBeVisible({ timeout: 15000 })
})

test('recogida en local no pide dirección ni cobra envío', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Lomo' }).click()
  await page.getByRole('button', { name: /Aumentar cantidad/ }).click()
  await page.getByRole('button', { name: /Añadir/ }).click()
  await page.getByRole('button', { name: /Ver pedido/ }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()

  await page.getByRole('button', { name: 'Recogida en el local' }).click()
  await expect(page.getByLabel('Calle')).not.toBeVisible()
})

test('un artículo agotado durante el checkout bloquea el pago', async ({ page }) => {
  const supabase = crearClienteServicio()
  const { data: articulo } = await supabase.from('articulos').select('id').eq('nombre', 'Lomo').single()

  await page.goto('/')
  await page.getByRole('button', { name: 'Lomo' }).click()
  await page.getByRole('button', { name: /Aumentar cantidad/ }).click()
  await page.getByRole('button', { name: /Añadir/ }).click()
  await page.getByRole('button', { name: /Ver pedido/ }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Recogida en el local' }).click()
  await page.getByLabel('Nombre').fill('Ana')
  await page.getByLabel('Apellidos').fill('García')
  await page.getByLabel('Teléfono').fill('600111222')

  await supabase.from('articulos').update({ disponible: false }).eq('id', articulo!.id)
  try {
    await page.getByRole('button', { name: /Pagar/ }).click()
    await expect(page.getByText(/Lomo.*ya no está disponible/)).toBeVisible()
    await expect(page).toHaveURL(/\/checkout$/)
  } finally {
    await supabase.from('articulos').update({ disponible: true }).eq('id', articulo!.id)
  }
})

test('el servidor rechaza un pedido por debajo del mínimo aunque el navegador lo permita', async ({
  request,
}) => {
  const respuesta = await request.post('/api/pedidos', {
    data: {
      lineas: [],
      modoEntrega: 'domicilio',
      contacto: { nombre: 'Ana', apellidos: 'García', telefono: '600111222' },
      direccion: { calle: 'C. Hierro', numero: '73', piso: '', cp: '28850', ciudad: 'Torrejón de Ardoz', indicaciones: '' },
      franjaSolicitada: { inicio: new Date().toISOString(), fin: new Date().toISOString(), loAntesPosible: true },
      notas: '',
    },
  })
  expect(respuesta.status()).toBe(422)
  const cuerpo = await respuesta.json()
  expect(cuerpo.error.tipo).toBe('bajo_minimo')
})
```

- [ ] **Step 3: Ejecutar el recorrido completo**

Con `stripe listen` corriendo en otra terminal:

Run: `pnpm test:e2e checkout`
Expected: PASS. Si los selectores `#cardNumber`, `#cardExpiry`, `#cardCvc`, `#billingName` o `hosted-payment-submit-button` han cambiado en la página hospedada de Stripe, ajústalos: son los identificadores documentados por Stripe para automatizar Checkout, pero Stripe puede modificarlos.

- [ ] **Step 4: Commit**

```bash
git add e2e/checkout.spec.ts
git commit -m "Añade el recorrido de extremo a extremo del checkout"
```

---

## Qué queda fuera de este plan

Los planes siguientes, en orden:

3. **Panel de cocina** — autenticación del personal, tablero de estados, confirmación de franja, Realtime y aviso sonoro.
4. **Administración** — CRUD de carta, pantalla de disponibilidad, ajustes, equipo e historial.
5. **Reparto y despliegue** — perfil de repartidor y publicación en Vercel.
