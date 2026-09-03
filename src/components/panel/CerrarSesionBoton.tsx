'use client'

import { crearClienteNavegador } from '@/lib/supabase/cliente-navegador'

export function CerrarSesionBoton() {
  async function cerrarSesion() {
    const supabase = crearClienteNavegador()
    await supabase.auth.signOut()
    window.location.href = '/panel/iniciar-sesion'
  }

  return (
    <button type="button" onClick={cerrarSesion} className="rounded-lg border border-neutral-700 px-3 py-2 text-sm">
      Cerrar sesión
    </button>
  )
}
