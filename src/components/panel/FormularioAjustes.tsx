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
