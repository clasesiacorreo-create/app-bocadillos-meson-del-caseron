export type RolStaff = 'admin' | 'cocina' | 'repartidor'

export type PerfilStaff = {
  userId: string
  nombre: string
  rol: RolStaff
}
