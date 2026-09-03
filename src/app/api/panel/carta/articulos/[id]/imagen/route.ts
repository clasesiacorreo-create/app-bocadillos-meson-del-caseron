import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { obtenerPerfilStaff } from '@/lib/personal/sesion'
import { recomprimirImagen, TAMANO_MAXIMO_SUBIDA_BYTES, TIPOS_IMAGEN_PERMITIDOS } from '@/lib/carta/imagen'
import { actualizarImagenArticulo } from '@/lib/carta/escritura'
import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await obtenerPerfilStaff()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const formData = await req.formData()
  const archivo = formData.get('imagen')
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo de imagen' }, { status: 400 })
  }
  if (!TIPOS_IMAGEN_PERMITIDOS.includes(archivo.type)) {
    return NextResponse.json({ error: 'La imagen debe ser JPEG, PNG o WEBP' }, { status: 400 })
  }
  if (archivo.size > TAMANO_MAXIMO_SUBIDA_BYTES) {
    return NextResponse.json({ error: 'La imagen no puede superar los 5 MB' }, { status: 400 })
  }

  const bufferOriginal = Buffer.from(await archivo.arrayBuffer())
  const bufferComprimido = await recomprimirImagen(bufferOriginal)

  const supabase = crearClienteServicio()
  const ruta = `articulos/${id}-${randomUUID()}.webp`
  const { error: errorSubida } = await supabase.storage
    .from('carta')
    .upload(ruta, bufferComprimido, { contentType: 'image/webp', upsert: false })
  if (errorSubida) return NextResponse.json({ error: 'No se ha podido subir la imagen' }, { status: 500 })

  const { data: urlPublica } = supabase.storage.from('carta').getPublicUrl(ruta)
  await actualizarImagenArticulo(id, urlPublica.publicUrl)

  return NextResponse.json({ imagenUrl: urlPublica.publicUrl })
}
