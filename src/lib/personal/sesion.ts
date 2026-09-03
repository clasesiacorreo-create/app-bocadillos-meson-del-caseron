import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'
import { crearClienteServidorSesion } from '@/lib/supabase/cliente-servidor-sesion'
import type { PerfilStaff } from './tipos'

/**
 * Perfil del miembro del personal autenticado en esta petición, o `null` si
 * no hay sesión o su cuenta no tiene fila en `perfiles_staff` todavía. Se lee
 * con la clave de servicio porque `perfiles_staff` solo se abre por RLS a la
 * fila del propio usuario, y aquí conviene una lectura directa por id.
 */
export async function obtenerPerfilStaff(): Promise<PerfilStaff | null> {
  const supabaseSesion = await crearClienteServidorSesion()
  const {
    data: { user },
  } = await supabaseSesion.auth.getUser()
  if (!user) return null

  const supabaseServicio = crearClienteServicio()
  const { data, error } = await supabaseServicio
    .from('perfiles_staff')
    .select('user_id, nombre, rol')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return { userId: data.user_id, nombre: data.nombre, rol: data.rol as PerfilStaff['rol'] }
}
