const FORMATO = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  useGrouping: false,
})

/** Convierte un importe en céntimos enteros a texto legible: 500 -> "5,00 €". */
export function formatearPrecio(centimos: number): string {
  return FORMATO.format(centimos / 100)
}
