import { NextResponse } from 'next/server'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { actualizarDisponibilidadTamano } from '@/lib/carta/escritura'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; tamanoId: string }> },
) {
  const { id, tamanoId } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol !== 'admin' && perfil.rol !== 'cocina') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { disponible } = (await req.json()) as { disponible: boolean }
  await actualizarDisponibilidadTamano(id, tamanoId, disponible)
  return NextResponse.json({ disponible })
}
