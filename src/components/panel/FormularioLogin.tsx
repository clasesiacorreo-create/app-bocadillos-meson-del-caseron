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
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span>Contraseña</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
        />
      </label>

      {error && <p className="text-sm text-amber-400">Email o contraseña incorrectos.</p>}

      <button
        type="button"
        disabled={enviando}
        onClick={iniciarSesion}
        className="h-14 rounded-xl bg-amber-500 text-lg font-bold text-neutral-950 disabled:opacity-40"
      >
        Entrar
      </button>
    </div>
  )
}
