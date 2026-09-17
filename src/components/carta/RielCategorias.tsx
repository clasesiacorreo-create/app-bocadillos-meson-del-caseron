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
