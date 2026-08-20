'use client'

import { useState } from 'react'
import type { ArticuloCarta, CategoriaCarta } from '@/lib/carta/tipos'
import { TarjetaArticulo } from './TarjetaArticulo'

type Props = {
  categorias: CategoriaCarta[]
  onAbrirArticulo: (articulo: ArticuloCarta) => void
}

export function PestanasCategorias({ categorias, onAbrirArticulo }: Props) {
  const [activa, setActiva] = useState(categorias[0]?.id ?? '')
  const categoria = categorias.find((c) => c.id === activa) ?? categorias[0]

  return (
    <>
      <nav
        aria-label="Categorías de la carta"
        className="sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto bg-neutral-950/90 px-4 py-3 backdrop-blur"
      >
        {categorias.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiva(c.id)}
            aria-current={c.id === categoria?.id}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition
              ${c.id === categoria?.id ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-800'}`}
          >
            {c.nombre}
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-3 pb-28">
        {categoria?.articulos.map((articulo) => (
          <TarjetaArticulo key={articulo.id} articulo={articulo} onAbrir={onAbrirArticulo} />
        ))}
      </div>
    </>
  )
}
