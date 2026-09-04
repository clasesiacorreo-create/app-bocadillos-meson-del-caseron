import { NextResponse } from 'next/server'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { actualizarExtra, eliminarExtra, type DatosComplemento } from '@/lib/carta/escritura'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const datos = (await req.json()) as DatosComplemento
  await actualizarExtra(id, datos)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await eliminarExtra(id)
  return NextResponse.json({ ok: true })
}
