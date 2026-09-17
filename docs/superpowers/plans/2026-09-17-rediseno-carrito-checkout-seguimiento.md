# Rediseño visual — Carrito, checkout y seguimiento — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Terminar de aplicar la nueva identidad visual (pergamino/terracota,
Instrument Serif + Work Sans) al resto del flujo de cliente que la Fase 1 dejó
fuera a propósito: la barra y la hoja del carrito, el formulario de checkout y
la pantalla de seguimiento del pedido — añadiendo a esta última una línea de
tiempo vertical que hoy no existe. De paso, da a checkout y seguimiento un
layout de dos columnas en escritorio.

**Architecture:** Cada componente conserva el 100% de su lógica y sus
`data-testid`/roles — solo cambian clases CSS y, en `FormularioCheckout.tsx` y
`EstadoPedido.tsx`, la disposición del JSX (formulario a la izquierda, resumen
fijo a la derecha en escritorio, apilado en móvil vía `lg:flex-row`), nunca el
comportamiento. Los seis árboles de rutas que la Fase 1 dejó con su piel
oscura fijada en local (`checkout/page.tsx`, `pedido/[codigo]/page.tsx`, y
cuatro más del panel interno que esta fase tampoco toca) recuperan aquí su
verdadero rediseño en los dos casos que sí tocamos — el resto sigue fijado
hasta su propia fase. Una función pura nueva (`fasesSeguimiento`) traduce el
estado real del pedido a la línea de tiempo, sin inventar ningún estado que no
exista ya en `EstadoPedido`.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS v4, Vitest,
Testing Library, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-17-rediseno-visual.md` (sección 2, y
en la sección 3 las filas "Carrito", "Carrito (escritorio)", "Checkout",
"Checkout (escritorio)", "Seguimiento del pedido" y "Seguimiento
(escritorio)").

**Plan anterior:** `docs/superpowers/plans/2026-09-17-rediseno-carta.md`
(sistema de diseño y carta — completado). Ese plan dejó fijada la piel oscura
antigua en `checkout/page.tsx` y `pedido/[codigo]/page.tsx` (con
`bg-neutral-950 text-neutral-100` en el `<main>`) como parche puente mientras
esta fase llegaba — las Tareas 3 y 5 de este plan quitan ese parche y hacen el
rediseño real.

## Global Constraints

- **Gestor de paquetes: pnpm.** Nunca `npm` ni `npx`.
- **Solo cambio visual y de estructura de layout.** Ninguna tarea de este plan
  toca lógica de negocio, validación, tipos de dominio, endpoints ni esquema
  de base de datos. Toda la lógica de `FormularioCheckout.tsx` (el bloqueo de
  domicilio bajo mínimo, la validación, el envío del pedido) y de
  `EstadoPedido.tsx` (el polling cada 15s) se mantiene exactamente igual.
- **Paleta y tipografía**: los mismos tokens que ya existen desde la Fase 1
  (`--color-ground`, `--color-rail`, `--color-surface`, `--color-ink`,
  `--color-ink-soft`, `--color-border`, `--color-accent`,
  `--color-accent-dark`, `--color-accent-soft`, `--color-success`,
  `--color-success-soft`, más `font-display`/`font-sans`) — ninguna tarea de
  este plan necesita añadir tokens nuevos.
- **Nunca Geist, Inter, Roboto, Arial ni emoji como icono de interfaz.**
- **Idioma de la interfaz y del código de dominio: español**, sin acentos en
  identificadores.

---

## Tarea 1: Hoja inferior — límite de ancho en pantallas grandes

**Files:**
- Modify: `src/components/ui/HojaInferior.tsx`

**Interfaces:**
- Sin cambios de props (`{ titulo: string; onCerrar: () => void; children: ReactNode }`)
  ni de comportamiento (Escape para cerrar, bloqueo de scroll del body, cierre
  al pulsar el fondo). Solo cambian las clases de layout del panel.

Este componente lo comparten `FichaArticulo.tsx` (Fase 1) y
`HojaCarrito.tsx` (Tarea 2 de este plan) — al arreglarlo aquí, ambos ganan el
límite de ancho a la vez. No hay test propio de este componente que revisar
(comprobado: no existe `HojaInferior.test.tsx`).

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
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-ink/55" onClick={onCerrar} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4 pb-8 text-ink sm:mb-6 sm:max-w-lg sm:rounded-2xl"
      >
        {children}
      </div>
    </div>
  )
}
```

