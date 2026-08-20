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
  const precioMinimo = Math.min(...articulo.tamanos.map((t) => t.precioCentimos))

  return (
    <button
      type="button"
      disabled={!disponible}
      onClick={() => onAbrir(articulo)}
      aria-label={articulo.nombre}
      className={`flex w-full gap-3 rounded-xl border border-neutral-800 p-3 text-left transition
        ${disponible ? 'active:scale-[0.99]' : 'opacity-50'}`}
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-amber-900/30">
        {articulo.imagenUrl && (
          <Image src={articulo.imagenUrl} alt="" fill sizes="80px" className="object-cover" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-semibold">{articulo.nombre}</h3>
        <p className="line-clamp-2 text-sm text-neutral-400">{articulo.descripcion}</p>
        <p className="mt-1 text-sm font-medium">
          {articulo.tamanos.length > 1
            ? `desde ${formatearPrecio(precioMinimo)}`
            : formatearPrecio(precioMinimo)}
        </p>
        {!disponible && (
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-amber-500">
            Hoy no disponible
          </p>
        )}
      </div>
    </button>
  )
}
