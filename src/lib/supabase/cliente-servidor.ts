import { createClient } from '@supabase/supabase-js'
import type { Database } from './tipos-bd'

export type BaseDeDatos = Database

/**
 * Cliente para componentes y acciones de servidor. Usa la clave pública: solo
 * puede leer lo que las políticas permiten leer a cualquiera, que es la carta.
 */
export function crearClienteServidor() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !clave) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Revisa .env.local.',
    )
  }

  return createClient<BaseDeDatos>(url, clave, { auth: { persistSession: false } })
}