(El único cambio es añadir `justify-center` al contenedor y
`sm:mb-6 sm:max-w-lg sm:rounded-2xl` al panel: por debajo de 640px de ancho
—cualquier móvil— se ve exactamente igual que antes, a partir de ahí el panel
deja de estirarse de borde a borde y queda centrado con un ancho máximo, con
las cuatro esquinas redondeadas en vez de solo las de arriba.)

- [ ] **Step 2: Ejecutar la suite y comprobar que compila**

Run: `pnpm test && pnpm build`
Expected: PASS / compilación sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/HojaInferior.tsx
git commit -m "Limita el ancho de la hoja inferior en pantallas grandes"
```

---

## Tarea 2: Barra y hoja de carrito — nueva piel visual

**Files:**
- Modify: `src/components/carrito/BarraCarrito.tsx`
- Modify: `src/components/carrito/HojaCarrito.tsx`

**Interfaces:**
- Sin cambios de props, estado ni comportamiento en ninguno de los dos
  componentes.

`HojaCarrito.tsx` ya tiene parte de su piel migrada (lo hizo el parche puente
de la Fase 1, que corrigió el contraste de los tres avisos y el texto
secundario porque se habían quedado ilegibles cuando `HojaInferior.tsx` pasó a
fondo claro). Lo que queda por migrar en `HojaCarrito.tsx` son solo cuatro
clases sueltas; `BarraCarrito.tsx` no lo ha tocado nadie todavía y necesita el
cambio completo. No existe `BarraCarrito.test.tsx`, y `HojaCarrito.test.tsx`
no hace ninguna aserción sobre clases (comprobado de antemano) — ningún test
necesita cambios en esta tarea.

- [ ] **Step 1: Sustituir `src/components/carrito/BarraCarrito.tsx`**

```tsx
'use client'

import { useCarrito } from '@/lib/carrito/store'
import { formatearPrecio } from '@/lib/dinero'
import { calcularResumen } from '@/lib/precios'
import type { ReglasPedido } from '@/lib/precios/tipos'

type Props = {
  reglas: ReglasPedido
  onAbrir: () => void
}

