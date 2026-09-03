# Panel de cocina — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Desde el móvil, cocina (o admin) entra en `/panel`, ve los pedidos recién pagados en tiempo real con aviso sonoro y vibración, confirma o ajusta la franja de entrega, marca las líneas preparadas y avanza cada pedido por sus fases hasta la entrega (o hasta que quede listo para un repartidor).

**Architecture:** Se añade autenticación de personal con Supabase Auth y una tabla `perfiles_staff` con el rol de cada cuenta. Las políticas de RLS dejan que cada miembro del personal lea, con su propia sesión (no con la clave de servicio), los pedidos que le corresponden según su rol — eso es lo que habilita Supabase Realtime para el aviso de pedido nuevo, porque Realtime autoriza cada cambio contra las mismas políticas de RLS de la tabla. Las escrituras (confirmar franja, avanzar de fase, marcar una línea preparada) siguen pasando por endpoints de servidor que usan la clave de servicio y condicionan la transición al estado anterior, igual que ya hace el webhook de Stripe; no se conceden políticas de escritura por RLS. Una máquina de estados pura (`lib/estados`) centraliza qué transición puede ejecutar cada rol y en qué modo de entrega, para poder probarla entera sin base de datos.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Supabase (Postgres, Auth, Realtime), `@supabase/ssr`, Zustand, Vitest, Testing Library, Playwright, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-19-pedidos-horno-caseron-design.md` (secciones 5, 7, 9, 10 y 11 son las que cubre este plan).

**Plan anterior:** `docs/superpowers/plans/2026-08-21-checkout-stripe-seguimiento.md` (checkout, Stripe y seguimiento del cliente — completado).

## Global Constraints

- **Gestor de paquetes: pnpm.** Nunca `npm` ni `npx`. En su lugar `pnpm` y `pnpx`. Aplica también a scripts, documentación y CI.
- **Importes siempre en céntimos enteros.** Nunca euros en coma flotante.
- **Zona horaria de referencia: `Europe/Madrid`.**
- **Idioma de la interfaz y del código de dominio: español.** Nombres de variables, tablas y funciones en español, sin acentos en identificadores.
- **Las integraciones nativas (MCP) de Supabase, Vercel y Stripe no se usan.** Están conectadas a cuentas distintas. Todo se hace por CLI y código, y cualquier paso que dé de alta una cuenta o clave nueva se detiene a preguntar primero — incluida la primera cuenta de personal, porque todavía no hay pantalla de invitación.
- **Los pedidos no son accesibles desde el navegador anónimo.** El personal solo lee lo que le permiten sus políticas de RLS según su rol en `perfiles_staff`; el cliente anónimo sigue sin ver nunca esa tabla.
- **Cada transición de estado está condicionada al estado anterior**, ejecutada en el servidor con la clave de servicio: si dos personas pulsan la misma acción a la vez, la segunda no hace nada, igual que ya ocurre con la confirmación de pago.
- **El personal no se registra por su cuenta.** Sin pantalla de invitación todavía (llega en el plan de Administración), las cuentas de esta fase se crean con un script de un solo uso, tras confirmar con el usuario.
- **Supabase se usa en su versión Cloud, no local.**

## Estructura de ficheros

| Fichero | Responsabilidad |
|---|---|
| `src/lib/personal/tipos.ts` | Tipos: `RolStaff`, `PerfilStaff`. |
| `src/lib/estados/index.ts` | `transicionPermitida`, `puedeConfirmarFranja`. Puro. |
| `src/lib/pedidos/tablero.ts` | Agrupar en pestañas, ordenar por franja, fusionar cambios de Realtime. Puro. |
| `supabase/migrations/0004_esquema_personal.sql` | Tabla `perfiles_staff`, función de rol y políticas de RLS de lectura para el personal sobre pedidos. |
| `src/lib/supabase/cliente-navegador.ts` | Cliente de Supabase ligado a la sesión, para el navegador. |
| `src/lib/supabase/cliente-servidor-sesion.ts` | Cliente de Supabase ligado a la sesión, para Server Components y rutas. |
| `src/proxy.ts` | Refresca la sesión y protege `/panel/**` (sustituye a `middleware.ts` en Next 16; va en `src/` porque ahí vive `app`). |
| `src/lib/personal/sesion.ts` | `obtenerPerfilStaff`. |
| `scripts/crear-cuenta-staff.ts` | Script de un solo uso para dar de alta la primera cuenta de personal. |
| `src/components/panel/FormularioLogin.tsx` | Formulario de email y contraseña. |
| `src/app/panel/iniciar-sesion/page.tsx` | Página de inicio de sesión, fuera de la protección de `proxy.ts`. |
| `src/lib/pedidos/panel.ts` | `listarPedidosPanel`, `obtenerPedidoPanelPorId`, `confirmarFranjaPedido`, `avanzarEstadoPedido`, `marcarLineaPreparada`. |
| `src/components/panel/CerrarSesionBoton.tsx` | Botón de cerrar sesión. |
| `src/app/panel/(protegido)/layout.tsx` | Exige sesión, pinta cabecera con nombre y rol. |
| `src/app/api/panel/pedidos/[id]/confirmar-franja/route.ts` | Confirma o ajusta la franja. |
| `src/app/api/panel/pedidos/[id]/avanzar/route.ts` | Avanza el pedido de fase. |
| `src/app/api/panel/pedidos/[id]/lineas/[lineaId]/route.ts` | Marca una línea preparada o no. |
| `src/components/panel/TarjetaPedido.tsx` | Tarjeta de pedido con checklist y acciones. |
| `src/components/panel/TableroPedidos.tsx` | Pestañas, Realtime, aviso sonoro y vibración. |
| `src/app/panel/(protegido)/page.tsx` | Página `/panel`. |
| `e2e/panel.spec.ts` | Recorrido de extremo a extremo del tablero. |

---

### Tarea 1: Máquina de estados y permisos del personal

**Files:**
- Create: `src/lib/personal/tipos.ts`
- Create: `src/lib/estados/index.ts`
- Test: `src/lib/estados/estados.test.ts`

**Interfaces:**
- Consumes: `EstadoPedido` (de `@/lib/pedidos/tipos`), `ModoEntrega` (de `@/lib/precios/tipos`).
- Produces: tipos `RolStaff`, `PerfilStaff`; funciones `transicionPermitida(rol, de, a, modoEntrega): boolean`, `puedeConfirmarFranja(rol): boolean`.

- [ ] **Step 1: Escribir los tipos de personal**

Crear `src/lib/personal/tipos.ts`:

```ts
export type RolStaff = 'admin' | 'cocina' | 'repartidor'

export type PerfilStaff = {
  userId: string
  nombre: string
  rol: RolStaff
}
```

- [ ] **Step 2: Escribir los tests que fallan**

Crear `src/lib/estados/estados.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { puedeConfirmarFranja, transicionPermitida } from '.'

describe('transicionPermitida', () => {
  it.each([
    ['admin', 'nuevo', 'en_preparacion', 'domicilio', true],
    ['admin', 'nuevo', 'en_preparacion', 'recogida', true],
    ['admin', 'en_preparacion', 'pendiente_envio', 'domicilio', true],
    ['admin', 'pendiente_envio', 'en_reparto', 'domicilio', true],
    ['admin', 'pendiente_envio', 'en_reparto', 'recogida', false],
    ['admin', 'en_reparto', 'entregado', 'domicilio', true],
    ['admin', 'pendiente_envio', 'entregado', 'recogida', true],
    ['admin', 'pendiente_envio', 'entregado', 'domicilio', false],

    ['cocina', 'nuevo', 'en_preparacion', 'domicilio', true],
    ['cocina', 'en_preparacion', 'pendiente_envio', 'domicilio', true],
    ['cocina', 'pendiente_envio', 'en_reparto', 'domicilio', false],
    ['cocina', 'en_reparto', 'entregado', 'domicilio', false],
    ['cocina', 'pendiente_envio', 'entregado', 'recogida', true],
    ['cocina', 'pendiente_envio', 'entregado', 'domicilio', false],

    ['repartidor', 'pendiente_envio', 'en_reparto', 'domicilio', true],
    ['repartidor', 'en_reparto', 'entregado', 'domicilio', true],
    ['repartidor', 'nuevo', 'en_preparacion', 'domicilio', false],
    ['repartidor', 'en_preparacion', 'pendiente_envio', 'domicilio', false],
    ['repartidor', 'pendiente_envio', 'entregado', 'recogida', false],
  ] as const)('rol %s: %s -> %s (%s) = %s', (rol, de, a, modo, esperado) => {
    expect(transicionPermitida(rol, de, a, modo)).toBe(esperado)
  })

  it('nunca permite retroceder un estado', () => {
    expect(transicionPermitida('admin', 'en_preparacion', 'nuevo', 'domicilio')).toBe(false)
  })

  it('nunca permite saltarse una fase', () => {
    expect(transicionPermitida('admin', 'nuevo', 'pendiente_envio', 'domicilio')).toBe(false)
  })
})

describe('puedeConfirmarFranja', () => {
  it('admin y cocina pueden confirmar la franja', () => {
    expect(puedeConfirmarFranja('admin')).toBe(true)
    expect(puedeConfirmarFranja('cocina')).toBe(true)
  })

  it('el repartidor no puede confirmar la franja', () => {
    expect(puedeConfirmarFranja('repartidor')).toBe(false)
  })
})
```

- [ ] **Step 3: Ejecutar los tests y comprobar que fallan**

Run: `pnpm test estados`
Expected: FAIL — no existe `src/lib/estados/index.ts`.

- [ ] **Step 4: Implementar el módulo**

Crear `src/lib/estados/index.ts`:

```ts
import type { EstadoPedido } from '@/lib/pedidos/tipos'
import type { ModoEntrega } from '@/lib/precios/tipos'
import type { RolStaff } from '@/lib/personal/tipos'

export type { RolStaff } from '@/lib/personal/tipos'

type Transicion = { de: EstadoPedido; a: EstadoPedido; modos: ModoEntrega[] }

const TRANSICIONES: Record<RolStaff, Transicion[]> = {
  admin: [
    { de: 'nuevo', a: 'en_preparacion', modos: ['domicilio', 'recogida'] },
    { de: 'en_preparacion', a: 'pendiente_envio', modos: ['domicilio', 'recogida'] },
    { de: 'pendiente_envio', a: 'en_reparto', modos: ['domicilio'] },
    { de: 'en_reparto', a: 'entregado', modos: ['domicilio'] },
    { de: 'pendiente_envio', a: 'entregado', modos: ['recogida'] },
  ],
  cocina: [
    { de: 'nuevo', a: 'en_preparacion', modos: ['domicilio', 'recogida'] },
    { de: 'en_preparacion', a: 'pendiente_envio', modos: ['domicilio', 'recogida'] },
    { de: 'pendiente_envio', a: 'entregado', modos: ['recogida'] },
  ],
  repartidor: [
    { de: 'pendiente_envio', a: 'en_reparto', modos: ['domicilio'] },
    { de: 'en_reparto', a: 'entregado', modos: ['domicilio'] },
  ],
}

/**
 * Si el rol puede ejecutar esa transición para ese modo de entrega. Cada
 * transición la condiciona al estado anterior quien la llama (mismo patrón
 * que la confirmación de pago): esta función solo dice si hay permiso, no
 * toca la base de datos.
 */
