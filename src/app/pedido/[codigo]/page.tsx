import { notFound } from 'next/navigation'
import { obtenerEstadoPedido } from '@/lib/pedidos/seguimiento'
import { EstadoPedido } from '@/components/pedido/EstadoPedido'

export default async function PaginaSeguimiento({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const estado = await obtenerEstadoPedido(codigo)
  if (!estado) notFound()

  return (
    <main className="mx-auto max-w-[1100px] px-5 py-8 lg:px-16">
      <EstadoPedido estadoInicial={estado} />
    </main>
  )
}
