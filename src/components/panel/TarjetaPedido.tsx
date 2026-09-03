'use client'

import { useState } from 'react'
import { agruparFranjasPorDia, formatearHoraFranja } from '@/lib/horario'
import type { Franja } from '@/lib/horario/tipos'
import { formatearPrecio } from '@/lib/dinero'
import { franjaEsInminente } from '@/lib/pedidos/tablero'
import type { EstadoPedido, PedidoConLineas } from '@/lib/pedidos/tipos'
import type { ModoEntrega } from '@/lib/precios/tipos'
import type { PerfilStaff } from '@/lib/personal/tipos'

type Props = {
  pedido: PedidoConLineas
  perfil: PerfilStaff
  franjas: Franja[]
  onActualizado: (pedido: PedidoConLineas) => void
}

export function TarjetaPedido({ pedido, perfil, franjas, onActualizado }: Props) {
  const [mostrandoOtrasHoras, setMostrandoOtrasHoras] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const estado = pedido.estado as EstadoPedido
  const modoEntrega = pedido.modo_entrega as ModoEntrega
  const inicioFranja = pedido.franja_confirmada_inicio ?? pedido.franja_solicitada_inicio
  const franjaInminente = franjaEsInminente(inicioFranja, new Date())
  const puedeOperar = perfil.rol === 'admin' || perfil.rol === 'cocina'
  const checklistActivo = estado === 'nuevo' || estado === 'en_preparacion'
  const gruposFranjas = agruparFranjasPorDia(franjas, new Date())

  async function confirmarFranja(franja: { inicio: string; fin: string; loAntesPosible: boolean }) {
    setEnviando(true)
    const respuesta = await fetch(`/api/panel/pedidos/${pedido.id}/confirmar-franja`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(franja),
    })
    if (respuesta.ok) onActualizado(await respuesta.json())
    setEnviando(false)
    setMostrandoOtrasHoras(false)
  }

  async function avanzar(aFase: EstadoPedido) {
    setEnviando(true)
    const respuesta = await fetch(`/api/panel/pedidos/${pedido.id}/avanzar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aFase }),
    })
    if (respuesta.ok) onActualizado(await respuesta.json())
    setEnviando(false)
  }

  async function aceptarYEmpezar() {
    setEnviando(true)
    const respuestaFranja = await fetch(`/api/panel/pedidos/${pedido.id}/confirmar-franja`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inicio: pedido.franja_solicitada_inicio,
        fin: pedido.franja_solicitada_fin,
        loAntesPosible: true,
      }),
    })
    if (respuestaFranja.ok) {
      const respuestaAvanzar = await fetch(`/api/panel/pedidos/${pedido.id}/avanzar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aFase: 'en_preparacion' }),
      })
      if (respuestaAvanzar.ok) onActualizado(await respuestaAvanzar.json())
    }
    setEnviando(false)
  }

  async function marcarLinea(lineaId: string, preparada: boolean) {
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
    }
  }

  return (
    <article
      className={`rounded-xl border p-4 ${
        pedido.franja_confirmada_inicio
          ? 'border-emerald-600'
          : franjaInminente
            ? 'border-amber-500 bg-amber-500/10'
            : 'border-neutral-700'
      }`}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-400">
            Pedido {pedido.codigo_publico} ·{' '}
            {new Date(pedido.creado_en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="mt-1 font-semibold">
            {pedido.franja_solicitada_asap
              ? 'Lo antes posible'
              : `${formatearHoraFranja(pedido.franja_solicitada_inicio)}–${formatearHoraFranja(pedido.franja_solicitada_fin)}`}
            {pedido.franja_confirmada_inicio && pedido.franja_confirmada_fin && (
              <span className="text-emerald-400">
                {' '}
                → confirmado {formatearHoraFranja(pedido.franja_confirmada_inicio)}–
                {formatearHoraFranja(pedido.franja_confirmada_fin)}
              </span>
            )}
          </p>
          <p className="text-sm text-neutral-400">
            {modoEntrega === 'domicilio' ? 'A domicilio' : 'Recogida en el local'}
          </p>
        </div>
        <a href={`tel:${pedido.cliente_telefono}`} className="rounded-lg border border-neutral-700 px-3 py-2 text-sm">
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
              className="mt-1"
            />
            <span className={linea.preparada ? 'text-neutral-500 line-through' : ''}>
              {linea.cantidad}× {linea.nombre_articulo} · {linea.nombre_tamano}
              {linea.pedido_extras.length > 0 && (
                <span className="text-neutral-400"> ({linea.pedido_extras.map((e) => e.nombre_extra).join(', ')})</span>
              )}
              {linea.notas_linea && <span className="block text-amber-400">{linea.notas_linea}</span>}
            </span>
          </li>
        ))}
      </ul>

      {pedido.notas && <p className="mt-3 rounded-lg bg-amber-500/10 p-2 text-sm text-amber-400">{pedido.notas}</p>}

      <p className="mt-3 font-bold">{formatearPrecio(pedido.total_centimos)}</p>

      {puedeOperar && (
        <div className="mt-4 flex flex-col gap-2">
          {estado === 'nuevo' && !pedido.franja_confirmada_inicio && pedido.franja_solicitada_asap && (
            <button
              type="button"
              disabled={enviando}
              onClick={aceptarYEmpezar}
              className="h-12 rounded-xl bg-amber-500 font-bold text-neutral-950 disabled:opacity-40"
            >
              Aceptar y empezar
            </button>
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
                className="h-12 flex-1 rounded-xl bg-amber-500 font-bold text-neutral-950 disabled:opacity-40"
              >
                Confirmar {formatearHoraFranja(pedido.franja_solicitada_inicio)}–
                {formatearHoraFranja(pedido.franja_solicitada_fin)}
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={() => setMostrandoOtrasHoras((v) => !v)}
                className="h-12 flex-1 rounded-xl border border-neutral-700 font-semibold disabled:opacity-40"
              >
                Proponer otra hora
              </button>
            </div>
          )}

          {mostrandoOtrasHoras && (
            <div className="flex flex-col gap-2 rounded-lg border border-neutral-700 p-3">
              {gruposFranjas.map((grupo) => (
                <div key={grupo.etiqueta} className="flex flex-col gap-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{grupo.etiqueta}</p>
                  <div className="flex flex-wrap gap-2">
                    {grupo.franjas.map((franja) => (
                      <button
                        key={franja.inicio + franja.fin}
                        type="button"
                        disabled={enviando}
                        onClick={() => confirmarFranja({ inicio: franja.inicio, fin: franja.fin, loAntesPosible: false })}
                        className="rounded-lg border border-neutral-700 px-3 py-2 text-sm disabled:opacity-40"
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
              className="h-12 rounded-xl bg-amber-500 font-bold text-neutral-950 disabled:opacity-40"
            >
              Empezar
            </button>
          )}

          {estado === 'en_preparacion' && (
            <button
              type="button"
              disabled={enviando}
              onClick={() => avanzar('pendiente_envio')}
              className="h-12 rounded-xl bg-amber-500 font-bold text-neutral-950 disabled:opacity-40"
            >
              Listo
            </button>
          )}

          {estado === 'pendiente_envio' && modoEntrega === 'recogida' && (
            <button
              type="button"
              disabled={enviando}
              onClick={() => avanzar('entregado')}
              className="h-12 rounded-xl bg-amber-500 font-bold text-neutral-950 disabled:opacity-40"
            >
              Entregado
            </button>
          )}

          {estado === 'pendiente_envio' && modoEntrega === 'domicilio' && (
            <p className="text-center text-sm text-neutral-400">Esperando a que un repartidor lo recoja.</p>
          )}
        </div>
      )}
    </article>
  )
}
