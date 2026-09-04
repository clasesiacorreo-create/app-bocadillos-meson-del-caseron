import { NextResponse } from 'next/server'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { listarHistorial } from '@/lib/pedidos/historial'
import { crearClienteServidorSesion } from '@/lib/supabase/cliente-servidor-sesion'

export async function GET(req: Request) {
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol === 'repartidor') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const telefono = new URL(req.url).searchParams.get('telefono') ?? undefined
  const supabase = await crearClienteServidorSesion()
  const historial = await listarHistorial(supabase, telefono)
  return NextResponse.json(historial)
}
