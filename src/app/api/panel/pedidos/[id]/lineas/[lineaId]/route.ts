import { NextResponse } from 'next/server'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { marcarLineaPreparada } from '@/lib/pedidos/panel'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; lineaId: string }> }) {
  const { lineaId } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil || (perfil.rol !== 'admin' && perfil.rol !== 'cocina')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { preparada } = (await req.json()) as { preparada: boolean }
  await marcarLineaPreparada(lineaId, preparada)
  return NextResponse.json({ ok: true })
}
