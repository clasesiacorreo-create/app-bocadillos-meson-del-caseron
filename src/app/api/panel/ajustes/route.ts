import { NextResponse } from 'next/server'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { actualizarAjustes, errorDeAjustes, type Ajustes } from '@/lib/ajustes'
import { umbralesValidos } from '@/lib/precios'

export async function PATCH(req: Request) {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const datos = (await req.json()) as Ajustes

  const errorAjustes = errorDeAjustes(datos)
  if (errorAjustes) {
    return NextResponse.json({ error: errorAjustes }, { status: 400 })
  }
  if (!umbralesValidos(datos.pedidoMinimoCentimos, datos.envioGratisDesdeCentimos)) {
    return NextResponse.json(
      { error: 'El envío gratis debe activarse a partir de un importe mayor que el pedido mínimo' },
      { status: 400 },
    )
  }

  await actualizarAjustes(datos)
  return NextResponse.json({ ok: true })
}
