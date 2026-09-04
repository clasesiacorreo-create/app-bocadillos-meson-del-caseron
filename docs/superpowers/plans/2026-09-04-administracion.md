# Administración — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Desde el móvil, admin gestiona la carta (artículos, fotos, complementos), la disponibilidad diaria (admin y cocina), los ajustes del restaurante, el equipo (invitaciones por email) y consulta el historial de pedidos entregados con la caja del día — sin tocar código para nada de lo anterior.

**Architecture:** Se añaden pantallas y endpoints bajo `/panel/carta`, `/panel/ajustes`, `/panel/equipo` y `/panel/historial`, protegidos por el mismo layout de personal que ya existe. Todas las escrituras (carta, ajustes, equipo) pasan por endpoints de servidor con la clave de servicio, comprobando el rol a mano — el mismo patrón que ya usan las transiciones de pedido — porque no se conceden políticas de escritura por RLS. Las fotos de artículo se suben a un bucket público de Supabase Storage, recomprimidas en el servidor con `sharp` antes de guardarlas. El equipo se da de alta con `auth.admin.inviteUserByEmail`: Supabase envía el correo, y una página nueva (`/panel/invitacion`, fuera de la protección de `proxy.ts`) recibe el enlace, abre sesión con el token de invitación y deja fijar la contraseña.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Supabase (Postgres, Auth, Storage), `@supabase/ssr`, `sharp`, Vitest, Testing Library, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-19-pedidos-horno-caseron-design.md` (secciones 5, 6, 9, 10 y 11 son las que cubre este plan).

**Plan anterior:** `docs/superpowers/plans/2026-09-03-panel-de-cocina.md` (tablero de cocina — completado).

## Global Constraints

- **Gestor de paquetes: pnpm.** Nunca `npm` ni `npx`. En su lugar `pnpm` y `pnpx`. Aplica también a scripts, documentación y CI.
- **Importes siempre en céntimos enteros.** Nunca euros en coma flotante. Los formularios muestran y aceptan euros como texto, pero se convierten a céntimos con `parsearPrecio` antes de tocar la base de datos.
- **Zona horaria de referencia: `Europe/Madrid`.**
- **Idioma de la interfaz y del código de dominio: español.** Nombres de variables, tablas y funciones en español, sin acentos en identificadores.
- **Las integraciones nativas (MCP) de Supabase, Vercel y Stripe no se usan.** Están conectadas a cuentas distintas. Todo se hace por CLI y código.
- **Toda escritura de carta, ajustes y equipo pasa por el servidor con la clave de servicio**, comprobando el rol de quien llama con `obtenerPerfilStaff()`. No se conceden políticas de escritura por RLS para estas tablas — igual que ya ocurre con los pedidos.
- **La disponibilidad (artículo, tamaño, complemento) la puede tocar admin y cocina.** El resto de la carta (alta, edición, baja, fotos), los ajustes y el equipo son solo de admin.
- **El repartidor no tiene acceso a `/panel/carta`, `/panel/ajustes` (edición) ni `/panel/equipo`** en este plan — su perfil llega en el plan de reparto.
- **Supabase se usa en su versión Cloud, no local.**

## Estructura de ficheros

| Fichero | Responsabilidad |
|---|---|
| `src/lib/panel/erroresApi.ts` | `mensajeDeError`, compartido por todos los formularios del panel. |
| `src/lib/dinero/index.ts` | Añade `parsearPrecio` (euros de texto → céntimos). |
| `src/lib/precios/index.ts` | Añade `umbralesValidos`. |
| `src/lib/horario/index.ts` | Añade `rangoDelDiaEnMadrid`. |
| `src/lib/carta/escritura.ts` | Escritura de disponibilidad, CRUD de artículos y complementos, listados para formularios. |
| `src/lib/carta/imagen.ts` | `recomprimirImagen` con `sharp`. |
| `src/lib/ajustes/index.ts` | `obtenerAjustes`, `actualizarAjustes`. |
| `src/lib/personal/equipo.ts` | `listarEquipo`, `invitarMiembro`. |
| `src/lib/pedidos/historial.ts` | `listarHistorial`, `totalFacturadoHoy`. |
| `supabase/migrations/0005_storage_carta.sql` | Bucket público `carta` en Supabase Storage. |
| `next.config.ts` | `images.remotePatterns` para el dominio de Storage. |
| `package.json` | Añade `sharp`. |
| `src/proxy.ts` | Exime `/panel/invitacion` de la protección de sesión. |
| `src/components/panel/NavPanel.tsx` | Navegación entre secciones del panel, según rol. |
| `src/app/panel/(protegido)/layout.tsx` | Incluye `NavPanel`. |
| `src/app/api/panel/carta/articulos/[id]/disponibilidad/route.ts` | PATCH disponibilidad de artículo. |
| `src/app/api/panel/carta/articulos/[articuloId]/tamanos/[tamanoId]/disponibilidad/route.ts` | PATCH disponibilidad de un tamaño del artículo. |
| `src/app/api/panel/carta/complementos/[id]/disponibilidad/route.ts` | PATCH disponibilidad de complemento. |
| `src/components/panel/VistaDisponibilidad.tsx` | Pantalla de disponibilidad. |
| `src/app/panel/(protegido)/carta/page.tsx` | Página `/panel/carta` (disponibilidad). |
| `src/app/api/panel/carta/articulos/[id]/imagen/route.ts` | Sube y recomprime la foto de un artículo. |
| `src/app/api/panel/carta/articulos/route.ts` | POST crear artículo. |
| `src/app/api/panel/carta/articulos/[id]/route.ts` | PATCH actualizar, DELETE dar de baja. |
| `src/components/panel/FormularioArticulo.tsx` | Alta y edición de artículo. |
| `src/app/panel/(protegido)/carta/articulos/page.tsx` | Listado de artículos. |
| `src/app/panel/(protegido)/carta/articulos/nuevo/page.tsx` | Alta. |
| `src/app/panel/(protegido)/carta/articulos/[id]/page.tsx` | Edición. |
| `src/app/api/panel/carta/complementos/route.ts` | POST crear complemento. |
| `src/app/api/panel/carta/complementos/[id]/route.ts` | PATCH actualizar, DELETE dar de baja. |
| `src/components/panel/FormularioComplemento.tsx` | Alta y edición de complemento. |
| `src/app/panel/(protegido)/carta/complementos/page.tsx` | Listado. |
| `src/app/panel/(protegido)/carta/complementos/nuevo/page.tsx` | Alta. |
| `src/app/panel/(protegido)/carta/complementos/[id]/page.tsx` | Edición. |
| `src/app/api/panel/ajustes/route.ts` | PATCH actualizar ajustes. |
| `src/components/panel/FormularioAjustes.tsx` | Formulario de ajustes (admin). |
| `src/components/panel/VistaAjustesSoloLectura.tsx` | Vista de ajustes (cocina). |
| `src/app/panel/(protegido)/ajustes/page.tsx` | Página `/panel/ajustes`. |
| `src/app/api/panel/equipo/route.ts` | POST invitar. |
| `src/app/panel/invitacion/page.tsx` | Acepta la invitación y fija la contraseña. |
| `src/components/panel/VistaEquipo.tsx` | Listado e invitación de equipo. |
| `src/app/panel/(protegido)/equipo/page.tsx` | Página `/panel/equipo`. |
| `src/app/api/panel/historial/route.ts` | GET historial filtrado por teléfono. |
| `src/components/panel/VistaHistorial.tsx` | Pantalla de historial y caja del día. |
| `src/app/panel/(protegido)/historial/page.tsx` | Página `/panel/historial`. |

---

### Tarea 1: Utilidades compartidas del panel

**Files:**
- Create: `src/lib/panel/erroresApi.ts`
- Modify: `src/lib/dinero/index.ts`
- Modify: `src/lib/dinero/dinero.test.ts`
- Modify: `src/lib/precios/index.ts`
- Modify: `src/lib/precios/precios.test.ts`
- Modify: `src/components/panel/TarjetaPedido.tsx`

**Interfaces:**
- Produces: `mensajeDeError(respuesta: Response): Promise<string>`; `parsearPrecio(texto: string): number | null`; `umbralesValidos(pedidoMinimoCentimos: number, envioGratisDesdeCentimos: number | null): boolean`.

- [ ] **Step 1: Tests que fallan para `parsearPrecio`**

Añadir al final de `src/lib/dinero/dinero.test.ts`:

```ts
describe('parsearPrecio', () => {
  it('acepta coma decimal', () => {
    expect(parsearPrecio('2,50')).toBe(250)
  })

  it('acepta punto decimal', () => {
    expect(parsearPrecio('2.50')).toBe(250)
  })

  it('acepta un entero', () => {
    expect(parsearPrecio('5')).toBe(500)
  })

  it('acepta cero', () => {
    expect(parsearPrecio('0')).toBe(0)
  })

  it('rechaza texto vacío', () => {
    expect(parsearPrecio('')).toBeNull()
  })

  it('rechaza texto que no es un número', () => {
    expect(parsearPrecio('abc')).toBeNull()
  })

  it('rechaza negativos', () => {
    expect(parsearPrecio('-1')).toBeNull()
  })
})
```

Y añadir `parsearPrecio` al `import` de la primera línea del fichero (junto a `formatearPrecio`).

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `pnpm test dinero`
Expected: FAIL — `parsearPrecio` no existe todavía.

- [ ] **Step 3: Implementar `parsearPrecio`**

Añadir a `src/lib/dinero/index.ts`:

```ts
/**
 * Convierte un importe en euros escrito por una persona ("2,50", "2.50",
 * "5") a céntimos enteros. `null` si el texto no es un número válido o es
 * negativo, para que quien llama decida cómo avisar sin lanzar una excepción
 * por cada tecla que todavía no forma un número.
 */
export function parsearPrecio(texto: string): number | null {
  const normalizado = texto.trim().replace(',', '.')
  if (normalizado === '') return null
  const valor = Number(normalizado)
  if (!Number.isFinite(valor) || valor < 0) return null
  return Math.round(valor * 100)
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `pnpm test dinero`
Expected: PASS.

- [ ] **Step 5: Test que falla para `umbralesValidos`**

Añadir al final de `src/lib/precios/precios.test.ts`:

```ts
describe('umbralesValidos', () => {
  it('es válido cuando el envío gratis está desactivado', () => {
    expect(umbralesValidos(1000, null)).toBe(true)
  })

  it('es válido cuando el envío gratis supera el mínimo', () => {
    expect(umbralesValidos(1000, 2000)).toBe(true)
  })

  it('no es válido cuando el envío gratis es igual al mínimo', () => {
    expect(umbralesValidos(1000, 1000)).toBe(false)
  })

  it('no es válido cuando el envío gratis es menor que el mínimo', () => {
    expect(umbralesValidos(1000, 500)).toBe(false)
  })
})
```

Y añadir `umbralesValidos` al `import` de la primera línea (junto a `calcularResumen`, `precioLinea`).

- [ ] **Step 6: Ejecutar y comprobar que falla**

Run: `pnpm test precios`
Expected: FAIL — `umbralesValidos` no existe todavía.

- [ ] **Step 7: Implementar `umbralesValidos`**

Añadir a `src/lib/precios/index.ts`:

```ts
/**
 * Los dos umbrales miden el mismo subtotal pero significan cosas opuestas:
 * uno bloquea el pedido por debajo, el otro libera el envío por encima. Si
 * el segundo no fuera estrictamente mayor que el primero, el envío saldría
 * gratis en todo pedido que se pudiera hacer, y el ajuste dejaría de tener
 * efecto real.
 */
export function umbralesValidos(pedidoMinimoCentimos: number, envioGratisDesdeCentimos: number | null): boolean {
  return envioGratisDesdeCentimos === null || envioGratisDesdeCentimos > pedidoMinimoCentimos
}
```

- [ ] **Step 8: Ejecutar y comprobar que pasa**

Run: `pnpm test precios`
Expected: PASS.

- [ ] **Step 9: Extraer `mensajeDeError` a un módulo compartido**

Crear `src/lib/panel/erroresApi.ts`:

```ts
const MENSAJE_GENERICO = 'No se ha podido completar la acción. Inténtalo de nuevo.'

/**
 * En una pantalla de panel, una acción que no hace nada se lee como "¿lo
 * vuelvo a pulsar?": cuando la respuesta no es `ok` hay que enseñar algo. Los
 * endpoints del panel responden `{ error: string }`; si el cuerpo no llega o
 * no lo trae, se recurre al mensaje genérico.
 */
export async function mensajeDeError(respuesta: Response): Promise<string> {
  try {
    const cuerpo = (await respuesta.json()) as { error?: unknown }
    if (typeof cuerpo.error === 'string' && cuerpo.error.trim() !== '') return cuerpo.error
  } catch {
    // Cuerpo vacío o que no es JSON: se usa el mensaje genérico.
  }
  return MENSAJE_GENERICO
}
```

En `src/components/panel/TarjetaPedido.tsx`, quitar la constante `MENSAJE_GENERICO` y la función `mensajeDeError` que están definidas localmente (líneas 12-28 según el fichero actual), y añadir en su lugar, junto al resto de imports:

```ts
import { mensajeDeError } from '@/lib/panel/erroresApi'
```

El resto del fichero no cambia: sigue llamando a `mensajeDeError(respuesta)` exactamente igual, solo que ahora viene del módulo compartido.

- [ ] **Step 10: Comprobar que el tablero sigue pasando sus tests**

Run: `pnpm test TarjetaPedido`
Expected: PASS — el comportamiento no cambia, solo de dónde viene la función.

- [ ] **Step 11: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores.

- [ ] **Step 12: Commit**

```bash
git add src/lib/panel src/lib/dinero src/lib/precios src/components/panel/TarjetaPedido.tsx
git commit -m "Añade utilidades compartidas del panel: parsearPrecio, umbralesValidos, mensajeDeError"
```

---

### Tarea 2: Disponibilidad — escritura y endpoints

**Files:**
- Create: `src/lib/carta/escritura.ts`
- Create: `src/app/api/panel/carta/articulos/[id]/disponibilidad/route.ts`
- Create: `src/app/api/panel/carta/articulos/[articuloId]/tamanos/[tamanoId]/disponibilidad/route.ts`
- Create: `src/app/api/panel/carta/complementos/[id]/disponibilidad/route.ts`

**Interfaces:**
- Consumes: `crearClienteServicio` (de `@/lib/supabase/cliente-servicio`), `obtenerPerfilStaff` (de `@/lib/personal/sesion`).
- Produces: `actualizarDisponibilidadArticulo(id, disponible)`, `actualizarDisponibilidadTamano(articuloId, tamanoId, disponible)`, `actualizarDisponibilidadExtra(id, disponible)`; `PATCH /api/panel/carta/articulos/[id]/disponibilidad`, `PATCH /api/panel/carta/articulos/[articuloId]/tamanos/[tamanoId]/disponibilidad`, `PATCH /api/panel/carta/complementos/[id]/disponibilidad`.

- [ ] **Step 1: Crear el módulo de escritura con las tres funciones de disponibilidad**

Crear `src/lib/carta/escritura.ts`:

```ts
import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'

export async function actualizarDisponibilidadArticulo(id: string, disponible: boolean): Promise<void> {
  const supabase = crearClienteServicio()
  const { error } = await supabase.from('articulos').update({ disponible }).eq('id', id)
  if (error) throw error
}

/**
 * `articulo_tamanos` no expone su propio id a la capa de lectura pública
 * (`obtenerCarta` solo trae el id del tamaño, compartido entre artículos), así
 * que se actualiza por la pareja (articulo_id, tamano_id), que es única por la
 * restricción de la migración 0001.
 */
export async function actualizarDisponibilidadTamano(
  articuloId: string,
  tamanoId: string,
  disponible: boolean,
): Promise<void> {
  const supabase = crearClienteServicio()
  const { error } = await supabase
    .from('articulo_tamanos')
    .update({ disponible })
    .eq('articulo_id', articuloId)
    .eq('tamano_id', tamanoId)
  if (error) throw error
}

export async function actualizarDisponibilidadExtra(id: string, disponible: boolean): Promise<void> {
  const supabase = crearClienteServicio()
  const { error } = await supabase.from('extras').update({ disponible }).eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 2: Endpoint de disponibilidad de artículo**

Crear `src/app/api/panel/carta/articulos/[id]/disponibilidad/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { actualizarDisponibilidadArticulo } from '@/lib/carta/escritura'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol !== 'admin' && perfil.rol !== 'cocina') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { disponible } = (await req.json()) as { disponible: boolean }
  await actualizarDisponibilidadArticulo(id, disponible)
  return NextResponse.json({ disponible })
}
```

- [ ] **Step 3: Endpoint de disponibilidad de tamaño**

Crear `src/app/api/panel/carta/articulos/[articuloId]/tamanos/[tamanoId]/disponibilidad/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { actualizarDisponibilidadTamano } from '@/lib/carta/escritura'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ articuloId: string; tamanoId: string }> },
) {
  const { articuloId, tamanoId } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol !== 'admin' && perfil.rol !== 'cocina') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { disponible } = (await req.json()) as { disponible: boolean }
  await actualizarDisponibilidadTamano(articuloId, tamanoId, disponible)
  return NextResponse.json({ disponible })
}
```

- [ ] **Step 4: Endpoint de disponibilidad de complemento**

Crear `src/app/api/panel/carta/complementos/[id]/disponibilidad/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { actualizarDisponibilidadExtra } from '@/lib/carta/escritura'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol !== 'admin' && perfil.rol !== 'cocina') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { disponible } = (await req.json()) as { disponible: boolean }
  await actualizarDisponibilidadExtra(id, disponible)
  return NextResponse.json({ disponible })
}
```

- [ ] **Step 5: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores. Los tres endpoints se ejercen desde la pantalla de la Tarea 3.

- [ ] **Step 6: Commit**

```bash
git add src/lib/carta/escritura.ts src/app/api/panel/carta
git commit -m "Añade la escritura y los endpoints de disponibilidad de la carta"
```

---

### Tarea 3: Disponibilidad — pantalla y navegación

**Files:**
- Create: `src/components/panel/VistaDisponibilidad.tsx`
- Test: `src/components/panel/VistaDisponibilidad.test.tsx`
- Create: `src/components/panel/NavPanel.tsx`
- Create: `src/app/panel/(protegido)/carta/page.tsx`
- Modify: `src/app/panel/(protegido)/layout.tsx`

**Interfaces:**
- Consumes: `Carta`, `ArticuloCarta` (de `@/lib/carta/tipos`), `mensajeDeError` (de `@/lib/panel/erroresApi`), `obtenerCarta` (de `@/lib/carta/consultas`), `obtenerPerfilStaff` (de `@/lib/personal/sesion`), `RolStaff` (de `@/lib/personal/tipos`).
- Produces: componente `VistaDisponibilidad({ carta }): JSX`; componente `NavPanel({ rol }): JSX`.

- [ ] **Step 1: Test que falla para `VistaDisponibilidad`**

Crear `src/components/panel/VistaDisponibilidad.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VistaDisponibilidad } from './VistaDisponibilidad'
import type { Carta } from '@/lib/carta/tipos'

