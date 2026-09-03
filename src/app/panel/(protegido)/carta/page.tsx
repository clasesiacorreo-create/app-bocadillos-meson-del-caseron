import Link from 'next/link'
import { redirect } from 'next/navigation'
import { obtenerCarta } from '@/lib/carta/consultas'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { VistaDisponibilidad } from '@/components/panel/VistaDisponibilidad'

export default async function PaginaDisponibilidad() {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol === 'repartidor') redirect('/panel')

  const carta = await obtenerCarta()

  return (
    <div className="flex flex-col gap-4">
      {perfil.rol === 'admin' && (
        <div className="flex gap-2">
          <Link href="/panel/carta/articulos" className="rounded-lg border border-neutral-700 px-3 py-2 text-sm">
            Editar artículos
          </Link>
          <Link href="/panel/carta/complementos" className="rounded-lg border border-neutral-700 px-3 py-2 text-sm">
            Editar complementos
          </Link>
        </div>
      )}
      <VistaDisponibilidad carta={carta} />
    </div>
  )
}
