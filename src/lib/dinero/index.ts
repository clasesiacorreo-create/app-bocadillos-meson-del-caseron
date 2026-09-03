const FORMATO = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  useGrouping: false,
})

/** Convierte un importe en céntimos enteros a texto legible: 500 -> "5,00 €". */
export function formatearPrecio(centimos: number): string {
  return FORMATO.format(centimos / 100)
}

/**
 * Convierte un importe en euros escrito por una persona ("2,50", "2.50",
 * "5") a céntimos enteros. `null` si el texto no es un número válido o es
 * negativo, para que quien llama decida cómo avisar sin lanzar una excepción
 * por cada tecla que todavía no forma un número.
 */
export function parsearPrecio(texto: string): number | null {
  const normalizado = texto.trim().replace(',', '.')
  if (normalizado === '') return null
  const valor = Number(normalizado)
  if (!Number.isFinite(valor) || valor < 0) return null
  return Math.round(valor * 100)
}
