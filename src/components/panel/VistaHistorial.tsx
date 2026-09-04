'use client'

import { useState } from 'react'
import { formatearPrecio } from '@/lib/dinero'
import type { PedidoConLineas } from '@/lib/pedidos/tipos'

type Props = { historialInicial: PedidoConLineas[]; totalHoyCentimos: number }

export function VistaHistorial({ historialInicial, totalHoyCentimos }: Props) {
  const [historial, setHistorial] = useState(historialInicial)
  const [telefono, setTelefono] = useState('')
  const [buscando, setBuscando] = useState(false)

  async function buscar() {
    setBuscando(true)
    const respuesta = await fetch(`/api/panel/historial?telefono=${encodeURIComponent(telefono)}`)
    if (respuesta.ok) setHistorial(await respuesta.json())
    setBuscando(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-lg border border-neutral-700 p-3">
        Facturado hoy: <span className="font-bold">{formatearPrecio(totalHoyCentimos)}</span>
      </p>

      <div className="flex gap-2">
        <input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Buscar por teléfono"
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 p-3"
        />
        <button
          type="button"
          disabled={buscando}
          onClick={buscar}
          className="rounded-lg border border-neutral-700 px-4 disabled:opacity-40"
        >
          Buscar
        </button>
      </div>

      {historial.length === 0 && <p className="text-sm text-neutral-400">No hay pedidos entregados aquí.</p>}

      <ul className="flex flex-col gap-2">
        {historial.map((pedido) => (
          <li key={pedido.id} className="rounded-lg border border-neutral-700 p-3">
            <div className="flex justify-between">
              <span className="font-semibold">{pedido.codigo_publico}</span>
              <span>{formatearPrecio(pedido.total_centimos)}</span>
            </div>
            <p className="text-sm text-neutral-400">
              {pedido.cliente_nombre} {pedido.cliente_apellidos} · {pedido.cliente_telefono}
            </p>
            {pedido.entregado_en && (
              <p className="text-sm text-neutral-400">
                Entregado {new Date(pedido.entregado_en).toLocaleString('es-ES')}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