export function transicionPermitida(
  rol: RolStaff,
  de: EstadoPedido,
  a: EstadoPedido,
  modoEntrega: ModoEntrega,
): boolean {
  return TRANSICIONES[rol].some((t) => t.de === de && t.a === a && t.modos.includes(modoEntrega))
}

export function puedeConfirmarFranja(rol: RolStaff): boolean {
  return rol === 'admin' || rol === 'cocina'
}
```

- [ ] **Step 5: Ejecutar los tests y comprobar que pasan**

Run: `pnpm test estados`
Expected: PASS, todos los tests en verde.

- [ ] **Step 6: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/lib/personal/tipos.ts src/lib/estados
git commit -m "Añade la máquina de estados y permisos del personal"
```

---

### Tarea 2: Agrupación, orden y fusión del tablero

**Files:**
- Create: `src/lib/pedidos/tablero.ts`
- Test: `src/lib/pedidos/tablero.test.ts`

**Interfaces:**
- Consumes: `EstadoPedido`, `PedidoConLineas`, `PedidoLineaFila` (de `./tipos`), `Tables` (de `@/lib/supabase/tipos-bd`).
- Produces: tipo `Pestana`; funciones `pestanaDePedido(estado): Pestana | null`, `franjaEsInminente(inicioIso, ahora): boolean`, `ordenarPorFranja(pedidos): PedidoConLineas[]`, `fusionarPedidoEnLista(pedidos, pedido): PedidoConLineas[]`, `actualizarCamposPedido(pedidos, cambios): PedidoConLineas[]`, `fusionarLineaEnLista(pedidos, linea): PedidoConLineas[]`.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `src/lib/pedidos/tablero.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  actualizarCamposPedido,
  franjaEsInminente,
  fusionarLineaEnLista,
  fusionarPedidoEnLista,
  ordenarPorFranja,
  pestanaDePedido,
} from './tablero'
import type { PedidoConLineas, PedidoLineaFila } from './tipos'

function pedido(parcial: Partial<PedidoConLineas> = {}): PedidoConLineas {
  return {
    id: 'p-1',
    codigo_publico: 'abc123',
    estado: 'nuevo',
    modo_entrega: 'domicilio',
    cliente_nombre: 'Ana',
    cliente_apellidos: 'García',
    cliente_telefono: '600111222',
    direccion_calle: 'C. Hierro',
    direccion_numero: '73',
    direccion_piso: null,
    direccion_cp: '28850',
    direccion_ciudad: 'Torrejón de Ardoz',
    direccion_indicaciones: null,
    notas: '',
    franja_solicitada_inicio: '2026-01-15T12:00:00.000Z',
    franja_solicitada_fin: '2026-01-15T12:30:00.000Z',
    franja_solicitada_asap: false,
    franja_confirmada_inicio: null,
    franja_confirmada_fin: null,
    confirmado_en: null,
    subtotal_centimos: 1000,
    envio_centimos: 200,
    total_centimos: 1200,
    stripe_session_id: 'sess_1',
    stripe_payment_intent: 'pi_1',
    repartidor_id: null,
    creado_en: '2026-01-15T11:00:00.000Z',
    pagado_en: '2026-01-15T11:00:05.000Z',
    entregado_en: null,
    pedido_lineas: [],
    ...parcial,
  } as PedidoConLineas
}

function linea(parcial: Partial<PedidoLineaFila> = {}): PedidoLineaFila {
  return {
    id: 'l-1',
    pedido_id: 'p-1',
    articulo_id: 'a-1',
    tamano_id: 't-1',
    nombre_articulo: 'Lomo',
    nombre_tamano: 'Bocadillo',
    precio_unitario_centimos: 500,
    cantidad: 1,
    notas_linea: '',
    preparada: false,
    pedido_extras: [],
    ...parcial,
  } as PedidoLineaFila
}

describe('pestanaDePedido', () => {
  it('agrupa cada estado en su pestaña', () => {
    expect(pestanaDePedido('nuevo')).toBe('nuevos')
    expect(pestanaDePedido('en_preparacion')).toBe('en_marcha')
    expect(pestanaDePedido('pendiente_envio')).toBe('pendientes_envio')
    expect(pestanaDePedido('en_reparto')).toBe('pendientes_envio')
    expect(pestanaDePedido('entregado')).toBe('entregados')
  })

  it('no asigna pestaña a un pedido sin cobrar', () => {
    expect(pestanaDePedido('pendiente_pago')).toBeNull()
  })
})

describe('franjaEsInminente', () => {
  it('es inminente 15 minutos o menos antes de empezar', () => {
    const ahora = new Date('2026-01-15T12:00:00.000Z')
    expect(franjaEsInminente('2026-01-15T12:15:00.000Z', ahora)).toBe(true)
    expect(franjaEsInminente('2026-01-15T12:16:00.000Z', ahora)).toBe(false)
  })

  it('una franja ya pasada sigue siendo inminente', () => {
    const ahora = new Date('2026-01-15T12:00:00.000Z')
    expect(franjaEsInminente('2026-01-15T11:00:00.000Z', ahora)).toBe(true)
  })
})

describe('ordenarPorFranja', () => {
  it('ordena por la franja confirmada si existe, si no la solicitada', () => {
    const tarde = pedido({ id: 'p-tarde', franja_solicitada_inicio: '2026-01-15T14:00:00.000Z' })
    const pronto = pedido({
      id: 'p-pronto',
      franja_solicitada_inicio: '2026-01-15T13:00:00.000Z',
      franja_confirmada_inicio: '2026-01-15T12:30:00.000Z',
    })
    expect(ordenarPorFranja([tarde, pronto]).map((p) => p.id)).toEqual(['p-pronto', 'p-tarde'])
  })
})

describe('fusionarPedidoEnLista', () => {
  it('añade un pedido nuevo al principio', () => {
    const existente = pedido({ id: 'p-1' })
    const nuevo = pedido({ id: 'p-2' })
    expect(fusionarPedidoEnLista([existente], nuevo).map((p) => p.id)).toEqual(['p-2', 'p-1'])
  })

  it('sustituye un pedido existente en su sitio', () => {
    const original = pedido({ id: 'p-1', total_centimos: 1000 })
    const actualizado = pedido({ id: 'p-1', total_centimos: 2000 })
    const resultado = fusionarPedidoEnLista([original], actualizado)
    expect(resultado).toHaveLength(1)
    expect(resultado[0].total_centimos).toBe(2000)
  })
})

describe('actualizarCamposPedido', () => {
  it('actualiza los campos de un pedido existente sin tocar sus líneas', () => {
    const original = pedido({ id: 'p-1', estado: 'nuevo', pedido_lineas: [linea()] })
    const resultado = actualizarCamposPedido([original], { ...original, estado: 'en_preparacion' })
    expect(resultado[0].estado).toBe('en_preparacion')
    expect(resultado[0].pedido_lineas).toEqual([linea()])
  })
})

describe('fusionarLineaEnLista', () => {
  it('actualiza una línea concreta sin tocar las demás ni sus extras existentes', () => {
    const l1 = linea({
      id: 'l-1',
      preparada: false,
      pedido_extras: [{ id: 'e-1', linea_id: 'l-1', extra_id: null, nombre_extra: 'Queso', precio_centimos: 100 }],
    })
    const l2 = linea({ id: 'l-2', preparada: false })
    const original = pedido({ pedido_lineas: [l1, l2] })

    const { pedido_extras: _extras, ...filaActualizada } = { ...l1, preparada: true }
    const resultado = fusionarLineaEnLista([original], filaActualizada)

    const lineaActualizada = resultado[0].pedido_lineas.find((l) => l.id === 'l-1')!
    expect(lineaActualizada.preparada).toBe(true)
    expect(lineaActualizada.pedido_extras).toEqual(l1.pedido_extras)
    expect(resultado[0].pedido_lineas.find((l) => l.id === 'l-2')!.preparada).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar los tests y comprobar que fallan**

Run: `pnpm test tablero`
Expected: FAIL — no existe `src/lib/pedidos/tablero.ts`.

- [ ] **Step 3: Implementar el módulo**

Crear `src/lib/pedidos/tablero.ts`:

```ts
import type { Tables } from '@/lib/supabase/tipos-bd'
import type { EstadoPedido, PedidoConLineas } from './tipos'

