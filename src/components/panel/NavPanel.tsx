'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { RolStaff } from '@/lib/personal/tipos'

type Enlace = { href: string; etiqueta: string; roles: RolStaff[] }

const ENLACES: Enlace[] = [
  { href: '/panel', etiqueta: 'Pedidos', roles: ['admin', 'cocina'] },
  { href: '/panel/carta', etiqueta: 'Disponibilidad', roles: ['admin', 'cocina'] },
  { href: '/panel/ajustes', etiqueta: 'Ajustes', roles: ['admin', 'cocina'] },
  { href: '/panel/equipo', etiqueta: 'Equipo', roles: ['admin'] },
  { href: '/panel/historial', etiqueta: 'Historial', roles: ['admin', 'cocina'] },
]

export function NavPanel({ rol }: { rol: RolStaff }) {
  const pathname = usePathname()
  const enlaces = ENLACES.filter((enlace) => enlace.roles.includes(rol))

  return (
    <nav className="flex gap-5 overflow-x-auto border-b border-border px-4">
      {enlaces.map((enlace) => {
        const activo = pathname === enlace.href || (enlace.href !== '/panel' && pathname.startsWith(enlace.href))
        return (
          <Link
            key={enlace.href}
            href={enlace.href}
            className={`shrink-0 border-b-2 pb-2.5 pt-4 text-sm ${
              activo ? 'border-accent font-bold text-ink' : 'border-transparent font-semibold text-ink-soft'
            }`}
          >
            {enlace.etiqueta}
          </Link>
        )
      })}
    </nav>
  )
}
