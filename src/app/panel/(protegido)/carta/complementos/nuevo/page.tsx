import { redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarTamanos } from '@/lib/carta/escritura'
import { FormularioComplemento } from '@/components/panel/FormularioComplemento'

export default async function PaginaNuevoComplemento() {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol !== 'admin') redirect('/panel/carta')

  const tamanos = await listarTamanos()
  return <FormularioComplemento tamanos={tamanos} />
}
