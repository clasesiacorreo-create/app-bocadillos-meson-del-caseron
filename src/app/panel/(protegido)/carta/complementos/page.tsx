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
        className="self-start rounded-full bg-accent px-4 py-2 font-bold text-surface"
      >
        Nuevo complemento
      </Link>
      <ul className="flex flex-col gap-2">
        {extras.map((extra) => (
          <li key={extra.id}>
            <Link
              href={`/panel/carta/complementos/${extra.id}`}
              className="block rounded-xl border border-border bg-surface p-3 text-ink"
            >
              {extra.nombre}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
