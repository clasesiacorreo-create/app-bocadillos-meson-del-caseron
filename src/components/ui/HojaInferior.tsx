'use client'

import { useEffect, type ReactNode } from 'react'

type Props = {
  titulo: string
  onCerrar: () => void
  children: ReactNode
}

export function HojaInferior({ titulo, onCerrar, children }: Props) {
  useEffect(() => {
    function alPulsarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPulsarTecla)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alPulsarTecla)
      document.body.style.overflow = ''
    }
  }, [onCerrar])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-ink/55" onClick={onCerrar} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4 pb-8 text-ink sm:mb-6 sm:max-w-lg sm:rounded-2xl"
      >
        {children}
      </div>
    </div>
  )
}
