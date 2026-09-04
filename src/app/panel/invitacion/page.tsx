'use client'

import { useEffect, useState } from 'react'
import { crearClienteNavegador } from '@/lib/supabase/cliente-navegador'

type Fase = 'verificando' | 'lista' | 'guardando' | 'error'

const MENSAJE_ENLACE_INVALIDO = 'Este enlace de invitación no es válido o ha caducado.'

export default function PaginaInvitacion() {
  const [fase, setFase] = useState<Fase>('verificando')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function establecerSesion() {
      const supabase = crearClienteNavegador()
      const hash = new URLSearchParams(window.location.hash.replace('#', ''))
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')

      if (accessToken && refreshToken) {
        const { error: errorSesion } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        setFase(errorSesion ? 'error' : 'lista')
        if (errorSesion) setError(MENSAJE_ENLACE_INVALIDO)
        return
      }

      const params = new URLSearchParams(window.location.search)
      const tokenHash = params.get('token_hash')
      const tipo = params.get('type')
      if (tokenHash && tipo) {
        const { error: errorSesion } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: tipo as 'invite',
        })
        setFase(errorSesion ? 'error' : 'lista')
        if (errorSesion) setError(MENSAJE_ENLACE_INVALIDO)
        return
      }

      setError(MENSAJE_ENLACE_INVALIDO)
      setFase('error')
    }
    establecerSesion()
  }, [])

  async function guardarContrasena() {
    setFase('guardando')
    setError('')
    const supabase = crearClienteNavegador()
    const { error: errorContrasena } = await supabase.auth.updateUser({ password })
    if (errorContrasena) {
      setError('No se ha podido guardar la contraseña. Inténtalo de nuevo.')
      setFase('lista')
      return
    }
    window.location.href = '/panel'
  }

  if (fase === 'verificando') return <p className="p-4">Comprobando la invitación…</p>
  if (fase === 'error') return <p className="p-4 text-amber-400">{error}</p>

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Elige tu contraseña</h1>
      <label className="flex flex-col gap-1">
        <span>Contraseña</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
        />
      </label>
      {error && <p className="text-sm text-amber-400">{error}</p>}
      <button
        type="button"
        disabled={fase === 'guardando' || password.length < 8}
        onClick={guardarContrasena}
        className="h-14 rounded-xl bg-amber-500 text-lg font-bold text-neutral-950 disabled:opacity-40"
      >
        Entrar
      </button>
    </div>
  )
}
