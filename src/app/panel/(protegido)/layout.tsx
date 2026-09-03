import { redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { CerrarSesionBoton } from '@/components/panel/CerrarSesionBoton'
import { NavPanel } from '@/components/panel/NavPanel'

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')

  return (
    <div className="min-h-dvh pb-10">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div>
          <p className="font-semibold">{perfil.nombre}</p>
          <p className="text-xs uppercase tracking-wide text-neutral-400">{perfil.rol}</p>
        </div>
        <CerrarSesionBoton />
      </header>
      <NavPanel rol={perfil.rol} />
      <main className="px-4 py-4">{children}</main>
    </div>
  )
}