export function BarraCarrito({ reglas, onAbrir }: Props) {
  const lineas = useCarrito((estado) => estado.lineas)
  if (lineas.length === 0) return null

  const unidades = lineas.reduce((total, linea) => total + linea.cantidad, 0)
  const resumen = calcularResumen(lineas, 'domicilio', reglas)

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface p-4">
      <button
        type="button"
        onClick={onAbrir}
        className="mx-auto flex h-14 w-full max-w-lg items-center justify-between rounded-xl bg-accent px-5 font-bold text-surface"
      >
        <span>
          Ver pedido · {unidades} {unidades === 1 ? 'artículo' : 'artículos'}
        </span>
        <span>{formatearPrecio(resumen.subtotalCentimos)}</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: En `src/components/carrito/HojaCarrito.tsx`, cambiar exactamente estas cuatro clases**

1. En el botón "Reducir" (línea con `aria-label={\`Reducir ${linea.nombreArticulo}\`}`):
   `border border-neutral-700` → `border border-border`
2. En el botón "Aumentar" (línea con `aria-label={\`Aumentar ${linea.nombreArticulo}\`}`):
   `border border-neutral-700` → `border border-border`
3. En el `<dl>` del resumen: `border-t border-neutral-800` → `border-t border-border`
4. En el botón "Continuar": `bg-amber-500 text-lg font-bold text-neutral-950` → `bg-accent text-lg font-bold text-surface`

No toques ninguna otra línea del fichero — todo lo demás (el mensaje de
mínimo, el de envío gratis progresivo, el de envío gratis conseguido, el texto
secundario) ya está en los tokens nuevos desde la Fase 1.

- [ ] **Step 3: Ejecutar la suite y comprobar que compila**

Run: `pnpm test && pnpm build`
Expected: PASS / compilación sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/components/carrito/BarraCarrito.tsx src/components/carrito/HojaCarrito.tsx
git commit -m "Da a la barra y a la hoja de carrito la nueva identidad visual"
```

---

## Tarea 3: Checkout — nueva piel visual y layout de escritorio

**Files:**
- Modify: `src/components/checkout/FormularioCheckout.tsx`
- Modify: `src/components/checkout/FormularioCheckout.test.tsx`
- Modify: `src/app/checkout/page.tsx`

**Interfaces:**
- Sin cambios de props (`{ reglas: ReglasPedido; franjas: Franja[] }`) ni de
  ningún estado/handler de `FormularioCheckout`. La única aserción de clase
  que existe en su test (`toHaveClass('border-amber-500')`) pasa a
  `toHaveClass('border-accent')`, porque el color del "seleccionado" cambia de
  token — todo lo demás del test sigue verificando el mismo comportamiento.

- [ ] **Step 1: Actualizar la aserción de clase en el test**

En `src/components/checkout/FormularioCheckout.test.tsx`, dentro de `'con el
carrito por debajo del mínimo, preselecciona recogida y bloquea domicilio'`,
cambiar:

```tsx
    expect(screen.getByRole('button', { name: 'Recogida en el local' })).toHaveClass('border-amber-500')
```

por:

```tsx
    expect(screen.getByRole('button', { name: 'Recogida en el local' })).toHaveClass('border-accent')
```

No cambiar ninguna otra línea de ese test.

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `pnpm test FormularioCheckout`
Expected: FAIL — el componente todavía pinta `border-amber-500`.

- [ ] **Step 3: Sustituir `src/components/checkout/FormularioCheckout.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { agruparFranjasPorDia, formatearHoraFranja } from '@/lib/horario'
import type { Franja } from '@/lib/horario/tipos'
import { calcularResumen, precioLinea } from '@/lib/precios'
import type { ReglasPedido } from '@/lib/precios/tipos'
import { formatearPrecio } from '@/lib/dinero'
import { useCarrito } from '@/lib/carrito/store'
import { useDatosContacto } from '@/lib/carrito/datosContacto'
import type { ErrorValidacionPedido } from '@/lib/pedidos/tipos'
import { validarDatosContacto } from '@/lib/pedidos/validacion'
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

  const resumenDomicilio = calcularResumen(lineas, 'domicilio', reglas)
  const alcanzaMinimoDomicilio = resumenDomicilio.alcanzaMinimo

  const [modoEntrega, setModoEntrega] = useState<ModoEntrega>('domicilio')
  // Si el carrito no llega al mínimo de domicilio, la recogida es la única
  // opción posible aunque el usuario hubiera elegido domicilio antes de que
  // el carrito cambiara (p. ej. al quitar un artículo agotado).
  const modoEfectivo: ModoEntrega = alcanzaMinimoDomicilio ? modoEntrega : 'recogida'
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
  const [errorRed, setErrorRed] = useState(false)

  const resumen = calcularResumen(lineas, modoEfectivo, reglas)
  const franjaLoAntesPosible = franjas.find((f) => f.loAntesPosible)
  const gruposFranjas = agruparFranjasPorDia(franjas, new Date())

  async function enviarPedido() {
    setEnviando(true)
    setError(null)
    setErrorRed(false)

    const contacto = { nombre, apellidos, telefono }
    const direccion = modoEfectivo === 'domicilio' ? { calle, numero, piso, cp, ciudad, indicaciones } : null
    guardar(contacto, direccion ?? { calle: '', numero: '', piso: '', cp: '', ciudad: '', indicaciones: '' })

    const errorDatosContacto = validarDatosContacto(modoEfectivo, contacto, direccion)
    if (errorDatosContacto) {
      setError(errorDatosContacto)
      setEnviando(false)
      return
    }

    try {
      const respuesta = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineas,
          modoEntrega: modoEfectivo,
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
    } catch {
      setErrorRed(true)
      setEnviando(false)
    }
  }

  function quitarArticuloAfectado(articuloId: string) {
    for (const linea of lineas) {
      if (linea.articuloId === articuloId) eliminar(linea.id)
    }
    setError(null)
  }

  function quitarExtraAfectado(articuloId: string, tamanoId: string, extraId: string) {
    for (const linea of lineas) {
      if (linea.articuloId === articuloId && linea.tamanoId === tamanoId) {
        quitarExtraDeLinea(linea.id, extraId)
      }
    }
    setError(null)
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-11">
      <div className="flex flex-col gap-6 lg:max-w-2xl lg:flex-1">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">Entrega</legend>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!alcanzaMinimoDomicilio}
              onClick={() => setModoEntrega('domicilio')}
              className={`flex-1 rounded-lg border p-3 disabled:opacity-40 ${
                modoEfectivo === 'domicilio' ? 'border-accent bg-accent-soft' : 'border-border'
              }`}
            >
              A domicilio
            </button>
            <button
              type="button"
              onClick={() => setModoEntrega('recogida')}
              className={`flex-1 rounded-lg border p-3 ${
                modoEfectivo === 'recogida' ? 'border-accent bg-accent-soft' : 'border-border'
              }`}
            >
              Recogida en el local
            </button>
          </div>
          {!alcanzaMinimoDomicilio && (
            <p className="mt-2 text-sm text-ink-soft">
              Te faltan {formatearPrecio(resumenDomicilio.faltaParaMinimoCentimos)} para pedir a domicilio.
            </p>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">Tus datos</legend>
          <label className="flex flex-col gap-1">
            <span>Nombre</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="rounded-lg border border-border bg-surface p-3 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Apellidos</span>
            <input
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              className="rounded-lg border border-border bg-surface p-3 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Teléfono</span>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="rounded-lg border border-border bg-surface p-3 text-ink"
            />
          </label>
        </fieldset>

        {modoEfectivo === 'domicilio' && (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">Dirección</legend>
            <label className="flex flex-col gap-1">
              <span>Calle</span>
              <input
                value={calle}
                onChange={(e) => setCalle(e.target.value)}
                className="rounded-lg border border-border bg-surface p-3 text-ink"
              />
            </label>
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1">
                <span>Número</span>
                <input
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="rounded-lg border border-border bg-surface p-3 text-ink"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1">
                <span>Piso</span>
                <input
                  value={piso}
                  onChange={(e) => setPiso(e.target.value)}
                  className="rounded-lg border border-border bg-surface p-3 text-ink"
                />
              </label>
            </div>
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1">
                <span>Código postal</span>
                <input
                  value={cp}
                  onChange={(e) => setCp(e.target.value)}
                  className="rounded-lg border border-border bg-surface p-3 text-ink"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1">
                <span>Ciudad</span>
                <input
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  className="rounded-lg border border-border bg-surface p-3 text-ink"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span>Indicaciones para el portal (opcional)</span>
              <input
                value={indicaciones}
                onChange={(e) => setIndicaciones(e.target.value)}
                className="rounded-lg border border-border bg-surface p-3 text-ink"
              />
            </label>
          </fieldset>
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">Franja de entrega</legend>
          <p className="mb-2 text-sm text-ink-soft">
            Es una petición. El restaurante la confirmará al aceptar el pedido.
          </p>
          <div className="flex flex-col gap-3">
            {franjaLoAntesPosible && (
              <label className="flex items-center gap-3 rounded-lg border border-border p-3">
                <input
                  type="radio"
                  name="franja"
                  checked={franjaElegida === franjaLoAntesPosible}
                  onChange={() => setFranjaElegida(franjaLoAntesPosible)}
                />
                Lo antes posible
              </label>
            )}

            {gruposFranjas.map((grupo) => (
              <div key={grupo.etiqueta} className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{grupo.etiqueta}</p>
                {grupo.franjas.map((franja) => (
                  <label
                    key={franja.inicio + franja.fin}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <input
                      type="radio"
                      name="franja"
                      checked={franja === franjaElegida}
                      onChange={() => setFranjaElegida(franja)}
                    />
                    {formatearHoraFranja(franja.inicio)}–{formatearHoraFranja(franja.fin)}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Notas del pedido (opcional)</span>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="rounded-lg border border-border bg-surface p-3 text-ink"
          />
        </label>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-8 lg:w-[380px] lg:shrink-0 lg:rounded-2xl lg:border lg:border-border lg:bg-surface lg:p-7">
        <dl className="flex flex-col gap-1 border-t border-border pt-4 text-sm lg:border-t-0 lg:pt-0">
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
          <div className="rounded-lg bg-accent-soft p-3 text-sm text-accent-dark">
            <p>«{error.nombreArticulo}» ya no está disponible.</p>
            <button
              type="button"
              onClick={() => quitarArticuloAfectado(error.articuloId)}
              className="mt-2 rounded-lg border border-accent px-3 py-2"
            >
              Quitar del pedido
            </button>
          </div>
        )}

        {error?.tipo === 'extra_no_disponible' && (
          <div className="rounded-lg bg-accent-soft p-3 text-sm text-accent-dark">
            <p>El complemento «{error.nombreExtra}» ya no está disponible.</p>
            <button
              type="button"
              onClick={() => quitarExtraAfectado(error.articuloId, error.tamanoId, error.extraId)}
              className="mt-2 rounded-lg border border-accent px-3 py-2"
            >
              Quitar «{error.nombreExtra}» y continuar
            </button>
          </div>
        )}

        {error?.tipo === 'error_servidor' && (
          <p className="rounded-lg bg-accent-soft p-3 text-sm text-accent-dark">
            Ha habido un problema al procesar el pedido. Inténtalo de nuevo en un momento.
          </p>
        )}

        {error?.tipo === 'franja_no_valida' && (
          <p className="rounded-lg bg-accent-soft p-3 text-sm text-accent-dark">
            La franja elegida ya no está disponible. Recarga la página para ver las franjas actuales y vuelve a
            intentarlo.
          </p>
        )}

        {error?.tipo === 'datos_contacto_invalidos' && (
          <p className="rounded-lg bg-accent-soft p-3 text-sm text-accent-dark">
            Revisa estos datos antes de continuar: {error.campos.join(', ')}.
          </p>
        )}

        {error?.tipo === 'bajo_minimo' && (
          <p className="rounded-lg bg-accent-soft p-3 text-sm text-accent-dark">
            Te faltan {formatearPrecio(error.faltaCentimos)} para llegar al pedido mínimo a domicilio.
          </p>
        )}

        {errorRed && (
          <p className="rounded-lg bg-accent-soft p-3 text-sm text-accent-dark">
            No se ha podido conectar para enviar el pedido. Comprueba tu conexión e inténtalo de nuevo.
          </p>
        )}

        <button
          type="button"
          disabled={enviando || lineas.length === 0}
          onClick={enviarPedido}
          className="h-14 w-full rounded-xl bg-accent text-lg font-bold text-surface disabled:opacity-40"
        >
          Pagar {formatearPrecio(resumen.totalCentimos)}
        </button>
      </aside>
    </div>
  )
}
```

(El único cambio de estructura es envolver el resumen/errores/botón en un
`<aside>` hermano del bloque de campos, en vez de dejarlos sueltos al final de
una única columna — con `flex-col` de base y `lg:flex-row` en el contenedor
raíz, en móvil seguyen apilados exactamente en el mismo orden que antes;
`lg:sticky lg:top-8` es lo que hace que el resumen se quede fijo al bajar por
el formulario en escritorio. Ninguna función, estado ni handler cambia de
sitio ni de firma.)

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `pnpm test FormularioCheckout`
Expected: PASS.

- [ ] **Step 5: Sustituir `src/app/checkout/page.tsx`**

```tsx
import { obtenerAjustesHorario, obtenerReglas } from '@/lib/carta/consultas'
import { generarFranjas } from '@/lib/horario'
import { FormularioCheckout } from '@/components/checkout/FormularioCheckout'

export default async function PaginaCheckout() {
  const [reglas, ajustesHorario] = await Promise.all([obtenerReglas(), obtenerAjustesHorario()])
  const franjas = generarFranjas(ajustesHorario, new Date())

  return (
    <main className="mx-auto max-w-[1440px] px-5 pb-24 lg:px-16">
      <header className="py-6">
        <a href="/" className="text-sm text-ink-soft">
          ‹ Volver a la carta
        </a>
        <h1 className="mt-2 font-display text-[29px] italic text-ink">Finalizar pedido</h1>
      </header>
      {franjas.length === 0 ? (
        <p className="rounded-lg bg-surface p-4 text-sm text-ink-soft">
          El restaurante está cerrado ahora mismo y no hay franjas de entrega disponibles. Vuelve a intentarlo
          cuando abramos.
        </p>
      ) : (
        <FormularioCheckout reglas={reglas} franjas={franjas} />
      )}
    </main>
  )
}
```

(Se quita el `bg-neutral-950 text-neutral-100` que la Fase 1 fijó aquí como
parche puente — ahora hereda `bg-ground`/`text-ink` del `<body>`, igual que ya
hace `src/app/page.tsx` desde la Fase 1. El resto de clases pasa de la
paleta oscura a los tokens nuevos, con el mismo `max-w-[1440px]` que usa la
carta.)

- [ ] **Step 6: Ejecutar toda la suite y comprobar que compila**

Run: `pnpm test && pnpm build`
Expected: PASS / compilación sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/components/checkout/FormularioCheckout.tsx src/components/checkout/FormularioCheckout.test.tsx \
  src/app/checkout/page.tsx
git commit -m "Da al checkout la nueva identidad visual y un layout de dos columnas en escritorio"
```

---

## Tarea 4: Fases de seguimiento — función pura

**Files:**
- Create: `src/lib/pedidos/fasesSeguimiento.ts`
- Test: `src/lib/pedidos/fasesSeguimiento.test.ts`

**Interfaces:**
- Consumes: `EstadoSeguimiento` (de `./seguimiento`), `formatearHoraFranja`
  (de `@/lib/horario`).
- Produces: `FaseSeguimientoId = 'recibido' | 'preparacion' | 'listo' | 'reparto' | 'entregado'`;
  `FaseSeguimiento = { id: FaseSeguimientoId; etiqueta: string; detalle: string | null; estado: 'completada' | 'actual' | 'futura' }`;
  `fasesSeguimiento(pedido: EstadoSeguimiento): FaseSeguimiento[] | null` — la
  Tarea 5 la consume tal cual para pintar la línea de tiempo.

- [ ] **Step 1: Tests que fallan**

Crear `src/lib/pedidos/fasesSeguimiento.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { fasesSeguimiento } from './fasesSeguimiento'
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

describe('fasesSeguimiento', () => {
  it('sin línea de tiempo mientras se confirma el pago', () => {
    expect(fasesSeguimiento(pedido({ estado: 'pendiente_pago' }))).toBeNull()
  })

  it('a domicilio recorre las 5 fases, con reparto', () => {
    const fases = fasesSeguimiento(pedido({ estado: 'en_reparto', modoEntrega: 'domicilio' }))
    expect(fases?.map((f) => f.id)).toEqual(['recibido', 'preparacion', 'listo', 'reparto', 'entregado'])
  })

  it('en recogida no incluye la fase de reparto', () => {
    const fases = fasesSeguimiento(pedido({ estado: 'pendiente_envio', modoEntrega: 'recogida' }))
    expect(fases?.map((f) => f.id)).toEqual(['recibido', 'preparacion', 'listo', 'entregado'])
  })

  it('marca completadas las fases anteriores a la actual, y futuras las siguientes', () => {
    const fases = fasesSeguimiento(pedido({ estado: 'en_preparacion' }))
    expect(fases?.find((f) => f.id === 'recibido')?.estado).toBe('completada')
    expect(fases?.find((f) => f.id === 'preparacion')?.estado).toBe('actual')
    expect(fases?.find((f) => f.id === 'listo')?.estado).toBe('futura')
    expect(fases?.find((f) => f.id === 'reparto')?.estado).toBe('futura')
    expect(fases?.find((f) => f.id === 'entregado')?.estado).toBe('futura')
  })

  it('recibido muestra la franja confirmada si existe', () => {
    const fases = fasesSeguimiento(
      pedido({ franjaConfirmada: { inicio: '2026-01-15T12:00:00.000Z', fin: '2026-01-15T12:30:00.000Z' } }),
    )
    expect(fases?.find((f) => f.id === 'recibido')?.detalle).toBe('Confirmado para las 13:00–13:30')
  })

  it('recibido sin confirmar aún', () => {
    const fases = fasesSeguimiento(pedido())
    expect(fases?.find((f) => f.id === 'recibido')?.detalle).toBe('Pendiente de confirmar')
  })

  it('listo cambia de texto según el modo de entrega', () => {
    const domicilio = fasesSeguimiento(pedido({ estado: 'pendiente_envio', modoEntrega: 'domicilio' }))
    const recogida = fasesSeguimiento(pedido({ estado: 'pendiente_envio', modoEntrega: 'recogida' }))
    expect(domicilio?.find((f) => f.id === 'listo')?.detalle).toBe('Sale en breve')
    expect(recogida?.find((f) => f.id === 'listo')?.detalle).toBe('Puedes pasar a recogerlo')
  })

  it('entregado no lleva detalle', () => {
    const fases = fasesSeguimiento(pedido({ estado: 'entregado' }))
    expect(fases?.find((f) => f.id === 'entregado')?.detalle).toBeNull()
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `pnpm test fasesSeguimiento`
Expected: FAIL — `src/lib/pedidos/fasesSeguimiento.ts` no existe todavía.

- [ ] **Step 3: Implementar**

Crear `src/lib/pedidos/fasesSeguimiento.ts`:

```ts
import { formatearHoraFranja } from '@/lib/horario'
import type { EstadoSeguimiento } from './seguimiento'

export type FaseSeguimientoId = 'recibido' | 'preparacion' | 'listo' | 'reparto' | 'entregado'

export type FaseSeguimiento = {
  id: FaseSeguimientoId
  etiqueta: string
  detalle: string | null
  estado: 'completada' | 'actual' | 'futura'
}

const ORDEN_DOMICILIO: FaseSeguimientoId[] = ['recibido', 'preparacion', 'listo', 'reparto', 'entregado']
const ORDEN_RECOGIDA: FaseSeguimientoId[] = ['recibido', 'preparacion', 'listo', 'entregado']

const ETIQUETAS: Record<FaseSeguimientoId, string> = {
  recibido: 'Recibido',
  preparacion: 'En preparación',
  listo: 'Listo',
  reparto: 'En reparto',
  entregado: 'Entregado',
}

function faseDelEstado(pedido: EstadoSeguimiento): FaseSeguimientoId | null {
  switch (pedido.estado) {
    case 'pendiente_pago':
      return null
    case 'nuevo':
      return 'recibido'
    case 'en_preparacion':
      return 'preparacion'
    case 'pendiente_envio':
      return 'listo'
    case 'en_reparto':
      return 'reparto'
    case 'entregado':
      return 'entregado'
  }
}

function detalleDeFase(id: FaseSeguimientoId, pedido: EstadoSeguimiento): string | null {
  switch (id) {
    case 'recibido':
      return pedido.franjaConfirmada
        ? `Confirmado para las ${formatearHoraFranja(pedido.franjaConfirmada.inicio)}–${formatearHoraFranja(pedido.franjaConfirmada.fin)}`
        : 'Pendiente de confirmar'
    case 'preparacion':
      return 'La cocina está con tu pedido'
    case 'listo':
      return pedido.modoEntrega === 'recogida' ? 'Puedes pasar a recogerlo' : 'Sale en breve'
    case 'reparto':
      return 'Tu pedido va de camino'
    case 'entregado':
      return null
  }
}

/**
 * Traduce el estado real del pedido a la línea de tiempo que ve el cliente.
 * La recogida en local no pasa por reparto: su orden de fases es más corto.
 * `pendiente_pago` no tiene línea de tiempo — es un estado transitorio que en
 * un flujo normal el cliente nunca llega a ver (ver `obtenerEstadoPedido`).
 */
export function fasesSeguimiento(pedido: EstadoSeguimiento): FaseSeguimiento[] | null {
  const faseActual = faseDelEstado(pedido)
  if (!faseActual) return null

  const orden = pedido.modoEntrega === 'recogida' ? ORDEN_RECOGIDA : ORDEN_DOMICILIO
  const indiceActual = orden.indexOf(faseActual)

  return orden.map((id, indice) => ({
    id,
    etiqueta: ETIQUETAS[id],
    detalle: detalleDeFase(id, pedido),
    estado:
      indiceActual < 0
        ? 'futura'
        : indice < indiceActual
          ? 'completada'
          : indice === indiceActual
            ? 'actual'
            : 'futura',
  }))
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `pnpm test fasesSeguimiento`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pedidos/fasesSeguimiento.ts src/lib/pedidos/fasesSeguimiento.test.ts
git commit -m "Añade la función pura de fases de seguimiento"
```

---

## Tarea 5: Seguimiento del pedido — nueva piel, línea de tiempo y layout de escritorio

**Files:**
- Modify: `src/components/pedido/EstadoPedido.tsx`
- Modify: `src/app/pedido/[codigo]/page.tsx`

**Interfaces:**
- Consumes: `fasesSeguimiento` (de `@/lib/pedidos/fasesSeguimiento`, Tarea 4).
- Sin cambios de props (`{ estadoInicial: EstadoSeguimiento }`) ni del efecto
  de sondeo cada 15 segundos — se mantiene exactamente igual.

No existe `EstadoPedido.test.tsx` (comprobado) — esta tarea se verifica con
`pnpm build` y comprobación manual, como el resto de páginas de este
proyecto que no tienen test unitario propio.

- [ ] **Step 1: Sustituir `src/components/pedido/EstadoPedido.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { formatearPrecio } from '@/lib/dinero'
import { fasesSeguimiento } from '@/lib/pedidos/fasesSeguimiento'
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

  const fases = fasesSeguimiento(estado)

  return (
    <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:gap-12">
      <div className="lg:max-w-xl lg:flex-1">
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-ink-soft">Pedido {estado.codigoPublico}</p>
          <p className="mt-2 font-display text-[23px] italic text-accent-dark">{textoEstadoCliente(estado)}</p>
        </div>

        {fases && (
          <div className="mt-7 flex flex-col">
            {fases.map((fase, indice) => (
              <div key={fase.id} className="flex gap-4">
                <div className="flex w-7 shrink-0 flex-col items-center">
                  <div
                    className={`w-0.5 flex-1 ${
                      indice === 0 ? 'bg-transparent' : fase.estado === 'futura' ? 'bg-border' : 'bg-accent'
                    }`}
                  />
                  {fase.estado === 'actual' ? (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-accent-soft">
                      <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
                    </div>
                  ) : (
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        fase.estado === 'completada' ? 'bg-accent' : 'border-[1.5px] border-border bg-surface'
                      }`}
                    >
                      {fase.estado === 'completada' && (
                        <svg
                          viewBox="0 0 24 24"
                          width="13"
                          height="13"
                          fill="none"
                          stroke="white"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="4 12 9 17 20 6" />
                        </svg>
                      )}
                    </div>
                  )}
                  <div
                    className={`w-0.5 flex-1 ${
                      indice === fases.length - 1
                        ? 'bg-transparent'
                        : fase.estado === 'completada'
                          ? 'bg-accent'
                          : 'bg-border'
                    }`}
                  />
                </div>
                <div className="pb-6">
                  <p
                    className={
                      fase.estado === 'actual'
                        ? 'text-[14.5px] font-bold text-accent-dark'
                        : fase.estado === 'futura'
                          ? 'text-[14.5px] font-semibold text-ink-soft'
                          : 'text-[14.5px] font-semibold text-ink'
                    }
                  >
                    {fase.etiqueta}
                  </p>
                  {fase.detalle && <p className="mt-0.5 text-[12.5px] text-ink-soft">{fase.detalle}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:w-[360px] lg:shrink-0">
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="mb-3 text-xs uppercase tracking-wide text-ink-soft">Tu pedido</p>
          <dl className="flex flex-col gap-2 text-sm">
            {estado.lineas.map((linea, indice) => (
              <div key={indice} className="flex justify-between gap-3">
                <dt>
                  {linea.cantidad}× {linea.nombreArticulo} · {linea.nombreTamano}
                  {linea.extras.length > 0 && <span className="text-ink-soft"> ({linea.extras.join(', ')})</span>}
                </dt>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex justify-between border-t border-border pt-3 font-bold">
            <span>Total</span>
            <span>{formatearPrecio(estado.totalCentimos)}</span>
          </div>
        </div>

        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-ink-soft">
          ¿Alguna duda? Llama al restaurante: {estado.telefonoRestaurante}
        </p>
      </div>
    </div>
  )
}
```

(La línea de tiempo es contenido nuevo — no existía nada parecido antes—, pero
solo *visualiza* los mismos 6 estados reales de `EstadoPedido` a través de
`fasesSeguimiento`: no introduce ningún estado nuevo. El resumen de líneas y
el aviso del teléfono se envuelven en tarjetas a juego con el resto del
rediseño, pero siguen siendo exactamente el mismo texto estático que ya
había — sin convertir el teléfono en un enlace `tel:` ni añadir ninguna
interacción que no existiera, para no salirse de "sin cambios de
comportamiento".)

- [ ] **Step 2: Sustituir `src/app/pedido/[codigo]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { obtenerEstadoPedido } from '@/lib/pedidos/seguimiento'
import { EstadoPedido } from '@/components/pedido/EstadoPedido'

export default async function PaginaSeguimiento({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const estado = await obtenerEstadoPedido(codigo)
  if (!estado) notFound()

  return (
    <main className="mx-auto max-w-[1100px] px-5 py-8 lg:px-16">
      <EstadoPedido estadoInicial={estado} />
    </main>
  )
}
```

(Igual que en la Tarea 3: se quita el `bg-neutral-950 text-neutral-100` fijado
por la Fase 1, y hereda `bg-ground`/`text-ink` del `<body>`.)

- [ ] **Step 3: Ejecutar toda la suite y comprobar que compila**

Run: `pnpm test && pnpm build`
Expected: PASS / compilación sin errores.

- [ ] **Step 4: Comprobación manual**

Run: `pnpm dev`, abrir `http://localhost:3000/pedido/<código de un pedido de
prueba>` y confirmar a ojo: la línea de tiempo muestra las fases correctas
para el estado real del pedido (completadas con check, la actual con el punto
animado, las futuras en gris), y en recogida no aparece la fase "En reparto".
En una ventana ancha, la línea de tiempo queda a la izquierda y el resumen a
la derecha.

- [ ] **Step 5: Commit**

```bash
git add src/components/pedido/EstadoPedido.tsx "src/app/pedido/[codigo]/page.tsx"
git commit -m "Añade la línea de tiempo al seguimiento del pedido y su nueva identidad visual"
```

---

## Verificación final

- [ ] `pnpm test` — todos los tests unitarios en verde.
- [ ] `pnpm build` — compila sin errores.
- [ ] Comprobación manual en `pnpm dev`: carrito (barra + hoja), checkout y
  seguimiento en pergamino/terracota, sin ningún resto de
  `neutral-*`/`amber-*`/`emerald-*`/Geist en los ficheros tocados por este
  plan.
- [ ] El formulario de checkout se comporta exactamente igual que antes: el
  bloqueo de "A domicilio" bajo el pedido mínimo, la selección de franja, los
  siete tipos de error y el envío del pedido — nada de eso cambia, solo su
  piel.
- [ ] Las cuatro pantallas del panel interno que la Fase 1 dejó con su piel
  oscura fijada en local (`panel/(protegido)/layout.tsx`,
  `panel/iniciar-sesion/page.tsx`, `panel/invitacion/page.tsx`,
  `reparto/page.tsx`) siguen fijadas — este plan no las toca; les
  corresponde su propia fase (cocina, administración, repartidor y acceso).
