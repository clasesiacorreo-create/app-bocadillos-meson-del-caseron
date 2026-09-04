import { NextResponse } from 'next/server'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { crearExtra, type DatosComplemento } from '@/lib/carta/escritura'

export async function POST(req: Request) {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const datos = (await req.json()) as DatosComplemento
  const extra = await crearExtra(datos)
  return NextResponse.json(extra, { status: 201 })
}
