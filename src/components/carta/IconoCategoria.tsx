import type { ReactNode } from 'react'

type Props = {
  nombre: string
  className?: string
}

/**
 * Trazos por categoría real de la carta (migración 0002_carta_inicial.sql). Una
 * categoría nueva que no esté en este mapa cae en el icono genérico de cubiertos:
 * nunca deja el riel sin icono.
 */
const ICONOS: Record<string, ReactNode> = {
  'Clásicos a la plancha': (
    <>
      <rect x="3" y="9" width="14" height="9" rx="2" />
      <line x1="17" y1="12" x2="22" y2="10" />
      <line x1="6" y1="12.5" x2="14" y2="12.5" />
      <line x1="6" y1="15" x2="14" y2="15" />
    </>
  ),
  'Ibéricos & embutidos': (
    <>
      <path d="M9 3c3 0 6 2 6 6 0 3-1 4-1 7 0 2-1.5 3.5-3 3.5S8 18 8 16c0-1-1-2-1-4 0-4-1-9 2-9Z" />
      <line x1="9" y1="7" x2="14" y2="7" />
      <line x1="9" y1="10" x2="14.5" y2="10" />
    </>
  ),
  'Huevos & tortilla': (
    <>
      <ellipse cx="12" cy="13" rx="7" ry="8" />
      <circle cx="12" cy="13" r="3" fill="currentColor" stroke="none" />
    </>
  ),
  'Del mar': (
    <>
      <path d="M3 12c3-4 8-6 12-4 2 1 4 2 6 1-1 2-1 5 0 7-2-1-4 0-6 1-4 2-9 0-12-4Z" />
      <circle cx="8" cy="11" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  'Gourmet Caserón': (
    <path d="M12 3.5l2.4 5.2 5.6.6-4.2 3.9 1.2 5.6L12 15.9l-5 2.9 1.2-5.6-4.2-3.9 5.6-.6Z" />
  ),
  Hamburguesas: (
    <>
      <path d="M4 10c0-3.5 3.6-6 8-6s8 2.5 8 6" />
      <line x1="3.5" y1="12.5" x2="20.5" y2="12.5" />
      <line x1="4" y1="15.5" x2="20" y2="15.5" />
      <path d="M3.5 18.5h17c0 1.4-1.3 2.5-3 2.5h-11c-1.7 0-3-1.1-3-2.5Z" />
    </>
  ),
  Sándwiches: (
    <>
      <path d="M3 19 12 5l9 14Z" />
      <line x1="6.3" y1="14" x2="17.7" y2="14" />
    </>
  ),
}

const GENERICO = (
  <>
    <path d="M7 3v7a1.7 1.7 0 0 0 1.7 1.7v9.3" />
    <line x1="7" y1="3" x2="7" y2="8" />
    <line x1="10" y1="3" x2="10" y2="8" />
    <path d="M16.5 3c-1.4 0-2.3 1.8-2.3 4s.9 4 2.3 4v10" />
  </>
)

export function IconoCategoria({ nombre, className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICONOS[nombre] ?? GENERICO}
    </svg>
  )
}