export type Pestana = 'nuevos' | 'en_marcha' | 'pendientes_envio' | 'entregados'

/** `pendiente_pago` no aparece en ninguna pestaña: cocina nunca ve pedidos sin cobrar. */
export function pestanaDePedido(estado: EstadoPedido): Pestana | null {
  switch (estado) {
    case 'pendiente_pago':
      return null
    case 'nuevo':
      return 'nuevos'
    case 'en_preparacion':
      return 'en_marcha'
    case 'pendiente_envio':
    case 'en_reparto':
      return 'pendientes_envio'
    case 'entregado':
      return 'entregados'
  }
}

const UMBRAL_INMINENTE_MIN = 15

/** Una franja es "inminente" 15 minutos o menos antes de empezar (incluida una ya pasada). */
export function franjaEsInminente(inicioFranjaIso: string, ahora: Date): boolean {
  const minutosHastaInicio = (new Date(inicioFranjaIso).getTime() - ahora.getTime()) / 60000
  return minutosHastaInicio <= UMBRAL_INMINENTE_MIN
}

function inicioParaOrdenar(pedido: PedidoConLineas): string {
  return pedido.franja_confirmada_inicio ?? pedido.franja_solicitada_inicio
}

/** Ordena por franja (la confirmada si existe, si no la solicitada), la más próxima primero. */
export function ordenarPorFranja(pedidos: PedidoConLineas[]): PedidoConLineas[] {
  return [...pedidos].sort((a, b) => inicioParaOrdenar(a).localeCompare(inicioParaOrdenar(b)))
}

/** Sustituye el pedido por id, o lo añade al principio si es nuevo (tras un INSERT de Realtime). */
export function fusionarPedidoEnLista(pedidos: PedidoConLineas[], pedido: PedidoConLineas): PedidoConLineas[] {
  const indice = pedidos.findIndex((p) => p.id === pedido.id)
  if (indice === -1) return [pedido, ...pedidos]
  return pedidos.map((p) => (p.id === pedido.id ? pedido : p))
}

/** Actualiza los campos de un pedido ya presente en la lista sin tocar sus líneas (tras un UPDATE de Realtime). */
export function actualizarCamposPedido(pedidos: PedidoConLineas[], cambios: Tables<'pedidos'>): PedidoConLineas[] {
  return pedidos.map((pedido) => (pedido.id === cambios.id ? { ...pedido, ...cambios } : pedido))
}

/** Sustituye una línea por su id dentro de su pedido, conservando los extras que ya estaban en memoria. */
export function fusionarLineaEnLista(pedidos: PedidoConLineas[], linea: Tables<'pedido_lineas'>): PedidoConLineas[] {
  return pedidos.map((pedido) => {
    if (!pedido.pedido_lineas.some((l) => l.id === linea.id)) return pedido
    return {
      ...pedido,
      pedido_lineas: pedido.pedido_lineas.map((l) => (l.id === linea.id ? { ...l, ...linea } : l)),
    }
  })
}
```

- [ ] **Step 4: Ejecutar los tests y comprobar que pasan**

Run: `pnpm test tablero`
Expected: PASS, todos los tests en verde.

- [ ] **Step 5: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/lib/pedidos/tablero.ts src/lib/pedidos/tablero.test.ts
git commit -m "Añade la agrupación, orden y fusión del tablero de cocina"
```

---

### Tarea 3: Esquema de personal y permisos de lectura en Supabase

**Files:**
- Create: `supabase/migrations/0004_esquema_personal.sql`
- Modify: `src/lib/supabase/tipos-bd.ts` (regenerado)

**Interfaces:**
- Consumes: nada.
- Produces: tabla `perfiles_staff`; función SQL `rol_del_usuario_actual()`; políticas de RLS de lectura para el personal sobre `pedidos`, `pedido_lineas` y `pedido_extras`; `pedidos` y `pedido_lineas` añadidas a la publicación `supabase_realtime`.

- [ ] **Step 1: Escribir la migración**

Crear `supabase/migrations/0004_esquema_personal.sql`:

```sql
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

Comprobar que el fichero contiene `perfiles_staff`. No se edita a mano.

- [ ] **Step 4: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores.

- [ ] **Step 5: Commit**

```bash
git add supabase src/lib/supabase/tipos-bd.ts
git commit -m "Añade el esquema de personal y los permisos de lectura del panel"
```

---

### Tarea 4: Clientes de sesión y protección de `/panel`

**Files:**
- Modify: `package.json` (añade `@supabase/ssr`)
- Create: `src/lib/supabase/cliente-navegador.ts`
- Create: `src/lib/supabase/cliente-servidor-sesion.ts`
- Create: `src/lib/personal/sesion.ts`
- Create: `src/proxy.ts`

**Interfaces:**
- Consumes: `BaseDeDatos` (de `@/lib/supabase/cliente-servidor`), `crearClienteServicio` (de `@/lib/supabase/cliente-servicio`), `PerfilStaff` (de `@/lib/personal/tipos`).
- Produces: `crearClienteNavegador(): SupabaseClient<BaseDeDatos>`, `crearClienteServidorSesion(): Promise<SupabaseClient<BaseDeDatos>>`, `obtenerPerfilStaff(): Promise<PerfilStaff | null>`.

- [ ] **Step 1: Instalar `@supabase/ssr`**

```bash
pnpm add @supabase/ssr
```

- [ ] **Step 2: Cliente de navegador**

Crear `src/lib/supabase/cliente-navegador.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr'
import type { BaseDeDatos } from './cliente-servidor'

/**
 * Cliente ligado a la sesión del personal en el navegador: usa la clave
 * pública, pero las peticiones llevan la cookie de sesión, así que RLS lo
 * trata como el usuario autenticado, no como anónimo. Se usa para iniciar y
 * cerrar sesión, y para suscribirse a Realtime en el tablero.
 */
export function crearClienteNavegador() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !clave) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Revisa .env.local.')
  }
  return createBrowserClient<BaseDeDatos>(url, clave)
}
```

- [ ] **Step 3: Cliente de servidor ligado a la sesión**

Crear `src/lib/supabase/cliente-servidor-sesion.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { BaseDeDatos } from './cliente-servidor'

/**
 * Cliente ligado a la sesión de personal a través de las cookies de la
 * petición. Lee lo que las políticas de RLS permiten a ese usuario según su
 * rol en `perfiles_staff`: pedidos, líneas y extras para el tablero. Nunca
 * se usa para el navegador anónimo, que no tiene sesión.
 */
export async function crearClienteServidorSesion() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !clave) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Revisa .env.local.')
  }

  const almacenCookies = await cookies()

  return createServerClient<BaseDeDatos>(url, clave, {
    cookies: {
      getAll: () => almacenCookies.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            almacenCookies.set(name, value, options)
          }
        } catch {
          // Llamado desde un Server Component al refrescar el token: no
          // puede escribir cookies ahí. `proxy.ts` ya las refresca en cada
          // petición, así que aquí se ignora sin más.
        }
      },
    },
  })
}
```

- [ ] **Step 4: Lectura del perfil del personal**

Crear `src/lib/personal/sesion.ts`:

```ts
import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'
import { crearClienteServidorSesion } from '@/lib/supabase/cliente-servidor-sesion'
import type { PerfilStaff } from './tipos'

/**
 * Perfil del miembro del personal autenticado en esta petición, o `null` si
 * no hay sesión o su cuenta no tiene fila en `perfiles_staff` todavía. Se lee
 * con la clave de servicio porque `perfiles_staff` solo se abre por RLS a la
 * fila del propio usuario, y aquí conviene una lectura directa por id.
 */
