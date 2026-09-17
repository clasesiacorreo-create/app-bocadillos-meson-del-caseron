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
