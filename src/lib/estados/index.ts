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
 * Espejo exacto de la política de lectura de la migración 0004 (admin y
 * cocina) y 0006 (repartidor). Si cambia la política SQL, hay que cambiar
 * también esta función: son las dos mitades de la misma comprobación, una en
 * la base de datos y otra en los endpoints que leen con la clave de servicio
 * y por tanto se saltan RLS.
 */
export function puedeVerPedido(
  rol: RolStaff,
  estado: EstadoPedido,
  modoEntrega: ModoEntrega,
  repartidorId: string | null,
  usuarioId: string,
): boolean {
  return (
    rol === 'admin' ||
    (rol === 'cocina' && estado !== 'pendiente_pago') ||
    (rol === 'repartidor' &&
      modoEntrega === 'domicilio' &&
      (estado === 'pendiente_envio' || (estado === 'en_reparto' && repartidorId === usuarioId)))
  )
}
