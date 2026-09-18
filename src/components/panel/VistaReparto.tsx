'use client'

import { useEffect, useRef, useState } from 'react'
import { crearClienteNavegador } from '@/lib/supabase/cliente-navegador'
import { actualizarCamposPedido, fusionarPedidoEnLista, ordenarPorFranja } from '@/lib/pedidos/tablero'
import { pestanaDeReparto, type PestanaReparto } from '@/lib/pedidos/reparto'
import type { PedidoConLineas } from '@/lib/pedidos/tipos'
import type { PerfilStaff } from '@/lib/personal/tipos'
import type { Tables } from '@/lib/supabase/tipos-bd'
import { TarjetaReparto } from './TarjetaReparto'

const PESTANAS: { id: PestanaReparto; etiqueta: string }[] = [
  { id: 'para_repartir', etiqueta: 'Para repartir' },
  { id: 'mis_entregas', etiqueta: 'Mis entregas' },
]

type Props = {
  perfil: PerfilStaff
  pedidosIniciales: PedidoConLineas[]
}

export function VistaReparto({ perfil, pedidosIniciales }: Props) {
  const [pedidos, setPedidos] = useState(pedidosIniciales)
  const pedidosRef = useRef(pedidos)
  useEffect(() => {
    pedidosRef.current = pedidos
  }, [pedidos])
  const [pestanaActiva, setPestanaActiva] = useState<PestanaReparto>('para_repartir')

  useEffect(() => {
    const supabase = crearClienteNavegador()

    async function manejarCambioDePedido(cambio: Tables<'pedidos'>) {
      const yaVisible = pedidosRef.current.some((p) => p.id === cambio.id)
      if (yaVisible) {
        setPedidos((actuales) => actualizarCamposPedido(actuales, cambio))
        return
      }
      if (pestanaDeReparto(cambio, perfil.userId) === null) return

      const { data } = await supabase
        .from('pedidos')
        .select('*, pedido_lineas(*, pedido_extras(*))')
        .eq('id', cambio.id)
        .single()
      if (data) setPedidos((actuales) => fusionarPedidoEnLista(actuales, data as PedidoConLineas))
    }

    const canal = supabase
      .channel('vista-reparto')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos' }, (payload) => {
        manejarCambioDePedido(payload.new as Tables<'pedidos'>)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos' }, (payload) => {
        manejarCambioDePedido(payload.new as Tables<'pedidos'>)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [perfil.userId])

  function pedidosDe(id: PestanaReparto) {
    return pedidos.filter((p) => pestanaDeReparto(p, perfil.userId) === id)
  }

  function quitarPedido(pedidoId: string) {
    setPedidos((actuales) => actuales.filter((p) => p.id !== pedidoId))
  }

  const pedidosDeLaPestana = ordenarPorFranja(pedidosDe(pestanaActiva))

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex gap-2">
        {PESTANAS.map((pestana) => (
          <button
            key={pestana.id}
            type="button"
            onClick={() => setPestanaActiva(pestana.id)}
            className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold ${
              pestanaActiva === pestana.id
                ? 'border-accent bg-accent-soft text-accent-dark'
                : 'border-border bg-surface text-ink-soft'
            }`}
          >
            {pestana.etiqueta} ({pedidosDe(pestana.id).length})
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-4">
        {pedidosDeLaPestana.length === 0 && <p className="text-sm text-ink-soft">No hay pedidos aquí.</p>}
        {pedidosDeLaPestana.map((pedido) => (
          <TarjetaReparto
            key={pedido.id}
            pedido={pedido}
            onActualizado={(actualizado) => setPedidos((actuales) => fusionarPedidoEnLista(actuales, actualizado))}
            onConflicto={() => quitarPedido(pedido.id)}
          />
        ))}
      </div>
    </div>
  )
}
