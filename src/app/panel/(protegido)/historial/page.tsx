import { redirect } from 'next/navigation'
import { rangoDelDiaEnMadrid } from '@/lib/horario'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarHistorial, totalFacturadoHoy } from '@/lib/pedidos/historial'
import { crearClienteServidorSesion } from '@/lib/supabase/cliente-servidor-sesion'
import { VistaHistorial } from '@/components/panel/VistaHistorial'

export default async function PaginaHistorial() {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol === 'repartidor') redirect('/panel')

  const supabase = await crearClienteServidorSesion()
  const [historial, totalHoy] = await Promise.all([
    listarHistorial(supabase),
    totalFacturadoHoy(supabase, rangoDelDiaEnMadrid(new Date())),
  ])

  return <VistaHistorial historialInicial={historial} totalHoyCentimos={totalHoy} />
}
