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
            className="flex items-center justify-between rounded-lg border border-neutral-700 p-3"
          >
            <div>
              <p className="font-semibold">{miembro.nombre}</p>
              <p className="text-sm text-neutral-400">{miembro.email}</p>
            </div>
            <span className="text-xs uppercase tracking-wide text-neutral-400">{miembro.rol}</span>
          </li>
        ))}
      </ul>

      <fieldset className="flex flex-col gap-3 rounded-lg border border-neutral-700 p-3">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide">Invitar</legend>
        <label className="flex flex-col gap-1">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Nombre</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Rol</span>
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value as RolStaff)}
            className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
          >
            {ROLES.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.etiqueta}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-amber-400">{error}</p>}
        {invitado && <p className="text-sm text-emerald-400">Invitación enviada a {invitado}.</p>}

        <button
          type="button"
          disabled={enviando || !email || !nombre}
          onClick={invitar}
          className="h-12 rounded-xl bg-amber-500 font-bold text-neutral-950 disabled:opacity-40"
        >
          Invitar
        </button>
      </fieldset>
    </div>
  )
}
