import { redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarPedidosPanel } from '@/lib/pedidos/panel'
import { crearClienteServidorSesion } from '@/lib/supabase/cliente-servidor-sesion'
import { CerrarSesionBoton } from '@/components/panel/CerrarSesionBoton'
import { VistaReparto } from '@/components/panel/VistaReparto'

export default async function PaginaReparto() {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol !== 'repartidor') redirect('/panel')

  const supabaseSesion = await crearClienteServidorSesion()
  const pedidos = await listarPedidosPanel(supabaseSesion)

  return (
    <div className="min-h-dvh pb-10">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div>
          <p className="font-semibold">{perfil.nombre}</p>
          <p className="text-xs uppercase tracking-wide text-neutral-400">{perfil.rol}</p>
        </div>
        <CerrarSesionBoton />
      </header>
      <main className="px-4 py-4">
        <VistaReparto perfil={perfil} pedidosIniciales={pedidos} />
      </main>
    </div>
  )
}
