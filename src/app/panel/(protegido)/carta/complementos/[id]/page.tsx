import { notFound, redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarExtrasCompletos, listarTamanos } from '@/lib/carta/escritura'
import { FormularioComplemento } from '@/components/panel/FormularioComplemento'

export default async function PaginaEditarComplemento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol !== 'admin') redirect('/panel/carta')

  const [tamanos, extras] = await Promise.all([listarTamanos(), listarExtrasCompletos()])
  const extra = extras.find((e) => e.id === id)
  if (!extra) notFound()

  return <FormularioComplemento tamanos={tamanos} complementoInicial={extra} />
}
