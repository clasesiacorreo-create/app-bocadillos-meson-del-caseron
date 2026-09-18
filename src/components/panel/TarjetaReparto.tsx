'use client'

import { useState } from 'react'
import { formatearHoraFranja } from '@/lib/horario'
import { mensajeDeError } from '@/lib/panel/erroresApi'
import { enlaceMapa } from '@/lib/pedidos/reparto'
import type { EstadoPedido, PedidoConLineas } from '@/lib/pedidos/tipos'

type Props = {
  pedido: PedidoConLineas
  onActualizado: (pedido: PedidoConLineas) => void
  onConflicto?: () => void
}

export function TarjetaReparto({ pedido, onActualizado, onConflicto }: Props) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function avanzar(aFase: EstadoPedido) {
    setEnviando(true)
    setError(null)
    try {
      const respuesta = await fetch(`/api/panel/pedidos/${pedido.id}/avanzar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aFase }),
      })
      if (respuesta.ok) {
        onActualizado(await respuesta.json())
      } else if (respuesta.status === 409) {
        // Otro repartidor ya lo recogió: a partir de ahora la política de la
        // migración 0006 le oculta esta fila, así que ningún evento de tiempo
        // real va a quitarla de la lista por su cuenta. Se quita aquí mismo,
        // en cuanto el propio intento confirma que ya no es suyo.
        onConflicto?.()
      } else {
        setError(await mensajeDeError(respuesta))
      }
    } catch {
      setError('No se ha podido conectar. Comprueba tu conexión e inténtalo de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-surface p-4">
      <header className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Pedido {pedido.codigo_publico}</p>
        <span className="rounded-full bg-success-soft px-2 py-1 text-xs font-bold text-success">
          Pagado online — no cobrar
        </span>
      </header>

      <p className="mt-2 font-semibold text-ink">
        {pedido.franja_solicitada_asap
          ? 'Lo antes posible'
          : `${formatearHoraFranja(pedido.franja_solicitada_inicio)}–${formatearHoraFranja(pedido.franja_solicitada_fin)}`}
        {pedido.franja_confirmada_inicio && pedido.franja_confirmada_fin && (
          <span className="text-success">
            {' '}
            → confirmado {formatearHoraFranja(pedido.franja_confirmada_inicio)}–
            {formatearHoraFranja(pedido.franja_confirmada_fin)}
          </span>
        )}
      </p>

      <p className="mt-2 font-display text-lg text-ink">
        {pedido.direccion_calle} {pedido.direccion_numero}
        {pedido.direccion_piso ? `, ${pedido.direccion_piso}` : ''}
      </p>
      <p className="text-sm text-ink-soft">
        {pedido.direccion_cp} {pedido.direccion_ciudad}
      </p>
      {pedido.direccion_indicaciones && (
        <p className="mt-1 text-sm font-semibold text-accent-dark">{pedido.direccion_indicaciones}</p>
      )}

      <div className="mt-3 flex gap-2">
        <a
          href={enlaceMapa(pedido)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-lg border border-border bg-ground px-3 py-2 text-center text-sm font-semibold text-ink"
        >
          Abrir en el mapa
        </a>
        <a
          href={`tel:${pedido.cliente_telefono}`}
          className="flex-1 rounded-lg border border-border bg-ground px-3 py-2 text-center text-sm font-semibold text-ink"
        >
          {pedido.cliente_telefono}
        </a>
      </div>

      <ul className="mt-3 flex flex-col gap-1 text-sm text-ink">
        {pedido.pedido_lineas.map((linea) => (
          <li key={linea.id}>
            {linea.cantidad}× {linea.nombre_articulo} · {linea.nombre_tamano}
            {linea.pedido_extras.length > 0 && (
              <span className="text-ink-soft"> ({linea.pedido_extras.map((e) => e.nombre_extra).join(', ')})</span>
            )}
          </li>
        ))}
      </ul>

      {pedido.notas && <p className="mt-3 rounded-lg bg-accent-soft p-2 text-sm text-accent-dark">{pedido.notas}</p>}
      {error && <p className="mt-3 rounded-lg bg-accent-soft p-2 text-sm text-accent-dark">{error}</p>}

      {pedido.estado === 'pendiente_envio' && (
        <button
          type="button"
          disabled={enviando}
          onClick={() => avanzar('en_reparto')}
          className="mt-4 h-12 w-full rounded-xl bg-accent font-bold text-surface disabled:opacity-40"
        >
          Recojo este
        </button>
      )}

      {pedido.estado === 'en_reparto' && (
        <button
          type="button"
          disabled={enviando}
          onClick={() => avanzar('entregado')}
          className="mt-4 h-12 w-full rounded-xl bg-accent font-bold text-surface disabled:opacity-40"
        >
          Entregado
        </button>
      )}
    </article>
  )
}