const CARTA: Carta = {
  categorias: [
    {
      id: 'c-1',
      nombre: 'Clásicos a la plancha',
      articulos: [
        {
          id: 'a-1',
          nombre: 'Lomo',
          descripcion: '',
          imagenUrl: null,
          disponible: true,
          tamanos: [
            { id: 't-b', nombre: 'Bocadillo', precioCentimos: 500, disponible: true },
            { id: 't-m', nombre: 'Montado', precioCentimos: 400, disponible: true },
          ],
          extras: [
            { id: 'e-1', nombre: 'Queso', descripcion: '', disponible: true, precioPorTamanoId: { 't-b': 100 } },
          ],
        },
      ],
    },
  ],
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ disponible: false }) }))
})

describe('VistaDisponibilidad', () => {
  it('muestra el artículo, sus tamaños y sus complementos', () => {
    render(<VistaDisponibilidad carta={CARTA} />)
    expect(screen.getByText('Lomo')).toBeInTheDocument()
    expect(screen.getByText('Bocadillo')).toBeInTheDocument()
    expect(screen.getByText('Montado')).toBeInTheDocument()
    expect(screen.getByText('Queso')).toBeInTheDocument()
  })

  it('desactiva el artículo al pulsar su interruptor', async () => {
    render(<VistaDisponibilidad carta={CARTA} />)
    const interruptor = screen.getByRole('switch', { name: 'Lomo' })
    expect(interruptor).toHaveAttribute('aria-checked', 'true')

    await userEvent.click(interruptor)

    expect(fetch).toHaveBeenCalledWith(
      '/api/panel/carta/articulos/a-1/disponibilidad',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ disponible: false }) }),
    )
    expect(interruptor).toHaveAttribute('aria-checked', 'false')
  })

  it('pide la disponibilidad de un tamaño por la pareja artículo + tamaño', async () => {
    render(<VistaDisponibilidad carta={CARTA} />)
    await userEvent.click(screen.getByRole('switch', { name: 'Bocadillo' }))

    expect(fetch).toHaveBeenCalledWith(
      '/api/panel/carta/articulos/a-1/tamanos/t-b/disponibilidad',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('revierte el cambio si el servidor falla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'No se pudo guardar' }) }),
    )
    render(<VistaDisponibilidad carta={CARTA} />)
    const interruptor = screen.getByRole('switch', { name: 'Lomo' })

    await userEvent.click(interruptor)

    expect(interruptor).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('No se pudo guardar')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `pnpm test VistaDisponibilidad`
Expected: FAIL — `VistaDisponibilidad` no existe todavía.

- [ ] **Step 3: Implementar `VistaDisponibilidad`**

Crear `src/components/panel/VistaDisponibilidad.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { mensajeDeError } from '@/lib/panel/erroresApi'
import type { Carta } from '@/lib/carta/tipos'

type FilaProps = {
  etiqueta: string
  disponibleInicial: boolean
  endpoint: string
  indentado?: boolean
}

function FilaDisponibilidad({ etiqueta, disponibleInicial, endpoint, indentado }: FilaProps) {
  const [disponible, setDisponible] = useState(disponibleInicial)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function alternar() {
    const nuevoValor = !disponible
    setDisponible(nuevoValor)
    setEnviando(true)
    setError(null)
    const respuesta = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disponible: nuevoValor }),
    })
    if (!respuesta.ok) {
      setDisponible(!nuevoValor)
      setError(await mensajeDeError(respuesta))
    }
    setEnviando(false)
  }

  return (
    <div className={`flex items-center justify-between gap-2 py-2 ${indentado ? 'pl-6' : ''}`}>
      <span className={disponible ? '' : 'text-neutral-500'}>{etiqueta}</span>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-amber-400">{error}</span>}
        <button
          type="button"
          role="switch"
          aria-checked={disponible}
          aria-label={etiqueta}
          disabled={enviando}
          onClick={alternar}
          className={`h-7 w-12 rounded-full border transition disabled:opacity-40 ${
            disponible ? 'border-emerald-600 bg-emerald-600/30' : 'border-neutral-700 bg-neutral-800'
          }`}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-white transition ${disponible ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>
    </div>
  )
}

type Props = { carta: Carta }

export function VistaDisponibilidad({ carta }: Props) {
  const extrasUnicos = new Map<string, { id: string; nombre: string; disponible: boolean }>()
  for (const categoria of carta.categorias) {
    for (const articulo of categoria.articulos) {
      for (const extra of articulo.extras) {
        extrasUnicos.set(extra.id, { id: extra.id, nombre: extra.nombre, disponible: extra.disponible })
      }
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {carta.categorias.map((categoria) => (
        <section key={categoria.id}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">{categoria.nombre}</h2>
          <div className="divide-y divide-neutral-800">
            {categoria.articulos.map((articulo) => (
              <div key={articulo.id}>
                <FilaDisponibilidad
                  etiqueta={articulo.nombre}
                  disponibleInicial={articulo.disponible}
                  endpoint={`/api/panel/carta/articulos/${articulo.id}/disponibilidad`}
                />
                {articulo.tamanos.length > 1 &&
                  articulo.tamanos.map((tamano) => (
                    <FilaDisponibilidad
                      key={tamano.id}
                      etiqueta={tamano.nombre}
                      disponibleInicial={tamano.disponible}
                      endpoint={`/api/panel/carta/articulos/${articulo.id}/tamanos/${tamano.id}/disponibilidad`}
                      indentado
                    />
                  ))}
              </div>
            ))}
          </div>
        </section>
      ))}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">Complementos</h2>
        <div className="divide-y divide-neutral-800">
          {[...extrasUnicos.values()].map((extra) => (
            <FilaDisponibilidad
              key={extra.id}
              etiqueta={extra.nombre}
              disponibleInicial={extra.disponible}
              endpoint={`/api/panel/carta/complementos/${extra.id}/disponibilidad`}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `pnpm test VistaDisponibilidad`
Expected: PASS.

- [ ] **Step 5: Navegación del panel**

Crear `src/components/panel/NavPanel.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { RolStaff } from '@/lib/personal/tipos'

type Enlace = { href: string; etiqueta: string; roles: RolStaff[] }

const ENLACES: Enlace[] = [
  { href: '/panel', etiqueta: 'Pedidos', roles: ['admin', 'cocina', 'repartidor'] },
  { href: '/panel/carta', etiqueta: 'Disponibilidad', roles: ['admin', 'cocina'] },
]

export function NavPanel({ rol }: { rol: RolStaff }) {
  const pathname = usePathname()
  const enlaces = ENLACES.filter((enlace) => enlace.roles.includes(rol))

  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-neutral-800 px-4 py-2">
      {enlaces.map((enlace) => {
        const activo = pathname === enlace.href || (enlace.href !== '/panel' && pathname.startsWith(enlace.href))
        return (
          <Link
            key={enlace.href}
            href={enlace.href}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
              activo ? 'border-amber-500 bg-amber-500/10' : 'border-neutral-700'
            }`}
          >
            {enlace.etiqueta}
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 6: Añadir la navegación al layout protegido**

En `src/app/panel/(protegido)/layout.tsx`, añadir el import y renderizar `NavPanel` justo debajo de la cabecera:

```tsx
import { redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { CerrarSesionBoton } from '@/components/panel/CerrarSesionBoton'
import { NavPanel } from '@/components/panel/NavPanel'

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
      <NavPanel rol={perfil.rol} />
      <main className="px-4 py-4">{children}</main>
    </div>
  )
}
```

- [ ] **Step 7: Página de disponibilidad**

Crear `src/app/panel/(protegido)/carta/page.tsx`:

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { obtenerCarta } from '@/lib/carta/consultas'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { VistaDisponibilidad } from '@/components/panel/VistaDisponibilidad'

export default async function PaginaDisponibilidad() {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol === 'repartidor') redirect('/panel')

  const carta = await obtenerCarta()

  return (
    <div className="flex flex-col gap-4">
      {perfil.rol === 'admin' && (
        <div className="flex gap-2">
          <Link href="/panel/carta/articulos" className="rounded-lg border border-neutral-700 px-3 py-2 text-sm">
            Editar artículos
          </Link>
          <Link href="/panel/carta/complementos" className="rounded-lg border border-neutral-700 px-3 py-2 text-sm">
            Editar complementos
          </Link>
        </div>
      )}
      <VistaDisponibilidad carta={carta} />
    </div>
  )
}
```

- [ ] **Step 8: Comprobar que compila y que el resto de tests del panel siguen en verde**

Run: `pnpm build && pnpm test`
Expected: compilación y tests sin errores.

- [ ] **Step 9: Commit**

```bash
git add src/components/panel/VistaDisponibilidad.tsx src/components/panel/VistaDisponibilidad.test.tsx \
  src/components/panel/NavPanel.tsx "src/app/panel/(protegido)/layout.tsx" "src/app/panel/(protegido)/carta/page.tsx"
git commit -m "Añade la pantalla de disponibilidad y la navegación del panel"
```

---

### Tarea 4: Fotos de artículos — Storage y subida

**Files:**
- Create: `supabase/migrations/0005_storage_carta.sql`
- Create: `src/lib/carta/imagen.ts`
- Modify: `src/lib/carta/escritura.ts`
- Create: `src/app/api/panel/carta/articulos/[id]/imagen/route.ts`
- Modify: `next.config.ts`
- Modify: `package.json` (añade `sharp`)

**Interfaces:**
- Produces: `recomprimirImagen(buffer: Buffer): Promise<Buffer>`; `actualizarImagenArticulo(id: string, imagenUrl: string): Promise<void>`; `POST /api/panel/carta/articulos/[id]/imagen`.

- [ ] **Step 1: Añadir `sharp` como dependencia**

```bash
pnpm add sharp
```

`sharp` ya está en la lista de paquetes que Next.js excluye automáticamente del bundling de Server Components (`serverExternalPackages` incluye `sharp` de fábrica), así que no hace falta tocar `next.config.ts` para esto.

- [ ] **Step 2: Migración del bucket de Storage**

Crear `supabase/migrations/0005_storage_carta.sql`:

```sql
-- Bucket público para las fotos de los artículos. Público de lectura: las
-- imágenes se muestran en la carta pública sin autenticación. La escritura
-- solo ocurre desde el servidor con la clave de servicio (endpoint de subida
-- del panel), que se salta cualquier política de storage.objects, así que no
-- hace falta declarar ninguna aquí.
insert into storage.buckets (id, name, public)
values ('carta', 'carta', true)
on conflict (id) do nothing;
```

Aplicar la migración contra el proyecto de Supabase Cloud ya conectado (confirmar con el usuario si hay dudas de a qué proyecto apunta `.env.local`):

```bash
pnpx supabase db push
```

- [ ] **Step 3: Módulo de recompresión de imagen**

Crear `src/lib/carta/imagen.ts`:

```ts
import sharp from 'sharp'

export const TAMANO_MAXIMO_SUBIDA_BYTES = 5 * 1024 * 1024
export const TIPOS_IMAGEN_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']

const ANCHO_MAXIMO_PX = 800

/**
 * Recomprime cualquier foto subida a un WEBP de como mucho 800px de ancho.
 * Una foto de móvil sin recomprimir puede pesar varios MB; servida así en la
 * carta pública, sería la mayor parte del peso de la página.
 */
export async function recomprimirImagen(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate() // respeta la orientación EXIF antes de perderla al recodificar
    .resize({ width: ANCHO_MAXIMO_PX, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()
}
```

- [ ] **Step 4: Añadir `actualizarImagenArticulo` a la escritura de carta**

Añadir a `src/lib/carta/escritura.ts`:

```ts
export async function actualizarImagenArticulo(id: string, imagenUrl: string): Promise<void> {
  const supabase = crearClienteServicio()
  const { error } = await supabase.from('articulos').update({ imagen_url: imagenUrl }).eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 5: Endpoint de subida**

Crear `src/app/api/panel/carta/articulos/[id]/imagen/route.ts`:

```ts
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { recomprimirImagen, TAMANO_MAXIMO_SUBIDA_BYTES, TIPOS_IMAGEN_PERMITIDOS } from '@/lib/carta/imagen'
import { actualizarImagenArticulo } from '@/lib/carta/escritura'
import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const formData = await req.formData()
  const archivo = formData.get('imagen')
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo de imagen' }, { status: 400 })
  }
  if (!TIPOS_IMAGEN_PERMITIDOS.includes(archivo.type)) {
    return NextResponse.json({ error: 'La imagen debe ser JPEG, PNG o WEBP' }, { status: 400 })
  }
  if (archivo.size > TAMANO_MAXIMO_SUBIDA_BYTES) {
    return NextResponse.json({ error: 'La imagen no puede superar los 5 MB' }, { status: 400 })
  }

  const bufferOriginal = Buffer.from(await archivo.arrayBuffer())
  const bufferComprimido = await recomprimirImagen(bufferOriginal)

  const supabase = crearClienteServicio()
  const ruta = `articulos/${id}-${randomUUID()}.webp`
  const { error: errorSubida } = await supabase.storage
    .from('carta')
    .upload(ruta, bufferComprimido, { contentType: 'image/webp', upsert: false })
  if (errorSubida) return NextResponse.json({ error: 'No se ha podido subir la imagen' }, { status: 500 })

  const { data: urlPublica } = supabase.storage.from('carta').getPublicUrl(ruta)
  await actualizarImagenArticulo(id, urlPublica.publicUrl)

  return NextResponse.json({ imagenUrl: urlPublica.publicUrl })
}
```

- [ ] **Step 6: Permitir el dominio de Storage en `next/image`**

Reemplazar `next.config.ts` por:

```ts
import type { NextConfig } from 'next'

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
      : [],
  },
}

export default nextConfig
```

- [ ] **Step 7: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores. El endpoint se ejerce desde el formulario de artículo en la Tarea 6.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/0005_storage_carta.sql src/lib/carta/imagen.ts src/lib/carta/escritura.ts \
  src/app/api/panel/carta/articulos next.config.ts package.json pnpm-lock.yaml
git commit -m "Añade Storage, recompresión y subida de fotos de artículo"
```

---

### Tarea 5: Artículos — escritura y endpoints

**Files:**
- Modify: `src/lib/carta/escritura.ts`
- Create: `src/app/api/panel/carta/articulos/route.ts`
- Create: `src/app/api/panel/carta/articulos/[id]/route.ts`

**Interfaces:**
- Produces: tipo `DatosArticulo`; `crearArticulo(datos): Promise<{ id: string }>`, `actualizarArticulo(id, datos): Promise<void>`, `eliminarArticulo(id): Promise<void>`, `listarCategorias(): Promise<{id,nombre}[]>`, `listarTamanos(): Promise<{id,nombre}[]>`, `listarExtrasBase(): Promise<{id,nombre}[]>`; `POST /api/panel/carta/articulos`, `PATCH /api/panel/carta/articulos/[id]`, `DELETE /api/panel/carta/articulos/[id]`.

- [ ] **Step 1: Añadir el CRUD de artículos a la escritura de carta**

Añadir a `src/lib/carta/escritura.ts` (junto al resto de imports, añadir `crearClienteServidor`):

```ts
import { crearClienteServidor } from '@/lib/supabase/cliente-servidor'
```

Y al final del fichero:

```ts
export type DatosArticulo = {
  nombre: string
  descripcion: string
  categoriaId: string
  tamanos: { tamanoId: string; precioCentimos: number; disponible: boolean }[]
  extraIds: string[]
}

export async function crearArticulo(datos: DatosArticulo): Promise<{ id: string }> {
  const supabase = crearClienteServicio()
  const { data: articulo, error } = await supabase
    .from('articulos')
    .insert({ nombre: datos.nombre, descripcion: datos.descripcion, categoria_id: datos.categoriaId })
    .select('id')
    .single()
  if (error) throw error

  if (datos.tamanos.length > 0) {
    const { error: errorTamanos } = await supabase.from('articulo_tamanos').insert(
      datos.tamanos.map((t) => ({
        articulo_id: articulo.id,
        tamano_id: t.tamanoId,
        precio_centimos: t.precioCentimos,
        disponible: t.disponible,
      })),
    )
    if (errorTamanos) throw errorTamanos
  }

  if (datos.extraIds.length > 0) {
    const { error: errorExtras } = await supabase
      .from('articulo_extras')
      .insert(datos.extraIds.map((extraId) => ({ articulo_id: articulo.id, extra_id: extraId })))
    if (errorExtras) throw errorExtras
  }

  return { id: articulo.id }
}

/**
 * Reconcilia tamaños y complementos borrando todas las filas del artículo y
 * reinsertando el conjunto nuevo, en vez de calcular un diff: el volumen por
 * artículo (como mucho unos pocos tamaños y complementos) hace que el coste
 * sea irrelevante, y es mucho más simple de razonar. Si el borrado o una
 * inserción posterior fallara a mitad, el artículo quedaría con menos
 * tamaños o complementos de los debidos hasta el siguiente guardado; no hay
 * pedidos de por medio en esta operación, así que el riesgo es solo de
 * carta, no económico.
 */
export async function actualizarArticulo(id: string, datos: DatosArticulo): Promise<void> {
  const supabase = crearClienteServicio()
  const { error } = await supabase
    .from('articulos')
    .update({ nombre: datos.nombre, descripcion: datos.descripcion, categoria_id: datos.categoriaId })
    .eq('id', id)
  if (error) throw error

  const { error: errorBorrarTamanos } = await supabase.from('articulo_tamanos').delete().eq('articulo_id', id)
  if (errorBorrarTamanos) throw errorBorrarTamanos
  if (datos.tamanos.length > 0) {
    const { error: errorTamanos } = await supabase.from('articulo_tamanos').insert(
      datos.tamanos.map((t) => ({
        articulo_id: id,
        tamano_id: t.tamanoId,
        precio_centimos: t.precioCentimos,
        disponible: t.disponible,
      })),
    )
    if (errorTamanos) throw errorTamanos
  }

  const { error: errorBorrarExtras } = await supabase.from('articulo_extras').delete().eq('articulo_id', id)
  if (errorBorrarExtras) throw errorBorrarExtras
  if (datos.extraIds.length > 0) {
    const { error: errorExtras } = await supabase
      .from('articulo_extras')
      .insert(datos.extraIds.map((extraId) => ({ articulo_id: id, extra_id: extraId })))
    if (errorExtras) throw errorExtras
  }
}

/**
 * Baja real, no un interruptor: `pedido_lineas.articulo_id` apunta con `on
 * delete set null` (migración 0003), así que los pedidos ya hechos conservan
 * su copia de nombre y precio aunque el artículo desaparezca de la carta.
 */
export async function eliminarArticulo(id: string): Promise<void> {
  const supabase = crearClienteServicio()
  const { error } = await supabase.from('articulos').delete().eq('id', id)
  if (error) throw error
}

export async function listarCategorias(): Promise<{ id: string; nombre: string }[]> {
  const supabase = crearClienteServidor()
  const { data, error } = await supabase.from('categorias').select('id, nombre').eq('activa', true).order('orden')
  if (error) throw error
  return data
}

export async function listarTamanos(): Promise<{ id: string; nombre: string }[]> {
  const supabase = crearClienteServidor()
  const { data, error } = await supabase.from('tamanos').select('id, nombre').order('orden')
  if (error) throw error
  return data
}

export async function listarExtrasBase(): Promise<{ id: string; nombre: string }[]> {
  const supabase = crearClienteServidor()
  const { data, error } = await supabase.from('extras').select('id, nombre').order('orden')
  if (error) throw error
  return data
}
```

- [ ] **Step 2: Endpoint de creación**

Crear `src/app/api/panel/carta/articulos/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { crearArticulo, type DatosArticulo } from '@/lib/carta/escritura'

export async function POST(req: Request) {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const datos = (await req.json()) as DatosArticulo
  const articulo = await crearArticulo(datos)
  return NextResponse.json(articulo, { status: 201 })
}
```

- [ ] **Step 3: Endpoints de actualización y baja**

Crear `src/app/api/panel/carta/articulos/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { actualizarArticulo, eliminarArticulo, type DatosArticulo } from '@/lib/carta/escritura'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const datos = (await req.json()) as DatosArticulo
  await actualizarArticulo(id, datos)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await eliminarArticulo(id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores. Los endpoints se ejercen desde el formulario de la Tarea 6.

- [ ] **Step 5: Commit**

```bash
git add src/lib/carta/escritura.ts src/app/api/panel/carta/articulos
git commit -m "Añade el CRUD de artículos"
```

---

### Tarea 6: Artículos — formulario y páginas

**Files:**
- Create: `src/components/panel/FormularioArticulo.tsx`
- Test: `src/components/panel/FormularioArticulo.test.tsx`
- Create: `src/app/panel/(protegido)/carta/articulos/page.tsx`
- Create: `src/app/panel/(protegido)/carta/articulos/nuevo/page.tsx`
- Create: `src/app/panel/(protegido)/carta/articulos/[id]/page.tsx`

**Interfaces:**
- Consumes: `DatosArticulo`, `listarCategorias`, `listarTamanos`, `listarExtrasBase` (de `@/lib/carta/escritura`), `obtenerCarta` (de `@/lib/carta/consultas`), `parsearPrecio` (de `@/lib/dinero`), `mensajeDeError` (de `@/lib/panel/erroresApi`).
- Produces: componente `FormularioArticulo({ categorias, tamanos, extras, articuloInicial? }): JSX`.

- [ ] **Step 1: Test que falla para `FormularioArticulo`**

Crear `src/components/panel/FormularioArticulo.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FormularioArticulo } from './FormularioArticulo'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))

