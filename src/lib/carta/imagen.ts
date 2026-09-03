import sharp from 'sharp'

export const TAMANO_MAXIMO_SUBIDA_BYTES = 5 * 1024 * 1024
export const TIPOS_IMAGEN_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']

const ANCHO_MAXIMO_PX = 800

/**
 * Recomprime cualquier foto subida a un WEBP de como mucho 800px de ancho.
 * Una foto de móvil sin recomprimir puede pesar varios MB; servida así en la
 * carta pública, sería la mayor parte del peso de la página.
 */
export async function recomprimirImagen(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate() // respeta la orientación EXIF antes de perderla al recodificar
    .resize({ width: ANCHO_MAXIMO_PX, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()
}
