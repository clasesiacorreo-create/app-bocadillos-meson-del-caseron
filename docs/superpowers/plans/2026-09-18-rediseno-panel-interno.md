# Rediseño visual — Fase 3: panel interno (personal) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar la identidad visual "pergamino/terracota" (ya implementada en Fases 1 y 2 para carta, ficha, carrito, checkout y seguimiento) a las 10 pantallas del panel interno de personal — Cocina, Administración (Disponibilidad, Ajustes, Equipo, Historial, Editar artículo, Editar complemento), Repartidor, Iniciar sesión e Invitación — solo en su versión móvil.

**Architecture:** Cada pantalla ya existe como componente/página React funcionando contra Supabase; esta fase NO toca lógica de negocio, validaciones, endpoints ni estado — solo `className` y, en un puñado de sitios concretos donde el lienzo de diseño aprobado lo pide explícitamente, una reestructuración menor de JSX (agrupar interruptores de tamaño dentro de la tarjeta de su artículo, añadir cabecera con título y enlace "volver" a los formularios de artículo/complemento). El primer task desbloquea el resto: retira la piel oscura fijada en la Fase 1 (`bg-neutral-950 text-neutral-100`) del layout del panel y de la ruta de repartidor, y añade los dos tokens de color que esta fase necesita y que aún no existen (`--color-urgente`, `--color-peligro`).

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS v4 (tokens ya declarados en `src/app/globals.css` vía `@theme inline`), Vitest + Testing Library, pnpm.

**Spec:** [docs/superpowers/specs/2026-09-17-rediseno-visual.md](../specs/2026-09-17-rediseno-visual.md) — en particular §2 (sistema de diseño) y §3 "Panel interno" (inventario de pantallas). El lienzo de diseño aprobado (`https://claude.ai/artifact/YEFrZcdECc4Y88fC7727ED`, artboards `Cocina.dc.html`, `Disponibilidad.dc.html`, `Ajustes.dc.html`, `Equipo.dc.html`, `Historial.dc.html`, `FormularioArticulo.dc.html`, `FormularioComplemento.dc.html`, `Repartidor.dc.html`, `Login.dc.html`, `Invitacion.dc.html`) es la referencia pixel a pixel; este plan ya traduce sus decisiones a Tailwind, así que no hace falta volver a consultarlo.

## Global Constraints

- **Paleta:** sustituye TODA aparición de `neutral-950/900/800/700/500/400`, `amber-500/400` y `emerald-600/500/400` por los tokens Tailwind ya generados desde `src/app/globals.css`: `ground`, `rail`, `surface`, `ink`, `ink-soft`, `border`, `accent`, `accent-dark`, `accent-soft`, `success`, `success-soft`, más `urgente`, `urgente-soft` y `peligro` (los añade la Tarea 1). Ninguna clase `neutral-*`, `amber-*` ni `emerald-*` debe quedar en los ficheros que toca esta fase.
- **Tipografía:** títulos de pantalla y nombres de categoría van en `font-display italic` (Instrument Serif); el resto hereda Work Sans por defecto, sin clase extra.
- **Sin cambios de lógica:** cada tarea toca solo JSX/`className`. Si un paso añade una `<label>`/`<span>` de texto alrededor de un `<input>` que no la tenía, es únicamente para dar color al texto — nunca cambia el valor, el `name`, ni el comportamiento del campo.
- **Checkbox/radio nativos:** usa `accent-[var(--color-accent)]` (no la utilidad `accent-accent`) — mismo patrón ya usado en `FormularioCheckout.tsx` en la Fase 2.
- **Texto sobre fondo `--accent` sólido** (botones primarios): `text-surface`, nunca un hex literal.
- **Cajas de error/aviso:** `bg-accent-soft` + `text-accent-dark`. **Cajas de éxito:** `bg-success-soft` + `text-success`.
- **`--peligro`:** solo para los dos botones "Dar de baja" (Tareas 7 y 8). No lo uses en ningún otro sitio.
- **Alcance móvil únicamente:** el panel interno no lleva versión de escritorio (spec §4) — no añadas clases `sm:`/`lg:` en esta fase.
- **pnpm siempre** — nunca `npm`/`npx`, en ningún comando de verificación.
- **Verificación visual (recomendada, no bloqueante):** las pantallas de esta fase requieren sesión de Supabase real. Si tienes credenciales de prueba, inicia sesión y compruébalo en el navegador. Si no, puedes montar el componente cliente correspondiente con props de ejemplo en una ruta temporal de scratch (mismo patrón que la Tarea 5 de la Fase 2: verificas y luego BORRAS la ruta temporal antes de comitear). El criterio de aceptación real de cada tarea es: la suite de tests existente en verde + `pnpm build` sin errores.

---

### Task 1: Fundamentos del panel — tokens, layout, navegación y cabecera de repartidor

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/panel/(protegido)/layout.tsx`
- Modify: `src/components/panel/NavPanel.tsx`
- Modify: `src/components/panel/CerrarSesionBoton.tsx`
- Modify: `src/app/reparto/page.tsx`

**Interfaces:**
- Produces: los tokens Tailwind `bg-urgente`, `bg-urgente-soft`, `border-urgente`, `text-urgente`, `border-peligro`, `text-peligro` — las Tareas 2, 7 y 8 los consumen.
- Produces: `NavPanel` y `CerrarSesionBoton` sin cambios de props (`rol: RolStaff`; sin props) — solo cambia su render interno.

- [ ] **Step 1: Añade los tokens que faltan a `globals.css`**

Reemplaza el bloque `@theme inline` completo por:

```css
@import "tailwindcss";

