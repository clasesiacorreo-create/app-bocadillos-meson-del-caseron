import { redirect } from 'next/navigation'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { CerrarSesionBoton } from '@/components/panel/CerrarSesionBoton'
import { NavPanel } from '@/components/panel/NavPanel'

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) redirect('/panel/iniciar-sesion')

  return (
    <div className="min-h-dvh pb-10">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="font-bold text-ink">{perfil.nombre}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{perfil.rol}</p>
        </div>
        <CerrarSesionBoton />
      </header>
      <NavPanel rol={perfil.rol} />
      <main className="px-4 py-4">{children}</main>
    </div>
  )
}