export async function obtenerPerfilStaff(): Promise<PerfilStaff | null> {
  const supabaseSesion = await crearClienteServidorSesion()
  const {
    data: { user },
  } = await supabaseSesion.auth.getUser()
  if (!user) return null

  const supabaseServicio = crearClienteServicio()
  const { data, error } = await supabaseServicio
    .from('perfiles_staff')
    .select('user_id, nombre, rol')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return { userId: data.user_id, nombre: data.nombre, rol: data.rol as PerfilStaff['rol'] }
}
```

- [ ] **Step 5: Proxy que protege `/panel`**

Next.js 16 renombró `middleware.ts` a `proxy.ts` (la función exportada pasa a llamarse `proxy`); ver `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`. Ese mismo documento dice que el fichero va "en la raíz del proyecto, o dentro de `src` si aplica, de modo que quede al mismo nivel que `pages` o `app`" — en este proyecto `app` vive en `src/app`, así que aplica: el fichero es `src/proxy.ts`, no `proxy.ts` en la raíz. Un `proxy.ts` en la raíz del repo no lo descubre el build (Next calcula el directorio raíz de enrutado como el padre de `app`, que aquí es `src/`) y `/panel` se queda sin protección en silencio.

Crear `src/proxy.ts`:

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Refresca la cookie de sesión de Supabase en cada petición a `/panel/**` y
 * manda a iniciar sesión a quien no la tenga. La propia página de inicio de
 * sesión queda fuera para no entrar en bucle de redirecciones.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname !== '/panel/iniciar-sesion') {
    return NextResponse.redirect(new URL('/panel/iniciar-sesion', request.url))
  }

  return response
}

export const config = {
  matcher: '/panel/:path*',
}
```

- [ ] **Step 6: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/supabase/cliente-navegador.ts src/lib/supabase/cliente-servidor-sesion.ts src/lib/personal/sesion.ts src/proxy.ts
git commit -m "Añade la sesión de personal y protege /panel"
```

---

### Tarea 5: Primera cuenta de personal e inicio de sesión

**Files:**
- Create: `scripts/crear-cuenta-staff.ts`
- Create: `src/components/panel/FormularioLogin.tsx`
- Test: `src/components/panel/FormularioLogin.test.tsx`
- Create: `src/app/panel/iniciar-sesion/page.tsx`

**Interfaces:**
- Consumes: `crearClienteServicio` (de `@/lib/supabase/cliente-servicio`), `crearClienteNavegador` (de `@/lib/supabase/cliente-navegador`).
- Produces: página `/panel/iniciar-sesion`.

- [ ] **Step 1: PARADA — confirmar la primera cuenta de personal**

**No continúes sin respuesta del usuario.** Pregúntale:

> Para entrar en el panel de cocina hace falta una cuenta de personal en Supabase Auth, con rol `cocina` o `admin`. Todavía no hay pantalla de invitación —llega en el plan de Administración—, así que para esta fase doy de alta la primera cuenta con un script de un solo uso. ¿Qué email, contraseña y nombre uso para esa cuenta de prueba, y qué rol le pongo? Dime también si quieres una segunda cuenta.

Las integraciones nativas de Supabase de esta sesión apuntan a una cuenta distinta y no se usan sin avisar.

- [ ] **Step 2: Escribir el script de alta**

Crear `scripts/crear-cuenta-staff.ts`:

```ts
import { config } from 'dotenv'
config({ path: '.env.local' })

import { crearClienteServicio } from '../src/lib/supabase/cliente-servicio'

async function main() {
  const [, , email, password, nombre, rol] = process.argv
  if (!email || !password || !nombre || !rol) {
    console.error('Uso: pnpx tsx scripts/crear-cuenta-staff.ts <email> <password> <nombre> <admin|cocina|repartidor>')
    process.exit(1)
  }
  if (rol !== 'admin' && rol !== 'cocina' && rol !== 'repartidor') {
    console.error('El rol debe ser admin, cocina o repartidor.')
    process.exit(1)
  }

  const supabase = crearClienteServicio()

  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error

  const { error: errorPerfil } = await supabase.from('perfiles_staff').insert({ user_id: data.user.id, nombre, rol })
  if (errorPerfil) throw errorPerfil

  console.log(`Cuenta creada: ${email} (${rol}), user_id ${data.user.id}`)
}

main()
```

- [ ] **Step 3: Ejecutar el script con los datos que dio el usuario**

```bash
pnpx tsx scripts/crear-cuenta-staff.ts <email> <password> <nombre> <rol>
```

Expected: imprime `Cuenta creada: ...`. Repite el paso si el usuario pidió una segunda cuenta.

- [ ] **Step 4: Escribir el test que falla**

Crear `src/components/panel/FormularioLogin.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FormularioLogin } from './FormularioLogin'

vi.mock('@/lib/supabase/cliente-navegador', () => ({
  crearClienteNavegador: () => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: { message: 'Invalid login credentials' } }),
    },
  }),
}))

describe('FormularioLogin', () => {
  it('avisa si el email o la contraseña son incorrectos', async () => {
    render(<FormularioLogin />)
    await userEvent.type(screen.getByLabelText('Email'), 'cocina@ejemplo.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'mal')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Email o contraseña incorrectos.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Ejecutar el test y comprobar que falla**

Run: `pnpm test FormularioLogin`
Expected: FAIL — no existe `src/components/panel/FormularioLogin.tsx`.

- [ ] **Step 6: Implementar el formulario**

Crear `src/components/panel/FormularioLogin.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { crearClienteNavegador } from '@/lib/supabase/cliente-navegador'

export function FormularioLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(false)

  async function iniciarSesion() {
    setEnviando(true)
    setError(false)
    const supabase = crearClienteNavegador()
    const { error: errorSesion } = await supabase.auth.signInWithPassword({ email, password })
    if (errorSesion) {
      setError(true)
      setEnviando(false)
      return
    }
    window.location.href = '/panel'
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span>Contraseña</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
        />
      </label>

      {error && <p className="text-sm text-amber-400">Email o contraseña incorrectos.</p>}

      <button
        type="button"
        disabled={enviando}
        onClick={iniciarSesion}
        className="h-14 rounded-xl bg-amber-500 text-lg font-bold text-neutral-950 disabled:opacity-40"
      >
        Entrar
      </button>
    </div>
  )
}
```

- [ ] **Step 7: Ejecutar el test y comprobar que pasa**

Run: `pnpm test FormularioLogin`
Expected: PASS.

- [ ] **Step 8: Crear la página de inicio de sesión**

Crear `src/app/panel/iniciar-sesion/page.tsx`:

```tsx
import { FormularioLogin } from '@/components/panel/FormularioLogin'

export default function PaginaLogin() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">El Horno del Caserón</h1>
      <FormularioLogin />
    </main>
  )
}
```

- [ ] **Step 9: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores.

- [ ] **Step 10: Commit**

```bash
git add scripts src/components/panel/FormularioLogin.tsx src/components/panel/FormularioLogin.test.tsx src/app/panel/iniciar-sesion
git commit -m "Añade la primera cuenta de personal y el inicio de sesión"
```

---

### Tarea 6: Lectura y transición de pedidos, layout protegido

**Files:**
- Create: `src/lib/pedidos/panel.ts`
- Create: `src/components/panel/CerrarSesionBoton.tsx`
- Create: `src/app/panel/(protegido)/layout.tsx`

**Interfaces:**
- Consumes: `crearClienteServicio` (de `@/lib/supabase/cliente-servicio`), `PedidoConLineas`, `EstadoPedido`, `FranjaSolicitada` (de `./tipos`), `obtenerPerfilStaff` (de `@/lib/personal/sesion`), `crearClienteNavegador` (de `@/lib/supabase/cliente-navegador`).
- Produces: `listarPedidosPanel(supabase): Promise<PedidoConLineas[]>`, `obtenerPedidoPanelPorId(supabase, id): Promise<PedidoConLineas | null>`, `confirmarFranjaPedido(id, franja): Promise<PedidoConLineas>`, `avanzarEstadoPedido(id, estadoActual, estadoDestino): Promise<PedidoConLineas | null>`, `marcarLineaPreparada(lineaId, preparada): Promise<void>`.

- [ ] **Step 1: Implementar la lectura y las transiciones**

Crear `src/lib/pedidos/panel.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'
import type { BaseDeDatos } from '@/lib/supabase/cliente-servidor'
import type { EstadoPedido, FranjaSolicitada, PedidoConLineas } from './tipos'

const SELECT_CON_LINEAS = '*, pedido_lineas(*, pedido_extras(*))'

/**
 * Pedidos visibles para el tablero. Se ejecuta con el cliente de la sesión
 * de quien llama (no con la clave de servicio): las políticas de RLS ya
 * filtran qué pedidos puede ver según su rol en `perfiles_staff`.
 */
export async function listarPedidosPanel(supabase: SupabaseClient<BaseDeDatos>): Promise<PedidoConLineas[]> {
  const { data, error } = await supabase.from('pedidos').select(SELECT_CON_LINEAS).order('creado_en')
  if (error) throw error
  return data as PedidoConLineas[]
}

export async function obtenerPedidoPanelPorId(
  supabase: SupabaseClient<BaseDeDatos>,
  pedidoId: string,
): Promise<PedidoConLineas | null> {
  const { data, error } = await supabase.from('pedidos').select(SELECT_CON_LINEAS).eq('id', pedidoId).maybeSingle()
  if (error) throw error
  return data as PedidoConLineas | null
}