const CATEGORIAS = [{ id: 'c-1', nombre: 'Clásicos a la plancha' }]
const TAMANOS = [
  { id: 't-b', nombre: 'Bocadillo' },
  { id: 't-m', nombre: 'Montado' },
]
const EXTRAS = [{ id: 'e-1', nombre: 'Queso' }]

beforeEach(() => {
  vi.restoreAllMocks()
  push.mockReset()
  refresh.mockReset()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 'a-nuevo' }) }))
})

describe('FormularioArticulo — alta', () => {
  it('no deja guardar sin ofrecer al menos un tamaño', async () => {
    render(<FormularioArticulo categorias={CATEGORIAS} tamanos={TAMANOS} extras={EXTRAS} />)
    await userEvent.type(screen.getByLabelText('Nombre'), 'Lomo')
    await userEvent.click(screen.getByRole('button', { name: 'Crear artículo' }))

    expect(screen.getByText('Ofrece el artículo en al menos un tamaño.')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('crea el artículo con los tamaños marcados y redirige a su edición', async () => {
    render(<FormularioArticulo categorias={CATEGORIAS} tamanos={TAMANOS} extras={EXTRAS} />)
    await userEvent.type(screen.getByLabelText('Nombre'), 'Lomo')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Bocadillo' }))
    await userEvent.type(screen.getByPlaceholderText('Precio (€)'), '5')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Queso' }))
    await userEvent.click(screen.getByRole('button', { name: 'Crear artículo' }))

    expect(fetch).toHaveBeenCalledWith(
      '/api/panel/carta/articulos',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Lomo',
          descripcion: '',
          categoriaId: 'c-1',
          tamanos: [{ tamanoId: 't-b', precioCentimos: 500, disponible: true }],
          extraIds: ['e-1'],
        }),
      }),
    )
    expect(push).toHaveBeenCalledWith('/panel/carta/articulos/a-nuevo')
  })
})

