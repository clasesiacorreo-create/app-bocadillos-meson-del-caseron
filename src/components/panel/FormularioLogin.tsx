'use client'

import { useState } from 'react'
import { crearClienteNavegador } from '@/lib/supabase/cliente-navegador'

export function FormularioLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(false)

  async function iniciarSesion() {
    setEnviando(true)
    setError(false)
    const supabase = crearClienteNavegador()
    const { error: errorSesion } = await supabase.auth.signInWithPassword({ email, password })
    if (errorSesion) {
      setError(true)
      setEnviando(false)
      return
    }
    window.location.href = '/panel'
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-ink">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-border bg-ground p-3 text-ink"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-ink">Contraseña</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-border bg-ground p-3 text-ink"
        />
      </label>

      {error && (
        <p className="rounded-lg bg-accent-soft p-3 text-center text-sm font-semibold text-accent-dark">
          Email o contraseña incorrectos.
        </p>
      )}

      <button
        type="button"
        disabled={enviando}
        onClick={iniciarSesion}
        className="h-14 rounded-full bg-accent text-lg font-bold text-surface disabled:opacity-40"
      >
        Entrar
      </button>
    </div>
  )
}