/**
 * Confirma o ajusta la franja de un pedido. No está condicionada a que no
 * hubiera confirmación previa: "ajustar" una franja ya confirmada es una
 * acción válida, y repetirla no duplica ningún efecto secundario.
 */
export async function confirmarFranjaPedido(pedidoId: string, franja: FranjaSolicitada): Promise<PedidoConLineas> {
  const supabase = crearClienteServicio()
  const { data, error } = await supabase
    .from('pedidos')
    .update({
      franja_confirmada_inicio: franja.inicio,
      franja_confirmada_fin: franja.fin,
      confirmado_en: new Date().toISOString(),
    })
    .eq('id', pedidoId)
    .select(SELECT_CON_LINEAS)
    .single()

  if (error) throw error
  return data as PedidoConLineas
}

/**
 * Avanza el pedido a la siguiente fase, condicionado al estado anterior: si
 * otra persona ya lo movió, devuelve `null` en vez de retroceder el pedido o
 * duplicar la entrega.
 */
export async function avanzarEstadoPedido(
  pedidoId: string,
  estadoActual: EstadoPedido,
  estadoDestino: EstadoPedido,
): Promise<PedidoConLineas | null> {
  const supabase = crearClienteServicio()
  const { data, error } = await supabase
    .from('pedidos')
    .update({
      estado: estadoDestino,
      ...(estadoDestino === 'entregado' ? { entregado_en: new Date().toISOString() } : {}),
    })
    .eq('id', pedidoId)
    .eq('estado', estadoActual)
    .select(SELECT_CON_LINEAS)
    .maybeSingle()

  if (error) throw error
  return data as PedidoConLineas | null
}

export async function marcarLineaPreparada(lineaId: string, preparada: boolean): Promise<void> {
  const supabase = crearClienteServicio()
  const { error } = await supabase.from('pedido_lineas').update({ preparada }).eq('id', lineaId)
  if (error) throw error
}
```

- [ ] **Step 2: Botón de cerrar sesión**

Crear `src/components/panel/CerrarSesionBoton.tsx`:

```tsx
'use client'

import { crearClienteNavegador } from '@/lib/supabase/cliente-navegador'

export function CerrarSesionBoton() {
  async function cerrarSesion() {
    const supabase = crearClienteNavegador()
    await supabase.auth.signOut()
    window.location.href = '/panel/iniciar-sesion'
  }

  return (
    <button type="button" onClick={cerrarSesion} className="rounded-lg border border-neutral-700 px-3 py-2 text-sm">
      Cerrar sesión
    </button>
  )
}
```

- [ ] **Step 3: Layout protegido**

Crear `src/app/panel/(protegido)/layout.tsx`. El grupo de rutas `(protegido)` no añade segmento a la URL: `/panel` sigue siendo `/panel`, pero solo lo que cuelga de este grupo exige sesión; `/panel/iniciar-sesion` queda fuera, como sitio hermano.

```tsx
import { redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { CerrarSesionBoton } from '@/components/panel/CerrarSesionBoton'

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')

  return (
    <div className="min-h-dvh pb-10">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div>
          <p className="font-semibold">{perfil.nombre}</p>
          <p className="text-xs uppercase tracking-wide text-neutral-400">{perfil.rol}</p>
        </div>
        <CerrarSesionBoton />
      </header>
      <main className="px-4 py-4">{children}</main>
    </div>
  )
}
```

- [ ] **Step 4: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores. `src/lib/pedidos/panel.ts` se ejerce de extremo a extremo en la Tarea 9: escribe en la base de datos real y no tiene sentido simularlo con mocks. El grupo `(protegido)` aún no tiene `page.tsx`, así que `/panel` da 404 hasta la Tarea 8; eso no rompe la build.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pedidos/panel.ts src/components/panel/CerrarSesionBoton.tsx "src/app/panel/(protegido)"
git commit -m "Añade la lectura y transición de pedidos y el layout protegido del panel"
```

---

### Tarea 7: Endpoints de transición del pedido

**Files:**
- Create: `src/app/api/panel/pedidos/[id]/confirmar-franja/route.ts`
- Create: `src/app/api/panel/pedidos/[id]/avanzar/route.ts`
- Create: `src/app/api/panel/pedidos/[id]/lineas/[lineaId]/route.ts`

**Interfaces:**
- Consumes: `obtenerPerfilStaff` (de `@/lib/personal/sesion`), `puedeConfirmarFranja`, `transicionPermitida` (de `@/lib/estados`), `confirmarFranjaPedido`, `avanzarEstadoPedido`, `marcarLineaPreparada`, `obtenerPedidoPanelPorId` (de `@/lib/pedidos/panel`), `crearClienteServicio` (de `@/lib/supabase/cliente-servicio`).
- Produces: `POST /api/panel/pedidos/[id]/confirmar-franja`, `POST /api/panel/pedidos/[id]/avanzar`, `PATCH /api/panel/pedidos/[id]/lineas/[lineaId]`.

- [ ] **Step 1: Endpoint de confirmar franja**

Crear `src/app/api/panel/pedidos/[id]/confirmar-franja/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { puedeConfirmarFranja } from '@/lib/estados'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { confirmarFranjaPedido } from '@/lib/pedidos/panel'
import type { FranjaSolicitada } from '@/lib/pedidos/tipos'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!puedeConfirmarFranja(perfil.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const franja = (await req.json()) as FranjaSolicitada
  const pedido = await confirmarFranjaPedido(id, franja)
  return NextResponse.json(pedido)
}
```

- [ ] **Step 2: Endpoint de avanzar de fase**

Crear `src/app/api/panel/pedidos/[id]/avanzar/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { transicionPermitida } from '@/lib/estados'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { avanzarEstadoPedido, obtenerPedidoPanelPorId } from '@/lib/pedidos/panel'
import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'
import type { EstadoPedido } from '@/lib/pedidos/tipos'
import type { ModoEntrega } from '@/lib/precios/tipos'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { aFase } = (await req.json()) as { aFase: EstadoPedido }

  const pedidoActual = await obtenerPedidoPanelPorId(crearClienteServicio(), id)
  if (!pedidoActual) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const estadoActual = pedidoActual.estado as EstadoPedido
  const modoEntrega = pedidoActual.modo_entrega as ModoEntrega
  if (!transicionPermitida(perfil.rol, estadoActual, aFase, modoEntrega)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const pedido = await avanzarEstadoPedido(id, estadoActual, aFase)
  if (!pedido) return NextResponse.json({ error: 'Otra persona ya movió este pedido' }, { status: 409 })
  return NextResponse.json(pedido)
}
```

- [ ] **Step 3: Endpoint de marcar línea preparada**

Crear `src/app/api/panel/pedidos/[id]/lineas/[lineaId]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { marcarLineaPreparada } from '@/lib/pedidos/panel'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; lineaId: string }> }) {
  const { lineaId } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil || (perfil.rol !== 'admin' && perfil.rol !== 'cocina')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { preparada } = (await req.json()) as { preparada: boolean }
  await marcarLineaPreparada(lineaId, preparada)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores. Los tres endpoints se ejercen de extremo a extremo en la Tarea 9.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/panel
git commit -m "Añade los endpoints de transición del pedido en el panel"
```

---

### Tarea 8: Tablero de cocina — página, pestañas, tarjeta, tiempo real y aviso

**Files:**
- Create: `src/components/panel/TarjetaPedido.tsx`
- Test: `src/components/panel/TarjetaPedido.test.tsx`
- Create: `src/components/panel/TableroPedidos.tsx`
- Test: `src/components/panel/TableroPedidos.test.tsx`
- Create: `src/app/panel/(protegido)/page.tsx`

**Interfaces:**
- Consumes: `franjaEsInminente`, `pestanaDePedido`, `ordenarPorFranja`, `fusionarPedidoEnLista`, `actualizarCamposPedido`, `fusionarLineaEnLista` (de `@/lib/pedidos/tablero`), `agruparFranjasPorDia`, `formatearHoraFranja` (de `@/lib/horario`), `formatearPrecio` (de `@/lib/dinero`), `crearClienteNavegador` (de `@/lib/supabase/cliente-navegador`), `obtenerAjustesHorario` (de `@/lib/carta/consultas`), `generarFranjas` (de `@/lib/horario`), `obtenerPerfilStaff` (de `@/lib/personal/sesion`), `listarPedidosPanel` (de `@/lib/pedidos/panel`), `crearClienteServidorSesion` (de `@/lib/supabase/cliente-servidor-sesion`).
- Produces: componentes `TarjetaPedido`, `TableroPedidos`; página `/panel`.

- [ ] **Step 1: Escribir el test que falla para la tarjeta**

