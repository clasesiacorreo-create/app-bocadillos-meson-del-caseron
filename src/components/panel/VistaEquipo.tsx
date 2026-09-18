'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { mensajeDeError } from '@/lib/panel/erroresApi'
import type { MiembroEquipo } from '@/lib/personal/equipo'
import type { RolStaff } from '@/lib/personal/tipos'

const ROLES: { valor: RolStaff; etiqueta: string }[] = [
  { valor: 'admin', etiqueta: 'Admin' },
  { valor: 'cocina', etiqueta: 'Cocina' },
  { valor: 'repartidor', etiqueta: 'Repartidor' },
]

type Props = { equipo: MiembroEquipo[] }

export function VistaEquipo({ equipo }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<RolStaff>('cocina')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invitado, setInvitado] = useState<string | null>(null)

  async function invitar() {
    setEnviando(true)
    setError(null)
    setInvitado(null)
    const respuesta = await fetch('/api/panel/equipo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nombre, rol }),
    })
    if (respuesta.ok) {
      setInvitado(email)
      setEmail('')
      setNombre('')
      setRol('cocina')
      router.refresh()
    } else {
      setError(await mensajeDeError(respuesta))
    }
    setEnviando(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-2">
        {equipo.map((miembro) => (
          <li
            key={miembro.userId}
            className="flex items-center justify-between rounded-xl border border-border bg-surface p-3"
          >
            <div>
              <p className="font-semibold text-ink">{miembro.nombre}</p>
              <p className="text-sm text-ink-soft">{miembro.email}</p>
            </div>
            <span
              className={`text-xs font-bold uppercase tracking-wide ${
                miembro.rol === 'admin' ? 'text-accent-dark' : 'text-ink-soft'
              }`}
            >
              {miembro.rol}
            </span>
          </li>
        ))}
      </ul>

      <fieldset className="flex flex-col gap-3 rounded-xl border border-border p-3">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">Invitar</legend>
        <label className="flex flex-col gap-1">
          <span className="text-ink">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-border bg-surface p-3 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink">Nombre</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="rounded-lg border border-border bg-surface p-3 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink">Rol</span>
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value as RolStaff)}
            className="rounded-lg border border-border bg-surface p-3 text-ink"
          >
            {ROLES.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.etiqueta}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="rounded-lg bg-accent-soft p-3 text-sm text-accent-dark">{error}</p>}
        {invitado && (
          <p className="rounded-lg bg-success-soft p-3 text-center text-sm font-semibold text-success">
            Invitación enviada a {invitado}.
          </p>
        )}

        <button
          type="button"
          disabled={enviando || !email || !nombre}
          onClick={invitar}
          className="h-12 rounded-full bg-accent font-bold text-surface disabled:opacity-40"
        >
          Invitar
        </button>
      </fieldset>
    </div>
  )
}
