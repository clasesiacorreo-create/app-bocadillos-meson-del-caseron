export type TamanoDeArticulo = {
  id: string
  nombre: string
  precioCentimos: number
  disponible: boolean
}

export type ExtraDeArticulo = {
  id: string
  nombre: string
  descripcion: string
  disponible: boolean
  /** Precio por identificador de tamaño. Si falta el tamaño, el extra no se ofrece ahí. */
  precioPorTamanoId: Record<string, number>
}

export type ArticuloCarta = {
  id: string
  nombre: string
  descripcion: string
  imagenUrl: string | null
  disponible: boolean
  tamanos: TamanoDeArticulo[]
  extras: ExtraDeArticulo[]
}

export type CategoriaCarta = {
  id: string
  nombre: string
  articulos: ArticuloCarta[]
}

export type Carta = {
  categorias: CategoriaCarta[]
}
