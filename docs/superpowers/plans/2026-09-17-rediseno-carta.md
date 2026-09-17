# Rediseño visual — Sistema de diseño y carta — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir el tema oscuro genérico (`neutral-*`/`amber-*`, Geist) por la nueva
identidad de marca (pergamino/terracota, Instrument Serif + Work Sans) y cambiar la
navegación de categorías de la carta de pestañas horizontales a un riel vertical, en
la pantalla pública `/` (carta) y su ficha de producto.

**Architecture:** Los tokens de color y tipografía se declaran una sola vez en
`@theme` (Tailwind v4) y en las fuentes de `layout.tsx`, y de ahí en adelante se
consumen como utilidades normales (`bg-ground`, `text-ink`, `font-display`, etc.) en
todos los componentes — sin CSS-in-JS ni una librería de estilos nueva.
`PestanasCategorias.tsx` se sustituye por `RielCategorias.tsx` (layout vertical,
`position: sticky` en vez de una pestaña `overflow-x-auto`) y gana una capa de iconos
por categoría. `TarjetaArticulo.tsx` pasa de fila horizontal (imagen a la izquierda) a
columna (imagen arriba, texto debajo) — es una corrección deliberada: una primera
versión horizontal cortaba el texto de la tarjeta. Ningún componente cambia su lógica
de negocio ni sus props públicas salvo el renombrado de `PestanasCategorias`.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS v4, `next/font/google`,
Vitest, Testing Library, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-17-rediseno-visual.md` (secciones 2 y 3 —
la fila "Cliente" hasta "Ficha de artículo" del inventario de pantallas).

**Plan anterior:** ninguno — esta es la primera de varias fases del rediseño visual;
carrito/checkout/seguimiento y el panel interno (cocina, administración, repartidor,
login) son planes aparte que seguirán a este.

## Global Constraints

- **Gestor de paquetes: pnpm.** Nunca `npm` ni `npx`.
- **Solo cambio visual y de estructura de layout.** Ninguna tarea de este plan toca
  lógica de negocio, validación, tipos de dominio, endpoints ni esquema de base de
  datos. Si una prueba existente falla por algo que no sea una clase CSS o un texto de
  copy, es una señal de que el cambio se ha ido de alcance.
- **Paleta y tipografía exactas** (de la sección 2 del spec, sin desviarse):
  `--color-ground:#F7EFDF` `--color-rail:#EFE1C6` `--color-surface:#FFFCF5`
  `--color-ink:#2B2015` `--color-ink-soft:#7C6B52` `--color-border:rgba(43,32,21,0.14)`
  `--color-accent:#B8481F` `--color-accent-dark:#93381A`
  `--color-accent-soft:rgba(184,72,31,0.10)`. Fuente display: Instrument Serif
  (cursiva). Fuente de interfaz: Work Sans.
- **Nunca Geist, Inter, Roboto, Arial ni emoji como icono de interfaz.**
- **Idioma de la interfaz y del código de dominio: español**, sin acentos en
  identificadores.

---

## Tarea 1: Sistema de diseño — tokens de color y tipografía

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: utilidades Tailwind `bg-ground`, `bg-rail`, `bg-surface`, `text-ink`,
  `text-ink-soft`, `border-border`, `bg-accent`, `text-accent`, `bg-accent-dark`,
  `bg-accent-soft`, `text-accent-soft`, y la utilidad de fuente `font-display`
  (Instrument Serif itálica) además del `font-sans` ya existente (ahora Work Sans en
  vez de Geist Sans). Toda tarea posterior de este plan y de los siguientes consume
  estas utilidades tal cual.

Sin test unitario propio: es configuración de Tailwind y fuentes, no lógica. Se
verifica con `pnpm build`.

- [ ] **Step 1: Sustituir `src/app/globals.css`**

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
}
```

- [ ] **Step 2: Sustituir `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Instrument_Serif, Work_Sans } from 'next/font/google'
import './globals.css'

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
})

