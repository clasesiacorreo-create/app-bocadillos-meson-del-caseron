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
        className="self-start rounded-full bg-accent px-4 py-2 font-bold text-surface"
      >
        Nuevo artículo
      </Link>
      {carta.categorias.map((categoria) => (
        <section key={categoria.id}>
          <h2 className="mb-2 font-display text-lg italic text-ink">{categoria.nombre}</h2>
          <ul className="flex flex-col gap-2">
            {categoria.articulos.map((articulo) => (
              <li key={articulo.id}>
                <Link
                  href={`/panel/carta/articulos/${articulo.id}`}
                  className="block rounded-xl border border-border bg-surface p-3 text-ink"
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
