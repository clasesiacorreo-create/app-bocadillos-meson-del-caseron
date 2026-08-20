'use client'

import { useState } from 'react'
import type { ArticuloCarta, Carta } from '@/lib/carta/tipos'
import { FichaArticulo } from './FichaArticulo'
import { PestanasCategorias } from './PestanasCategorias'

export function VistaCarta({ carta }: { carta: Carta }) {
  const [abierto, setAbierto] = useState<ArticuloCarta | null>(null)

  return (
    <>
      <PestanasCategorias categorias={carta.categorias} onAbrirArticulo={setAbierto} />
      {abierto && (
        <FichaArticulo
          articulo={abierto}
          onCerrar={() => setAbierto(null)}
          onAnadir={() => setAbierto(null)}
        />
      )}
    </>
  )
}
