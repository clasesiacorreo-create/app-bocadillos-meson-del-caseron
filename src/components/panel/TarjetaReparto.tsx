'use client'

import { useState } from 'react'
import { mensajeDeError } from '@/lib/panel/erroresApi'
import { enlaceMapa } from '@/lib/pedidos/reparto'
import type { EstadoPedido, PedidoConLineas } from '@/lib/pedidos/tipos'

type Props = {
  pedido: PedidoConLineas
  onActualizado: (pedido: PedidoConLineas) => void
}

export function TarjetaReparto({ pedido, onActualizado }: Props) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function avanzar(aFase: EstadoPedido) {
    setEnviando(true)
    setError(null)
    const respuesta = await fetch(`/api/panel/pedidos/${pedido.id}/avanzar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aFase }),
    })
    if (respuesta.ok) onActualizado(await respuesta.json())
    else setError(await mensajeDeError(respuesta))
    setEnviando(false)
  }

  return (
    <article className="rounded-xl border border-neutral-700 p-4">
      <header className="flex items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-neutral-400">Pedido {pedido.codigo_publico}</p>
        <span className="rounded-full bg-emerald-600/20 px-2 py-1 text-xs font-semibold text-emerald-400">
          Pagado online — no cobrar
        </span>
      </header>

      <p className="mt-2 text-lg font-bold">
        {pedido.direccion_calle} {pedido.direccion_numero}
        {pedido.direccion_piso ? `, ${pedido.direccion_piso}` : ''}
      </p>
      <p className="text-sm text-neutral-400">
        {pedido.direccion_cp} {pedido.direccion_ciudad}
      </p>
      {pedido.direccion_indicaciones && <p className="mt-1 text-sm text-amber-400">{pedido.direccion_indicaciones}</p>}

      <div className="mt-3 flex gap-2">
        <a
          href={enlaceMapa(pedido)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-lg border border-neutral-700 px-3 py-2 text-center text-sm"
        >
          Abrir en el mapa
        </a>
        <a
          href={`tel:${pedido.cliente_telefono}`}
          className="flex-1 rounded-lg border border-neutral-700 px-3 py-2 text-center text-sm"
        >
          {pedido.cliente_telefono}
        </a>
      </div>

      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {pedido.pedido_lineas.map((linea) => (
          <li key={linea.id}>
            {linea.cantidad}× {linea.nombre_articulo} · {linea.nombre_tamano}
            {linea.pedido_extras.length > 0 && (
              <span className="text-neutral-400"> ({linea.pedido_extras.map((e) => e.nombre_extra).join(', ')})</span>
            )}
          </li>
        ))}
      </ul>

      {pedido.notas && <p className="mt-3 rounded-lg bg-amber-500/10 p-2 text-sm text-amber-400">{pedido.notas}</p>}
      {error && <p className="mt-3 rounded-lg bg-amber-500/10 p-2 text-sm text-amber-400">{error}</p>}

      {pedido.estado === 'pendiente_envio' && (
        <button
          type="button"
          disabled={enviando}
          onClick={() => avanzar('en_reparto')}
          className="mt-4 h-12 w-full rounded-xl bg-amber-500 font-bold text-neutral-950 disabled:opacity-40"
        >
          Recojo este
        </button>
      )}

      {pedido.estado === 'en_reparto' && (
        <button
          type="button"
          disabled={enviando}
          onClick={() => avanzar('entregado')}
          className="mt-4 h-12 w-full rounded-xl bg-amber-500 font-bold text-neutral-950 disabled:opacity-40"
        >
          Entregado
        </button>
      )}
    </article>
  )
}