describe('FormularioArticulo — edición', () => {
  const ARTICULO_INICIAL = {
    id: 'a-1',
    nombre: 'Lomo',
    descripcion: 'Lomo jugoso',
    categoriaId: 'c-1',
    imagenUrl: null,
    tamanos: [{ tamanoId: 't-b', precioCentimos: 500, disponible: true }],
    extraIds: ['e-1'],
  }

  it('precarga los datos existentes y permite dar de baja', async () => {
    render(
      <FormularioArticulo categorias={CATEGORIAS} tamanos={TAMANOS} extras={EXTRAS} articuloInicial={ARTICULO_INICIAL} />,
    )
    expect(screen.getByLabelText('Nombre')).toHaveValue('Lomo')
    expect(screen.getByRole('checkbox', { name: 'Bocadillo' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Montado' })).not.toBeChecked()

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await userEvent.click(screen.getByRole('button', { name: 'Dar de baja' }))

    expect(fetch).toHaveBeenCalledWith('/api/panel/carta/articulos/a-1', expect.objectContaining({ method: 'DELETE' }))
    expect(push).toHaveBeenCalledWith('/panel/carta/articulos')
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `pnpm test FormularioArticulo`
Expected: FAIL — `FormularioArticulo` no existe todavía.

- [ ] **Step 3: Implementar `FormularioArticulo`**

Crear `src/components/panel/FormularioArticulo.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { mensajeDeError } from '@/lib/panel/erroresApi'
import { parsearPrecio } from '@/lib/dinero'

type Opcion = { id: string; nombre: string }

type TamanoFormulario = { tamanoId: string; ofrecido: boolean; precioTexto: string; disponible: boolean }

type ArticuloInicial = {
  id: string
  nombre: string
  descripcion: string
  categoriaId: string
  imagenUrl: string | null
  tamanos: { tamanoId: string; precioCentimos: number; disponible: boolean }[]
  extraIds: string[]
}

type Props = {
  categorias: Opcion[]
  tamanos: Opcion[]
  extras: Opcion[]
  articuloInicial?: ArticuloInicial
}

export function FormularioArticulo({ categorias, tamanos, extras, articuloInicial }: Props) {
  const router = useRouter()
  const editando = articuloInicial !== undefined

  const [nombre, setNombre] = useState(articuloInicial?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(articuloInicial?.descripcion ?? '')
  const [categoriaId, setCategoriaId] = useState(articuloInicial?.categoriaId ?? categorias[0]?.id ?? '')
  const [tamanosForm, setTamanosForm] = useState<TamanoFormulario[]>(
    tamanos.map((t) => {
      const existente = articuloInicial?.tamanos.find((at) => at.tamanoId === t.id)
      return {
        tamanoId: t.id,
        ofrecido: existente !== undefined,
        precioTexto: existente ? String(existente.precioCentimos / 100).replace('.', ',') : '',
        disponible: existente?.disponible ?? true,
      }
    }),
  )
  const [extraIds, setExtraIds] = useState<string[]>(articuloInicial?.extraIds ?? [])
  const [imagenUrl, setImagenUrl] = useState(articuloInicial?.imagenUrl ?? null)
  const [archivoImagen, setArchivoImagen] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function alternarTamano(tamanoId: string) {
    setTamanosForm((actual) => actual.map((t) => (t.tamanoId === tamanoId ? { ...t, ofrecido: !t.ofrecido } : t)))
  }

  function cambiarPrecioTamano(tamanoId: string, texto: string) {
    setTamanosForm((actual) => actual.map((t) => (t.tamanoId === tamanoId ? { ...t, precioTexto: texto } : t)))
  }

  function cambiarDisponibleTamano(tamanoId: string, disponible: boolean) {
    setTamanosForm((actual) => actual.map((t) => (t.tamanoId === tamanoId ? { ...t, disponible } : t)))
  }

  function alternarExtra(extraId: string) {
    setExtraIds((actual) => (actual.includes(extraId) ? actual.filter((id) => id !== extraId) : [...actual, extraId]))
  }

  async function guardar() {
    setError(null)

    const tamanosOfrecidos = tamanosForm.filter((t) => t.ofrecido)
    if (tamanosOfrecidos.length === 0) {
      setError('Ofrece el artículo en al menos un tamaño.')
      return
    }
    const tamanosConPrecio: { tamanoId: string; precioCentimos: number; disponible: boolean }[] = []
    for (const t of tamanosOfrecidos) {
      const precioCentimos = parsearPrecio(t.precioTexto)
      if (precioCentimos === null) {
        setError('Revisa los precios: deben ser números válidos.')
        return
      }
      tamanosConPrecio.push({ tamanoId: t.tamanoId, precioCentimos, disponible: t.disponible })
    }

    setGuardando(true)
    const datos = { nombre, descripcion, categoriaId, tamanos: tamanosConPrecio, extraIds }
    const respuesta = await fetch(
      editando ? `/api/panel/carta/articulos/${articuloInicial!.id}` : '/api/panel/carta/articulos',
      {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      },
    )
    if (!respuesta.ok) {
      setError(await mensajeDeError(respuesta))
      setGuardando(false)
      return
    }

    if (editando) {
      router.push('/panel/carta/articulos')
      router.refresh()
    } else {
      const creado = (await respuesta.json()) as { id: string }
      router.push(`/panel/carta/articulos/${creado.id}`)
    }
  }

  async function subirImagen() {
    if (!archivoImagen || !articuloInicial) return
    setError(null)
    setGuardando(true)
    const formData = new FormData()
    formData.append('imagen', archivoImagen)
    const respuesta = await fetch(`/api/panel/carta/articulos/${articuloInicial.id}/imagen`, {
      method: 'POST',
      body: formData,
    })
    if (respuesta.ok) {
      const cuerpo = (await respuesta.json()) as { imagenUrl: string }
      setImagenUrl(cuerpo.imagenUrl)
      setArchivoImagen(null)
    } else {
      setError(await mensajeDeError(respuesta))
    }
    setGuardando(false)
  }

  async function eliminar() {
    if (!articuloInicial) return
    if (!window.confirm(`¿Dar de baja «${articuloInicial.nombre}»? Esta acción no se puede deshacer.`)) return
    setGuardando(true)
    const respuesta = await fetch(`/api/panel/carta/articulos/${articuloInicial.id}`, { method: 'DELETE' })
    if (respuesta.ok) {
      router.push('/panel/carta/articulos')
      router.refresh()
    } else {
      setError(await mensajeDeError(respuesta))
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <label className="flex flex-col gap-1">
        <span>Nombre</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span>Descripción</span>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span>Categoría</span>
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
        >
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>

      {editando ? (
        <div className="flex flex-col gap-2">
          <span>Foto</span>
          <div className="relative h-32 w-32 overflow-hidden rounded-lg bg-amber-900/30">
            {imagenUrl && <Image src={imagenUrl} alt="" fill sizes="128px" className="object-cover" />}
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setArchivoImagen(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            disabled={!archivoImagen || guardando}
            onClick={subirImagen}
            className="self-start rounded-lg border border-neutral-700 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Subir foto
          </button>
        </div>
      ) : (
        <p className="text-sm text-neutral-400">Podrás añadir la foto después de crear el artículo.</p>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide">Tamaños</legend>
        {tamanosForm.map((t) => {
          const nombreTamano = tamanos.find((tam) => tam.id === t.tamanoId)?.nombre ?? ''
          return (
            <div key={t.tamanoId} className="flex items-center gap-3 rounded-lg border border-neutral-700 p-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={t.ofrecido} onChange={() => alternarTamano(t.tamanoId)} />
                {nombreTamano}
              </label>
              {t.ofrecido && (
                <>
                  <input
                    value={t.precioTexto}
                    onChange={(e) => cambiarPrecioTamano(t.tamanoId, e.target.value)}
                    placeholder="Precio (€)"
                    className="w-24 rounded-lg border border-neutral-700 bg-neutral-800 p-2"
                  />
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={t.disponible}
                      onChange={(e) => cambiarDisponibleTamano(t.tamanoId, e.target.checked)}
                    />
                    Disponible
                  </label>
                </>
              )}
            </div>
          )
        })}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide">Complementos</legend>
        {extras.map((extra) => (
          <label key={extra.id} className="flex items-center gap-2">
            <input type="checkbox" checked={extraIds.includes(extra.id)} onChange={() => alternarExtra(extra.id)} />
            {extra.nombre}
          </label>
        ))}
      </fieldset>

      {error && <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={guardando || !nombre}
          onClick={guardar}
          className="h-12 flex-1 rounded-xl bg-amber-500 font-bold text-neutral-950 disabled:opacity-40"
        >
          {editando ? 'Guardar cambios' : 'Crear artículo'}
        </button>
        {editando && (
          <button
            type="button"
            disabled={guardando}
            onClick={eliminar}
            className="h-12 rounded-xl border border-neutral-700 px-4 font-semibold text-amber-400 disabled:opacity-40"
          >
            Dar de baja
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `pnpm test FormularioArticulo`
Expected: PASS.

- [ ] **Step 5: Páginas de listado, alta y edición**

Crear `src/app/panel/(protegido)/carta/articulos/page.tsx`:

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { obtenerCarta } from '@/lib/carta/consultas'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'

export default async function PaginaListadoArticulos() {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol !== 'admin') redirect('/panel/carta')

  const carta = await obtenerCarta()

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/panel/carta/articulos/nuevo"
        className="self-start rounded-lg bg-amber-500 px-4 py-2 font-bold text-neutral-950"
      >
        Nuevo artículo
      </Link>
      {carta.categorias.map((categoria) => (
        <section key={categoria.id}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">{categoria.nombre}</h2>
          <ul className="flex flex-col gap-2">
            {categoria.articulos.map((articulo) => (
              <li key={articulo.id}>
                <Link
                  href={`/panel/carta/articulos/${articulo.id}`}
                  className="block rounded-lg border border-neutral-700 p-3"
                >
                  {articulo.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
```

Crear `src/app/panel/(protegido)/carta/articulos/nuevo/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarCategorias, listarExtrasBase, listarTamanos } from '@/lib/carta/escritura'
import { FormularioArticulo } from '@/components/panel/FormularioArticulo'

export default async function PaginaNuevoArticulo() {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol !== 'admin') redirect('/panel/carta')

  const [categorias, tamanos, extras] = await Promise.all([listarCategorias(), listarTamanos(), listarExtrasBase()])

  return <FormularioArticulo categorias={categorias} tamanos={tamanos} extras={extras} />
}
```

Crear `src/app/panel/(protegido)/carta/articulos/[id]/page.tsx`:

```tsx
import { notFound, redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarCategorias, listarExtrasBase, listarTamanos } from '@/lib/carta/escritura'
import { obtenerCarta } from '@/lib/carta/consultas'
import { FormularioArticulo } from '@/components/panel/FormularioArticulo'

export default async function PaginaEditarArticulo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol !== 'admin') redirect('/panel/carta')

  const [categorias, tamanos, extras, carta] = await Promise.all([
    listarCategorias(),
    listarTamanos(),
    listarExtrasBase(),
    obtenerCarta(),
  ])
  const articulo = carta.categorias.flatMap((c) => c.articulos).find((a) => a.id === id)
  if (!articulo) notFound()
  const categoria = carta.categorias.find((c) => c.articulos.some((a) => a.id === id))!

  return (
    <FormularioArticulo
      categorias={categorias}
      tamanos={tamanos}
      extras={extras}
      articuloInicial={{
        id: articulo.id,
        nombre: articulo.nombre,
        descripcion: articulo.descripcion,
        categoriaId: categoria.id,
        imagenUrl: articulo.imagenUrl,
        tamanos: articulo.tamanos.map((t) => ({
          tamanoId: t.id,
          precioCentimos: t.precioCentimos,
          disponible: t.disponible,
        })),
        extraIds: articulo.extras.map((e) => e.id),
      }}
    />
  )
}
```

- [ ] **Step 6: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/components/panel/FormularioArticulo.tsx src/components/panel/FormularioArticulo.test.tsx \
  "src/app/panel/(protegido)/carta/articulos"
git commit -m "Añade el formulario y las páginas de alta y edición de artículos"
```

---

### Tarea 7: Complementos — escritura y endpoints

**Files:**
- Modify: `src/lib/carta/escritura.ts`
- Create: `src/app/api/panel/carta/complementos/route.ts`
- Create: `src/app/api/panel/carta/complementos/[id]/route.ts`

**Interfaces:**
- Produces: tipo `DatosComplemento`; `crearExtra(datos): Promise<{id}>`, `actualizarExtra(id, datos): Promise<void>`, `eliminarExtra(id): Promise<void>`, `listarExtrasCompletos(): Promise<{id,nombre,descripcion,preciosPorTamanoId}[]>`; `POST /api/panel/carta/complementos`, `PATCH /api/panel/carta/complementos/[id]`, `DELETE /api/panel/carta/complementos/[id]`.

- [ ] **Step 1: Añadir el CRUD de complementos a la escritura de carta**

Añadir al final de `src/lib/carta/escritura.ts`:

```ts
export type DatosComplemento = {
  nombre: string
  descripcion: string
  /** Solo los tamaños en los que se ofrece el complemento. */
  preciosPorTamanoId: Record<string, number>
}

export async function crearExtra(datos: DatosComplemento): Promise<{ id: string }> {
  const supabase = crearClienteServicio()
  const { data: extra, error } = await supabase
    .from('extras')
    .insert({ nombre: datos.nombre, descripcion: datos.descripcion })
    .select('id')
    .single()
  if (error) throw error

  const filas = Object.entries(datos.preciosPorTamanoId).map(([tamanoId, precioCentimos]) => ({
    extra_id: extra.id,
    tamano_id: tamanoId,
    precio_centimos: precioCentimos,
  }))
  if (filas.length > 0) {
    const { error: errorPrecios } = await supabase.from('extra_precios').insert(filas)
    if (errorPrecios) throw errorPrecios
  }

  return { id: extra.id }
}

export async function actualizarExtra(id: string, datos: DatosComplemento): Promise<void> {
  const supabase = crearClienteServicio()
  const { error } = await supabase
    .from('extras')
    .update({ nombre: datos.nombre, descripcion: datos.descripcion })
    .eq('id', id)
  if (error) throw error

  const { error: errorBorrar } = await supabase.from('extra_precios').delete().eq('extra_id', id)
  if (errorBorrar) throw errorBorrar
  const filas = Object.entries(datos.preciosPorTamanoId).map(([tamanoId, precioCentimos]) => ({
    extra_id: id,
    tamano_id: tamanoId,
    precio_centimos: precioCentimos,
  }))
  if (filas.length > 0) {
    const { error: errorPrecios } = await supabase.from('extra_precios').insert(filas)
    if (errorPrecios) throw errorPrecios
  }
}

/** Baja real: `pedido_extras.extra_id` apunta con `on delete set null` (migración 0003). */
export async function eliminarExtra(id: string): Promise<void> {
  const supabase = crearClienteServicio()
  const { error } = await supabase.from('extras').delete().eq('id', id)
  if (error) throw error
}

export async function listarExtrasCompletos(): Promise<
  { id: string; nombre: string; descripcion: string; preciosPorTamanoId: Record<string, number> }[]
> {
  const supabase = crearClienteServidor()
  const { data, error } = await supabase
    .from('extras')
    .select('id, nombre, descripcion, extra_precios ( tamano_id, precio_centimos )')
    .order('orden')
  if (error) throw error
  return data.map((extra) => ({
    id: extra.id,
    nombre: extra.nombre,
    descripcion: extra.descripcion,
    preciosPorTamanoId: Object.fromEntries(extra.extra_precios.map((p) => [p.tamano_id, p.precio_centimos])),
  }))
}
```

- [ ] **Step 2: Endpoint de creación**

Crear `src/app/api/panel/carta/complementos/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { crearExtra, type DatosComplemento } from '@/lib/carta/escritura'

export async function POST(req: Request) {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const datos = (await req.json()) as DatosComplemento
  const extra = await crearExtra(datos)
  return NextResponse.json(extra, { status: 201 })
}
```

- [ ] **Step 3: Endpoints de actualización y baja**

Crear `src/app/api/panel/carta/complementos/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { actualizarExtra, eliminarExtra, type DatosComplemento } from '@/lib/carta/escritura'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const datos = (await req.json()) as DatosComplemento
  await actualizarExtra(id, datos)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await eliminarExtra(id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/lib/carta/escritura.ts src/app/api/panel/carta/complementos
git commit -m "Añade el CRUD de complementos"
```

---

### Tarea 8: Complementos — formulario y páginas

**Files:**
- Create: `src/components/panel/FormularioComplemento.tsx`
- Test: `src/components/panel/FormularioComplemento.test.tsx`
- Create: `src/app/panel/(protegido)/carta/complementos/page.tsx`
- Create: `src/app/panel/(protegido)/carta/complementos/nuevo/page.tsx`
- Create: `src/app/panel/(protegido)/carta/complementos/[id]/page.tsx`

**Interfaces:**
- Consumes: `DatosComplemento`, `listarExtrasCompletos`, `listarTamanos` (de `@/lib/carta/escritura`), `parsearPrecio` (de `@/lib/dinero`), `mensajeDeError` (de `@/lib/panel/erroresApi`).
- Produces: componente `FormularioComplemento({ tamanos, complementoInicial? }): JSX`.

- [ ] **Step 1: Test que falla para `FormularioComplemento`**

Crear `src/components/panel/FormularioComplemento.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FormularioComplemento } from './FormularioComplemento'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))

const TAMANOS = [
  { id: 't-b', nombre: 'Bocadillo' },
  { id: 't-m', nombre: 'Montado' },
  { id: 't-u', nombre: 'Único' },
]

beforeEach(() => {
  vi.restoreAllMocks()
  push.mockReset()
  refresh.mockReset()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 'e-nuevo' }) }))
})

