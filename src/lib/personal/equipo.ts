import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'
import type { RolStaff } from './tipos'

export type MiembroEquipo = {
  userId: string
  nombre: string
  rol: RolStaff
  email: string
}

export async function listarEquipo(): Promise<MiembroEquipo[]> {
  const supabase = crearClienteServicio()
  const { data: perfiles, error } = await supabase.from('perfiles_staff').select('user_id, nombre, rol')
  if (error) throw error

  const { data: usuarios, error: errorUsuarios } = await supabase.auth.admin.listUsers()
  if (errorUsuarios) throw errorUsuarios

  return perfiles.map((perfil) => ({
    userId: perfil.user_id,
    nombre: perfil.nombre,
    rol: perfil.rol as RolStaff,
    email: usuarios.users.find((usuario) => usuario.id === perfil.user_id)?.email ?? '',
  }))
}

/**
 * Mapa id → nombre de todo el personal con rol `repartidor`, para que el
 * tablero de cocina pueda mostrar quién lleva un pedido en reparto sin
 * exponer nada más de su perfil. Se lee con la clave de servicio: la
 * política de `perfiles_staff` de la migración 0004 solo deja a cada cual
 * leer su propia fila.
 */
export async function listarNombresRepartidores(): Promise<Record<string, string>> {
  const supabase = crearClienteServicio()
  const { data, error } = await supabase.from('perfiles_staff').select('user_id, nombre').eq('rol', 'repartidor')
  if (error) throw error
  return Object.fromEntries(data.map((fila) => [fila.user_id, fila.nombre]))
}

/**
 * El perfil se crea al invitar, no al aceptar: así el rol queda decidido
 * desde el primer momento y las políticas de RLS y `obtenerPerfilStaff` ya
 * encuentran la fila en cuanto la persona abre sesión con el enlace del
 * correo. Si la inserción del perfil fallara, se retira la cuenta de Auth
 * recién creada en vez de dejar una invitación fantasma sin rol que nunca
 * podría entrar al panel.
 */
export async function invitarMiembro(
  email: string,
  nombre: string,
  rol: RolStaff,
  redirectTo: string,
): Promise<void> {
  const supabase = crearClienteServicio()
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo })
  if (error) throw error

  const { error: errorPerfil } = await supabase.from('perfiles_staff').insert({ user_id: data.user.id, nombre, rol })
  if (errorPerfil) {
    await supabase.auth.admin.deleteUser(data.user.id)
    throw errorPerfil
  }
}
