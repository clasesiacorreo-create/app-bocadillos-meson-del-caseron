import type { EstadoPedido } from '@/lib/pedidos/tipos'
import type { ModoEntrega } from '@/lib/precios/tipos'
import type { RolStaff } from '@/lib/personal/tipos'

export type { RolStaff } from '@/lib/personal/tipos'

type Transicion = { de: EstadoPedido; a: EstadoPedido; modos: ModoEntrega[] }

const TRANSICIONES: Record<RolStaff, Transicion[]> = {
  admin: [
    { de: 'nuevo', a: 'en_preparacion', modos: ['domicilio', 'recogida'] },
    { de: 'en_preparacion', a: 'pendiente_envio', modos: ['domicilio', 'recogida'] },
    { de: 'pendiente_envio', a: 'en_reparto', modos: ['domicilio'] },
    { de: 'en_reparto', a: 'entregado', modos: ['domicilio'] },
    { de: 'pendiente_envio', a: 'entregado', modos: ['recogida'] },
  ],
  cocina: [
    { de: 'nuevo', a: 'en_preparacion', modos: ['domicilio', 'recogida'] },
    { de: 'en_preparacion', a: 'pendiente_envio', modos: ['domicilio', 'recogida'] },
    { de: 'pendiente_envio', a: 'entregado', modos: ['recogida'] },
  ],
  repartidor: [
    { de: 'pendiente_envio', a: 'en_reparto', modos: ['domicilio'] },
    { de: 'en_reparto', a: 'entregado', modos: ['domicilio'] },
  ],
}

/**
 * Si el rol puede ejecutar esa transición para ese modo de entrega. Cada
 * transición la condiciona al estado anterior quien la llama (mismo patrón
 * que la confirmación de pago): esta función solo dice si hay permiso, no
 * toca la base de datos.
 */
export function transicionPermitida(
  rol: RolStaff,
  de: EstadoPedido,
  a: EstadoPedido,
  modoEntrega: ModoEntrega,
): boolean {
  return TRANSICIONES[rol].some((t) => t.de === de && t.a === a && t.modos.includes(modoEntrega))
}

export function puedeConfirmarFranja(rol: RolStaff): boolean {
  return rol === 'admin' || rol === 'cocina'
}

/**
 * Refleja a propósito la política de lectura de RLS de la migración 0004
 * ("el personal lee pedidos segun su rol"): admin ve cualquier pedido, cocina
 * todos salvo los que aún no se han cobrado. Los endpoints que leen un pedido
 * con la clave de servicio —que se salta RLS— tienen que comprobarlo aquí a
 * mano para no devolver por esa vía un pedido que el rol no podría leer por su
 * cuenta. Si cambia la política SQL, hay que cambiar también esta función.
 */
export function puedeVerPedido(rol: RolStaff, estado: EstadoPedido): boolean {
  return rol === 'admin' || (rol === 'cocina' && estado !== 'pendiente_pago')
}
