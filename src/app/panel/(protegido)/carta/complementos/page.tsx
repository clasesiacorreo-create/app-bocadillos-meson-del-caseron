import Link from 'next/link'
import { redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarExtrasCompletos } from '@/lib/carta/escritura'

export default async function PaginaListadoComplementos() {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol !== 'admin') redirect('/panel/carta')

  const extras = await listarExtrasCompletos()

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/panel/carta/complementos/nuevo"
        className="self-start rounded-lg bg-amber-500 px-4 py-2 font-bold text-neutral-950"
      >
        Nuevo complemento
      </Link>
      <ul className="flex flex-col gap-2">
        {extras.map((extra) => (
          <li key={extra.id}>
            <Link
              href={`/panel/carta/complementos/${extra.id}`}
              className="block rounded-lg border border-neutral-700 p-3"
            >
              {extra.nombre}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