const workSans = Work_Sans({
  variable: '--font-work-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'El Horno del Caserón · Pedidos a domicilio',
  description:
    'Bocadillos, hamburguesas y sándwiches para recoger o pedir a domicilio en Torrejón de Ardoz.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="es"
      className={`${instrumentSerif.variable} ${workSans.variable} h-full antialiased`}
    >
      <body className="bg-ground text-ink antialiased">{children}</body>
    </html>
  )
}
```

(Aprovechamos el cambio para arreglar la descripción por defecto de `create-next-app`,
"Generated by create next app", que nadie había personalizado.)

- [ ] **Step 3: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores. La home debe verse con fondo pergamino y el
`<h1>` (todavía con las clases antiguas hasta la Tarea 5) en la fuente Work Sans por
herencia de `font-sans`.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "Sustituye Geist y la paleta oscura por el nuevo sistema de diseño"
```

---

## Tarea 2: Iconos de categoría

**Files:**
- Create: `src/components/carta/IconoCategoria.tsx`
- Test: `src/components/carta/IconoCategoria.test.tsx`

**Interfaces:**
- Consumes: nada (componente puro).
- Produces: `IconoCategoria({ nombre, className }: { nombre: string; className?: string }): JSX.Element`.
  La Tarea 3 lo usa pasando `categoria.nombre` tal cual viene de `CategoriaCarta`.

- [ ] **Step 1: Test que falla**

Crear `src/components/carta/IconoCategoria.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IconoCategoria } from './IconoCategoria'

describe('IconoCategoria', () => {
  it('renderiza un svg con un icono distinto para cada categoría real', () => {
    const { container: plancha } = render(<IconoCategoria nombre="Clásicos a la plancha" />)
    const { container: mar } = render(<IconoCategoria nombre="Del mar" />)
    const svgPlancha = plancha.querySelector('svg')
    const svgMar = mar.querySelector('svg')
    expect(svgPlancha).toBeInTheDocument()
    expect(svgMar).toBeInTheDocument()
    expect(svgPlancha?.innerHTML).not.toBe(svgMar?.innerHTML)
  })

  it('usa un icono genérico para una categoría que no tiene uno propio', () => {
    const { container } = render(<IconoCategoria nombre="Categoría nueva sin icono todavía" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('es decorativo: no interfiere con lectores de pantalla', () => {
    const { container } = render(<IconoCategoria nombre="Hamburguesas" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `pnpm test IconoCategoria`
Expected: FAIL — `src/components/carta/IconoCategoria.tsx` no existe todavía.

- [ ] **Step 3: Implementar**

Crear `src/components/carta/IconoCategoria.tsx`:

```tsx
import type { ReactNode } from 'react'

type Props = {
  nombre: string
  className?: string
}

/**
 * Trazos por categoría real de la carta (migración 0002_carta_inicial.sql). Una
 * categoría nueva que no esté en este mapa cae en el icono genérico de cubiertos:
 * nunca deja el riel sin icono.
 */
