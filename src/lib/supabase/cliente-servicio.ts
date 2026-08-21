import { createClient } from '@supabase/supabase-js'
import type { BaseDeDatos } from './cliente-servidor'

/**
 * Cliente con la clave de servicio: salta RLS. Solo se usa en código de
 * servidor que gestiona pedidos (crear, transicionar, leer para el
 * seguimiento). Nunca se expone al navegador.
 */
export function crearClienteServicio() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !clave) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Revisa .env.local.',
    )
  }

  return createClient<BaseDeDatos>(url, clave, { auth: { persistSession: false } })
}
