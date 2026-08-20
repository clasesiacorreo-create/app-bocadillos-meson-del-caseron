'use client'

import { useCarrito } from '@/lib/carrito/store'
import { formatearPrecio } from '@/lib/dinero'
import { calcularResumen } from '@/lib/precios'
import type { ReglasPedido } from '@/lib/precios/tipos'

type Props = {
  reglas: ReglasPedido
  onAbrir: () => void
}

export function BarraCarrito({ reglas, onAbrir }: Props) {
  const lineas = useCarrito((estado) => estado.lineas)
  if (lineas.length === 0) return null

  const unidades = lineas.reduce((total, linea) => total + linea.cantidad, 0)
  const resumen = calcularResumen(lineas, 'domicilio', reglas)

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-neutral-950/95 p-4 backdrop-blur">
      <button
        type="button"
        onClick={onAbrir}
        className="mx-auto flex h-14 w-full max-w-lg items-center justify-between rounded-xl bg-amber-500 px-5 font-bold text-neutral-950"
      >
        <span>
          Ver pedido · {unidades} {unidades === 1 ? 'artículo' : 'artículos'}
        </span>
        <span>{formatearPrecio(resumen.subtotalCentimos)}</span>
      </button>
    </div>
  )
}