const ICONOS: Record<string, ReactNode> = {
  'Clásicos a la plancha': (
    <>
      <rect x="3" y="9" width="14" height="9" rx="2" />
      <line x1="17" y1="12" x2="22" y2="10" />
      <line x1="6" y1="12.5" x2="14" y2="12.5" />
      <line x1="6" y1="15" x2="14" y2="15" />
    </>
  ),
  'Ibéricos & embutidos': (
    <>
      <path d="M9 3c3 0 6 2 6 6 0 3-1 4-1 7 0 2-1.5 3.5-3 3.5S8 18 8 16c0-1-1-2-1-4 0-4-1-9 2-9Z" />
      <line x1="9" y1="7" x2="14" y2="7" />
      <line x1="9" y1="10" x2="14.5" y2="10" />
    </>
  ),
  'Huevos & tortilla': (
    <>
      <ellipse cx="12" cy="13" rx="7" ry="8" />
      <circle cx="12" cy="13" r="3" fill="currentColor" stroke="none" />
    </>
  ),
  'Del mar': (
    <>
      <path d="M3 12c3-4 8-6 12-4 2 1 4 2 6 1-1 2-1 5 0 7-2-1-4 0-6 1-4 2-9 0-12-4Z" />
      <circle cx="8" cy="11" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  'Gourmet Caserón': (
    <path d="M12 3.5l2.4 5.2 5.6.6-4.2 3.9 1.2 5.6L12 15.9l-5 2.9 1.2-5.6-4.2-3.9 5.6-.6Z" />
  ),
  Hamburguesas: (
    <>
      <path d="M4 10c0-3.5 3.6-6 8-6s8 2.5 8 6" />
      <line x1="3.5" y1="12.5" x2="20.5" y2="12.5" />
      <line x1="4" y1="15.5" x2="20" y2="15.5" />
      <path d="M3.5 18.5h17c0 1.4-1.3 2.5-3 2.5h-11c-1.7 0-3-1.1-3-2.5Z" />
    </>
  ),
  Sándwiches: (
    <>
      <path d="M3 19 12 5l9 14Z" />
      <line x1="6.3" y1="14" x2="17.7" y2="14" />
    </>
  ),
}

const GENERICO = (
  <>
    <path d="M7 3v7a1.7 1.7 0 0 0 1.7 1.7v9.3" />
    <line x1="7" y1="3" x2="7" y2="8" />
    <line x1="10" y1="3" x2="10" y2="8" />
    <path d="M16.5 3c-1.4 0-2.3 1.8-2.3 4s.9 4 2.3 4v10" />
  </>
)

export function IconoCategoria({ nombre, className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICONOS[nombre] ?? GENERICO}
    </svg>
  )
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `pnpm test IconoCategoria`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/carta/IconoCategoria.tsx src/components/carta/IconoCategoria.test.tsx
git commit -m "Añade los iconos de categoría del riel"
```

---

## Tarea 3: Riel vertical de categorías

**Files:**
- Create: `src/components/carta/RielCategorias.tsx`
- Test: `src/components/carta/RielCategorias.test.tsx`
- Delete: `src/components/carta/PestanasCategorias.tsx`
- Modify: `src/components/carta/VistaCarta.tsx`

**Interfaces:**
- Consumes: `IconoCategoria` (Tarea 2), `TarjetaArticulo` (sin cambios de props en
  esta tarea — sus clases cambian en la Tarea 4, pero eso no afecta a esta), tipos
  `ArticuloCarta`/`CategoriaCarta` de `@/lib/carta/tipos`.
- Produces: `RielCategorias({ categorias: CategoriaCarta[], onAbrirArticulo: (articulo: ArticuloCarta) => void }): JSX.Element`
  — misma firma exacta que tenía `PestanasCategorias`, así que `VistaCarta.tsx` solo
  cambia el nombre importado y la etiqueta JSX.

- [ ] **Step 1: Test que falla**

Crear `src/components/carta/RielCategorias.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RielCategorias } from './RielCategorias'
import type { ArticuloCarta, CategoriaCarta } from '@/lib/carta/tipos'

function articulo(id: string, nombre: string): ArticuloCarta {
  return {
    id,
    nombre,
    descripcion: 'Descripción de prueba',
    imagenUrl: null,
    disponible: true,
    tamanos: [{ id: `${id}-t`, nombre: 'Bocadillo', precioCentimos: 500, disponible: true }],
    extras: [],
  }
}

function categorias(): CategoriaCarta[] {
  return [
    { id: 'c-1', nombre: 'Clásicos a la plancha', articulos: [articulo('a-1', 'Lomo')] },
    { id: 'c-2', nombre: 'Del mar', articulos: [articulo('a-2', 'Rejos fritos')] },
  ]
}