describe('FormularioComplemento', () => {
  it('no deja guardar sin precio en ningún tamaño', async () => {
    render(<FormularioComplemento tamanos={TAMANOS} />)
    await userEvent.type(screen.getByLabelText('Nombre'), 'Queso')
    await userEvent.click(screen.getByRole('button', { name: 'Crear complemento' }))

    expect(screen.getByText('Pon precio para al menos un tamaño.')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('crea el complemento solo con los tamaños que tienen precio', async () => {
    render(<FormularioComplemento tamanos={TAMANOS} />)
    await userEvent.type(screen.getByLabelText('Nombre'), 'Queso')
    await userEvent.type(screen.getByLabelText('Bocadillo'), '1')
    await userEvent.type(screen.getByLabelText('Montado'), '0,50')
    await userEvent.click(screen.getByRole('button', { name: 'Crear complemento' }))

    expect(fetch).toHaveBeenCalledWith(
      '/api/panel/carta/complementos',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Queso',
          descripcion: '',
          preciosPorTamanoId: { 't-b': 100, 't-m': 50 },
        }),
      }),
    )
    expect(push).toHaveBeenCalledWith('/panel/carta/complementos')
  })

  it('en edición, precarga los precios existentes', () => {
    render(
      <FormularioComplemento
        tamanos={TAMANOS}
        complementoInicial={{ id: 'e-1', nombre: 'Queso', descripcion: '', preciosPorTamanoId: { 't-b': 100 } }}
      />,
    )
    expect(screen.getByLabelText('Bocadillo')).toHaveValue('1')
    expect(screen.getByLabelText('Montado')).toHaveValue('')
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `pnpm test FormularioComplemento`
Expected: FAIL — `FormularioComplemento` no existe todavía.

- [ ] **Step 3: Implementar `FormularioComplemento`**

Crear `src/components/panel/FormularioComplemento.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { mensajeDeError } from '@/lib/panel/erroresApi'
import { parsearPrecio } from '@/lib/dinero'

type Opcion = { id: string; nombre: string }

type ComplementoInicial = {
  id: string
  nombre: string
  descripcion: string
  preciosPorTamanoId: Record<string, number>
}

type Props = { tamanos: Opcion[]; complementoInicial?: ComplementoInicial }

export function FormularioComplemento({ tamanos, complementoInicial }: Props) {
  const router = useRouter()
  const editando = complementoInicial !== undefined

  const [nombre, setNombre] = useState(complementoInicial?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(complementoInicial?.descripcion ?? '')
  const [precios, setPrecios] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {}
    for (const tamano of tamanos) {
      const centimos = complementoInicial?.preciosPorTamanoId[tamano.id]
      inicial[tamano.id] = centimos !== undefined ? String(centimos / 100).replace('.', ',') : ''
    }
    return inicial
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    setError(null)
    const preciosPorTamanoId: Record<string, number> = {}
    for (const tamano of tamanos) {
      const texto = precios[tamano.id]
      if (texto.trim() === '') continue
      const centimos = parsearPrecio(texto)
      if (centimos === null) {
        setError('Revisa los precios: deben ser números válidos.')
        return
      }
      preciosPorTamanoId[tamano.id] = centimos
    }
    if (Object.keys(preciosPorTamanoId).length === 0) {
      setError('Pon precio para al menos un tamaño.')
      return
    }

    setGuardando(true)
    const datos = { nombre, descripcion, preciosPorTamanoId }
    const respuesta = await fetch(
      editando ? `/api/panel/carta/complementos/${complementoInicial!.id}` : '/api/panel/carta/complementos',
      {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      },
    )
    if (respuesta.ok) {
      router.push('/panel/carta/complementos')
      router.refresh()
    } else {
      setError(await mensajeDeError(respuesta))
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!complementoInicial) return
    if (!window.confirm(`¿Dar de baja «${complementoInicial.nombre}»? Esta acción no se puede deshacer.`)) return
    setGuardando(true)
    const respuesta = await fetch(`/api/panel/carta/complementos/${complementoInicial.id}`, { method: 'DELETE' })
    if (respuesta.ok) {
      router.push('/panel/carta/complementos')
      router.refresh()
    } else {
      setError(await mensajeDeError(respuesta))
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <label className="flex flex-col gap-1">
        <span>Nombre</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span>Descripción</span>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
        />
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide">
          Precio por tamaño (vacío = no se ofrece)
        </legend>
        {tamanos.map((tamano) => (
          <label key={tamano.id} className="flex items-center justify-between gap-3">
            <span>{tamano.nombre}</span>
            <input
              aria-label={tamano.nombre}
              value={precios[tamano.id]}
              onChange={(e) => setPrecios((actual) => ({ ...actual, [tamano.id]: e.target.value }))}
              placeholder="€"
              className="w-24 rounded-lg border border-neutral-700 bg-neutral-800 p-2"
            />
          </label>
        ))}
      </fieldset>

      {error && <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={guardando || !nombre}
          onClick={guardar}
          className="h-12 flex-1 rounded-xl bg-amber-500 font-bold text-neutral-950 disabled:opacity-40"
        >
          {editando ? 'Guardar cambios' : 'Crear complemento'}
        </button>
        {editando && (
          <button
            type="button"
            disabled={guardando}
            onClick={eliminar}
            className="h-12 rounded-xl border border-neutral-700 px-4 font-semibold text-amber-400 disabled:opacity-40"
          >
            Dar de baja
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `pnpm test FormularioComplemento`
Expected: PASS.

- [ ] **Step 5: Páginas de listado, alta y edición**

Crear `src/app/panel/(protegido)/carta/complementos/page.tsx`:

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarExtrasCompletos } from '@/lib/carta/escritura'

export default async function PaginaListadoComplementos() {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol !== 'admin') redirect('/panel/carta')

  const extras = await listarExtrasCompletos()

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/panel/carta/complementos/nuevo"
        className="self-start rounded-lg bg-amber-500 px-4 py-2 font-bold text-neutral-950"
      >
        Nuevo complemento
      </Link>
      <ul className="flex flex-col gap-2">
        {extras.map((extra) => (
          <li key={extra.id}>
            <Link
              href={`/panel/carta/complementos/${extra.id}`}
              className="block rounded-lg border border-neutral-700 p-3"
            >
              {extra.nombre}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

Crear `src/app/panel/(protegido)/carta/complementos/nuevo/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarTamanos } from '@/lib/carta/escritura'
import { FormularioComplemento } from '@/components/panel/FormularioComplemento'

export default async function PaginaNuevoComplemento() {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol !== 'admin') redirect('/panel/carta')

  const tamanos = await listarTamanos()
  return <FormularioComplemento tamanos={tamanos} />
}
```

Crear `src/app/panel/(protegido)/carta/complementos/[id]/page.tsx`:

```tsx
import { notFound, redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarExtrasCompletos, listarTamanos } from '@/lib/carta/escritura'
import { FormularioComplemento } from '@/components/panel/FormularioComplemento'

export default async function PaginaEditarComplemento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol !== 'admin') redirect('/panel/carta')

  const [tamanos, extras] = await Promise.all([listarTamanos(), listarExtrasCompletos()])
  const extra = extras.find((e) => e.id === id)
  if (!extra) notFound()

  return <FormularioComplemento tamanos={tamanos} complementoInicial={extra} />
}
```

- [ ] **Step 6: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/components/panel/FormularioComplemento.tsx src/components/panel/FormularioComplemento.test.tsx \
  "src/app/panel/(protegido)/carta/complementos"
git commit -m "Añade el formulario y las páginas de alta y edición de complementos"
```

---

### Tarea 9: Ajustes — lectura, escritura y endpoint

**Files:**
- Create: `src/lib/ajustes/index.ts`
- Create: `src/app/api/panel/ajustes/route.ts`

**Interfaces:**
- Consumes: `HorarioSemanal` (de `@/lib/horario/tipos`), `TablesUpdate` (de `@/lib/supabase/tipos-bd`), `umbralesValidos` (de `@/lib/precios`).
- Produces: tipo `Ajustes`; `obtenerAjustes(): Promise<Ajustes>`, `actualizarAjustes(datos: Ajustes): Promise<void>`; `PATCH /api/panel/ajustes`.

- [ ] **Step 1: Módulo de lectura y escritura de ajustes**

Crear `src/lib/ajustes/index.ts`:

```ts
import { crearClienteServidor } from '@/lib/supabase/cliente-servidor'
import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'
import type { HorarioSemanal } from '@/lib/horario/tipos'
import type { TablesUpdate } from '@/lib/supabase/tipos-bd'

export type Ajustes = {
  nombreRestaurante: string
  telefono: string
  direccion: string
  horario: HorarioSemanal
  envioCentimos: number
  pedidoMinimoCentimos: number
  envioGratisDesdeCentimos: number | null
  antelacionMinimaMin: number
  duracionFranjaMin: number
}

export async function obtenerAjustes(): Promise<Ajustes> {
  const supabase = crearClienteServidor()
  const { data, error } = await supabase.from('ajustes').select('*').single()
  if (error) throw error

  return {
    nombreRestaurante: data.nombre_restaurante,
    telefono: data.telefono,
    direccion: data.direccion,
    horario: data.horario as unknown as HorarioSemanal,
    envioCentimos: data.envio_centimos,
    pedidoMinimoCentimos: data.pedido_minimo_centimos,
    envioGratisDesdeCentimos: data.envio_gratis_desde_centimos,
    antelacionMinimaMin: data.antelacion_minima_min,
    duracionFranjaMin: data.duracion_franja_min,
  }
}

export async function actualizarAjustes(datos: Ajustes): Promise<void> {
  const cambios: TablesUpdate<'ajustes'> = {
    nombre_restaurante: datos.nombreRestaurante,
    telefono: datos.telefono,
    direccion: datos.direccion,
    horario: datos.horario,
    envio_centimos: datos.envioCentimos,
    pedido_minimo_centimos: datos.pedidoMinimoCentimos,
    envio_gratis_desde_centimos: datos.envioGratisDesdeCentimos,
    antelacion_minima_min: datos.antelacionMinimaMin,
    duracion_franja_min: datos.duracionFranjaMin,
  }
  const supabase = crearClienteServicio()
  const { error } = await supabase.from('ajustes').update(cambios).eq('id', true)
  if (error) throw error
}
```

- [ ] **Step 2: Endpoint de actualización**

Crear `src/app/api/panel/ajustes/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { actualizarAjustes, type Ajustes } from '@/lib/ajustes'
import { umbralesValidos } from '@/lib/precios'

export async function PATCH(req: Request) {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const datos = (await req.json()) as Ajustes
  if (!umbralesValidos(datos.pedidoMinimoCentimos, datos.envioGratisDesdeCentimos)) {
    return NextResponse.json(
      { error: 'El envío gratis debe activarse a partir de un importe mayor que el pedido mínimo' },
      { status: 400 },
    )
  }

  await actualizarAjustes(datos)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores. El endpoint se ejerce desde el formulario de la Tarea 10.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ajustes src/app/api/panel/ajustes
git commit -m "Añade la lectura y escritura de ajustes"
```

---

### Tarea 10: Ajustes — formulario, vista de solo lectura, página y navegación

**Files:**
- Create: `src/components/panel/FormularioAjustes.tsx`
- Test: `src/components/panel/FormularioAjustes.test.tsx`
- Create: `src/components/panel/VistaAjustesSoloLectura.tsx`
- Create: `src/app/panel/(protegido)/ajustes/page.tsx`
- Modify: `src/components/panel/NavPanel.tsx`

**Interfaces:**
- Consumes: `Ajustes` (de `@/lib/ajustes`), `parsearPrecio` (de `@/lib/dinero`), `umbralesValidos` (de `@/lib/precios`), `mensajeDeError` (de `@/lib/panel/erroresApi`), `HorarioSemanal`, `TramoHorario` (de `@/lib/horario/tipos`).
- Produces: componente `FormularioAjustes({ ajustesIniciales }): JSX`; componente `VistaAjustesSoloLectura({ ajustes }): JSX`.

