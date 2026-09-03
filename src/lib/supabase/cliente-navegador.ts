import { createBrowserClient } from '@supabase/ssr'
import type { BaseDeDatos } from './cliente-servidor'

/**
 * Cliente ligado a la sesión del personal en el navegador: usa la clave
 * pública, pero las peticiones llevan la cookie de sesión, así que RLS lo
 * trata como el usuario autenticado, no como anónimo. Se usa para iniciar y
 * cerrar sesión, y para suscribirse a Realtime en el tablero.
 */
export function crearClienteNavegador() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !clave) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Revisa .env.local.')
  }
  return createBrowserClient<BaseDeDatos>(url, clave)
}