Crear `src/components/panel/TarjetaPedido.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TarjetaPedido } from './TarjetaPedido'
import type { PedidoConLineas } from '@/lib/pedidos/tipos'
import type { PerfilStaff } from '@/lib/personal/tipos'

const PERFIL_COCINA: PerfilStaff = { userId: 'u-1', nombre: 'Cocina', rol: 'cocina' }

function pedido(parcial: Partial<PedidoConLineas> = {}): PedidoConLineas {
  return {
    id: 'p-1',
    codigo_publico: 'abc123',
    estado: 'nuevo',
    modo_entrega: 'domicilio',
    cliente_nombre: 'Ana',
    cliente_apellidos: 'García',
    cliente_telefono: '600111222',
    direccion_calle: 'C. Hierro',
    direccion_numero: '73',
    direccion_piso: null,
    direccion_cp: '28850',
    direccion_ciudad: 'Torrejón de Ardoz',
    direccion_indicaciones: null,
    notas: '',
    franja_solicitada_inicio: '2026-01-15T12:00:00.000Z',
    franja_solicitada_fin: '2026-01-15T12:30:00.000Z',
    franja_solicitada_asap: false,
    franja_confirmada_inicio: null,
    franja_confirmada_fin: null,
    confirmado_en: null,
    subtotal_centimos: 1000,
    envio_centimos: 200,
    total_centimos: 1200,
    stripe_session_id: 'sess_1',
    stripe_payment_intent: 'pi_1',
    repartidor_id: null,
    creado_en: '2026-01-15T11:00:00.000Z',
    pagado_en: '2026-01-15T11:00:05.000Z',
    entregado_en: null,
    pedido_lineas: [
      {
        id: 'l-1',
        pedido_id: 'p-1',
        articulo_id: 'a-1',
        tamano_id: 't-1',
        nombre_articulo: 'Lomo',
        nombre_tamano: 'Bocadillo',
        precio_unitario_centimos: 500,
        cantidad: 1,
        notas_linea: '',
        preparada: false,
        pedido_extras: [],
      },
    ],
    ...parcial,
  } as PedidoConLineas
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(pedido()) }))
})

describe('TarjetaPedido', () => {
  it('ofrece confirmar la franja pedida cuando aún no está confirmada', () => {
    render(<TarjetaPedido pedido={pedido()} perfil={PERFIL_COCINA} franjas={[]} onActualizado={() => {}} />)
    expect(screen.getByRole('button', { name: /Confirmar 13:00–13:30/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Proponer otra hora' })).toBeInTheDocument()
  })

  it('fusiona "aceptar" y "empezar" en un único botón para lo antes posible', () => {
    render(
      <TarjetaPedido
        pedido={pedido({ franja_solicitada_asap: true })}
        perfil={PERFIL_COCINA}
        franjas={[]}
        onActualizado={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: 'Aceptar y empezar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Confirmar/ })).not.toBeInTheDocument()
  })

  it('confirmar la franja llama al endpoint con la franja pedida', async () => {
    const onActualizado = vi.fn()
    render(<TarjetaPedido pedido={pedido()} perfil={PERFIL_COCINA} franjas={[]} onActualizado={onActualizado} />)

    await userEvent.click(screen.getByRole('button', { name: /Confirmar 13:00–13:30/ }))

    expect(fetch).toHaveBeenCalledWith(
      '/api/panel/pedidos/p-1/confirmar-franja',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          inicio: '2026-01-15T12:00:00.000Z',
          fin: '2026-01-15T12:30:00.000Z',
          loAntesPosible: false,
        }),
      }),
    )
    expect(onActualizado).toHaveBeenCalled()
  })

  it('desactiva el checklist una vez el pedido ha salido de preparación', () => {
    render(
      <TarjetaPedido
        pedido={pedido({ estado: 'pendiente_envio' })}
        perfil={PERFIL_COCINA}
        franjas={[]}
        onActualizado={() => {}}
      />,
    )
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })
})
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `pnpm test TarjetaPedido`
Expected: FAIL — no existe `src/components/panel/TarjetaPedido.tsx`.

- [ ] **Step 3: Implementar la tarjeta**

Crear `src/components/panel/TarjetaPedido.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { agruparFranjasPorDia, formatearHoraFranja } from '@/lib/horario'
import type { Franja } from '@/lib/horario/tipos'
import { formatearPrecio } from '@/lib/dinero'
import { franjaEsInminente } from '@/lib/pedidos/tablero'
import type { EstadoPedido, PedidoConLineas } from '@/lib/pedidos/tipos'
import type { ModoEntrega } from '@/lib/precios/tipos'
import type { PerfilStaff } from '@/lib/personal/tipos'

type Props = {
  pedido: PedidoConLineas
  perfil: PerfilStaff
  franjas: Franja[]
  onActualizado: (pedido: PedidoConLineas) => void
}

