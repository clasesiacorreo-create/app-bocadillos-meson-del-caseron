'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { RolStaff } from '@/lib/personal/tipos'

type Enlace = { href: string; etiqueta: string; roles: RolStaff[] }

const ENLACES: Enlace[] = [
  { href: '/panel', etiqueta: 'Pedidos', roles: ['admin', 'cocina', 'repartidor'] },
  { href: '/panel/carta', etiqueta: 'Disponibilidad', roles: ['admin', 'cocina'] },
]

export function NavPanel({ rol }: { rol: RolStaff }) {
  const pathname = usePathname()
  const enlaces = ENLACES.filter((enlace) => enlace.roles.includes(rol))

  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-neutral-800 px-4 py-2">
      {enlaces.map((enlace) => {
        const activo = pathname === enlace.href || (enlace.href !== '/panel' && pathname.startsWith(enlace.href))
        return (
          <Link
            key={enlace.href}
            href={enlace.href}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
              activo ? 'border-amber-500 bg-amber-500/10' : 'border-neutral-700'
            }`}
          >
            {enlace.etiqueta}
          </Link>
        )
      })}
    </nav>
  )
}
