import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { BaseDeDatos } from './cliente-servidor'

/**
 * Cliente ligado a la sesión de personal a través de las cookies de la
 * petición. Lee lo que las políticas de RLS permiten a ese usuario según su
 * rol en `perfiles_staff`: pedidos, líneas y extras para el tablero. Nunca
 * se usa para el navegador anónimo, que no tiene sesión.
 */
export async function crearClienteServidorSesion() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !clave) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Revisa .env.local.')
  }

  const almacenCookies = await cookies()

  return createServerClient<BaseDeDatos>(url, clave, {
    cookies: {
      getAll: () => almacenCookies.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            almacenCookies.set(name, value, options)
          }
        } catch {
          // Llamado desde un Server Component al refrescar el token: no
          // puede escribir cookies ahí. `proxy.ts` ya las refresca en cada
          // petición, así que aquí se ignora sin más.
        }
      },
    },
  })
}
