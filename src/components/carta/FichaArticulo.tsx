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
      <h2 className="text-xl font-bold">{articulo.nombre}</h2>
      <p className="mt-1 text-sm text-neutral-400">{articulo.descripcion}</p>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wide">Tamaño</legend>
        <div className="flex flex-col gap-2">
          {articulo.tamanos.map((t) => (
            <label
              key={t.id}
              className={`flex items-center justify-between rounded-lg border border-neutral-700 p-3
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
                />
                {t.nombre}
              </span>
              <span className="font-medium">{formatearPrecio(t.precioCentimos)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {extrasDelTamano.length > 0 && (
        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-semibold uppercase tracking-wide">
            Complementos
          </legend>
          <div className="flex flex-col gap-2">
            {extrasDelTamano.map((extra) => (
              <label
                key={extra.id}
                className={`flex items-center justify-between rounded-lg border border-neutral-700 p-3
                  ${extra.disponible ? '' : 'opacity-50'}`}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={extrasElegidos.includes(extra.id)}
                    disabled={!extra.disponible}
                    onChange={() => alternarExtra(extra.id)}
                  />
                  <span>
                    {extra.nombre}
                    {!extra.disponible && (
                      <span className="ml-2 text-xs uppercase tracking-wide text-amber-500">
                        Hoy no disponible
                      </span>
                    )}
                  </span>
                </span>
                <span className="font-medium">
                  {formatearPrecio(extra.precioPorTamanoId[tamanoId])}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="mt-5 block">
        <span className="text-sm font-semibold uppercase tracking-wide">Nota para la cocina</span>
        <input
          type="text"
          value={notasLinea}
          onChange={(e) => setNotasLinea(e.target.value)}
          placeholder="sin tomate, poco hecho..."
          className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-800 p-3"
        />
      </label>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="button"
          aria-label="Reducir cantidad"
          onClick={() => setCantidad((c) => Math.max(1, c - 1))}
          className="h-11 w-11 rounded-full border border-neutral-700 text-xl"
        >
          −
        </button>
        <span aria-live="polite" className="w-6 text-center text-lg font-semibold">
          {cantidad}
        </span>
        <button
          type="button"
          aria-label="Aumentar cantidad"
          onClick={() => setCantidad((c) => c + 1)}
          className="h-11 w-11 rounded-full border border-neutral-700 text-xl"
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
        className="mt-6 h-14 w-full rounded-xl bg-amber-500 text-lg font-bold text-neutral-950"
      >
        Añadir · {formatearPrecio(total)}
      </button>
    </HojaInferior>
  )
}
