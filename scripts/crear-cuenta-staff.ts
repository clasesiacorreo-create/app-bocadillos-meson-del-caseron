import { config } from 'dotenv'
config({ path: '.env.local' })

import { crearClienteServicio } from '../src/lib/supabase/cliente-servicio'

async function main() {
  const [, , email, password, nombre, rol] = process.argv
  if (!email || !password || !nombre || !rol) {
    console.error('Uso: pnpx tsx scripts/crear-cuenta-staff.ts <email> <password> <nombre> <admin|cocina|repartidor>')
    process.exit(1)
  }
  if (rol !== 'admin' && rol !== 'cocina' && rol !== 'repartidor') {
    console.error('El rol debe ser admin, cocina o repartidor.')
    process.exit(1)
  }

  const supabase = crearClienteServicio()

  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error

  const { error: errorPerfil } = await supabase.from('perfiles_staff').insert({ user_id: data.user.id, nombre, rol })
  if (errorPerfil) throw errorPerfil

  console.log(`Cuenta creada: ${email} (${rol}), user_id ${data.user.id}`)
}

main()
