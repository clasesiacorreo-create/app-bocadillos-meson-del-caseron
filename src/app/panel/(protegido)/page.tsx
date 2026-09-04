import { redirect } from 'next/navigation'
import { obtenerAjustesHorario } from '@/lib/carta/consultas'
import { generarFranjas } from '@/lib/horario'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarPedidosPanel } from '@/lib/pedidos/panel'
import { crearClienteServidorSesion } from '@/lib/supabase/cliente-servidor-sesion'
import { TableroPedidos } from '@/components/panel/TableroPedidos'

export default async function PaginaPanel() {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol === 'repartidor') redirect('/reparto')

  const supabaseSesion = await crearClienteServidorSesion()
  const [pedidos, ajustesHorario] = await Promise.all([
    listarPedidosPanel(supabaseSesion),
    obtenerAjustesHorario(),
  ])
  const franjas = generarFranjas(ajustesHorario, new Date())

  return <TableroPedidos perfil={perfil} pedidosIniciales={pedidos} franjas={franjas} />
}
