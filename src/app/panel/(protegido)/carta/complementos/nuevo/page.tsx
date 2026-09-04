import { redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarTamanos } from '@/lib/carta/escritura'
import { obtenerCarta } from '@/lib/carta/consultas'
import { FormularioComplemento } from '@/components/panel/FormularioComplemento'

export default async function PaginaNuevoComplemento() {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol !== 'admin') redirect('/panel/carta')

  const [tamanos, carta] = await Promise.all([listarTamanos(), obtenerCarta()])
  const categorias = carta.categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    articulos: c.articulos.map((a) => ({ id: a.id, nombre: a.nombre })),
  }))

  return <FormularioComplemento tamanos={tamanos} categorias={categorias} />
}
