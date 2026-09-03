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
  const [errorRed, setErrorRed] = useState(false)

  const resumen = calcularResumen(lineas, modoEntrega, reglas)

  async function enviarPedido() {
    setEnviando(true)
    setError(null)
    setErrorRed(false)

    const contacto = { nombre, apellidos, telefono }
    const direccion = modoEntrega === 'domicilio' ? { calle, numero, piso, cp, ciudad, indicaciones } : null
    guardar(contacto, direccion ?? { calle: '', numero: '', piso: '', cp: '', ciudad: '', indicaciones: '' })

    const errorDatosContacto = validarDatosContacto(modoEntrega, contacto, direccion)
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
            onClick={() => quitarExtraAfectado(error.articuloId, error.tamanoId, error.extraId)}
            className="mt-2 rounded-lg border border-amber-500 px-3 py-2"
          >
            Quitar «{error.nombreExtra}» y continuar
          </button>
        </div>
      )}

      {error?.tipo === 'datos_contacto_invalidos' && (
        <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">
          Revisa estos datos antes de continuar: {error.campos.join(', ')}.
        </p>
      )}

      {error?.tipo === 'bajo_minimo' && (
        <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">
          Te faltan {formatearPrecio(error.faltaCentimos)} para llegar al pedido mínimo a domicilio.
        </p>
      )}

      {errorRed && (
        <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">
          No se ha podido conectar para enviar el pedido. Comprueba tu conexión e inténtalo de nuevo.
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