describe('RielCategorias', () => {
  it('muestra los artículos de la primera categoría por defecto', () => {
    render(<RielCategorias categorias={categorias()} onAbrirArticulo={vi.fn()} />)
    expect(screen.getByText('Lomo')).toBeInTheDocument()
    expect(screen.queryByText('Rejos fritos')).not.toBeInTheDocument()
  })

  it('cambia de categoría al pulsar otra del riel', async () => {
    render(<RielCategorias categorias={categorias()} onAbrirArticulo={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Del mar/ }))
    expect(screen.getByText('Rejos fritos')).toBeInTheDocument()
    expect(screen.queryByText('Lomo')).not.toBeInTheDocument()
  })

  it('marca con aria-current la categoría activa, y solo esa', async () => {
    render(<RielCategorias categorias={categorias()} onAbrirArticulo={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Clásicos a la plancha/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
    await userEvent.click(screen.getByRole('button', { name: /Del mar/ }))
    expect(screen.getByRole('button', { name: /Del mar/ })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: /Clásicos a la plancha/ })).toHaveAttribute(
      'aria-current',
      'false',
    )
  })

  it('abre la ficha del artículo pulsado', async () => {
    const onAbrirArticulo = vi.fn()
    render(<RielCategorias categorias={categorias()} onAbrirArticulo={onAbrirArticulo} />)
    await userEvent.click(screen.getByRole('button', { name: 'Lomo' }))
    expect(onAbrirArticulo).toHaveBeenCalledWith(expect.objectContaining({ id: 'a-1' }))
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `pnpm test RielCategorias`
Expected: FAIL — `src/components/carta/RielCategorias.tsx` no existe todavía.

- [ ] **Step 3: Implementar**

Crear `src/components/carta/RielCategorias.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { ArticuloCarta, CategoriaCarta } from '@/lib/carta/tipos'
import { IconoCategoria } from './IconoCategoria'
import { TarjetaArticulo } from './TarjetaArticulo'

type Props = {
  categorias: CategoriaCarta[]
  onAbrirArticulo: (articulo: ArticuloCarta) => void
}

export function RielCategorias({ categorias, onAbrirArticulo }: Props) {
  const [activa, setActiva] = useState(categorias[0]?.id ?? '')
  const categoria = categorias.find((c) => c.id === activa) ?? categorias[0]

  return (
    <div className="flex items-start bg-rail">
      <nav
        aria-label="Categorías de la carta"
        className="sticky top-0 flex w-[92px] shrink-0 flex-col gap-0.5 self-start py-3 lg:w-64 lg:gap-1 lg:py-7"
      >
        {categorias.map((c) => {
          const esActiva = c.id === categoria?.id
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiva(c.id)}
              aria-current={esActiva}
              className={`relative mx-1.5 flex flex-col items-center gap-1.5 rounded-xl px-1.5 py-2.5 text-center lg:mx-0 lg:flex-row lg:gap-3 lg:rounded-lg lg:px-3.5 lg:py-3 lg:text-left
                ${esActiva ? 'bg-surface text-accent' : 'text-ink-soft'}`}
            >
              <span
                aria-hidden="true"
                className={`absolute -left-1.5 top-2 bottom-2 w-[3px] rounded-r-full lg:left-0
                  ${esActiva ? 'bg-accent' : 'bg-transparent'}`}
              />
              <IconoCategoria nombre={c.nombre} className="shrink-0" />
              <span className="text-[10.5px] font-semibold leading-tight lg:text-sm">{c.nombre}</span>
            </button>
          )
        })}
      </nav>

      <div className="min-w-0 flex-1 border-l border-border bg-ground px-4 pb-[82px] pt-[18px] lg:px-9 lg:pb-16 lg:pt-8">
        <div className="mb-3.5">
          <h2 className="font-display text-[23px] italic text-ink lg:text-[27px]">{categoria?.nombre}</h2>
          <p className="mt-0.5 text-xs text-ink-soft">
            {categoria?.articulos.length} {categoria?.articulos.length === 1 ? 'bocadillo' : 'bocadillos'}
          </p>
        </div>

        <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-3 lg:gap-5">
          {categoria?.articulos.map((articulo) => (
            <TarjetaArticulo key={articulo.id} articulo={articulo} onAbrir={onAbrirArticulo} />
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `pnpm test RielCategorias`
Expected: PASS.

- [ ] **Step 5: Borrar el componente antiguo**

```bash
git rm src/components/carta/PestanasCategorias.tsx
```

(No existía `PestanasCategorias.test.tsx` — no hay test que borrar.)

- [ ] **Step 6: Actualizar `VistaCarta.tsx`**

En `src/components/carta/VistaCarta.tsx`, cambiar el import y el uso:

```tsx
import { RielCategorias } from './RielCategorias'
```

```tsx
<RielCategorias categorias={carta.categorias} onAbrirArticulo={setAbierto} />
```

(sustituye la línea `import { PestanasCategorias } from './PestanasCategorias'` y la
etiqueta `<PestanasCategorias .../>` — el resto del fichero no cambia.)

- [ ] **Step 7: Ejecutar toda la suite y comprobar que compila**

Run: `pnpm test && pnpm build`
Expected: PASS / compilación sin errores.

- [ ] **Step 8: Commit**

```bash
git add src/components/carta/RielCategorias.tsx src/components/carta/RielCategorias.test.tsx \
  src/components/carta/VistaCarta.tsx
git commit -m "Sustituye las pestañas horizontales de categorías por un riel vertical"
```

---

## Tarea 4: Tarjeta de artículo — imagen arriba, texto debajo

**Files:**
- Modify: `src/components/carta/TarjetaArticulo.tsx`
- Modify: `src/components/carta/TarjetaArticulo.test.tsx`

**Interfaces:**
- Sin cambios de props ni de comportamiento: mismos parámetros
  `{ articulo: ArticuloCarta; onAbrir: (articulo: ArticuloCarta) => void }`.

Esta tarea es puramente visual: cambia de fila horizontal (imagen 80×80 a la
izquierda, que dejaba el texto sin espacio) a columna (imagen a todo el ancho arriba,
texto debajo) — la misma corrección que ya se validó en el lienzo de diseño tras
detectar que la versión horizontal cortaba el texto.

- [ ] **Step 1: Actualizar el test que fija el texto en minúscula**

En `src/components/carta/TarjetaArticulo.test.tsx`, el nuevo copy usa "Desde" con
mayúscula inicial (antes era "desde"). Reemplazar las dos líneas afectadas:

```tsx
    expect(screen.getByText(/Desde 4,00/)).toBeInTheDocument()
```

```tsx
    expect(screen.getByText(/Desde 5,00/)).toBeInTheDocument()
    expect(screen.queryByText(/Desde 4,00/)).not.toBeInTheDocument()
```

(son las líneas 27, 55 y 56 del fichero actual — el resto de `TarjetaArticulo.test.tsx`
no cambia.)

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `pnpm test TarjetaArticulo`
Expected: FAIL — el componente todavía devuelve "desde 4,00 €" en minúscula.

- [ ] **Step 3: Sustituir `TarjetaArticulo.tsx`**

```tsx
'use client'

import Image from 'next/image'
import { articuloDisponible } from '@/lib/carta/reglas'
import type { ArticuloCarta } from '@/lib/carta/tipos'
import { formatearPrecio } from '@/lib/dinero'

type Props = {
  articulo: ArticuloCarta
  onAbrir: (articulo: ArticuloCarta) => void
}

export function TarjetaArticulo({ articulo, onAbrir }: Props) {
  const disponible = articuloDisponible(articulo)
  const tamanosDisponibles = articulo.tamanos.filter((t) => t.disponible)
  // Si ningún tamaño está disponible hoy, se recurre a la lista completa: el
  // artículo ya aparece atenuado y sin poder abrirse, pero debe mostrar algún
  // precio en vez de "∞ €" (Math.min de un array vacío).
  const tamanosParaPrecio = tamanosDisponibles.length > 0 ? tamanosDisponibles : articulo.tamanos
  const precioMinimo =
    tamanosParaPrecio.length > 0
      ? Math.min(...tamanosParaPrecio.map((t) => t.precioCentimos))
      : 0

  return (
    <button
      type="button"
      disabled={!disponible}
      onClick={() => onAbrir(articulo)}
      aria-label={articulo.nombre}
      className={`flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-sm transition
        ${disponible ? 'active:scale-[0.99]' : 'opacity-55'}`}
    >
      <div className="relative h-[138px] w-full shrink-0 lg:h-[168px]">
        {articulo.imagenUrl ? (
          <Image
            src={articulo.imagenUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-accent-soft">
            <svg
              viewBox="0 0 24 24"
              width="32"
              height="32"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent opacity-55"
              aria-hidden="true"
            >
              <path d="M7 3v7a1.7 1.7 0 0 0 1.7 1.7v9.3" />
              <line x1="7" y1="3" x2="7" y2="8" />
              <line x1="10" y1="3" x2="10" y2="8" />
              <path d="M16.5 3c-1.4 0-2.3 1.8-2.3 4s.9 4 2.3 4v10" />
            </svg>
          </div>
        )}
        {!disponible && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-ink/80 px-2.5 py-1 text-[10.5px] font-semibold text-surface">
            Hoy no disponible
          </span>
        )}
      </div>

      <div className="flex flex-col gap-0.5 p-3.5">
        <h3 className="font-display text-[17px] text-ink">{articulo.nombre}</h3>
        <p className="line-clamp-1 text-[12.5px] text-ink-soft lg:line-clamp-2">{articulo.descripcion}</p>
        <p className="mt-0.5 text-[13px] font-semibold text-ink">
          {articulo.tamanos.length > 1
            ? `Desde ${formatearPrecio(precioMinimo)}`
            : formatearPrecio(precioMinimo)}
        </p>
      </div>
    </button>
  )
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `pnpm test TarjetaArticulo`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/carta/TarjetaArticulo.tsx src/components/carta/TarjetaArticulo.test.tsx
git commit -m "Pone la foto del artículo a todo el ancho arriba y el texto debajo"
```

---

## Tarea 5: Cabecera de la página principal

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `RielCategorias` a través de `VistaCarta` (sin cambios en esta tarea).

Ninguna página de este proyecto tiene test unitario propio — se verifica con
`pnpm build` y comprobación manual.

- [ ] **Step 1: Sustituir `src/app/page.tsx`**

```tsx
import { obtenerCarta, obtenerReglas } from '@/lib/carta/consultas'
import { VistaCarta } from '@/components/carta/VistaCarta'

export const revalidate = 60

export default async function PaginaCarta() {
  const [carta, reglas] = await Promise.all([obtenerCarta(), obtenerReglas()])

  return (
    <main className="mx-auto max-w-[1440px]">
      <header className="border-b border-border px-5 py-6">
        <h1 className="font-display text-[29px] italic text-ink">El Horno del Caserón</h1>
        <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-soft">
          Asador y casa de comidas · Torrejón de Ardoz
        </p>
      </header>
      <VistaCarta carta={carta} reglas={reglas} />
    </main>
  )
}
```

(Se quita `mx-auto max-w-lg px-4` del `<main>` original: el riel de categorías ahora
necesita ocupar el ancho completo para quedar pegado al borde izquierdo, con su propio
padding interno. El `max-w-[1440px] mx-auto` en el `<main>` evita que se estire sin
límite en pantallas muy anchas.)

- [ ] **Step 2: Comprobar que compila**

Run: `pnpm build`
Expected: compilación sin errores.

- [ ] **Step 3: Comprobación manual**

Run: `pnpm dev`, abrir `http://localhost:3000` y confirmar a ojo:
- El riel de categorías queda pegado a la izquierda, con icono y nombre por categoría.
- Al pulsar una categoría cambian los artículos de la derecha sin recargar.
- Las tarjetas muestran la foto a todo su ancho arriba y el texto debajo.
- En una ventana ancha (redimensionar el navegador a >1024px) los artículos pasan a
  verse en una cuadrícula de 3 columnas y el riel gana texto en línea con el icono.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "Da a la cabecera de la carta la nueva identidad visual"
```

---

## Tarea 6: Ficha de artículo — nueva piel visual

**Files:**
- Modify: `src/components/carta/FichaArticulo.tsx`
- Modify: `src/components/ui/HojaInferior.tsx`

**Interfaces:**
- Sin cambios de props, estado interno ni comportamiento en ninguno de los dos
  componentes — solo cambian las clases CSS. `FichaArticulo.test.tsx` no hace ninguna
  aserción sobre clases (comprobado: solo consulta por rol/texto/label), así que debe
  seguir en verde sin tocarlo.

- [ ] **Step 1: Sustituir `src/components/ui/HojaInferior.tsx`**

```tsx
'use client'

import { useEffect, type ReactNode } from 'react'

type Props = {
  titulo: string
  onCerrar: () => void
  children: ReactNode
}

export function HojaInferior({ titulo, onCerrar, children }: Props) {
  useEffect(() => {
    function alPulsarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPulsarTecla)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alPulsarTecla)
      document.body.style.overflow = ''
    }
  }, [onCerrar])

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-ink/55" onClick={onCerrar} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4 pb-8 text-ink"
      >
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Sustituir `src/components/carta/FichaArticulo.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { HojaInferior } from '@/components/ui/HojaInferior'
import { extrasParaTamano } from '@/lib/carta/reglas'
import type { ArticuloCarta } from '@/lib/carta/tipos'
import { formatearPrecio } from '@/lib/dinero'
import { precioLinea } from '@/lib/precios'
import type { LineaParaCarrito } from '@/lib/carrito/tipos'

type Props = {
  articulo: ArticuloCarta
  onCerrar: () => void
  onAnadir: (linea: LineaParaCarrito) => void
}

export function FichaArticulo({ articulo, onCerrar, onAnadir }: Props) {
  const tamanosDisponibles = articulo.tamanos.filter((t) => t.disponible)
  const [tamanoId, setTamanoId] = useState(tamanosDisponibles[0]?.id ?? '')
  const [extrasElegidos, setExtrasElegidos] = useState<string[]>([])
  const [cantidad, setCantidad] = useState(1)
  const [notasLinea, setNotasLinea] = useState('')

  const tamano = articulo.tamanos.find((t) => t.id === tamanoId)
  const extrasDelTamano = extrasParaTamano(articulo, tamanoId)

  // Al cambiar de tamaño, un extra elegido puede dejar de tener precio. Se
  // descarta en silencio en lugar de arrastrar una línea impagable.
  const extrasAplicados = extrasDelTamano
    .filter((extra) => extrasElegidos.includes(extra.id) && extra.disponible)
    .map((extra) => ({
      extraId: extra.id,
      nombre: extra.nombre,
      precioCentimos: extra.precioPorTamanoId[tamanoId],
    }))

  const total = tamano
    ? precioLinea({
        articuloId: articulo.id,
        tamanoId,
        precioUnitarioCentimos: tamano.precioCentimos,
        extras: extrasAplicados,
        cantidad,
      })
    : 0

  function alternarExtra(id: string) {
    setExtrasElegidos((actuales) =>
      actuales.includes(id) ? actuales.filter((e) => e !== id) : [...actuales, id],
    )
  }

  return (
    <HojaInferior titulo={articulo.nombre} onCerrar={onCerrar}>
      <h2 className="font-display text-2xl italic text-ink">{articulo.nombre}</h2>
      <p className="mt-1 text-sm text-ink-soft">{articulo.descripcion}</p>

      <fieldset className="mt-5">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Tamaño
        </legend>
        <div className="flex flex-col gap-2">
          {articulo.tamanos.map((t) => (
            <label
              key={t.id}
              className={`flex items-center justify-between rounded-xl border p-3
                ${t.id === tamanoId ? 'border-accent bg-accent-soft text-accent-dark' : 'border-border'}
                ${t.disponible ? '' : 'opacity-50'}`}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="tamano"
                  value={t.id}
                  checked={t.id === tamanoId}
                  disabled={!t.disponible}
                  onChange={() => setTamanoId(t.id)}
                  className="accent-[var(--color-accent)]"
                />
                {t.nombre}
              </span>
              <span className="font-semibold">{formatearPrecio(t.precioCentimos)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {extrasDelTamano.length > 0 && (
        <fieldset className="mt-5">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Complementos
          </legend>
          <div className="flex flex-col gap-2">
            {extrasDelTamano.map((extra) => (
              <label
                key={extra.id}
                className={`flex items-center justify-between rounded-xl border border-border p-3
                  ${extra.disponible ? '' : 'opacity-50'}`}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={extrasElegidos.includes(extra.id)}
                    disabled={!extra.disponible}
                    onChange={() => alternarExtra(extra.id)}
                    className="accent-[var(--color-accent)]"
                  />
                  <span>
                    {extra.nombre}
                    {!extra.disponible && (
                      <span className="ml-2 text-xs uppercase tracking-wide text-accent">
                        Hoy no disponible
                      </span>
                    )}
                  </span>
                </span>
                <span className="font-semibold">
                  {formatearPrecio(extra.precioPorTamanoId[tamanoId])}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="mt-5 block">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Nota para la cocina
        </span>
        <input
          type="text"
          value={notasLinea}
          onChange={(e) => setNotasLinea(e.target.value)}
          placeholder="sin tomate, poco hecho..."
          className="mt-2 w-full rounded-xl border border-border bg-ground p-3 text-ink"
        />
      </label>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="button"
          aria-label="Reducir cantidad"
          onClick={() => setCantidad((c) => Math.max(1, c - 1))}
          className="h-11 w-11 rounded-full border border-border text-xl text-ink"
        >
          −
        </button>
        <span aria-live="polite" className="w-6 text-center text-lg font-semibold text-ink">
          {cantidad}
        </span>
        <button
          type="button"
          aria-label="Aumentar cantidad"
          onClick={() => setCantidad((c) => c + 1)}
          className="h-11 w-11 rounded-full bg-accent text-xl text-surface"
        >
          +
        </button>
      </div>

      <button
        type="button"
        disabled={!tamano}
        onClick={() =>
          tamano &&
          onAnadir({
            articuloId: articulo.id,
            nombreArticulo: articulo.nombre,
            imagenUrl: articulo.imagenUrl,
            tamanoId,
            nombreTamano: tamano.nombre,
            precioUnitarioCentimos: tamano.precioCentimos,
            extras: extrasAplicados,
            cantidad,
            notasLinea,
          })
        }
        className="mt-6 h-14 w-full rounded-xl bg-accent text-lg font-bold text-surface"
      >
        Añadir · {formatearPrecio(total)}
      </button>
    </HojaInferior>
  )
}
```

- [ ] **Step 3: Ejecutar toda la suite**

Run: `pnpm test && pnpm build`
Expected: PASS / compilación sin errores. `FichaArticulo.test.tsx` no debería
necesitar ningún cambio.

- [ ] **Step 4: Commit**

```bash
git add src/components/carta/FichaArticulo.tsx src/components/ui/HojaInferior.tsx
git commit -m "Da a la ficha de artículo y a la hoja inferior la nueva piel visual"
```

---

## Verificación final

- [ ] `pnpm test` — todos los tests unitarios en verde.
- [ ] `pnpm build` — compila sin errores.
- [ ] Comprobación manual en `pnpm dev`: riel vertical funcional, tarjetas con foto
  arriba/texto debajo, ficha de producto con la nueva piel, todo en pergamino/terracota
  con Instrument Serif + Work Sans — sin ningún resto de `neutral-*`/`amber-*`/Geist en
  los ficheros tocados por este plan.
- [ ] `BarraCarrito.tsx` y `HojaCarrito.tsx` siguen con su piel antigua a propósito:
  es el siguiente plan (carrito/checkout/seguimiento) el que los rediseña. No tocarlos
  aquí aunque convivan visualmente con la carta ya rediseñada mientras tanto.
