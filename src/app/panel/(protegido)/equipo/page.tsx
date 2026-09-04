import { redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarEquipo } from '@/lib/personal/equipo'
import { VistaEquipo } from '@/components/panel/VistaEquipo'

export default async function PaginaEquipo() {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol !== 'admin') redirect('/panel')

  const equipo = await listarEquipo()
  return <VistaEquipo equipo={equipo} />
}
