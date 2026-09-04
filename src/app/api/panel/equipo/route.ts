import { NextResponse } from 'next/server'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { invitarMiembro } from '@/lib/personal/equipo'
import type { RolStaff } from '@/lib/personal/tipos'

const ROLES_VALIDOS: RolStaff[] = ['admin', 'cocina', 'repartidor']

export async function POST(req: Request) {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { email, nombre, rol } = (await req.json()) as { email?: string; nombre?: string; rol?: string }
  if (!email || !nombre || !rol || !ROLES_VALIDOS.includes(rol as RolStaff)) {
    return NextResponse.json({ error: 'Faltan datos o el rol no es válido' }, { status: 400 })
  }

  const origen = new URL(req.url).origin
  try {
    await invitarMiembro(email, nombre, rol as RolStaff, `${origen}/panel/invitacion`)
  } catch {
    return NextResponse.json({ error: 'No se ha podido enviar la invitación' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