@theme inline {
  --font-sans: var(--font-work-sans);
  --font-display: var(--font-instrument-serif);

  --color-ground: #f7efdf;
  --color-rail: #efe1c6;
  --color-surface: #fffcf5;
  --color-ink: #2b2015;
  --color-ink-soft: #7c6b52;
  --color-border: rgba(43, 32, 21, 0.14);
  --color-accent: #b8481f;
  --color-accent-dark: #93381a;
  --color-accent-soft: rgba(184, 72, 31, 0.1);
  --color-success: #4d6b3a;
  --color-success-soft: rgba(77, 107, 58, 0.12);
  --color-urgente: #b8862e;
  --color-urgente-soft: rgba(184, 134, 46, 0.12);
  --color-peligro: #9a3b2e;
}
```

- [ ] **Step 2: Reskin de `src/app/panel/(protegido)/layout.tsx`**

Reemplaza el fichero completo por:

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
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="font-bold text-ink">{perfil.nombre}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{perfil.rol}</p>
        </div>
        <CerrarSesionBoton />
      </header>
      <NavPanel rol={perfil.rol} />
      <main className="px-4 py-4">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Reskin de `NavPanel.tsx` — de pastillas a pestañas con subrayado**

Reemplaza el fichero completo por:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { RolStaff } from '@/lib/personal/tipos'

type Enlace = { href: string; etiqueta: string; roles: RolStaff[] }

const ENLACES: Enlace[] = [
  { href: '/panel', etiqueta: 'Pedidos', roles: ['admin', 'cocina'] },
  { href: '/panel/carta', etiqueta: 'Disponibilidad', roles: ['admin', 'cocina'] },
  { href: '/panel/ajustes', etiqueta: 'Ajustes', roles: ['admin', 'cocina'] },
  { href: '/panel/equipo', etiqueta: 'Equipo', roles: ['admin'] },
  { href: '/panel/historial', etiqueta: 'Historial', roles: ['admin', 'cocina'] },
]

export function NavPanel({ rol }: { rol: RolStaff }) {
  const pathname = usePathname()
  const enlaces = ENLACES.filter((enlace) => enlace.roles.includes(rol))

  return (
    <nav className="flex gap-5 overflow-x-auto border-b border-border px-4">
      {enlaces.map((enlace) => {
        const activo = pathname === enlace.href || (enlace.href !== '/panel' && pathname.startsWith(enlace.href))
        return (
          <Link
            key={enlace.href}
            href={enlace.href}
            className={`shrink-0 border-b-2 pb-2.5 pt-4 text-sm ${
              activo ? 'border-accent font-bold text-ink' : 'border-transparent font-semibold text-ink-soft'
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

No cambies el array `ENLACES` (mismos 5 destinos, mismo filtrado por rol): el nuevo diseño solo cambia cómo se pinta cada pestaña, no qué pestañas hay.

- [ ] **Step 4: Reskin de `CerrarSesionBoton.tsx`**

Reemplaza el fichero completo por:

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
    <button
      type="button"
      onClick={cerrarSesion}
      className="rounded-full border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink-soft"
    >
      Cerrar sesión
    </button>
  )
}
```

- [ ] **Step 5: Reskin de `src/app/reparto/page.tsx`**

Esta ruta no usa el layout `(protegido)` (el repartidor no ve `NavPanel`), así que repite su propia cabecera. Reemplaza el fichero completo por:

```tsx
import { redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarPedidosPanel } from '@/lib/pedidos/panel'
import { crearClienteServidorSesion } from '@/lib/supabase/cliente-servidor-sesion'
import { CerrarSesionBoton } from '@/components/panel/CerrarSesionBoton'
import { VistaReparto } from '@/components/panel/VistaReparto'

export default async function PaginaReparto() {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol !== 'repartidor') redirect('/panel')

  const supabaseSesion = await crearClienteServidorSesion()
  const pedidos = await listarPedidosPanel(supabaseSesion)

  return (
    <div className="min-h-dvh pb-10">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="font-bold text-ink">{perfil.nombre}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{perfil.rol}</p>
        </div>
        <CerrarSesionBoton />
      </header>
      <main className="px-4 py-4">
        <VistaReparto perfil={perfil} pedidosIniciales={pedidos} />
      </main>
    </div>
  )
}
```

- [ ] **Step 6: Verifica que la suite completa sigue en verde**

Run: `pnpm test`
Expected: todos los tests pasan (ninguno de estos 5 ficheros tiene test unitario propio, pero deben seguir compilando y no romper nada que otros tests monten indirectamente).

Run: `pnpm build`
Expected: build sin errores ni warnings de Tailwind sobre clases desconocidas.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css "src/app/panel/(protegido)/layout.tsx" src/components/panel/NavPanel.tsx src/components/panel/CerrarSesionBoton.tsx src/app/reparto/page.tsx
git commit -m "Añade los tokens urgente/peligro y aplica el rediseño a la estructura común del panel"
```

---

### Task 2: Cocina — tablero de pedidos

**Files:**
- Modify: `src/components/panel/TableroPedidos.tsx`
- Modify: `src/components/panel/TarjetaPedido.tsx`
- Test (ya existentes, no se tocan): `src/components/panel/TableroPedidos.test.tsx`, `src/components/panel/TarjetaPedido.test.tsx`

**Interfaces:**
- Consumes: tokens de la Tarea 1 (`border-urgente`, `bg-urgente-soft`, `border-peligro` no se usa aquí).
- No cambia ninguna prop, handler ni la forma de `Props` en ninguno de los dos componentes.

- [ ] **Step 1: Reskin del `return` de `TableroPedidos.tsx`**

No toques nada por encima de la línea 131 (todo el estado, los `useEffect` de tiempo real y el audio quedan exactamente igual). Reemplaza el `return` final (líneas 131-163) por:

