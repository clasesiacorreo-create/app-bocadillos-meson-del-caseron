'use client'

import { useState } from 'react'
import { agruparFranjasPorDia, formatearHoraFranja } from '@/lib/horario'
import type { Franja } from '@/lib/horario/tipos'
import { formatearPrecio } from '@/lib/dinero'
import { mensajeDeError } from '@/lib/panel/erroresApi'
import { franjaEsInminente } from '@/lib/pedidos/tablero'
import type { EstadoPedido, PedidoConLineas } from '@/lib/pedidos/tipos'
import type { ModoEntrega } from '@/lib/precios/tipos'
import type { PerfilStaff } from '@/lib/personal/tipos'

type Props = {
  pedido: PedidoConLineas
  perfil: PerfilStaff
  franjas: Franja[]
  onActualizado: (pedido: PedidoConLineas) => void
  nombresRepartidores?: Record<string, string>
}

export function TarjetaPedido({ pedido, perfil, franjas, onActualizado, nombresRepartidores = {} }: Props) {
  const [mostrandoOtrasHoras, setMostrandoOtrasHoras] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const estado = pedido.estado as EstadoPedido
  const modoEntrega = pedido.modo_entrega as ModoEntrega
  const inicioFranja = pedido.franja_confirmada_inicio ?? pedido.franja_solicitada_inicio
  const franjaInminente = franjaEsInminente(inicioFranja, new Date())
  const puedeOperar = perfil.rol === 'admin' || perfil.rol === 'cocina'
  const checklistActivo = estado === 'nuevo' || estado === 'en_preparacion'
  const gruposFranjas = agruparFranjasPorDia(franjas, new Date())

  async function confirmarFranja(franja: { inicio: string; fin: string; loAntesPosible: boolean }) {
    setEnviando(true)
    setError(null)
    const respuesta = await fetch(`/api/panel/pedidos/${pedido.id}/confirmar-franja`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(franja),
    })
    if (respuesta.ok) {
      onActualizado(await respuesta.json())
      // El selector de horas solo se cierra si la franja quedó confirmada: al
      // fallar es justo cuando hay que seguir viendo qué se intentó.
      setMostrandoOtrasHoras(false)
    } else {
      setError(await mensajeDeError(respuesta))
    }
    setEnviando(false)
  }

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

  async function aceptarYEmpezar() {
    setEnviando(true)
    setError(null)
    const respuestaFranja = await fetch(`/api/panel/pedidos/${pedido.id}/confirmar-franja`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inicio: pedido.franja_solicitada_inicio,
        fin: pedido.franja_solicitada_fin,
        loAntesPosible: true,
      }),
    })
    if (!respuestaFranja.ok) {
      setError(await mensajeDeError(respuestaFranja))
      setEnviando(false)
      return
    }

    const respuestaAvanzar = await fetch(`/api/panel/pedidos/${pedido.id}/avanzar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aFase: 'en_preparacion' }),
    })
    if (respuestaAvanzar.ok) onActualizado(await respuestaAvanzar.json())
    else setError(await mensajeDeError(respuestaAvanzar))
    setEnviando(false)
  }

  async function marcarLinea(lineaId: string, preparada: boolean) {
    setError(null)
    const respuesta = await fetch(`/api/panel/pedidos/${pedido.id}/lineas/${lineaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preparada }),
    })
    if (respuesta.ok) {
      onActualizado({
        ...pedido,
        pedido_lineas: pedido.pedido_lineas.map((l) => (l.id === lineaId ? { ...l, preparada } : l)),
      })
    } else {
      setError(await mensajeDeError(respuesta))
    }
  }

  return (
    <article
      className={`rounded-xl border p-4 ${
        pedido.franja_confirmada_inicio
          ? 'border-success bg-success-soft'
          : franjaInminente
            ? 'border-urgente bg-urgente-soft'
            : 'border-border bg-surface'
      }`}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-soft">
            Pedido {pedido.codigo_publico} ·{' '}
            {new Date(pedido.creado_en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="mt-1 font-semibold text-ink">
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
          <p className="text-sm font-semibold text-ink">
            {modoEntrega === 'domicilio' ? 'A domicilio' : 'Recogida en el local'}
          </p>
        </div>
        <a
          href={`tel:${pedido.cliente_telefono}`}
          className="rounded-full border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink"
        >
          {pedido.cliente_telefono}
        </a>
      </header>

      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {pedido.pedido_lineas.map((linea) => (
          <li key={linea.id} className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={linea.preparada}
              disabled={!puedeOperar || !checklistActivo || enviando}
              onChange={(e) => marcarLinea(linea.id, e.target.checked)}
              className="mt-1 accent-[var(--color-accent)]"
            />
            <span className={linea.preparada ? 'text-ink-soft line-through' : 'text-ink'}>
              {linea.cantidad}× {linea.nombre_articulo} · {linea.nombre_tamano}
              {linea.pedido_extras.length > 0 && (
                <span className="text-ink-soft"> ({linea.pedido_extras.map((e) => e.nombre_extra).join(', ')})</span>
              )}
              {linea.notas_linea && <span className="block text-accent-dark">{linea.notas_linea}</span>}
            </span>
          </li>
        ))}
      </ul>

      {pedido.notas && <p className="mt-3 rounded-lg bg-accent-soft p-2 text-sm text-accent-dark">{pedido.notas}</p>}

      <p className="mt-3 font-bold text-ink">{formatearPrecio(pedido.total_centimos)}</p>

      {error && <p className="mt-3 rounded-lg bg-accent-soft p-2 text-sm text-accent-dark">{error}</p>}

      {puedeOperar && (
        <div className="mt-4 flex flex-col gap-2">
          {estado === 'nuevo' && !pedido.franja_confirmada_inicio && pedido.franja_solicitada_asap && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={enviando}
                onClick={aceptarYEmpezar}
                className="h-12 flex-1 rounded-xl bg-accent font-bold text-surface disabled:opacity-40"
              >
                Aceptar y empezar
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={() => setMostrandoOtrasHoras((v) => !v)}
                className="h-12 flex-1 rounded-xl border border-border bg-surface font-semibold text-ink disabled:opacity-40"
              >
                Proponer otra hora
              </button>
            </div>
          )}

          {estado === 'nuevo' && !pedido.franja_confirmada_inicio && !pedido.franja_solicitada_asap && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={enviando}
                onClick={() =>
                  confirmarFranja({
                    inicio: pedido.franja_solicitada_inicio,
                    fin: pedido.franja_solicitada_fin,
                    loAntesPosible: false,
                  })
                }
                className="h-12 flex-1 rounded-xl bg-accent font-bold text-surface disabled:opacity-40"
              >
                Confirmar {formatearHoraFranja(pedido.franja_solicitada_inicio)}–
                {formatearHoraFranja(pedido.franja_solicitada_fin)}
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={() => setMostrandoOtrasHoras((v) => !v)}
                className="h-12 flex-1 rounded-xl border border-border bg-surface font-semibold text-ink disabled:opacity-40"
              >
                Proponer otra hora
              </button>
            </div>
          )}

          {mostrandoOtrasHoras && (
            <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
              {gruposFranjas.map((grupo) => (
                <div key={grupo.etiqueta} className="flex flex-col gap-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{grupo.etiqueta}</p>
                  <div className="flex flex-wrap gap-2">
                    {grupo.franjas.map((franja) => (
                      <button
                        key={franja.inicio + franja.fin}
                        type="button"
                        disabled={enviando}
                        onClick={() => confirmarFranja({ inicio: franja.inicio, fin: franja.fin, loAntesPosible: false })}
                        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink disabled:opacity-40"
                      >
                        {formatearHoraFranja(franja.inicio)}–{formatearHoraFranja(franja.fin)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {estado === 'nuevo' && pedido.franja_confirmada_inicio && (
            <button
              type="button"
              disabled={enviando}
              onClick={() => avanzar('en_preparacion')}
              className="h-12 rounded-xl bg-accent font-bold text-surface disabled:opacity-40"
            >
              Empezar
            </button>
          )}

          {estado === 'en_preparacion' && (
            <button
              type="button"
              disabled={enviando}
              onClick={() => avanzar('pendiente_envio')}
              className="h-12 rounded-xl bg-accent font-bold text-surface disabled:opacity-40"
            >
              Listo
            </button>
          )}

          {estado === 'pendiente_envio' && modoEntrega === 'recogida' && (
            <button
              type="button"
              disabled={enviando}
              onClick={() => avanzar('entregado')}
              className="h-12 rounded-xl bg-accent font-bold text-surface disabled:opacity-40"
            >
              Entregado
            </button>
          )}

          {estado === 'pendiente_envio' && modoEntrega === 'domicilio' && (
            <p className="text-center text-sm text-ink-soft">Esperando a que un repartidor lo recoja.</p>
          )}

          {estado === 'en_reparto' && (
            <p className="text-center text-sm text-ink-soft">
              En reparto con {pedido.repartidor_id ? (nombresRepartidores[pedido.repartidor_id] ?? 'un repartidor') : 'un repartidor'}
            </p>
          )}
        </div>
      )}
    </article>
  )
}
