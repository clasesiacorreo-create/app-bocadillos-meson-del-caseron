'use client'

import { useEffect, useState } from 'react'
import { BarraCarrito } from '@/components/carrito/BarraCarrito'
import { HojaCarrito } from '@/components/carrito/HojaCarrito'
import { useCarrito } from '@/lib/carrito/store'
import type { ArticuloCarta, Carta } from '@/lib/carta/tipos'
import type { ReglasPedido } from '@/lib/precios/tipos'
import { FichaArticulo } from './FichaArticulo'
import { RielCategorias } from './RielCategorias'

export function VistaCarta({ carta, reglas }: { carta: Carta; reglas: ReglasPedido }) {
  const [abierto, setAbierto] = useState<ArticuloCarta | null>(null)
  const [carritoVisible, setCarritoVisible] = useState(false)
  const anadir = useCarrito((estado) => estado.anadir)

  // El carrito persiste en localStorage y se rehidrata aquí, ya en el
  // navegador, porque el servidor no tiene localStorage.
  useEffect(() => {
    void useCarrito.persist.rehydrate()
  }, [])

  return (
    <>
      <RielCategorias categorias={carta.categorias} onAbrirArticulo={setAbierto} />

      {abierto && (
        <FichaArticulo
          articulo={abierto}
          onCerrar={() => setAbierto(null)}
          onAnadir={(linea) => {
            anadir(linea)
            setAbierto(null)
          }}
        />
      )}

      <BarraCarrito reglas={reglas} onAbrir={() => setCarritoVisible(true)} />
      {carritoVisible && (
        <HojaCarrito reglas={reglas} onCerrar={() => setCarritoVisible(false)} />
      )}
    </>
  )
}
