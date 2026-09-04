import { redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { obtenerAjustes } from '@/lib/ajustes'
import { FormularioAjustes } from '@/components/panel/FormularioAjustes'
import { VistaAjustesSoloLectura } from '@/components/panel/VistaAjustesSoloLectura'

export default async function PaginaAjustes() {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol === 'repartidor') redirect('/panel')

  const ajustes = await obtenerAjustes()
  return perfil.rol === 'admin' ? (
    <FormularioAjustes ajustesIniciales={ajustes} />
  ) : (
    <VistaAjustesSoloLectura ajustes={ajustes} />
  )
}
