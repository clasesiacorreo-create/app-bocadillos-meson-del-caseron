import { NextResponse } from 'next/server'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { crearArticulo, type DatosArticulo } from '@/lib/carta/escritura'

export async function POST(req: Request) {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const datos = (await req.json()) as DatosArticulo
  const articulo = await crearArticulo(datos)
  return NextResponse.json(articulo, { status: 201 })
}
