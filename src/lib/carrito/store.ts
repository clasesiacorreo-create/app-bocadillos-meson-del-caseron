import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LineaParaCarrito } from './tipos'

export type LineaEnCarrito = LineaParaCarrito & { id: string }

type EstadoCarrito = {
  lineas: LineaEnCarrito[]
  anadir: (linea: LineaParaCarrito) => void
  cambiarCantidad: (id: string, cantidad: number) => void
  eliminar: (id: string) => void
  vaciar: () => void
}

/**
 * Huella de una línea a efectos de agrupación: mismo artículo, mismo tamaño,
 * mismos extras y misma nota. Los extras se ordenan porque el orden en que el
 * cliente los marca no debe impedir agrupar dos líneas iguales.
 */
function huella(linea: LineaParaCarrito): string {
  const extras = linea.extras
    .map((extra) => extra.extraId)
    .sort()
    .join(',')
  return [linea.articuloId, linea.tamanoId, extras, linea.notasLinea.trim()].join('|')
}

export const useCarrito = create<EstadoCarrito>()(
  persist(
    (set) => ({
      lineas: [],

      anadir: (nueva) =>
        set((estado) => {
          const huellaNueva = huella(nueva)
          const existente = estado.lineas.find((linea) => huella(linea) === huellaNueva)

          if (existente) {
            return {
              lineas: estado.lineas.map((linea) =>
                linea.id === existente.id
                  ? { ...linea, cantidad: linea.cantidad + nueva.cantidad }
                  : linea,
              ),
            }
          }

          return { lineas: [...estado.lineas, { ...nueva, id: crypto.randomUUID() }] }
        }),

      cambiarCantidad: (id, cantidad) =>
        set((estado) => ({
          lineas:
            cantidad <= 0
              ? estado.lineas.filter((linea) => linea.id !== id)
              : estado.lineas.map((linea) => (linea.id === id ? { ...linea, cantidad } : linea)),
        })),

      eliminar: (id) =>
        set((estado) => ({ lineas: estado.lineas.filter((linea) => linea.id !== id) })),

      vaciar: () => set({ lineas: [] }),
    }),
    {
      name: 'carrito-horno-caseron',
      version: 1,
      // El servidor no tiene localStorage. Sin esto, el HTML del servidor y el
      // del cliente difieren y React lanza un error de hidratación.
      skipHydration: true,
    },
  ),
)