- [ ] **Step 1: Test que falla para `FormularioAjustes`**

Crear `src/components/panel/FormularioAjustes.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FormularioAjustes } from './FormularioAjustes'
import type { Ajustes } from '@/lib/ajustes'

const SIN_TRAMOS = { lunes: [], martes: [], miercoles: [], jueves: [], viernes: [], sabado: [], domingo: [] }

const AJUSTES: Ajustes = {
  nombreRestaurante: 'El Horno del Caserón',
  telefono: '916780435',
  direccion: 'C. Hierro, 73, Torrejón de Ardoz',
  horario: { ...SIN_TRAMOS, jueves: [{ desde: '13:00', hasta: '16:00' }] },
  envioCentimos: 200,
  pedidoMinimoCentimos: 1000,
  envioGratisDesdeCentimos: 2000,
  antelacionMinimaMin: 30,
  duracionFranjaMin: 30,
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) }))
})

describe('FormularioAjustes', () => {
  it('precarga los importes en euros', () => {
    render(<FormularioAjustes ajustesIniciales={AJUSTES} />)
    expect(screen.getByLabelText('Coste de envío (€)')).toHaveValue('2')
    expect(screen.getByLabelText('Pedido mínimo a domicilio (€)')).toHaveValue('10')
  })

  it('avisa si el envío gratis no supera el pedido mínimo', async () => {
    render(<FormularioAjustes ajustesIniciales={AJUSTES} />)
    const campoEnvioGratis = screen.getByLabelText('Envío gratis desde (€)')
    await userEvent.clear(campoEnvioGratis)
    await userEvent.type(campoEnvioGratis, '5')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar ajustes' }))

    expect(
      screen.getByText('El envío gratis debe activarse a partir de un importe mayor que el pedido mínimo.'),
    ).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('guarda los ajustes válidos', async () => {
    render(<FormularioAjustes ajustesIniciales={AJUSTES} />)
    await userEvent.click(screen.getByRole('button', { name: 'Guardar ajustes' }))

    expect(fetch).toHaveBeenCalledWith(
      '/api/panel/ajustes',
      expect.objectContaining({ method: 'PATCH' }),
    )
    expect(await screen.findByText('Ajustes guardados.')).toBeInTheDocument()
  })

  it('añade y quita tramos de un día', async () => {
    render(<FormularioAjustes ajustesIniciales={AJUSTES} />)
    expect(screen.getAllByRole('button', { name: 'Quitar' })).toHaveLength(1)

    await userEvent.click(screen.getAllByRole('button', { name: 'Añadir tramo' })[3]) // jueves es el 4º día
    expect(screen.getAllByRole('button', { name: 'Quitar' })).toHaveLength(2)

    await userEvent.click(screen.getAllByRole('button', { name: 'Quitar' })[0])
    expect(screen.getAllByRole('button', { name: 'Quitar' })).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `pnpm test FormularioAjustes`
Expected: FAIL — `FormularioAjustes` no existe todavía.

- [ ] **Step 3: Implementar `FormularioAjustes`**

Crear `src/components/panel/FormularioAjustes.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { mensajeDeError } from '@/lib/panel/erroresApi'
import { parsearPrecio } from '@/lib/dinero'
import { umbralesValidos } from '@/lib/precios'
import type { Ajustes } from '@/lib/ajustes'
import type { HorarioSemanal, TramoHorario } from '@/lib/horario/tipos'

const DIAS: { clave: keyof HorarioSemanal; etiqueta: string }[] = [
  { clave: 'lunes', etiqueta: 'Lunes' },
  { clave: 'martes', etiqueta: 'Martes' },
  { clave: 'miercoles', etiqueta: 'Miércoles' },
  { clave: 'jueves', etiqueta: 'Jueves' },
  { clave: 'viernes', etiqueta: 'Viernes' },
  { clave: 'sabado', etiqueta: 'Sábado' },
  { clave: 'domingo', etiqueta: 'Domingo' },
]

function euros(centimos: number): string {
  return String(centimos / 100).replace('.', ',')
}

type Props = { ajustesIniciales: Ajustes }

