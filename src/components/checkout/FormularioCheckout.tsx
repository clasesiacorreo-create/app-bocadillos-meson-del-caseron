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