```tsx
  return (
    <div className="flex flex-col gap-4">
      <nav className="flex gap-2 overflow-x-auto">
        {PESTANAS.map((pestana) => (
          <button
            key={pestana.id}
            type="button"
            onClick={() => setPestanaActiva(pestana.id)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
              pestanaActiva === pestana.id
                ? 'border-accent bg-accent-soft text-accent-dark'
                : 'border-border bg-surface text-ink-soft'
            }`}
          >
            {pestana.etiqueta} ({pedidosDe(pestana.id).length})
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-4">
        {pedidosDeLaPestana.length === 0 && <p className="text-sm text-ink-soft">No hay pedidos aquí.</p>}
        {pedidosDeLaPestana.map((pedido) => (
          <TarjetaPedido
            key={pedido.id}
            pedido={pedido}
            perfil={perfil}
            franjas={franjas}
            onActualizado={(actualizado) => setPedidos((actuales) => fusionarPedidoEnLista(actuales, actualizado))}
            nombresRepartidores={nombresRepartidores}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Reskin del `return` de `TarjetaPedido.tsx`**

No toques nada por encima de la línea 111 (todo el estado y los handlers `confirmarFranja`, `avanzar`, `aceptarYEmpezar`, `marcarLinea` quedan exactamente igual). Reemplaza el `return` final (líneas 111-295) por:

```tsx
  return (
    <article
      className={`rounded-xl border p-4 ${
        pedido.franja_confirmada_inicio
          ? 'border-success bg-success-soft'
          : franjaInminente
            ? 'border-urgente bg-urgente-soft'
            : 'border-border bg-surface'
      }`}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-soft">
            Pedido {pedido.codigo_publico} ·{' '}
            {new Date(pedido.creado_en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="mt-1 font-semibold text-ink">
            {pedido.franja_solicitada_asap
              ? 'Lo antes posible'
              : `${formatearHoraFranja(pedido.franja_solicitada_inicio)}–${formatearHoraFranja(pedido.franja_solicitada_fin)}`}
            {pedido.franja_confirmada_inicio && pedido.franja_confirmada_fin && (
              <span className="text-success">
                {' '}
                → confirmado {formatearHoraFranja(pedido.franja_confirmada_inicio)}–
                {formatearHoraFranja(pedido.franja_confirmada_fin)}
              </span>
            )}
          </p>
          <p className="text-sm font-semibold text-ink">
            {modoEntrega === 'domicilio' ? 'A domicilio' : 'Recogida en el local'}
          </p>
        </div>
        <a
          href={`tel:${pedido.cliente_telefono}`}
          className="rounded-full border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink"
        >
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
              className="mt-1 accent-[var(--color-accent)]"
            />
            <span className={linea.preparada ? 'text-ink-soft line-through' : 'text-ink'}>
              {linea.cantidad}× {linea.nombre_articulo} · {linea.nombre_tamano}
              {linea.pedido_extras.length > 0 && (
                <span className="text-ink-soft"> ({linea.pedido_extras.map((e) => e.nombre_extra).join(', ')})</span>
              )}
              {linea.notas_linea && <span className="block text-accent-dark">{linea.notas_linea}</span>}
            </span>
          </li>
        ))}
      </ul>

      {pedido.notas && <p className="mt-3 rounded-lg bg-accent-soft p-2 text-sm text-accent-dark">{pedido.notas}</p>}

      <p className="mt-3 font-bold text-ink">{formatearPrecio(pedido.total_centimos)}</p>

      {error && <p className="mt-3 rounded-lg bg-accent-soft p-2 text-sm text-accent-dark">{error}</p>}

      {puedeOperar && (
        <div className="mt-4 flex flex-col gap-2">
          {estado === 'nuevo' && !pedido.franja_confirmada_inicio && pedido.franja_solicitada_asap && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={enviando}
                onClick={aceptarYEmpezar}
                className="h-12 flex-1 rounded-xl bg-accent font-bold text-surface disabled:opacity-40"
              >
                Aceptar y empezar
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={() => setMostrandoOtrasHoras((v) => !v)}
                className="h-12 flex-1 rounded-xl border border-border bg-surface font-semibold text-ink disabled:opacity-40"
              >
                Proponer otra hora
              </button>
            </div>
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
                className="h-12 flex-1 rounded-xl bg-accent font-bold text-surface disabled:opacity-40"
              >
                Confirmar {formatearHoraFranja(pedido.franja_solicitada_inicio)}–
                {formatearHoraFranja(pedido.franja_solicitada_fin)}
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={() => setMostrandoOtrasHoras((v) => !v)}
                className="h-12 flex-1 rounded-xl border border-border bg-surface font-semibold text-ink disabled:opacity-40"
              >
                Proponer otra hora
              </button>
            </div>
          )}

          {mostrandoOtrasHoras && (
            <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
              {gruposFranjas.map((grupo) => (
                <div key={grupo.etiqueta} className="flex flex-col gap-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{grupo.etiqueta}</p>
                  <div className="flex flex-wrap gap-2">
                    {grupo.franjas.map((franja) => (
                      <button
                        key={franja.inicio + franja.fin}
                        type="button"
                        disabled={enviando}
                        onClick={() => confirmarFranja({ inicio: franja.inicio, fin: franja.fin, loAntesPosible: false })}
                        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink disabled:opacity-40"
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
              className="h-12 rounded-xl bg-accent font-bold text-surface disabled:opacity-40"
            >
              Empezar
            </button>
          )}

          {estado === 'en_preparacion' && (
            <button
              type="button"
              disabled={enviando}
              onClick={() => avanzar('pendiente_envio')}
              className="h-12 rounded-xl bg-accent font-bold text-surface disabled:opacity-40"
            >
              Listo
            </button>
          )}

          {estado === 'pendiente_envio' && modoEntrega === 'recogida' && (
            <button
              type="button"
              disabled={enviando}
              onClick={() => avanzar('entregado')}
              className="h-12 rounded-xl bg-accent font-bold text-surface disabled:opacity-40"
            >
              Entregado
            </button>
          )}

          {estado === 'pendiente_envio' && modoEntrega === 'domicilio' && (
            <p className="text-center text-sm text-ink-soft">Esperando a que un repartidor lo recoja.</p>
          )}

          {estado === 'en_reparto' && (
            <p className="text-center text-sm text-ink-soft">
              En reparto con {pedido.repartidor_id ? (nombresRepartidores[pedido.repartidor_id] ?? 'un repartidor') : 'un repartidor'}
            </p>
          )}
        </div>
      )}
    </article>
  )
}
```

- [ ] **Step 3: Verifica los tests de esta tarea**

Run: `pnpm vitest run src/components/panel/TableroPedidos.test.tsx src/components/panel/TarjetaPedido.test.tsx`
Expected: todos PASS, sin cambios de aserciones.

- [ ] **Step 4: Commit**

```bash
git add src/components/panel/TableroPedidos.tsx src/components/panel/TarjetaPedido.tsx
git commit -m "Aplica el rediseño visual a Cocina (tablero y tarjeta de pedido)"
```

---

### Task 3: Disponibilidad

**Files:**
- Modify: `src/components/panel/VistaDisponibilidad.tsx`
- Modify: `src/app/panel/(protegido)/carta/page.tsx`
- Test (ya existente, no se toca): `src/components/panel/VistaDisponibilidad.test.tsx`

**Interfaces:**
- `FilaDisponibilidad` (componente privado, no exportado): su prop `indentado?: boolean` se renombra a `pequeno?: boolean` — es un cambio interno, `VistaDisponibilidad` es su único consumidor y este mismo task actualiza ambos lados.
- `VistaDisponibilidad({ carta: Carta })` no cambia de firma.

- [ ] **Step 1: Reskin y reagrupación de `VistaDisponibilidad.tsx`**

El lienzo aprobado agrupa cada artículo y sus tamaños en UNA tarjeta (el interruptor del tamaño queda anidado dentro, más pequeño), en vez de filas sueltas separadas por una línea divisoria. Reemplaza el fichero completo por:

```tsx
'use client'

import { useState } from 'react'
import { mensajeDeError } from '@/lib/panel/erroresApi'
import type { Carta } from '@/lib/carta/tipos'

type FilaProps = {
  etiqueta: string
  disponibleInicial: boolean
  endpoint: string
  pequeno?: boolean
}

function FilaDisponibilidad({ etiqueta, disponibleInicial, endpoint, pequeno }: FilaProps) {
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

  const pistaClase = pequeno ? 'h-5 w-[34px]' : 'h-6 w-[42px]'
  const pulgarClase = pequeno ? 'h-4 w-4' : 'h-5 w-5'
  const pulgarActivo = pequeno ? 'left-[16px]' : 'left-[20px]'

  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`${pequeno ? 'text-xs' : 'text-sm'} ${disponible ? 'text-ink' : 'text-ink-soft'}`}>
        {etiqueta}
      </span>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-accent-dark">{error}</span>}
        <button
          type="button"
          role="switch"
          aria-checked={disponible}
          aria-label={etiqueta}
          disabled={enviando}
          onClick={alternar}
          className={`relative shrink-0 rounded-full transition disabled:opacity-40 ${pistaClase}`}
          style={{ backgroundColor: disponible ? 'var(--color-accent)' : 'rgba(43,32,21,0.18)' }}
        >
          <span
            className={`absolute top-0.5 left-0.5 block rounded-full bg-white transition ${pulgarClase} ${disponible ? pulgarActivo : ''}`}
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
          <h2 className="mb-2 font-display text-lg italic text-ink">{categoria.nombre}</h2>
          <div className="flex flex-col gap-2">
            {categoria.articulos.map((articulo) => (
              <div key={articulo.id} className="rounded-xl border border-border bg-surface p-3">
                <FilaDisponibilidad
                  etiqueta={articulo.nombre}
                  disponibleInicial={articulo.disponible}
                  endpoint={`/api/panel/carta/articulos/${articulo.id}/disponibilidad`}
                />
                {articulo.tamanos.length > 0 && (
                  <div className="mt-2.5 flex flex-col gap-1.5 pl-1">
                    {articulo.tamanos.map((tamano) => (
                      <FilaDisponibilidad
                        key={tamano.id}
                        etiqueta={tamano.nombre}
                        disponibleInicial={tamano.disponible}
                        endpoint={`/api/panel/carta/articulos/${articulo.id}/tamanos/${tamano.id}/disponibilidad`}
                        pequeno
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <section>
        <h2 className="mb-2 font-display text-lg italic text-ink">Complementos</h2>
        <div className="flex flex-col gap-2">
          {[...extrasUnicos.values()].map((extra) => (
            <div key={extra.id} className="rounded-xl border border-border bg-surface p-3">
              <FilaDisponibilidad
                etiqueta={extra.nombre}
                disponibleInicial={extra.disponible}
                endpoint={`/api/panel/carta/complementos/${extra.id}/disponibilidad`}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
```

Los tres endpoints (`.../articulos/${articulo.id}/disponibilidad`, `.../articulos/${articulo.id}/tamanos/${tamano.id}/disponibilidad`, `.../complementos/${extra.id}/disponibilidad`) son EXACTAMENTE los mismos que ya existían — el test `VistaDisponibilidad.test.tsx` los comprueba literalmente, no los cambies.

- [ ] **Step 2: Reskin de `carta/page.tsx`**

Reemplaza el fichero completo por:

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
          <Link
            href="/panel/carta/articulos"
            className="flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-center text-sm font-semibold text-ink"
          >
            Editar artículos
          </Link>
          <Link
            href="/panel/carta/complementos"
            className="flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-center text-sm font-semibold text-ink"
          >
            Editar complementos
          </Link>
        </div>
      )}
      <VistaDisponibilidad carta={carta} />
    </div>
  )
}
```

- [ ] **Step 3: Verifica el test de esta tarea**

Run: `pnpm vitest run src/components/panel/VistaDisponibilidad.test.tsx`
Expected: todos PASS (5 tests: muestra artículo/tamaños/complementos, desactiva artículo, pide disponibilidad de tamaño por pareja artículo+tamaño, muestra el interruptor con un solo tamaño, revierte el cambio si falla el servidor).

- [ ] **Step 4: Commit**

```bash
git add src/components/panel/VistaDisponibilidad.tsx "src/app/panel/(protegido)/carta/page.tsx"
git commit -m "Aplica el rediseño visual a Disponibilidad"
```

---

### Task 4: Ajustes

**Files:**
- Modify: `src/components/panel/FormularioAjustes.tsx`
- Modify: `src/components/panel/VistaAjustesSoloLectura.tsx`
- Test (ya existente, no se toca): `src/components/panel/FormularioAjustes.test.tsx`

**Interfaces:** ninguna firma cambia (`FormularioAjustes({ ajustesIniciales: Ajustes })`, `VistaAjustesSoloLectura({ ajustes: Ajustes })`).

- [ ] **Step 1: Reskin del `return` de `FormularioAjustes.tsx`**

No toques nada por encima de la línea 107 (estado y `guardar`/`actualizarTramo`/`anadirTramo`/`quitarTramo` quedan exactamente igual). Reemplaza el `return` final (líneas 107-243) por:

```tsx
  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">Restaurante</legend>
        <label className="flex flex-col gap-1">
          <span className="text-ink">Nombre</span>
          <input
            value={ajustes.nombreRestaurante}
            onChange={(e) => setAjustes((a) => ({ ...a, nombreRestaurante: e.target.value }))}
            className="rounded-lg border border-border bg-surface p-3 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink">Teléfono</span>
          <input
            value={ajustes.telefono}
            onChange={(e) => setAjustes((a) => ({ ...a, telefono: e.target.value }))}
            className="rounded-lg border border-border bg-surface p-3 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink">Dirección</span>
          <input
            value={ajustes.direccion}
            onChange={(e) => setAjustes((a) => ({ ...a, direccion: e.target.value }))}
            className="rounded-lg border border-border bg-surface p-3 text-ink"
          />
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">Horario semanal</legend>
        {DIAS.map((dia) => (
          <div key={dia.clave} className="flex flex-col gap-2">
            <p className="font-medium text-ink">{dia.etiqueta}</p>
            {ajustes.horario[dia.clave].length === 0 && <p className="text-sm text-ink-soft">Cerrado</p>}
            {ajustes.horario[dia.clave].map((tramo, indice) => (
              <div key={indice} className="flex items-center gap-2">
                <input
                  type="time"
                  value={tramo.desde}
                  onChange={(e) => actualizarTramo(dia.clave, indice, 'desde', e.target.value)}
                  className="rounded-lg border border-border bg-surface p-2 text-ink"
                />
                <span className="text-ink-soft">–</span>
                <input
                  type="time"
                  value={tramo.hasta}
                  onChange={(e) => actualizarTramo(dia.clave, indice, 'hasta', e.target.value)}
                  className="rounded-lg border border-border bg-surface p-2 text-ink"
                />
                <button
                  type="button"
                  onClick={() => quitarTramo(dia.clave, indice)}
                  className="text-sm font-semibold text-ink-soft"
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => anadirTramo(dia.clave)}
              className="self-start rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-ink"
            >
              Añadir tramo
            </button>
          </div>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">Reglas del pedido</legend>
        <label className="flex flex-col gap-1">
          <span className="text-ink">Coste de envío (€)</span>
          <input
            value={textoEnvio}
            onChange={(e) => setTextoEnvio(e.target.value)}
            className="rounded-lg border border-border bg-surface p-3 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink">Pedido mínimo a domicilio (€)</span>
          <input
            value={textoMinimo}
            onChange={(e) => setTextoMinimo(e.target.value)}
            className="rounded-lg border border-border bg-surface p-3 text-ink"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={envioGratisActivo}
            onChange={(e) => setEnvioGratisActivo(e.target.checked)}
            className="accent-[var(--color-accent)]"
          />
          <span className="text-ink">Envío gratis a partir de un importe</span>
        </label>
        {envioGratisActivo && (
          <label className="flex flex-col gap-1">
            <span className="text-ink">Envío gratis desde (€)</span>
            <input
              value={textoEnvioGratis}
              onChange={(e) => setTextoEnvioGratis(e.target.value)}
              className="rounded-lg border border-border bg-surface p-3 text-ink"
            />
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-ink">Antelación mínima (minutos)</span>
          <input
            type="number"
            value={ajustes.antelacionMinimaMin}
            onChange={(e) => setAjustes((a) => ({ ...a, antelacionMinimaMin: Number(e.target.value) }))}
            className="rounded-lg border border-border bg-surface p-3 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink">Duración de cada franja (minutos)</span>
          <input
            type="number"
            value={ajustes.duracionFranjaMin}
            onChange={(e) => setAjustes((a) => ({ ...a, duracionFranjaMin: Number(e.target.value) }))}
            className="rounded-lg border border-border bg-surface p-3 text-ink"
          />
        </label>
      </fieldset>

      {error && <p className="rounded-lg bg-accent-soft p-3 text-sm text-accent-dark">{error}</p>}
      {guardado && <p className="rounded-lg bg-success-soft p-3 text-sm text-success">Ajustes guardados.</p>}

      <button
        type="button"
        disabled={guardando}
        onClick={guardar}
        className="h-14 rounded-xl bg-accent text-lg font-bold text-surface disabled:opacity-40"
      >
        Guardar ajustes
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Reskin de `VistaAjustesSoloLectura.tsx`**

Reemplaza el fichero completo por:

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
        <p className="font-semibold text-ink">{ajustes.nombreRestaurante}</p>
        <p className="text-sm text-ink-soft">
          {ajustes.telefono} · {ajustes.direccion}
        </p>
      </div>
      <dl className="flex flex-col gap-1 text-sm text-ink">
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
      <dl className="flex flex-col gap-1 text-sm text-ink">
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

- [ ] **Step 3: Verifica el test de esta tarea**

Run: `pnpm vitest run src/components/panel/FormularioAjustes.test.tsx`
Expected: todos PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/panel/FormularioAjustes.tsx src/components/panel/VistaAjustesSoloLectura.tsx
git commit -m "Aplica el rediseño visual a Ajustes"
```

---

### Task 5: Equipo

**Files:**
- Modify: `src/components/panel/VistaEquipo.tsx`
- Test (ya existente, no se toca): `src/components/panel/VistaEquipo.test.tsx`

**Interfaces:** `VistaEquipo({ equipo: MiembroEquipo[] })` no cambia.

- [ ] **Step 1: Reskin del `return` de `VistaEquipo.tsx`**

No toques nada por encima de la línea 47 (estado y `invitar` quedan exactamente igual). Reemplaza el `return` final (líneas 47-112) por:

```tsx
  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-2">
        {equipo.map((miembro) => (
          <li
            key={miembro.userId}
            className="flex items-center justify-between rounded-xl border border-border bg-surface p-3"
          >
            <div>
              <p className="font-semibold text-ink">{miembro.nombre}</p>
              <p className="text-sm text-ink-soft">{miembro.email}</p>
            </div>
            <span
              className={`text-xs font-bold uppercase tracking-wide ${
                miembro.rol === 'admin' ? 'text-accent-dark' : 'text-ink-soft'
              }`}
            >
              {miembro.rol}
            </span>
          </li>
        ))}
      </ul>

      <fieldset className="flex flex-col gap-3 rounded-xl border border-border p-3">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">Invitar</legend>
        <label className="flex flex-col gap-1">
          <span className="text-ink">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-border bg-surface p-3 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink">Nombre</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="rounded-lg border border-border bg-surface p-3 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink">Rol</span>
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value as RolStaff)}
            className="rounded-lg border border-border bg-surface p-3 text-ink"
          >
            {ROLES.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.etiqueta}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-accent-dark">{error}</p>}
        {invitado && (
          <p className="rounded-lg bg-success-soft p-3 text-center text-sm font-semibold text-success">
            Invitación enviada a {invitado}.
          </p>
        )}

        <button
          type="button"
          disabled={enviando || !email || !nombre}
          onClick={invitar}
          className="h-12 rounded-full bg-accent font-bold text-surface disabled:opacity-40"
        >
          Invitar
        </button>
      </fieldset>
    </div>
  )
}
```

- [ ] **Step 2: Verifica el test de esta tarea**

Run: `pnpm vitest run src/components/panel/VistaEquipo.test.tsx`
Expected: todos PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/panel/VistaEquipo.tsx
git commit -m "Aplica el rediseño visual a Equipo"
```

---

### Task 6: Historial

**Files:**
- Modify: `src/components/panel/VistaHistorial.tsx`
- Test (ya existente, no se toca): `src/components/panel/VistaHistorial.test.tsx`

**Interfaces:** `VistaHistorial({ historialInicial: PedidoConLineas[], totalHoyCentimos: number })` no cambia.

- [ ] **Step 1: Reskin del `return` de `VistaHistorial.tsx`**

No toques nada por encima de la línea 21 (estado y `buscar` quedan exactamente igual). Reemplaza el `return` final (líneas 21-65) por:

```tsx
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Facturado hoy</p>
        <p className="mt-1.5 font-display text-3xl italic text-accent-dark">{formatearPrecio(totalHoyCentimos)}</p>
      </div>

      <div className="flex gap-2">
        <input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Buscar por teléfono"
          className="flex-1 rounded-lg border border-border bg-surface p-3 text-ink"
        />
        <button
          type="button"
          disabled={buscando}
          onClick={buscar}
          className="rounded-lg bg-accent px-4 font-bold text-surface disabled:opacity-40"
        >
          Buscar
        </button>
      </div>

      {historial.length === 0 && <p className="text-sm text-ink-soft">No hay pedidos entregados aquí.</p>}

      <ul className="flex flex-col gap-2">
        {historial.map((pedido) => (
          <li key={pedido.id} className="rounded-lg border border-border bg-surface p-3">
            <div className="flex justify-between">
              <span className="font-semibold text-ink">{pedido.codigo_publico}</span>
              <span className="font-semibold text-ink">{formatearPrecio(pedido.total_centimos)}</span>
            </div>
            <p className="text-sm text-ink-soft">
              {pedido.cliente_nombre} {pedido.cliente_apellidos} · {pedido.cliente_telefono}
            </p>
            {pedido.entregado_en && (
              <p className="text-sm text-ink-soft">
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

- [ ] **Step 2: Verifica el test de esta tarea**

Run: `pnpm vitest run src/components/panel/VistaHistorial.test.tsx`
Expected: todos PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/panel/VistaHistorial.tsx
git commit -m "Aplica el rediseño visual a Historial"
```

---

### Task 7: Formulario de artículo

**Files:**
- Modify: `src/components/panel/FormularioArticulo.tsx`
- Modify: `src/app/panel/(protegido)/carta/articulos/page.tsx`
- Test (ya existente, no se toca): `src/components/panel/FormularioArticulo.test.tsx`

**Interfaces:** `FormularioArticulo({ categorias, tamanos, extras, articuloInicial? })` no cambia.

- [ ] **Step 1: Añade el import de `Link` y reskin del `return` de `FormularioArticulo.tsx`**

Añade `import Link from 'next/link'` a la lista de imports (junto a los ya existentes de `react`, `next/navigation`, `next/image`). No toques nada del estado ni de `guardar`/`subirImagen`/`eliminar`/`alternarTamano`/`cambiarPrecioTamano`/`alternarExtra`. Reemplaza el `return` final (líneas 142-256) por:

```tsx
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/panel/carta/articulos" className="text-sm font-semibold text-ink-soft">
          ‹ Artículos
        </Link>
        <h1 className="font-display text-2xl italic text-ink">{editando ? 'Editar artículo' : 'Nuevo artículo'}</h1>
      </header>

      <label className="flex flex-col gap-1">
        <span className="text-ink">Nombre</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="rounded-lg border border-border bg-surface p-3 text-ink"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-ink">Descripción</span>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="rounded-lg border border-border bg-surface p-3 text-ink"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-ink">Categoría</span>
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="rounded-lg border border-border bg-surface p-3 text-ink"
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
          <span className="text-ink">Foto</span>
          <div className="relative h-32 w-32 overflow-hidden rounded-lg bg-accent-soft">
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
            className="self-start rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-ink disabled:opacity-40"
          >
            Subir foto
          </button>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">Podrás añadir la foto después de crear el artículo.</p>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">Tamaños</legend>
        {tamanosForm.map((t) => {
          const nombreTamano = tamanos.find((tam) => tam.id === t.tamanoId)?.nombre ?? ''
          return (
            <div key={t.tamanoId} className="rounded-xl border border-border bg-surface p-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={t.ofrecido}
                  onChange={() => alternarTamano(t.tamanoId)}
                  className="accent-[var(--color-accent)]"
                />
                <span className="font-semibold text-ink">{nombreTamano}</span>
              </label>
              {t.ofrecido && (
                <input
                  value={t.precioTexto}
                  onChange={(e) => cambiarPrecioTamano(t.tamanoId, e.target.value)}
                  placeholder="Precio (€)"
                  className="mt-2 ml-6 w-24 rounded-lg border border-border bg-surface p-2 text-ink"
                />
              )}
            </div>
          )
        })}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">Complementos</legend>
        {extras.map((extra) => (
          <label key={extra.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={extraIds.includes(extra.id)}
              onChange={() => alternarExtra(extra.id)}
              className="accent-[var(--color-accent)]"
            />
            <span className="text-ink">{extra.nombre}</span>
          </label>
        ))}
      </fieldset>

      {error && <p className="rounded-lg bg-accent-soft p-3 text-sm text-accent-dark">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={guardando || !nombre}
          onClick={guardar}
          className="h-12 flex-1 rounded-xl bg-accent font-bold text-surface disabled:opacity-40"
        >
          {editando ? 'Guardar cambios' : 'Crear artículo'}
        </button>
        {editando && (
          <button
            type="button"
            disabled={guardando}
            onClick={eliminar}
            className="h-12 rounded-full border border-peligro px-4 font-semibold text-peligro disabled:opacity-40"
          >
            Dar de baja
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Reskin de `carta/articulos/page.tsx`**

Reemplaza el fichero completo por:

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
        className="self-start rounded-full bg-accent px-4 py-2 font-bold text-surface"
      >
        Nuevo artículo
      </Link>
      {carta.categorias.map((categoria) => (
        <section key={categoria.id}>
          <h2 className="mb-2 font-display text-lg italic text-ink">{categoria.nombre}</h2>
          <ul className="flex flex-col gap-2">
            {categoria.articulos.map((articulo) => (
              <li key={articulo.id}>
                <Link
                  href={`/panel/carta/articulos/${articulo.id}`}
                  className="block rounded-xl border border-border bg-surface p-3 text-ink"
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

- [ ] **Step 3: Verifica el test de esta tarea**

Run: `pnpm vitest run src/components/panel/FormularioArticulo.test.tsx`
Expected: todos PASS (el nuevo `<header>` con "‹ Artículos" y el `<h1>` no chocan con ninguna consulta `getByLabelText`/`getByRole` del test).

- [ ] **Step 4: Commit**

```bash
git add src/components/panel/FormularioArticulo.tsx "src/app/panel/(protegido)/carta/articulos/page.tsx"
git commit -m "Aplica el rediseño visual al formulario y listado de artículos"
```

---

### Task 8: Formulario de complemento

**Files:**
- Modify: `src/components/panel/FormularioComplemento.tsx`
- Modify: `src/app/panel/(protegido)/carta/complementos/page.tsx`
- Test (ya existente, no se toca): `src/components/panel/FormularioComplemento.test.tsx`

**Interfaces:** `FormularioComplemento({ tamanos, categorias, complementoInicial? })` no cambia.

- [ ] **Step 1: Añade el import de `Link` y reskin del `return` de `FormularioComplemento.tsx`**

Añade `import Link from 'next/link'` a la lista de imports. No toques nada del estado ni de `guardar`/`eliminar`/`alternarArticulo`. Reemplaza el `return` final (líneas 97-193) por:

```tsx
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/panel/carta/complementos" className="text-sm font-semibold text-ink-soft">
          ‹ Complementos
        </Link>
        <h1 className="font-display text-2xl italic text-ink">
          {editando ? 'Editar complemento' : 'Nuevo complemento'}
        </h1>
      </header>

      <label className="flex flex-col gap-1">
        <span className="text-ink">Nombre</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="rounded-lg border border-border bg-surface p-3 text-ink"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-ink">Descripción</span>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="rounded-lg border border-border bg-surface p-3 text-ink"
        />
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Precio por tamaño (vacío = no se ofrece)
        </legend>
        {tamanos.map((tamano) => (
          <label key={tamano.id} className="flex items-center justify-between gap-3">
            <span className="text-ink">{tamano.nombre}</span>
            <input
              aria-label={tamano.nombre}
              value={precios[tamano.id]}
              onChange={(e) => setPrecios((actual) => ({ ...actual, [tamano.id]: e.target.value }))}
              placeholder="€"
              className="w-24 rounded-lg border border-border bg-surface p-2 text-ink"
            />
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">Productos</legend>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setArticuloIds(categorias.flatMap((c) => c.articulos.map((a) => a.id)))}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-ink-soft"
          >
            Seleccionar todos
          </button>
          <button
            type="button"
            onClick={() => setArticuloIds([])}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-ink-soft"
          >
            Ninguno
          </button>
        </div>
        {categorias.map((categoria) => (
          <div key={categoria.id} className="flex flex-col gap-1">
            <p className="font-display text-base italic text-ink">{categoria.nombre}</p>
            {categoria.articulos.map((articulo) => (
              <label key={articulo.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={articuloIds.includes(articulo.id)}
                  onChange={() => alternarArticulo(articulo.id)}
                  className="accent-[var(--color-accent)]"
                />
                <span className="text-ink">{articulo.nombre}</span>
              </label>
            ))}
          </div>
        ))}
      </fieldset>

      {error && <p className="rounded-lg bg-accent-soft p-3 text-sm text-accent-dark">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={guardando || !nombre}
          onClick={guardar}
          className="h-12 flex-1 rounded-xl bg-accent font-bold text-surface disabled:opacity-40"
        >
          {editando ? 'Guardar cambios' : 'Crear complemento'}
        </button>
        {editando && (
          <button
            type="button"
            disabled={guardando}
            onClick={eliminar}
            className="h-12 rounded-full border border-peligro px-4 font-semibold text-peligro disabled:opacity-40"
          >
            Dar de baja
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Reskin de `carta/complementos/page.tsx`**

Reemplaza el fichero completo por:

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
        className="self-start rounded-full bg-accent px-4 py-2 font-bold text-surface"
      >
        Nuevo complemento
      </Link>
      <ul className="flex flex-col gap-2">
        {extras.map((extra) => (
          <li key={extra.id}>
            <Link
              href={`/panel/carta/complementos/${extra.id}`}
              className="block rounded-xl border border-border bg-surface p-3 text-ink"
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

- [ ] **Step 3: Verifica el test de esta tarea**

Run: `pnpm vitest run src/components/panel/FormularioComplemento.test.tsx`
Expected: todos PASS (8 tests).

- [ ] **Step 4: Commit**

```bash
git add src/components/panel/FormularioComplemento.tsx "src/app/panel/(protegido)/carta/complementos/page.tsx"
git commit -m "Aplica el rediseño visual al formulario y listado de complementos"
```

---

### Task 9: Repartidor

**Files:**
- Modify: `src/components/panel/VistaReparto.tsx`
- Modify: `src/components/panel/TarjetaReparto.tsx`
- Test (ya existentes, no se tocan): `src/components/panel/VistaReparto.test.tsx`, `src/components/panel/TarjetaReparto.test.tsx`

**Interfaces:** ninguna firma cambia.

- [ ] **Step 1: Reskin del `return` de `VistaReparto.tsx`**

No toques nada por encima de la línea 74 (estado, el `useEffect` de tiempo real y `quitarPedido` quedan exactamente igual). Reemplaza el `return` final (líneas 74-104) por:

```tsx
  return (
    <div className="flex flex-col gap-4">
      <nav className="flex gap-2">
        {PESTANAS.map((pestana) => (
          <button
            key={pestana.id}
            type="button"
            onClick={() => setPestanaActiva(pestana.id)}
            className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold ${
              pestanaActiva === pestana.id
                ? 'border-accent bg-accent-soft text-accent-dark'
                : 'border-border bg-surface text-ink-soft'
            }`}
          >
            {pestana.etiqueta} ({pedidosDe(pestana.id).length})
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-4">
        {pedidosDeLaPestana.length === 0 && <p className="text-sm text-ink-soft">No hay pedidos aquí.</p>}
        {pedidosDeLaPestana.map((pedido) => (
          <TarjetaReparto
            key={pedido.id}
            pedido={pedido}
            onActualizado={(actualizado) => setPedidos((actuales) => fusionarPedidoEnLista(actuales, actualizado))}
            onConflicto={() => quitarPedido(pedido.id)}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Reskin del `return` de `TarjetaReparto.tsx`**

No toques nada por encima de la línea 46 (estado y `avanzar` quedan exactamente igual). Reemplaza el `return` final (líneas 46-130) por:

```tsx
  return (
    <article className="rounded-2xl border border-border bg-surface p-4">
      <header className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Pedido {pedido.codigo_publico}</p>
        <span className="rounded-full bg-success-soft px-2 py-1 text-xs font-bold text-success">
          Pagado online — no cobrar
        </span>
      </header>

      <p className="mt-2 font-semibold text-ink">
        {pedido.franja_solicitada_asap
          ? 'Lo antes posible'
          : `${formatearHoraFranja(pedido.franja_solicitada_inicio)}–${formatearHoraFranja(pedido.franja_solicitada_fin)}`}
        {pedido.franja_confirmada_inicio && pedido.franja_confirmada_fin && (
          <span className="text-success">
            {' '}
            → confirmado {formatearHoraFranja(pedido.franja_confirmada_inicio)}–
            {formatearHoraFranja(pedido.franja_confirmada_fin)}
          </span>
        )}
      </p>

      <p className="mt-2 font-display text-lg text-ink">
        {pedido.direccion_calle} {pedido.direccion_numero}
        {pedido.direccion_piso ? `, ${pedido.direccion_piso}` : ''}
      </p>
      <p className="text-sm text-ink-soft">
        {pedido.direccion_cp} {pedido.direccion_ciudad}
      </p>
      {pedido.direccion_indicaciones && (
        <p className="mt-1 text-sm font-semibold text-accent-dark">{pedido.direccion_indicaciones}</p>
      )}

      <div className="mt-3 flex gap-2">
        <a
          href={enlaceMapa(pedido)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-lg border border-border bg-ground px-3 py-2 text-center text-sm font-semibold text-ink"
        >
          Abrir en el mapa
        </a>
        <a
          href={`tel:${pedido.cliente_telefono}`}
          className="flex-1 rounded-lg border border-border bg-ground px-3 py-2 text-center text-sm font-semibold text-ink"
        >
          {pedido.cliente_telefono}
        </a>
      </div>

      <ul className="mt-3 flex flex-col gap-1 text-sm text-ink">
        {pedido.pedido_lineas.map((linea) => (
          <li key={linea.id}>
            {linea.cantidad}× {linea.nombre_articulo} · {linea.nombre_tamano}
            {linea.pedido_extras.length > 0 && (
              <span className="text-ink-soft"> ({linea.pedido_extras.map((e) => e.nombre_extra).join(', ')})</span>
            )}
          </li>
        ))}
      </ul>

      {pedido.notas && <p className="mt-3 rounded-lg bg-accent-soft p-2 text-sm text-accent-dark">{pedido.notas}</p>}
      {error && <p className="mt-3 rounded-lg bg-accent-soft p-2 text-sm text-accent-dark">{error}</p>}

      {pedido.estado === 'pendiente_envio' && (
        <button
          type="button"
          disabled={enviando}
          onClick={() => avanzar('en_reparto')}
          className="mt-4 h-12 w-full rounded-xl bg-accent font-bold text-surface disabled:opacity-40"
        >
          Recojo este
        </button>
      )}

      {pedido.estado === 'en_reparto' && (
        <button
          type="button"
          disabled={enviando}
          onClick={() => avanzar('entregado')}
          className="mt-4 h-12 w-full rounded-xl bg-accent font-bold text-surface disabled:opacity-40"
        >
          Entregado
        </button>
      )}
    </article>
  )
}
```

- [ ] **Step 3: Verifica los tests de esta tarea**

Run: `pnpm vitest run src/components/panel/VistaReparto.test.tsx src/components/panel/TarjetaReparto.test.tsx`
Expected: todos PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/panel/VistaReparto.tsx src/components/panel/TarjetaReparto.tsx
git commit -m "Aplica el rediseño visual a Repartidor"
```

---

### Task 10: Iniciar sesión e Invitación

**Files:**
- Modify: `src/components/panel/FormularioLogin.tsx`
- Modify: `src/app/panel/iniciar-sesion/page.tsx`
- Modify: `src/app/panel/invitacion/page.tsx`
- Test (ya existente, no se toca): `src/components/panel/FormularioLogin.test.tsx`

**Interfaces:** `FormularioLogin` sigue sin props.

- [ ] **Step 1: Reskin de `FormularioLogin.tsx`**

No toques nada del estado ni de `iniciarSesion`. Reemplaza el fichero completo por:

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
        <span className="text-ink">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-border bg-ground p-3 text-ink"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-ink">Contraseña</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-border bg-ground p-3 text-ink"
        />
      </label>

      {error && (
        <p className="rounded-lg bg-accent-soft p-3 text-center text-sm font-semibold text-accent-dark">
          Email o contraseña incorrectos.
        </p>
      )}

      <button
        type="button"
        disabled={enviando}
        onClick={iniciarSesion}
        className="h-14 rounded-full bg-accent text-lg font-bold text-surface disabled:opacity-40"
      >
        Entrar
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Reskin de `iniciar-sesion/page.tsx`**

Reemplaza el fichero completo por:

```tsx
import { FormularioLogin } from '@/components/panel/FormularioLogin'

export default function PaginaLogin() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="font-display text-3xl italic text-ink">El Horno del Caserón</h1>
        <p className="mt-1.5 text-sm text-ink-soft">Acceso del personal</p>
      </div>
      <FormularioLogin />
    </main>
  )
}
```

- [ ] **Step 3: Reskin de `invitacion/page.tsx`**

No toques nada de `establecerSesion` ni de `guardarContrasena`. Reemplaza el fichero completo por:

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

  if (fase === 'verificando') return <p className="p-4 text-ink">Comprobando la invitación…</p>
  if (fase === 'error') return <p className="p-4 text-accent-dark">{error}</p>

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="font-display text-2xl italic text-ink">Elige tu contraseña</h1>
      <label className="flex flex-col gap-1">
        <span className="text-ink">Contraseña</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-border bg-ground p-3 text-ink"
        />
      </label>
      {error && <p className="text-sm text-accent-dark">{error}</p>}
      <button
        type="button"
        disabled={fase === 'guardando' || password.length < 8}
        onClick={guardarContrasena}
        className="h-14 rounded-full bg-accent text-lg font-bold text-surface disabled:opacity-40"
      >
        Entrar
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Verifica el test de esta tarea**

Run: `pnpm vitest run src/components/panel/FormularioLogin.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/panel/FormularioLogin.tsx src/app/panel/iniciar-sesion/page.tsx src/app/panel/invitacion/page.tsx
git commit -m "Aplica el rediseño visual a Iniciar sesión e Invitación"
```

---

## Verificación final (whole-branch)

Tras completar las 10 tareas:

1. `pnpm test` — deben pasar los 236+ tests existentes (esta fase no añade tests nuevos: no cambia lógica, solo piel).
2. `pnpm build` — sin errores.
3. `grep -rE "neutral-|amber-|emerald-" src/app/panel src/app/reparto src/components/panel` — no debe devolver ninguna línea. Si aparece alguna, es una pantalla que se quedó sin migrar y hay que corregirla antes de dar la fase por terminada.
4. Repite la comprobación de regresión cruzada de las Fases 1 y 2: revisa si algún token o componente compartido que esta fase tocó (`globals.css`, `NavPanel`, `CerrarSesionBoton`) rompe visualmente alguna pantalla de cliente (carta, carrito, checkout, seguimiento) que no está en el alcance de esta fase — no debería, porque esta fase solo añade tokens nuevos y no toca ninguno existente, pero es el mismo tipo de fallo que se coló dos veces en las fases anteriores, así que conviene mirarlo explícitamente.