export function TarjetaPedido({ pedido, perfil, franjas, onActualizado }: Props) {
  const [mostrandoOtrasHoras, setMostrandoOtrasHoras] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const estado = pedido.estado as EstadoPedido
  const modoEntrega = pedido.modo_entrega as ModoEntrega
  const inicioFranja = pedido.franja_confirmada_inicio ?? pedido.franja_solicitada_inicio
  const franjaInminente = franjaEsInminente(inicioFranja, new Date())
  const puedeOperar = perfil.rol === 'admin' || perfil.rol === 'cocina'
  const checklistActivo = estado === 'nuevo' || estado === 'en_preparacion'
  const gruposFranjas = agruparFranjasPorDia(franjas, new Date())

  async function confirmarFranja(franja: { inicio: string; fin: string; loAntesPosible: boolean }) {
    setEnviando(true)
    const respuesta = await fetch(`/api/panel/pedidos/${pedido.id}/confirmar-franja`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(franja),
    })
    if (respuesta.ok) onActualizado(await respuesta.json())
    setEnviando(false)
    setMostrandoOtrasHoras(false)
  }

  async function avanzar(aFase: EstadoPedido) {
    setEnviando(true)
    const respuesta = await fetch(`/api/panel/pedidos/${pedido.id}/avanzar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aFase }),
    })
    if (respuesta.ok) onActualizado(await respuesta.json())
    setEnviando(false)
  }

  async function aceptarYEmpezar() {
    setEnviando(true)
    const respuestaFranja = await fetch(`/api/panel/pedidos/${pedido.id}/confirmar-franja`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inicio: pedido.franja_solicitada_inicio,
        fin: pedido.franja_solicitada_fin,
        loAntesPosible: true,
      }),
    })
    if (respuestaFranja.ok) {
      const respuestaAvanzar = await fetch(`/api/panel/pedidos/${pedido.id}/avanzar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aFase: 'en_preparacion' }),
      })
      if (respuestaAvanzar.ok) onActualizado(await respuestaAvanzar.json())
    }
    setEnviando(false)
  }

  async function marcarLinea(lineaId: string, preparada: boolean) {
    const respuesta = await fetch(`/api/panel/pedidos/${pedido.id}/lineas/${lineaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preparada }),
    })
    if (respuesta.ok) {
      onActualizado({
        ...pedido,
        pedido_lineas: pedido.pedido_lineas.map((l) => (l.id === lineaId ? { ...l, preparada } : l)),
      })
    }
  }

  return (
    <article
      className={`rounded-xl border p-4 ${
        pedido.franja_confirmada_inicio
          ? 'border-emerald-600'
          : franjaInminente
            ? 'border-amber-500 bg-amber-500/10'
            : 'border-neutral-700'
      }`}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-400">
            Pedido {pedido.codigo_publico} ·{' '}
            {new Date(pedido.creado_en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="mt-1 font-semibold">
            {pedido.franja_solicitada_asap
              ? 'Lo antes posible'
              : `${formatearHoraFranja(pedido.franja_solicitada_inicio)}–${formatearHoraFranja(pedido.franja_solicitada_fin)}`}
            {pedido.franja_confirmada_inicio && pedido.franja_confirmada_fin && (
              <span className="text-emerald-400">
                {' '}
                → confirmado {formatearHoraFranja(pedido.franja_confirmada_inicio)}–
                {formatearHoraFranja(pedido.franja_confirmada_fin)}
              </span>
            )}
          </p>
          <p className="text-sm text-neutral-400">
            {modoEntrega === 'domicilio' ? 'A domicilio' : 'Recogida en el local'}
          </p>
        </div>
        <a href={`tel:${pedido.cliente_telefono}`} className="rounded-lg border border-neutral-700 px-3 py-2 text-sm">
          {pedido.cliente_telefono}
        </a>
      </header>

      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {pedido.pedido_lineas.map((linea) => (
          <li key={linea.id} className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={linea.preparada}
              disabled={!puedeOperar || !checklistActivo || enviando}
              onChange={(e) => marcarLinea(linea.id, e.target.checked)}
              className="mt-1"
            />
            <span className={linea.preparada ? 'text-neutral-500 line-through' : ''}>
              {linea.cantidad}× {linea.nombre_articulo} · {linea.nombre_tamano}
              {linea.pedido_extras.length > 0 && (
                <span className="text-neutral-400"> ({linea.pedido_extras.map((e) => e.nombre_extra).join(', ')})</span>
              )}
              {linea.notas_linea && <span className="block text-amber-400">{linea.notas_linea}</span>}
            </span>
          </li>
        ))}
      </ul>

      {pedido.notas && <p className="mt-3 rounded-lg bg-amber-500/10 p-2 text-sm text-amber-400">{pedido.notas}</p>}

      <p className="mt-3 font-bold">{formatearPrecio(pedido.total_centimos)}</p>

      {puedeOperar && (
        <div className="mt-4 flex flex-col gap-2">
          {estado === 'nuevo' && !pedido.franja_confirmada_inicio && pedido.franja_solicitada_asap && (
            <button
              type="button"
              disabled={enviando}
              onClick={aceptarYEmpezar}
              className="h-12 rounded-xl bg-amber-500 font-bold text-neutral-950 disabled:opacity-40"
            >
              Aceptar y empezar
            </button>
          )}

          {estado === 'nuevo' && !pedido.franja_confirmada_inicio && !pedido.franja_solicitada_asap && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={enviando}
                onClick={() =>
                  confirmarFranja({
                    inicio: pedido.franja_solicitada_inicio,
                    fin: pedido.franja_solicitada_fin,
                    loAntesPosible: false,
                  })
                }
                className="h-12 flex-1 rounded-xl bg-amber-500 font-bold text-neutral-950 disabled:opacity-40"
              >
                Confirmar {formatearHoraFranja(pedido.franja_solicitada_inicio)}–
                {formatearHoraFranja(pedido.franja_solicitada_fin)}
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={() => setMostrandoOtrasHoras((v) => !v)}
                className="h-12 flex-1 rounded-xl border border-neutral-700 font-semibold disabled:opacity-40"
              >
                Proponer otra hora
              </button>
            </div>
          )}

          {mostrandoOtrasHoras && (
            <div className="flex flex-col gap-2 rounded-lg border border-neutral-700 p-3">
              {gruposFranjas.map((grupo) => (
                <div key={grupo.etiqueta} className="flex flex-col gap-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{grupo.etiqueta}</p>
                  <div className="flex flex-wrap gap-2">
                    {grupo.franjas.map((franja) => (
                      <button
                        key={franja.inicio + franja.fin}
                        type="button"
                        disabled={enviando}
                        onClick={() => confirmarFranja({ inicio: franja.inicio, fin: franja.fin, loAntesPosible: false })}
                        className="rounded-lg border border-neutral-700 px-3 py-2 text-sm disabled:opacity-40"
                      >
                        {formatearHoraFranja(franja.inicio)}–{formatearHoraFranja(franja.fin)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {estado === 'nuevo' && pedido.franja_confirmada_inicio && (
            <button
              type="button"
              disabled={enviando}
              onClick={() => avanzar('en_preparacion')}
              className="h-12 rounded-xl bg-amber-500 font-bold text-neutral-950 disabled:opacity-40"
            >
              Empezar
            </button>
          )}

          {estado === 'en_preparacion' && (
            <button
              type="button"
              disabled={enviando}
              onClick={() => avanzar('pendiente_envio')}
              className="h-12 rounded-xl bg-amber-500 font-bold text-neutral-950 disabled:opacity-40"
            >
              Listo
            </button>
          )}

          {estado === 'pendiente_envio' && modoEntrega === 'recogida' && (
            <button
              type="button"
              disabled={enviando}
              onClick={() => avanzar('entregado')}
              className="h-12 rounded-xl bg-amber-500 font-bold text-neutral-950 disabled:opacity-40"
            >
              Entregado
            </button>
          )}

          {estado === 'pendiente_envio' && modoEntrega === 'domicilio' && (
            <p className="text-center text-sm text-neutral-400">Esperando a que un repartidor lo recoja.</p>
          )}
        </div>
      )}
    </article>
  )
}
```

- [ ] **Step 4: Ejecutar el test y comprobar que pasa**

Run: `pnpm test TarjetaPedido`
Expected: PASS.

- [ ] **Step 5: Escribir el test que falla para el tablero**

Crear `src/components/panel/TableroPedidos.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TableroPedidos } from './TableroPedidos'
import type { PedidoConLineas } from '@/lib/pedidos/tipos'
import type { PerfilStaff } from '@/lib/personal/tipos'

const PERFIL_COCINA: PerfilStaff = { userId: 'u-1', nombre: 'Cocina', rol: 'cocina' }

vi.mock('@/lib/supabase/cliente-navegador', () => ({
  crearClienteNavegador: () => ({
    channel: () => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  }),
}))

function pedido(parcial: Partial<PedidoConLineas> = {}): PedidoConLineas {
  return {
    id: 'p-1',
    codigo_publico: 'abc123',
    estado: 'nuevo',
    modo_entrega: 'recogida',
    cliente_nombre: 'Ana',
    cliente_apellidos: 'García',
    cliente_telefono: '600111222',
    direccion_calle: null,
    direccion_numero: null,
    direccion_piso: null,
    direccion_cp: null,
    direccion_ciudad: null,
    direccion_indicaciones: null,
    notas: '',
    franja_solicitada_inicio: '2026-01-15T12:00:00.000Z',
    franja_solicitada_fin: '2026-01-15T12:30:00.000Z',
    franja_solicitada_asap: false,
    franja_confirmada_inicio: null,
    franja_confirmada_fin: null,
    confirmado_en: null,
    subtotal_centimos: 1000,
    envio_centimos: 0,
    total_centimos: 1000,
    stripe_session_id: 'sess_1',
    stripe_payment_intent: 'pi_1',
    repartidor_id: null,
    creado_en: '2026-01-15T11:00:00.000Z',
    pagado_en: '2026-01-15T11:00:05.000Z',
    entregado_en: null,
    pedido_lineas: [],
    ...parcial,
  } as PedidoConLineas
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('TableroPedidos', () => {
  it('cuenta cada pedido en su pestaña y filtra la lista visible', async () => {
    const pedidos = [pedido({ id: 'p-1', estado: 'nuevo' }), pedido({ id: 'p-2', estado: 'entregado' })]
    render(<TableroPedidos perfil={PERFIL_COCINA} pedidosIniciales={pedidos} franjas={[]} />)

    expect(screen.getByRole('button', { name: /Nuevos \(1\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Entregados \(1\)/ })).toBeInTheDocument()
    expect(screen.getByText(/abc123/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Entregados/ }))
    expect(screen.queryByText('No hay pedidos aquí.')).not.toBeInTheDocument()
  })

  it('avisa cuando la pestaña activa no tiene pedidos', () => {
    render(
      <TableroPedidos
        perfil={PERFIL_COCINA}
        pedidosIniciales={[pedido({ estado: 'entregado' })]}
        franjas={[]}
      />,
    )
    expect(screen.getByText('No hay pedidos aquí.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Ejecutar el test y comprobar que falla**

Run: `pnpm test TableroPedidos`
Expected: FAIL — no existe `src/components/panel/TableroPedidos.tsx`.

- [ ] **Step 7: Implementar el tablero**

Crear `src/components/panel/TableroPedidos.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { crearClienteNavegador } from '@/lib/supabase/cliente-navegador'
import {
  actualizarCamposPedido,
  fusionarLineaEnLista,
  fusionarPedidoEnLista,
  ordenarPorFranja,
  pestanaDePedido,
  type Pestana,
} from '@/lib/pedidos/tablero'
import type { EstadoPedido, PedidoConLineas } from '@/lib/pedidos/tipos'
import type { PerfilStaff } from '@/lib/personal/tipos'
import type { Franja } from '@/lib/horario/tipos'
import type { Tables } from '@/lib/supabase/tipos-bd'
import { TarjetaPedido } from './TarjetaPedido'

const PESTANAS: { id: Pestana; etiqueta: string }[] = [
  { id: 'nuevos', etiqueta: 'Nuevos' },
  { id: 'en_marcha', etiqueta: 'En marcha' },
  { id: 'pendientes_envio', etiqueta: 'Pendientes de envío' },
  { id: 'entregados', etiqueta: 'Entregados' },
]

function reproducirAviso() {
  try {
    const contexto = new AudioContext()
    const oscilador = contexto.createOscillator()
    const ganancia = contexto.createGain()
    oscilador.type = 'sine'
    oscilador.frequency.value = 880
    ganancia.gain.setValueAtTime(0.2, contexto.currentTime)
    ganancia.gain.exponentialRampToValueAtTime(0.001, contexto.currentTime + 0.6)
    oscilador.connect(ganancia)
    ganancia.connect(contexto.destination)
    oscilador.start()
    oscilador.stop(contexto.currentTime + 0.6)
  } catch {
    // Sin audio (navegador sin soporte o reproducción automática bloqueada): no debe romper el tablero.
  }
  if (navigator.vibrate) navigator.vibrate([200, 100, 200])
}

type Props = {
  perfil: PerfilStaff
  pedidosIniciales: PedidoConLineas[]
  franjas: Franja[]
}

export function TableroPedidos({ perfil, pedidosIniciales, franjas }: Props) {
  const [pedidos, setPedidos] = useState(pedidosIniciales)
  const [pestanaActiva, setPestanaActiva] = useState<Pestana>('nuevos')

  useEffect(() => {
    const supabase = crearClienteNavegador()

    const canal = supabase
      .channel('tablero-pedidos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos' }, async (payload) => {
        const { data } = await supabase
          .from('pedidos')
          .select('*, pedido_lineas(*, pedido_extras(*))')
          .eq('id', (payload.new as Tables<'pedidos'>).id)
          .single()
        if (data) {
          setPedidos((actuales) => fusionarPedidoEnLista(actuales, data as PedidoConLineas))
          reproducirAviso()
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos' }, (payload) => {
        setPedidos((actuales) => actualizarCamposPedido(actuales, payload.new as Tables<'pedidos'>))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedido_lineas' }, (payload) => {
        setPedidos((actuales) => fusionarLineaEnLista(actuales, payload.new as Tables<'pedido_lineas'>))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  function pedidosDe(id: Pestana) {
    return pedidos.filter((p) => pestanaDePedido(p.estado as EstadoPedido) === id)
  }

  const pedidosDeLaPestana = ordenarPorFranja(pedidosDe(pestanaActiva))

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex gap-2 overflow-x-auto">
        {PESTANAS.map((pestana) => (
          <button
            key={pestana.id}
            type="button"
            onClick={() => setPestanaActiva(pestana.id)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
              pestanaActiva === pestana.id ? 'border-amber-500 bg-amber-500/10' : 'border-neutral-700'
            }`}
          >
            {pestana.etiqueta} ({pedidosDe(pestana.id).length})
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-4">
        {pedidosDeLaPestana.length === 0 && <p className="text-sm text-neutral-400">No hay pedidos aquí.</p>}
        {pedidosDeLaPestana.map((pedido) => (
          <TarjetaPedido
            key={pedido.id}
            pedido={pedido}
            perfil={perfil}
            franjas={franjas}
            onActualizado={(actualizado) => setPedidos((actuales) => fusionarPedidoEnLista(actuales, actualizado))}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Ejecutar el test y comprobar que pasa**

Run: `pnpm test TableroPedidos`
Expected: PASS.

- [ ] **Step 9: Crear la página del panel**

Crear `src/app/panel/(protegido)/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { obtenerAjustesHorario } from '@/lib/carta/consultas'
import { generarFranjas } from '@/lib/horario'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarPedidosPanel } from '@/lib/pedidos/panel'
import { crearClienteServidorSesion } from '@/lib/supabase/cliente-servidor-sesion'
import { TableroPedidos } from '@/components/panel/TableroPedidos'

export default async function PaginaPanel() {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')

  const supabaseSesion = await crearClienteServidorSesion()
  const [pedidos, ajustesHorario] = await Promise.all([
    listarPedidosPanel(supabaseSesion),
    obtenerAjustesHorario(),
  ])
  const franjas = generarFranjas(ajustesHorario, new Date())

  return <TableroPedidos perfil={perfil} pedidosIniciales={pedidos} franjas={franjas} />
}
```

- [ ] **Step 10: Ejecutar toda la suite y comprobar que compila**

Run: `pnpm test`
Expected: PASS, toda la suite en verde.

Run: `pnpm build`
Expected: compilación sin errores.

- [ ] **Step 11: Commit**

```bash
git add src/components/panel/TarjetaPedido.tsx src/components/panel/TarjetaPedido.test.tsx src/components/panel/TableroPedidos.tsx src/components/panel/TableroPedidos.test.tsx "src/app/panel/(protegido)/page.tsx"
git commit -m "Añade el tablero de cocina con pestañas, tarjeta, tiempo real y aviso"
```

---

### Tarea 9: Recorrido de extremo a extremo del panel

**Files:**
- Modify: `.env.example`
- Create: `e2e/panel.spec.ts`

**Interfaces:**
- Consumes: la cuenta de personal creada en la Tarea 5, vía variables de entorno `PANEL_TEST_EMAIL` y `PANEL_TEST_PASSWORD`.
- Produces: nada nuevo, verifica el sistema completo.

- [ ] **Step 1: Añadir las variables de entorno de prueba**

Añadir a `.env.local` (no se versiona) el email y la contraseña de la cuenta de `cocina` creada en la Tarea 5:

```
PANEL_TEST_EMAIL=
PANEL_TEST_PASSWORD=
```

Añadir las mismas claves, vacías, a `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
CALLMEBOT_TELEFONO=
CALLMEBOT_CLAVE=
PANEL_TEST_EMAIL=
PANEL_TEST_PASSWORD=
```

- [ ] **Step 2: Escribir el recorrido completo**

Crear `e2e/panel.spec.ts`:

```ts
import { config } from 'dotenv'
config({ path: '.env.local' })
import { expect, test } from '@playwright/test'

const EMAIL_COCINA = process.env.PANEL_TEST_EMAIL!
const PASSWORD_COCINA = process.env.PANEL_TEST_PASSWORD!

test('la cocina confirma, prepara y entrega un pedido de recogida recién pagado', async ({ page }) => {
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
  await page.getByRole('button', { name: /Pagar/ }).click()

  await page.waitForURL(/checkout\.stripe\.com/)
  await page.locator('#email').fill('ana@example.com')
  await page.getByRole('radio', { name: 'Card' }).click({ force: true })
  await page.locator('#cardNumber').fill('4242424242424242')
  await page.locator('#cardExpiry').fill('12/34')
  await page.locator('#cardCvc').fill('123')
  await page.locator('#billingName').fill('Ana García')
  await page.getByTestId('hosted-payment-submit-button').click()
  await page.waitForURL(/\/pedido\//)
  const urlSeguimiento = page.url()
  // El código público del pedido va en la URL de seguimiento (/pedido/<codigo>) y es
  // el mismo que el panel muestra en la cabecera de la tarjeta ("Pedido <codigo>").
  // Hace falta para distinguir esta tarjeta de otros pedidos de recogida que ya
  // hubiera en el tablero.
  const codigoPedido = urlSeguimiento.split('/pedido/')[1]

  await page.goto('/panel/iniciar-sesion')
  await page.getByLabel('Email').fill(EMAIL_COCINA)
  await page.getByLabel('Contraseña').fill(PASSWORD_COCINA)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(/\/panel$/)

  const tarjeta = page.locator('article').filter({ hasText: codigoPedido })
  // La tarjeta ofrece un flujo de confirmación distinto según si el restaurante estaba
  // abierto al pagar: si lo estaba, el checkout preselecciona "Lo antes posible" y la
  // tarjeta muestra un único botón "Aceptar y empezar" que confirma la franja y pasa a
  // preparación a la vez; si no lo estaba (pero seguía habiendo franjas futuras), el
  // pedido lleva una franja concreta y la tarjeta muestra los pasos separados
  // "Confirmar {hora}" + "Empezar". No depende de cuál esté abierto el restaurante al
  // ejecutar el test: se espera a que aparezca cualquiera de los dos y se sigue ese flujo.
  const botonAceptarYEmpezar = tarjeta.getByRole('button', { name: 'Aceptar y empezar' })
  const botonConfirmar = tarjeta.getByRole('button', { name: /Confirmar/ })
  await expect(botonAceptarYEmpezar.or(botonConfirmar)).toBeVisible({ timeout: 15000 })
  if (await botonAceptarYEmpezar.isVisible()) {
    await botonAceptarYEmpezar.click()
  } else {
    await botonConfirmar.click()
    await tarjeta.getByRole('button', { name: 'Empezar' }).click()
  }

  // El tablero solo pinta las tarjetas de la pestaña activa (TableroPedidos filtra por
  // estado), así que cada transición que cambia de pestaña obliga a cambiar de pestaña
  // para seguir viendo la tarjeta: nuevo → en_preparacion pasa a "En marcha".
  await page.getByRole('button', { name: 'En marcha' }).click()
  const casilla = tarjeta.getByRole('checkbox').first()
  await expect(casilla).toBeEnabled({ timeout: 15000 })
  // El checkbox marca la línea vía un PATCH asíncrono antes de reflejar el cambio (no hay
  // actualización optimista), así que un solo check() puede correr por delante de la
  // respuesta. Reintentar hasta que quede marcado de verdad.
  await expect(async () => {
    await casilla.check()
    await expect(casilla).toBeChecked()
  }).toPass({ timeout: 15000 })
  await tarjeta.getByRole('button', { name: 'Listo' }).click()

  // en_preparacion → pendiente_envio pasa a "Pendientes de envío".
  await page.getByRole('button', { name: 'Pendientes de envío' }).click()
  await expect(tarjeta.getByRole('button', { name: 'Entregado' })).toBeVisible({ timeout: 15000 })
  await tarjeta.getByRole('button', { name: 'Entregado' }).click()

  // pendiente_envio → entregado pasa a "Entregados". Esperar aquí a que la tarjeta
  // aparezca en esa pestaña confirma que el PATCH ha terminado antes de ir a la página
  // de seguimiento: esta solo se refresca sola cada 15 s (sondeo, no tiempo real), así
  // que navegar antes de tiempo dejaría viendo el estado anterior.
  await page.getByRole('button', { name: 'Entregados' }).click()
  await expect(tarjeta).toBeVisible({ timeout: 15000 })

  await page.goto(urlSeguimiento)
  await expect(page.getByText('Entregado')).toBeVisible({ timeout: 15000 })
})
```

- [ ] **Step 3: Ejecutar el recorrido completo**

Con `stripe listen` corriendo en otra terminal (Tarea 5 del plan de checkout):

Run: `pnpm test:e2e panel`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add .env.example e2e/panel.spec.ts
git commit -m "Añade el recorrido de extremo a extremo del panel de cocina"
```

---

## Qué queda fuera de este plan

Los planes siguientes, en orden:

4. **Administración** — CRUD de carta, pantalla de disponibilidad, ajustes, equipo (invitaciones, ya no un script) e historial.
5. **Reparto y despliegue** — perfil de repartidor (usa `estados` y las transiciones que ya modela este plan) y publicación en Vercel.
