'use client'

import { useEffect, useState } from 'react'
import { crearClienteNavegador } from '@/lib/supabase/cliente-navegador'
import {
  actualizarCamposPedido,
  fusionarLineaEnLista,
  fusionarPedidoEnLista,
  ordenarPorFranja,
  pestanaDePedido,
  type Pestana,
} from '@/lib/pedidos/tablero'
import type { EstadoPedido, PedidoConLineas } from '@/lib/pedidos/tipos'
import type { PerfilStaff } from '@/lib/personal/tipos'
import type { Franja } from '@/lib/horario/tipos'
import type { Tables } from '@/lib/supabase/tipos-bd'
import { TarjetaPedido } from './TarjetaPedido'

const PESTANAS: { id: Pestana; etiqueta: string }[] = [
  { id: 'nuevos', etiqueta: 'Nuevos' },
  { id: 'en_marcha', etiqueta: 'En marcha' },
  { id: 'pendientes_envio', etiqueta: 'Pendientes de envío' },
  { id: 'entregados', etiqueta: 'Entregados' },
]

function reproducirAviso() {
  try {
    const contexto = new AudioContext()
    const oscilador = contexto.createOscillator()
    const ganancia = contexto.createGain()
    oscilador.type = 'sine'
    oscilador.frequency.value = 880
    ganancia.gain.setValueAtTime(0.2, contexto.currentTime)
    ganancia.gain.exponentialRampToValueAtTime(0.001, contexto.currentTime + 0.6)
    oscilador.connect(ganancia)
    ganancia.connect(contexto.destination)
    oscilador.start()
    oscilador.stop(contexto.currentTime + 0.6)
  } catch {
    // Sin audio (navegador sin soporte o reproducción automática bloqueada): no debe romper el tablero.
  }
  if (navigator.vibrate) navigator.vibrate([200, 100, 200])
}

type Props = {
  perfil: PerfilStaff
  pedidosIniciales: PedidoConLineas[]
  franjas: Franja[]
}

export function TableroPedidos({ perfil, pedidosIniciales, franjas }: Props) {
  const [pedidos, setPedidos] = useState(pedidosIniciales)
  const [pestanaActiva, setPestanaActiva] = useState<Pestana>('nuevos')

  useEffect(() => {
    const supabase = crearClienteNavegador()

    const canal = supabase
      .channel('tablero-pedidos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos' }, async (payload) => {
        const { data } = await supabase
          .from('pedidos')
          .select('*, pedido_lineas(*, pedido_extras(*))')
          .eq('id', (payload.new as Tables<'pedidos'>).id)
          .single()
        if (data) {
          setPedidos((actuales) => fusionarPedidoEnLista(actuales, data as PedidoConLineas))
          reproducirAviso()
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos' }, (payload) => {
        setPedidos((actuales) => actualizarCamposPedido(actuales, payload.new as Tables<'pedidos'>))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedido_lineas' }, (payload) => {
        setPedidos((actuales) => fusionarLineaEnLista(actuales, payload.new as Tables<'pedido_lineas'>))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  function pedidosDe(id: Pestana) {
    return pedidos.filter((p) => pestanaDePedido(p.estado as EstadoPedido) === id)
  }

  const pedidosDeLaPestana = ordenarPorFranja(pedidosDe(pestanaActiva))

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex gap-2 overflow-x-auto">
        {PESTANAS.map((pestana) => (
          <button
            key={pestana.id}
            type="button"
            onClick={() => setPestanaActiva(pestana.id)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
              pestanaActiva === pestana.id ? 'border-amber-500 bg-amber-500/10' : 'border-neutral-700'
            }`}
          >
            {pestana.etiqueta} ({pedidosDe(pestana.id).length})
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-4">
        {pedidosDeLaPestana.length === 0 && <p className="text-sm text-neutral-400">No hay pedidos aquí.</p>}
        {pedidosDeLaPestana.map((pedido) => (
          <TarjetaPedido
            key={pedido.id}
            pedido={pedido}
            perfil={perfil}
            franjas={franjas}
            onActualizado={(actualizado) => setPedidos((actuales) => fusionarPedidoEnLista(actuales, actualizado))}
          />
        ))}
      </div>
    </div>
  )
}