export function FormularioAjustes({ ajustesIniciales }: Props) {
  const [ajustes, setAjustes] = useState(ajustesIniciales)
  const [envioGratisActivo, setEnvioGratisActivo] = useState(ajustesIniciales.envioGratisDesdeCentimos !== null)
  const [textoEnvio, setTextoEnvio] = useState(euros(ajustesIniciales.envioCentimos))
  const [textoMinimo, setTextoMinimo] = useState(euros(ajustesIniciales.pedidoMinimoCentimos))
  const [textoEnvioGratis, setTextoEnvioGratis] = useState(
    ajustesIniciales.envioGratisDesdeCentimos !== null ? euros(ajustesIniciales.envioGratisDesdeCentimos) : '',
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)

  function actualizarTramo(dia: keyof HorarioSemanal, indice: number, campo: keyof TramoHorario, valor: string) {
    setAjustes((actual) => ({
      ...actual,
      horario: {
        ...actual.horario,
        [dia]: actual.horario[dia].map((tramo, i) => (i === indice ? { ...tramo, [campo]: valor } : tramo)),
      },
    }))
  }

  function anadirTramo(dia: keyof HorarioSemanal) {
    setAjustes((actual) => ({
      ...actual,
      horario: { ...actual.horario, [dia]: [...actual.horario[dia], { desde: '13:00', hasta: '16:00' }] },
    }))
  }

  function quitarTramo(dia: keyof HorarioSemanal, indice: number) {
    setAjustes((actual) => ({
      ...actual,
      horario: { ...actual.horario, [dia]: actual.horario[dia].filter((_, i) => i !== indice) },
    }))
  }

  async function guardar() {
    setError(null)
    setGuardado(false)

    const envioCentimos = parsearPrecio(textoEnvio)
    const pedidoMinimoCentimos = parsearPrecio(textoMinimo)
    const envioGratisDesdeCentimos = envioGratisActivo ? parsearPrecio(textoEnvioGratis) : null
    if (
      envioCentimos === null ||
      pedidoMinimoCentimos === null ||
      (envioGratisActivo && envioGratisDesdeCentimos === null)
    ) {
      setError('Revisa los importes: deben ser números válidos.')
      return
    }
    if (!umbralesValidos(pedidoMinimoCentimos, envioGratisDesdeCentimos)) {
      setError('El envío gratis debe activarse a partir de un importe mayor que el pedido mínimo.')
      return
    }
    for (const dia of DIAS) {
      for (const tramo of ajustes.horario[dia.clave]) {
        if (tramo.desde >= tramo.hasta) {
          setError(`En ${dia.etiqueta}, cada tramo debe terminar después de empezar.`)
          return
        }
      }
    }

    const datos: Ajustes = { ...ajustes, envioCentimos, pedidoMinimoCentimos, envioGratisDesdeCentimos }

    setGuardando(true)
    const respuesta = await fetch('/api/panel/ajustes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    })
    if (respuesta.ok) {
      setAjustes(datos)
      setGuardado(true)
    } else {
      setError(await mensajeDeError(respuesta))
    }
    setGuardando(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide">Restaurante</legend>
        <label className="flex flex-col gap-1">
          <span>Nombre</span>
          <input
            value={ajustes.nombreRestaurante}
            onChange={(e) => setAjustes((a) => ({ ...a, nombreRestaurante: e.target.value }))}
            className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Teléfono</span>
          <input
            value={ajustes.telefono}
            onChange={(e) => setAjustes((a) => ({ ...a, telefono: e.target.value }))}
            className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Dirección</span>
          <input
            value={ajustes.direccion}
            onChange={(e) => setAjustes((a) => ({ ...a, direccion: e.target.value }))}
            className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
          />
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide">Horario semanal</legend>
        {DIAS.map((dia) => (
          <div key={dia.clave} className="flex flex-col gap-2">
            <p className="font-medium">{dia.etiqueta}</p>
            {ajustes.horario[dia.clave].length === 0 && <p className="text-sm text-neutral-500">Cerrado</p>}
            {ajustes.horario[dia.clave].map((tramo, indice) => (
              <div key={indice} className="flex items-center gap-2">
                <input
                  type="time"
                  value={tramo.desde}
                  onChange={(e) => actualizarTramo(dia.clave, indice, 'desde', e.target.value)}
                  className="rounded-lg border border-neutral-700 bg-neutral-800 p-2"
                />
                <span>–</span>
                <input
                  type="time"
                  value={tramo.hasta}
                  onChange={(e) => actualizarTramo(dia.clave, indice, 'hasta', e.target.value)}
                  className="rounded-lg border border-neutral-700 bg-neutral-800 p-2"
                />
                <button
                  type="button"
                  onClick={() => quitarTramo(dia.clave, indice)}
                  className="text-sm text-amber-400"
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => anadirTramo(dia.clave)}
              className="self-start rounded-lg border border-neutral-700 px-3 py-1.5 text-sm"
            >
              Añadir tramo
            </button>
          </div>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide">Reglas del pedido</legend>
        <label className="flex flex-col gap-1">
          <span>Coste de envío (€)</span>
          <input
            value={textoEnvio}
            onChange={(e) => setTextoEnvio(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Pedido mínimo a domicilio (€)</span>
          <input
            value={textoMinimo}
            onChange={(e) => setTextoMinimo(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
          />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={envioGratisActivo} onChange={(e) => setEnvioGratisActivo(e.target.checked)} />
          <span>Envío gratis a partir de un importe</span>
        </label>
        {envioGratisActivo && (
          <label className="flex flex-col gap-1">
            <span>Envío gratis desde (€)</span>
            <input
              value={textoEnvioGratis}
              onChange={(e) => setTextoEnvioGratis(e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
            />
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span>Antelación mínima (minutos)</span>
          <input
            type="number"
            value={ajustes.antelacionMinimaMin}
            onChange={(e) => setAjustes((a) => ({ ...a, antelacionMinimaMin: Number(e.target.value) }))}
            className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Duración de cada franja (minutos)</span>
          <input
            type="number"
            value={ajustes.duracionFranjaMin}
            onChange={(e) => setAjustes((a) => ({ ...a, duracionFranjaMin: Number(e.target.value) }))}
            className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
          />
        </label>
      </fieldset>

      {error && <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">{error}</p>}
      {guardado && <p className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400">Ajustes guardados.</p>}

      <button
        type="button"
        disabled={guardando}
        onClick={guardar}
        className="h-14 rounded-xl bg-amber-500 text-lg font-bold text-neutral-950 disabled:opacity-40"
      >
        Guardar ajustes
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `pnpm test FormularioAjustes`
Expected: PASS.

- [ ] **Step 5: Vista de solo lectura**

Crear `src/components/panel/VistaAjustesSoloLectura.tsx`:

```tsx
import { formatearPrecio } from '@/lib/dinero'
import type { Ajustes } from '@/lib/ajustes'

const DIAS: { clave: keyof Ajustes['horario']; etiqueta: string }[] = [
  { clave: 'lunes', etiqueta: 'Lunes' },
  { clave: 'martes', etiqueta: 'Martes' },
  { clave: 'miercoles', etiqueta: 'Miércoles' },
  { clave: 'jueves', etiqueta: 'Jueves' },
  { clave: 'viernes', etiqueta: 'Viernes' },
  { clave: 'sabado', etiqueta: 'Sábado' },
  { clave: 'domingo', etiqueta: 'Domingo' },
]

export function VistaAjustesSoloLectura({ ajustes }: { ajustes: Ajustes }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-semibold">{ajustes.nombreRestaurante}</p>
        <p className="text-sm text-neutral-400">
          {ajustes.telefono} · {ajustes.direccion}
        </p>
      </div>
      <dl className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <dt>Envío</dt>
          <dd>{formatearPrecio(ajustes.envioCentimos)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Pedido mínimo</dt>
          <dd>{formatearPrecio(ajustes.pedidoMinimoCentimos)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Envío gratis desde</dt>
          <dd>
            {ajustes.envioGratisDesdeCentimos !== null ? formatearPrecio(ajustes.envioGratisDesdeCentimos) : 'Desactivado'}
          </dd>
        </div>
      </dl>
      <dl className="flex flex-col gap-1 text-sm">
        {DIAS.map((dia) => (
          <div key={dia.clave} className="flex justify-between">
            <dt>{dia.etiqueta}</dt>
            <dd>
              {ajustes.horario[dia.clave].length === 0
                ? 'Cerrado'
                : ajustes.horario[dia.clave].map((t) => `${t.desde}–${t.hasta}`).join(', ')}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
```

- [ ] **Step 6: Página de ajustes**

Crear `src/app/panel/(protegido)/ajustes/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { obtenerAjustes } from '@/lib/ajustes'
import { FormularioAjustes } from '@/components/panel/FormularioAjustes'
import { VistaAjustesSoloLectura } from '@/components/panel/VistaAjustesSoloLectura'

export default async function PaginaAjustes() {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol === 'repartidor') redirect('/panel')

  const ajustes = await obtenerAjustes()
  return perfil.rol === 'admin' ? (
    <FormularioAjustes ajustesIniciales={ajustes} />
  ) : (
    <VistaAjustesSoloLectura ajustes={ajustes} />
  )
}
```

- [ ] **Step 7: Añadir "Ajustes" a la navegación**

En `src/components/panel/NavPanel.tsx`, añadir una entrada al array `ENLACES`, justo después de `Disponibilidad`:

```ts
{ href: '/panel/ajustes', etiqueta: 'Ajustes', roles: ['admin', 'cocina'] },
```

- [ ] **Step 8: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores.

- [ ] **Step 9: Commit**

```bash
git add src/components/panel/FormularioAjustes.tsx src/components/panel/FormularioAjustes.test.tsx \
  src/components/panel/VistaAjustesSoloLectura.tsx "src/app/panel/(protegido)/ajustes" src/components/panel/NavPanel.tsx
git commit -m "Añade la pantalla de ajustes"
```

---

### Tarea 11: Equipo — invitación, listado y endpoint

**Files:**
- Create: `src/lib/personal/equipo.ts`
- Create: `src/app/api/panel/equipo/route.ts`
- Modify: `src/proxy.ts`

**Interfaces:**
- Consumes: `crearClienteServicio` (de `@/lib/supabase/cliente-servicio`), `RolStaff` (de `@/lib/personal/tipos`), `obtenerPerfilStaff` (de `@/lib/personal/sesion`).
- Produces: tipo `MiembroEquipo`; `listarEquipo(): Promise<MiembroEquipo[]>`, `invitarMiembro(email, nombre, rol, redirectTo): Promise<void>`; `POST /api/panel/equipo`.

- [ ] **Step 1: Módulo de equipo**

Crear `src/lib/personal/equipo.ts`:

```ts
import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'
import type { RolStaff } from './tipos'

export type MiembroEquipo = {
  userId: string
  nombre: string
  rol: RolStaff
  email: string
}

export async function listarEquipo(): Promise<MiembroEquipo[]> {
  const supabase = crearClienteServicio()
  const { data: perfiles, error } = await supabase.from('perfiles_staff').select('user_id, nombre, rol')
  if (error) throw error

  const { data: usuarios, error: errorUsuarios } = await supabase.auth.admin.listUsers()
  if (errorUsuarios) throw errorUsuarios

  return perfiles.map((perfil) => ({
    userId: perfil.user_id,
    nombre: perfil.nombre,
    rol: perfil.rol as RolStaff,
    email: usuarios.users.find((usuario) => usuario.id === perfil.user_id)?.email ?? '',
  }))
}

/**
 * El perfil se crea al invitar, no al aceptar: así el rol queda decidido
 * desde el primer momento y las políticas de RLS y `obtenerPerfilStaff` ya
 * encuentran la fila en cuanto la persona abre sesión con el enlace del
 * correo. Si la inserción del perfil fallara, se retira la cuenta de Auth
 * recién creada en vez de dejar una invitación fantasma sin rol que nunca
 * podría entrar al panel.
 */
export async function invitarMiembro(
  email: string,
  nombre: string,
  rol: RolStaff,
  redirectTo: string,
): Promise<void> {
  const supabase = crearClienteServicio()
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo })
  if (error) throw error

  const { error: errorPerfil } = await supabase.from('perfiles_staff').insert({ user_id: data.user.id, nombre, rol })
  if (errorPerfil) {
    await supabase.auth.admin.deleteUser(data.user.id)
    throw errorPerfil
  }
}
```

- [ ] **Step 2: Endpoint de invitación**

Crear `src/app/api/panel/equipo/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { invitarMiembro } from '@/lib/personal/equipo'
import type { RolStaff } from '@/lib/personal/tipos'

const ROLES_VALIDOS: RolStaff[] = ['admin', 'cocina', 'repartidor']

export async function POST(req: Request) {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { email, nombre, rol } = (await req.json()) as { email?: string; nombre?: string; rol?: string }
  if (!email || !nombre || !rol || !ROLES_VALIDOS.includes(rol as RolStaff)) {
    return NextResponse.json({ error: 'Faltan datos o el rol no es válido' }, { status: 400 })
  }

  const origen = new URL(req.url).origin
  try {
    await invitarMiembro(email, nombre, rol as RolStaff, `${origen}/panel/invitacion`)
  } catch {
    return NextResponse.json({ error: 'No se ha podido enviar la invitación' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
```

- [ ] **Step 3: Eximir `/panel/invitacion` de la protección de sesión**

En `src/proxy.ts`, cambiar la condición de redirección para que también deje pasar `/panel/invitacion` (la sesión de quien acepta una invitación todavía no existe en cookies cuando llega el primer render del servidor: la establece el propio código de cliente de esa página al leer el enlace):

```ts
const RUTAS_PUBLICAS = ['/panel/iniciar-sesion', '/panel/invitacion']

// ...dentro de proxy(), sustituir la comprobación existente por:
if (!user && !RUTAS_PUBLICAS.includes(request.nextUrl.pathname)) {
  return NextResponse.redirect(new URL('/panel/iniciar-sesion', request.url))
}
```

- [ ] **Step 4: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores. El endpoint y el flujo completo se ejercen desde la pantalla de la Tarea 12.

- [ ] **Step 5: Commit**

```bash
git add src/lib/personal/equipo.ts src/app/api/panel/equipo src/proxy.ts
git commit -m "Añade la invitación de equipo por email"
```

---

### Tarea 12: Equipo — aceptar invitación, pantalla, página y navegación

**Files:**
- Create: `src/app/panel/invitacion/page.tsx`
- Create: `src/components/panel/VistaEquipo.tsx`
- Test: `src/components/panel/VistaEquipo.test.tsx`
- Create: `src/app/panel/(protegido)/equipo/page.tsx`
- Modify: `src/components/panel/NavPanel.tsx`

**Interfaces:**
- Consumes: `crearClienteNavegador` (de `@/lib/supabase/cliente-navegador`), `MiembroEquipo`, `listarEquipo` (de `@/lib/personal/equipo`), `RolStaff` (de `@/lib/personal/tipos`), `mensajeDeError` (de `@/lib/panel/erroresApi`).
- Produces: página `/panel/invitacion`; componente `VistaEquipo({ equipo }): JSX`.

- [ ] **Step 1: Página de aceptar invitación**

Crear `src/app/panel/invitacion/page.tsx`. El enlace del correo de invitación de Supabase puede llegar de dos formas según la configuración del proyecto: con el token en el fragmento de la URL (`#access_token=...&refresh_token=...`) o como `token_hash`/`type` en la query string, para verificar con `verifyOtp`. Se comprueban ambas para no depender de cuál esté activa:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { crearClienteNavegador } from '@/lib/supabase/cliente-navegador'

type Fase = 'verificando' | 'lista' | 'guardando' | 'error'

const MENSAJE_ENLACE_INVALIDO = 'Este enlace de invitación no es válido o ha caducado.'

export default function PaginaInvitacion() {
  const [fase, setFase] = useState<Fase>('verificando')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function establecerSesion() {
      const supabase = crearClienteNavegador()
      const hash = new URLSearchParams(window.location.hash.replace('#', ''))
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')

      if (accessToken && refreshToken) {
        const { error: errorSesion } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        setFase(errorSesion ? 'error' : 'lista')
        if (errorSesion) setError(MENSAJE_ENLACE_INVALIDO)
        return
      }

      const params = new URLSearchParams(window.location.search)
      const tokenHash = params.get('token_hash')
      const tipo = params.get('type')
      if (tokenHash && tipo) {
        const { error: errorSesion } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: tipo as 'invite',
        })
        setFase(errorSesion ? 'error' : 'lista')
        if (errorSesion) setError(MENSAJE_ENLACE_INVALIDO)
        return
      }

      setError(MENSAJE_ENLACE_INVALIDO)
      setFase('error')
    }
    establecerSesion()
  }, [])

  async function guardarContrasena() {
    setFase('guardando')
    setError('')
    const supabase = crearClienteNavegador()
    const { error: errorContrasena } = await supabase.auth.updateUser({ password })
    if (errorContrasena) {
      setError('No se ha podido guardar la contraseña. Inténtalo de nuevo.')
      setFase('lista')
      return
    }
    window.location.href = '/panel'
  }

  if (fase === 'verificando') return <p className="p-4">Comprobando la invitación…</p>
  if (fase === 'error') return <p className="p-4 text-amber-400">{error}</p>

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Elige tu contraseña</h1>
      <label className="flex flex-col gap-1">
        <span>Contraseña</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
        />
      </label>
      {error && <p className="text-sm text-amber-400">{error}</p>}
      <button
        type="button"
        disabled={fase === 'guardando' || password.length < 8}
        onClick={guardarContrasena}
        className="h-14 rounded-xl bg-amber-500 text-lg font-bold text-neutral-950 disabled:opacity-40"
      >
        Entrar
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Test que falla para `VistaEquipo`**

Crear `src/components/panel/VistaEquipo.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VistaEquipo } from './VistaEquipo'
import type { MiembroEquipo } from '@/lib/personal/equipo'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const EQUIPO: MiembroEquipo[] = [{ userId: 'u-1', nombre: 'Javier', rol: 'admin', email: 'javier@example.com' }]

beforeEach(() => {
  vi.restoreAllMocks()
  refresh.mockReset()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) }))
})

describe('VistaEquipo', () => {
  it('muestra el equipo actual', () => {
    render(<VistaEquipo equipo={EQUIPO} />)
    expect(screen.getByText('Javier')).toBeInTheDocument()
    expect(screen.getByText('javier@example.com')).toBeInTheDocument()
  })

  it('invita a una persona nueva y refresca el listado', async () => {
    render(<VistaEquipo equipo={EQUIPO} />)
    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com')
    await userEvent.type(screen.getByLabelText('Nombre'), 'Ana')
    await userEvent.selectOptions(screen.getByLabelText('Rol'), 'cocina')
    await userEvent.click(screen.getByRole('button', { name: 'Invitar' }))

    expect(fetch).toHaveBeenCalledWith(
      '/api/panel/equipo',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'ana@example.com', nombre: 'Ana', rol: 'cocina' }),
      }),
    )
    expect(await screen.findByText('Invitación enviada a ana@example.com.')).toBeInTheDocument()
    expect(refresh).toHaveBeenCalled()
  })

  it('muestra el error si la invitación falla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Ya existe esa cuenta' }) }),
    )
    render(<VistaEquipo equipo={EQUIPO} />)
    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com')
    await userEvent.type(screen.getByLabelText('Nombre'), 'Ana')
    await userEvent.click(screen.getByRole('button', { name: 'Invitar' }))

    expect(await screen.findByText('Ya existe esa cuenta')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Ejecutar y comprobar que falla**

Run: `pnpm test VistaEquipo`
Expected: FAIL — `VistaEquipo` no existe todavía.

- [ ] **Step 4: Implementar `VistaEquipo`**

Crear `src/components/panel/VistaEquipo.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { mensajeDeError } from '@/lib/panel/erroresApi'
import type { MiembroEquipo } from '@/lib/personal/equipo'
import type { RolStaff } from '@/lib/personal/tipos'

const ROLES: { valor: RolStaff; etiqueta: string }[] = [
  { valor: 'admin', etiqueta: 'Admin' },
  { valor: 'cocina', etiqueta: 'Cocina' },
  { valor: 'repartidor', etiqueta: 'Repartidor' },
]

type Props = { equipo: MiembroEquipo[] }

export function VistaEquipo({ equipo }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<RolStaff>('cocina')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invitado, setInvitado] = useState<string | null>(null)

  async function invitar() {
    setEnviando(true)
    setError(null)
    setInvitado(null)
    const respuesta = await fetch('/api/panel/equipo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nombre, rol }),
    })
    if (respuesta.ok) {
      setInvitado(email)
      setEmail('')
      setNombre('')
      setRol('cocina')
      router.refresh()
    } else {
      setError(await mensajeDeError(respuesta))
    }
    setEnviando(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-2">
        {equipo.map((miembro) => (
          <li
            key={miembro.userId}
            className="flex items-center justify-between rounded-lg border border-neutral-700 p-3"
          >
            <div>
              <p className="font-semibold">{miembro.nombre}</p>
              <p className="text-sm text-neutral-400">{miembro.email}</p>
            </div>
            <span className="text-xs uppercase tracking-wide text-neutral-400">{miembro.rol}</span>
          </li>
        ))}
      </ul>

      <fieldset className="flex flex-col gap-3 rounded-lg border border-neutral-700 p-3">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide">Invitar</legend>
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
          <span>Nombre</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Rol</span>
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value as RolStaff)}
            className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
          >
            {ROLES.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.etiqueta}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-amber-400">{error}</p>}
        {invitado && <p className="text-sm text-emerald-400">Invitación enviada a {invitado}.</p>}

        <button
          type="button"
          disabled={enviando || !email || !nombre}
          onClick={invitar}
          className="h-12 rounded-xl bg-amber-500 font-bold text-neutral-950 disabled:opacity-40"
        >
          Invitar
        </button>
      </fieldset>
    </div>
  )
}
```

- [ ] **Step 5: Ejecutar y comprobar que pasa**

Run: `pnpm test VistaEquipo`
Expected: PASS.

- [ ] **Step 6: Página de equipo**

Crear `src/app/panel/(protegido)/equipo/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarEquipo } from '@/lib/personal/equipo'
import { VistaEquipo } from '@/components/panel/VistaEquipo'

export default async function PaginaEquipo() {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol !== 'admin') redirect('/panel')

  const equipo = await listarEquipo()
  return <VistaEquipo equipo={equipo} />
}
```

- [ ] **Step 7: Añadir "Equipo" a la navegación**

En `src/components/panel/NavPanel.tsx`, añadir al array `ENLACES`:

```ts
{ href: '/panel/equipo', etiqueta: 'Equipo', roles: ['admin'] },
```

- [ ] **Step 8: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores.

- [ ] **Step 9: Commit**

```bash
git add src/app/panel/invitacion src/components/panel/VistaEquipo.tsx src/components/panel/VistaEquipo.test.tsx \
  "src/app/panel/(protegido)/equipo" src/components/panel/NavPanel.tsx
git commit -m "Añade la pantalla de equipo y la aceptación de invitaciones"
```

**Nota de verificación manual:** este flujo depende de que el envío de correo esté configurado en el proyecto de Supabase Cloud ya conectado. Antes de darlo por bueno, invita a una cuenta de prueba desde `/panel/equipo` y sigue el enlace del correo hasta fijar la contraseña y entrar en `/panel`, confirmando con el usuario qué cuenta de correo usar para la prueba.

---

### Tarea 13: Historial — cálculo del día y consultas

**Files:**
- Modify: `src/lib/horario/index.ts`
- Modify: `src/lib/horario/horario.test.ts`
- Create: `src/lib/pedidos/historial.ts`

**Interfaces:**
- Consumes: `SupabaseClient` (de `@supabase/supabase-js`), `BaseDeDatos` (de `@/lib/supabase/cliente-servidor`), `PedidoConLineas` (de `@/lib/pedidos/tipos`).
- Produces: `rangoDelDiaEnMadrid(ahora: Date): { desde: string; hasta: string }`; `listarHistorial(supabase, telefono?): Promise<PedidoConLineas[]>`, `totalFacturadoHoy(supabase, rango): Promise<number>`.

- [ ] **Step 1: Tests que fallan para `rangoDelDiaEnMadrid`**

Añadir al final de `src/lib/horario/horario.test.ts`:

```ts
describe('rangoDelDiaEnMadrid', () => {
  it('calcula la medianoche a medianoche en invierno (UTC+1)', () => {
    // 2026-01-15 20:00 UTC = jueves 21:00 en Madrid.
    const rango = rangoDelDiaEnMadrid(new Date('2026-01-15T20:00:00Z'))
    expect(rango).toEqual({ desde: '2026-01-14T23:00:00.000Z', hasta: '2026-01-15T23:00:00.000Z' })
  })

  it('calcula la medianoche a medianoche en verano (UTC+2)', () => {
    // 2026-07-15 20:00 UTC = miércoles 22:00 en Madrid.
    const rango = rangoDelDiaEnMadrid(new Date('2026-07-15T20:00:00Z'))
    expect(rango).toEqual({ desde: '2026-07-14T22:00:00.000Z', hasta: '2026-07-15T22:00:00.000Z' })
  })

  it('un instante justo después de medianoche sigue perteneciendo a ese mismo día', () => {
    // 2026-01-14 23:00:01 UTC = jueves 00:00:01 en Madrid.
    const rango = rangoDelDiaEnMadrid(new Date('2026-01-14T23:00:01Z'))
    expect(rango.desde).toBe('2026-01-14T23:00:00.000Z')
  })
})
```

Y añadir `rangoDelDiaEnMadrid` al `import` de la primera línea del fichero (junto a `generarFranjas`, etc.).

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `pnpm test horario`
Expected: FAIL — `rangoDelDiaEnMadrid` no existe todavía.

- [ ] **Step 3: Implementar `rangoDelDiaEnMadrid`**

Añadir a `src/lib/horario/index.ts`, después de `partesEnZona`/`fechaEnZona` (que ya existen en el fichero y son las que reutiliza):

```ts
/**
 * Inicio (inclusive) y fin (exclusivo) del día natural en Madrid que
 * contiene `ahora`, en ISO 8601 UTC. Se usa para acotar "hoy" en el
 * historial y la caja del día sin repetir la aritmética de zona horaria que
 * ya resuelven `partesEnZona` y `fechaEnZona` para las franjas.
 */
export function rangoDelDiaEnMadrid(ahora: Date): { desde: string; hasta: string } {
  const partes = partesEnZona(ahora)
  const fechaAlMedioDia = new Date(Date.UTC(partes.anio, partes.mes - 1, partes.dia, 12))
  const desplazamiento = desplazamientoMinutos(fechaAlMedioDia)
  const desde = fechaEnZona(partes.anio, partes.mes, partes.dia, 0, 0, desplazamiento)
  const hasta = new Date(desde.getTime() + 24 * 60 * 60000)
  return { desde: desde.toISOString(), hasta: hasta.toISOString() }
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `pnpm test horario`
Expected: PASS.

- [ ] **Step 5: Consultas de historial**

Crear `src/lib/pedidos/historial.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BaseDeDatos } from '@/lib/supabase/cliente-servidor'
import type { PedidoConLineas } from './tipos'

const SELECT_CON_LINEAS = '*, pedido_lineas(*, pedido_extras(*))'
const LIMITE_HISTORIAL = 200

/**
 * Pedidos entregados, más recientes primero. Usa el cliente de sesión de
 * quien llama (no la clave de servicio): las políticas de RLS ya limitan qué
 * pedidos puede ver según su rol, igual que en el tablero.
 */
export async function listarHistorial(
  supabase: SupabaseClient<BaseDeDatos>,
  telefono?: string,
): Promise<PedidoConLineas[]> {
  let consulta = supabase
    .from('pedidos')
    .select(SELECT_CON_LINEAS)
    .eq('estado', 'entregado')
    .order('entregado_en', { ascending: false })
    .limit(LIMITE_HISTORIAL)

  if (telefono && telefono.trim() !== '') {
    consulta = consulta.ilike('cliente_telefono', `%${telefono.trim()}%`)
  }

  const { data, error } = await consulta
  if (error) throw error
  return data as PedidoConLineas[]
}

/**
 * Suma de los pedidos entregados en el rango dado. No es una consulta
 * agregada: el volumen diario de un asador de bocadillos es pequeño, así que
 * traer las filas y sumar en memoria es más simple que mantener una función
 * de Postgres solo para esto.
 */
export async function totalFacturadoHoy(
  supabase: SupabaseClient<BaseDeDatos>,
  rango: { desde: string; hasta: string },
): Promise<number> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('total_centimos')
    .eq('estado', 'entregado')
    .gte('entregado_en', rango.desde)
    .lt('entregado_en', rango.hasta)
  if (error) throw error
  return data.reduce((total, pedido) => total + pedido.total_centimos, 0)
}
```

- [ ] **Step 6: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores. Estas funciones se ejercen desde la pantalla de la Tarea 14.

- [ ] **Step 7: Commit**

```bash
git add src/lib/horario/index.ts src/lib/horario/horario.test.ts src/lib/pedidos/historial.ts
git commit -m "Añade el cálculo del día en Madrid y las consultas del historial"
```

---

### Tarea 14: Historial — pantalla, página y navegación

**Files:**
- Create: `src/app/api/panel/historial/route.ts`
- Create: `src/components/panel/VistaHistorial.tsx`
- Test: `src/components/panel/VistaHistorial.test.tsx`
- Create: `src/app/panel/(protegido)/historial/page.tsx`
- Modify: `src/components/panel/NavPanel.tsx`

**Interfaces:**
- Consumes: `listarHistorial`, `totalFacturadoHoy` (de `@/lib/pedidos/historial`), `rangoDelDiaEnMadrid` (de `@/lib/horario`), `formatearPrecio` (de `@/lib/dinero`), `PedidoConLineas` (de `@/lib/pedidos/tipos`).
- Produces: `GET /api/panel/historial`; componente `VistaHistorial({ historialInicial, totalHoyCentimos }): JSX`.

- [ ] **Step 1: Endpoint de búsqueda**

Crear `src/app/api/panel/historial/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarHistorial } from '@/lib/pedidos/historial'
import { crearClienteServidorSesion } from '@/lib/supabase/cliente-servidor-sesion'

export async function GET(req: Request) {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol === 'repartidor') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const telefono = new URL(req.url).searchParams.get('telefono') ?? undefined
  const supabase = await crearClienteServidorSesion()
  const historial = await listarHistorial(supabase, telefono)
  return NextResponse.json(historial)
}
```

- [ ] **Step 2: Test que falla para `VistaHistorial`**

Crear `src/components/panel/VistaHistorial.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VistaHistorial } from './VistaHistorial'
import type { PedidoConLineas } from '@/lib/pedidos/tipos'

function pedido(parcial: Partial<PedidoConLineas> = {}): PedidoConLineas {
  return {
    id: 'p-1',
    codigo_publico: 'abc123',
    estado: 'entregado',
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
    franja_confirmada_inicio: '2026-01-15T12:00:00.000Z',
    franja_confirmada_fin: '2026-01-15T12:30:00.000Z',
    confirmado_en: '2026-01-15T11:05:00.000Z',
    subtotal_centimos: 1000,
    envio_centimos: 0,
    total_centimos: 1000,
    stripe_session_id: 'sess_1',
    stripe_payment_intent: 'pi_1',
    repartidor_id: null,
    creado_en: '2026-01-15T11:00:00.000Z',
    pagado_en: '2026-01-15T11:00:05.000Z',
    entregado_en: '2026-01-15T12:20:00.000Z',
    pedido_lineas: [],
    ...parcial,
  } as PedidoConLineas
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) }))
})

describe('VistaHistorial', () => {
  it('muestra la caja del día y los pedidos entregados', () => {
    render(<VistaHistorial historialInicial={[pedido()]} totalHoyCentimos={1000} />)
    expect(screen.getByText('10,00 €')).toBeInTheDocument()
    expect(screen.getByText('abc123')).toBeInTheDocument()
    expect(screen.getByText(/Ana García/)).toBeInTheDocument()
  })

  it('busca por teléfono contra el servidor', async () => {
    render(<VistaHistorial historialInicial={[pedido()]} totalHoyCentimos={1000} />)
    await userEvent.type(screen.getByPlaceholderText('Buscar por teléfono'), '600111222')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(fetch).toHaveBeenCalledWith('/api/panel/historial?telefono=600111222')
  })

  it('avisa cuando no hay pedidos', () => {
    render(<VistaHistorial historialInicial={[]} totalHoyCentimos={0} />)
    expect(screen.getByText('No hay pedidos entregados aquí.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Ejecutar y comprobar que falla**

Run: `pnpm test VistaHistorial`
Expected: FAIL — `VistaHistorial` no existe todavía.

- [ ] **Step 4: Implementar `VistaHistorial`**

Crear `src/components/panel/VistaHistorial.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { formatearPrecio } from '@/lib/dinero'
import type { PedidoConLineas } from '@/lib/pedidos/tipos'

type Props = { historialInicial: PedidoConLineas[]; totalHoyCentimos: number }

export function VistaHistorial({ historialInicial, totalHoyCentimos }: Props) {
  const [historial, setHistorial] = useState(historialInicial)
  const [telefono, setTelefono] = useState('')
  const [buscando, setBuscando] = useState(false)

  async function buscar() {
    setBuscando(true)
    const respuesta = await fetch(`/api/panel/historial?telefono=${encodeURIComponent(telefono)}`)
    if (respuesta.ok) setHistorial(await respuesta.json())
    setBuscando(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-lg border border-neutral-700 p-3">
        Facturado hoy: <span className="font-bold">{formatearPrecio(totalHoyCentimos)}</span>
      </p>

      <div className="flex gap-2">
        <input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Buscar por teléfono"
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 p-3"
        />
        <button
          type="button"
          disabled={buscando}
          onClick={buscar}
          className="rounded-lg border border-neutral-700 px-4 disabled:opacity-40"
        >
          Buscar
        </button>
      </div>

      {historial.length === 0 && <p className="text-sm text-neutral-400">No hay pedidos entregados aquí.</p>}

      <ul className="flex flex-col gap-2">
        {historial.map((pedido) => (
          <li key={pedido.id} className="rounded-lg border border-neutral-700 p-3">
            <div className="flex justify-between">
              <span className="font-semibold">{pedido.codigo_publico}</span>
              <span>{formatearPrecio(pedido.total_centimos)}</span>
            </div>
            <p className="text-sm text-neutral-400">
              {pedido.cliente_nombre} {pedido.cliente_apellidos} · {pedido.cliente_telefono}
            </p>
            {pedido.entregado_en && (
              <p className="text-sm text-neutral-400">
                Entregado {new Date(pedido.entregado_en).toLocaleString('es-ES')}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 5: Ejecutar y comprobar que pasa**

Run: `pnpm test VistaHistorial`
Expected: PASS.

- [ ] **Step 6: Página de historial**

Crear `src/app/panel/(protegido)/historial/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { rangoDelDiaEnMadrid } from '@/lib/horario'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarHistorial, totalFacturadoHoy } from '@/lib/pedidos/historial'
import { crearClienteServidorSesion } from '@/lib/supabase/cliente-servidor-sesion'
import { VistaHistorial } from '@/components/panel/VistaHistorial'

export default async function PaginaHistorial() {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol === 'repartidor') redirect('/panel')

  const supabase = await crearClienteServidorSesion()
  const [historial, totalHoy] = await Promise.all([
    listarHistorial(supabase),
    totalFacturadoHoy(supabase, rangoDelDiaEnMadrid(new Date())),
  ])

  return <VistaHistorial historialInicial={historial} totalHoyCentimos={totalHoy} />
}
```

- [ ] **Step 7: Añadir "Historial" a la navegación**

En `src/components/panel/NavPanel.tsx`, añadir al array `ENLACES`:

```ts
{ href: '/panel/historial', etiqueta: 'Historial', roles: ['admin', 'cocina'] },
```

- [ ] **Step 8: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores.

- [ ] **Step 9: Commit**

```bash
git add src/app/api/panel/historial src/components/panel/VistaHistorial.tsx src/components/panel/VistaHistorial.test.tsx \
  "src/app/panel/(protegido)/historial" src/components/panel/NavPanel.tsx
git commit -m "Añade la pantalla de historial y caja del día"
```

---

### Tarea 15: Recorrido final y verificación

**Files:** ninguno nuevo — verificación de todo lo construido en este plan.

- [ ] **Step 1: Suite completa**

Run: `pnpm lint && pnpm test && pnpm build`
Expected: sin errores de lint, todos los tests en verde, compilación correcta.

- [ ] **Step 2: Recorrido manual con una cuenta admin**

Con `pnpm dev` y una cuenta admin real (la primera cuenta de personal, creada en el plan anterior con `scripts/crear-cuenta-staff.ts`):

1. `/panel/carta` — desactivar y reactivar un artículo, un tamaño y un complemento; comprobar en `/` (carta pública, en otra pestaña) que el cambio se refleja.
2. `/panel/carta/articulos/nuevo` — crear un artículo con dos tamaños y un complemento, subir una foto, comprobar que aparece en la carta pública.
3. `/panel/carta/articulos/[id]` — editarlo, darlo de baja, comprobar que desaparece de la carta pública.
4. `/panel/carta/complementos/nuevo` — crear un complemento con precio en un solo tamaño, comprobar que solo se ofrece ahí.
5. `/panel/ajustes` — cambiar el horario de un día, el pedido mínimo y el umbral de envío gratis; intentar guardar un umbral de envío gratis menor que el mínimo y comprobar que el panel lo rechaza.
6. `/panel/equipo` — invitar a una cuenta de prueba (confirmar con el usuario qué email usar), seguir el enlace del correo, fijar contraseña y entrar en `/panel`.
7. `/panel/historial` — entregar un pedido de prueba de principio a fin (o usar uno ya entregado) y comprobar que aparece aquí con el total del día actualizado; buscar por su teléfono.

- [ ] **Step 3: Repetir los pasos 1 y 5 (lectura) con una cuenta de cocina**

Comprobar que cocina puede tocar disponibilidad pero no ve los botones de alta/edición/baja de artículos y complementos, y que ve los ajustes en modo solo lectura, sin poder editarlos.

- [ ] **Step 4: Commit final si el recorrido manual obligó a algún ajuste**

```bash
git add -A
git commit -m "Ajustes finales tras el recorrido manual de Administración"
```

(Omitir este paso si el recorrido no requirió cambios.)

---

## Qué queda fuera de este plan

- **Reparto y despliegue** — perfil de repartidor (usa `estados` y las transiciones que ya modela el plan del panel de cocina) y publicación en Vercel.
- Edición o baja de una cuenta de equipo ya existente: el spec solo pide invitar y asignar rol al invitar.
- Gestión de categorías y tamaños desde el panel: son fijos (`Bocadillo`/`Montado`/`Único` y las categorías cargadas en la migración 0002); el spec solo pide alta, edición y baja de artículos, no de las categorías o tamaños en sí.
- Borrado del objeto de Storage al reemplazar o eliminar la foto de un artículo: queda huérfano en el bucket, sin coste funcional — mismo criterio que ya acepta este proyecto para las filas huérfanas de `crear.ts`.
