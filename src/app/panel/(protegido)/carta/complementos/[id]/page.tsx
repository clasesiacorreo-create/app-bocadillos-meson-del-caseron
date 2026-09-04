import { notFound, redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarExtrasCompletos, listarTamanos } from '@/lib/carta/escritura'
import { obtenerCarta } from '@/lib/carta/consultas'
import { FormularioComplemento } from '@/components/panel/FormularioComplemento'

export default async function PaginaEditarComplemento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol !== 'admin') redirect('/panel/carta')

  const [tamanos, extras, carta] = await Promise.all([listarTamanos(), listarExtrasCompletos(), obtenerCarta()])
  const extra = extras.find((e) => e.id === id)
  if (!extra) notFound()
  const categorias = carta.categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    articulos: c.articulos.map((a) => ({ id: a.id, nombre: a.nombre })),
  }))

  return <FormularioComplemento tamanos={tamanos} categorias={categorias} complementoInicial={extra} />
}
