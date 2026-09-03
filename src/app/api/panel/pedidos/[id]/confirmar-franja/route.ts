import { NextResponse } from 'next/server'
import { obtenerAjustesHorario } from '@/lib/carta/consultas'
import { puedeConfirmarFranja, puedeVerPedido } from '@/lib/estados'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { confirmarFranjaPedido, obtenerPedidoPanelPorId } from '@/lib/pedidos/panel'
import { validarFranja } from '@/lib/pedidos/validacion'
import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'
import type { EstadoPedido, FranjaSolicitada } from '@/lib/pedidos/tipos'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!puedeConfirmarFranja(perfil.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const pedidoActual = await obtenerPedidoPanelPorId(crearClienteServicio(), id)
  if (!pedidoActual) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // La lectura de arriba usa la clave de servicio, que se salta RLS: sin esta
  // comprobación este endpoint devolvería el pedido entero (dirección,
  // teléfono, líneas, totales) a un rol al que la política de la migración
  // 0004 se lo oculta, como cocina con un pedido aún sin cobrar.
  if (!puedeVerPedido(perfil.rol, pedidoActual.estado as EstadoPedido)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const cuerpo = (await req.json()) as Partial<FranjaSolicitada> | null
  if (
    !cuerpo ||
    typeof cuerpo.inicio !== 'string' ||
    typeof cuerpo.fin !== 'string' ||
    typeof cuerpo.loAntesPosible !== 'boolean'
  ) {
    return NextResponse.json({ error: 'La franja recibida no tiene el formato esperado.' }, { status: 422 })
  }
  const franja: FranjaSolicitada = {
    inicio: cuerpo.inicio,
    fin: cuerpo.fin,
    loAntesPosible: cuerpo.loAntesPosible,
  }

  // Misma revalidación que en el checkout del cliente: una franja horaria
  // concreta puede haberse quedado obsoleta en un tablero abierto todo el
  // día. "Lo antes posible" no es una franja con hora que pueda caducar así:
  // es la misma petición que el cliente ya hizo y pagó, y aceptarla no debe
  // depender de si el restaurante está abierto en el instante exacto en que
  // cocina pulsa el botón — ya se validó una vez al crear el pedido.
  if (!franja.loAntesPosible) {
    const errorFranja = validarFranja(await obtenerAjustesHorario(), franja, new Date())
    if (errorFranja) {
      return NextResponse.json(
        { error: 'Esa franja ya no es válida. Recarga el panel para ver las horas disponibles.', tipo: errorFranja.tipo },
        { status: 422 },
      )
    }
  }

  const pedido = await confirmarFranjaPedido(id, franja)
  return NextResponse.json(pedido)
}
