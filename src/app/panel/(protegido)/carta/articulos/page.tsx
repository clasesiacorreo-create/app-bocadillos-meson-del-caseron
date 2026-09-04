import Link from 'next/link'
import { redirect } from 'next/navigation'
import { obtenerCarta } from '@/lib/carta/consultas'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'

export default async function PaginaListadoArticulos() {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')
  if (perfil.rol !== 'admin') redirect('/panel/carta')

  const carta = await obtenerCarta()

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/panel/carta/articulos/nuevo"
        className="self-start rounded-lg bg-amber-500 px-4 py-2 font-bold text-neutral-950"
      >
        Nuevo artículo
      </Link>
      {carta.categorias.map((categoria) => (
        <section key={categoria.id}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">{categoria.nombre}</h2>
          <ul className="flex flex-col gap-2">
            {categoria.articulos.map((articulo) => (
              <li key={articulo.id}>
                <Link
                  href={`/panel/carta/articulos/${articulo.id}`}
                  className="block rounded-lg border border-neutral-700 p-3"
                >
                  {articulo.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
