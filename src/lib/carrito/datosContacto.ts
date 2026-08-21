import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DatosContacto, DireccionEntrega } from '@/lib/pedidos/tipos'

type EstadoDatosContacto = {
  contacto: DatosContacto
  direccion: DireccionEntrega
  guardar: (contacto: DatosContacto, direccion: DireccionEntrega) => void
}

const VACIO_CONTACTO: DatosContacto = { nombre: '', apellidos: '', telefono: '' }
const VACIA_DIRECCION: DireccionEntrega = {
  calle: '', numero: '', piso: '', cp: '', ciudad: '', indicaciones: '',
}

export const useDatosContacto = create<EstadoDatosContacto>()(
  persist(
    (set) => ({
      contacto: VACIO_CONTACTO,
      direccion: VACIA_DIRECCION,
      guardar: (contacto, direccion) => set({ contacto, direccion }),
    }),
    {
      name: 'datos-contacto-horno-caseron',
      version: 1,
      skipHydration: true,
    },
  ),
)
