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
      <div className="rounded-2xl border border-border bg-surface p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Facturado hoy</p>
        <p className="mt-1.5 font-display text-3xl italic font-bold text-accent-dark">{formatearPrecio(totalHoyCentimos)}</p>
      </div>

      <div className="flex gap-2">
        <input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Buscar por teléfono"
          className="flex-1 rounded-lg border border-border bg-surface p-3 text-ink"
        />
        <button
          type="button"
          disabled={buscando}
          onClick={buscar}
          className="rounded-lg bg-accent px-4 font-bold text-surface disabled:opacity-40"
        >
          Buscar
        </button>
      </div>

      {historial.length === 0 && <p className="text-sm text-ink-soft">No hay pedidos entregados aquí.</p>}

      <ul className="flex flex-col gap-2">
        {historial.map((pedido) => (
          <li key={pedido.id} className="rounded-lg border border-border bg-surface p-3">
            <div className="flex justify-between">
              <span className="font-semibold text-ink">{pedido.codigo_publico}</span>
              <span className="font-semibold text-ink">{formatearPrecio(pedido.total_centimos)}</span>
            </div>
            <p className="text-sm text-ink-soft">
              {pedido.cliente_nombre} {pedido.cliente_apellidos} · {pedido.cliente_telefono}
            </p>
            {pedido.entregado_en && (
              <p className="text-sm text-ink-soft">
                Entregado {new Date(pedido.entregado_en).toLocaleString('es-ES')}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
