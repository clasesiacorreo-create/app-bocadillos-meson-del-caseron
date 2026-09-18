'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { mensajeDeError } from '@/lib/panel/erroresApi'
import { parsearPrecio } from '@/lib/dinero'

type Opcion = { id: string; nombre: string }

type CategoriaConArticulos = { id: string; nombre: string; articulos: Opcion[] }

type ComplementoInicial = {
  id: string
  nombre: string
  descripcion: string
  preciosPorTamanoId: Record<string, number>
  articuloIds: string[]
}

type Props = { tamanos: Opcion[]; categorias: CategoriaConArticulos[]; complementoInicial?: ComplementoInicial }

export function FormularioComplemento({ tamanos, categorias, complementoInicial }: Props) {
  const router = useRouter()
  const editando = complementoInicial !== undefined

  const [nombre, setNombre] = useState(complementoInicial?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(complementoInicial?.descripcion ?? '')
  const [precios, setPrecios] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {}
    for (const tamano of tamanos) {
      const centimos = complementoInicial?.preciosPorTamanoId[tamano.id]
      inicial[tamano.id] = centimos !== undefined ? String(centimos / 100).replace('.', ',') : ''
    }
    return inicial
  })
  const [articuloIds, setArticuloIds] = useState<string[]>(complementoInicial?.articuloIds ?? [])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function alternarArticulo(articuloId: string) {
    setArticuloIds((actual) =>
      actual.includes(articuloId) ? actual.filter((id) => id !== articuloId) : [...actual, articuloId],
    )
  }

  async function guardar() {
    setError(null)
    const preciosPorTamanoId: Record<string, number> = {}
    for (const tamano of tamanos) {
      const texto = precios[tamano.id]
      if (texto.trim() === '') continue
      const centimos = parsearPrecio(texto)
      if (centimos === null) {
        setError('Revisa los precios: deben ser números válidos.')
        return
      }
      preciosPorTamanoId[tamano.id] = centimos
    }
    if (Object.keys(preciosPorTamanoId).length === 0) {
      setError('Pon precio para al menos un tamaño.')
      return
    }

    setGuardando(true)
    const datos = { nombre, descripcion, preciosPorTamanoId, articuloIds }
    const respuesta = await fetch(
      editando ? `/api/panel/carta/complementos/${complementoInicial!.id}` : '/api/panel/carta/complementos',
      {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      },
    )
    if (respuesta.ok) {
      router.push('/panel/carta/complementos')
      router.refresh()
    } else {
      setError(await mensajeDeError(respuesta))
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!complementoInicial) return
    if (!window.confirm(`¿Dar de baja «${complementoInicial.nombre}»? Esta acción no se puede deshacer.`)) return
    setGuardando(true)
    const respuesta = await fetch(`/api/panel/carta/complementos/${complementoInicial.id}`, { method: 'DELETE' })
    if (respuesta.ok) {
      router.push('/panel/carta/complementos')
      router.refresh()
    } else {
      setError(await mensajeDeError(respuesta))
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/panel/carta/complementos" className="text-sm font-semibold text-ink-soft">
          ‹ Complementos
        </Link>
        <h1 className="font-display text-2xl italic text-ink">
          {editando ? 'Editar complemento' : 'Nuevo complemento'}
        </h1>
      </header>

      <label className="flex flex-col gap-1">
        <span className="text-ink">Nombre</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="rounded-lg border border-border bg-surface p-3 text-ink"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-ink">Descripción</span>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="rounded-lg border border-border bg-surface p-3 text-ink"
        />
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Precio por tamaño (vacío = no se ofrece)
        </legend>
        {tamanos.map((tamano) => (
          <label key={tamano.id} className="flex items-center justify-between gap-3">
            <span className="text-ink">{tamano.nombre}</span>
            <input
              aria-label={tamano.nombre}
              value={precios[tamano.id]}
              onChange={(e) => setPrecios((actual) => ({ ...actual, [tamano.id]: e.target.value }))}
              placeholder="€"
              className="w-24 rounded-lg border border-border bg-surface p-2 text-ink"
            />
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">Productos</legend>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setArticuloIds(categorias.flatMap((c) => c.articulos.map((a) => a.id)))}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-ink-soft"
          >
            Seleccionar todos
          </button>
          <button
            type="button"
            onClick={() => setArticuloIds([])}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-ink-soft"
          >
            Ninguno
          </button>
        </div>
        {categorias.map((categoria) => (
          <div key={categoria.id} className="flex flex-col gap-1">
            <p className="font-display text-base italic text-ink">{categoria.nombre}</p>
            {categoria.articulos.map((articulo) => (
              <label key={articulo.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={articuloIds.includes(articulo.id)}
                  onChange={() => alternarArticulo(articulo.id)}
                  className="accent-[var(--color-accent)]"
                />
                <span className="text-ink">{articulo.nombre}</span>
              </label>
            ))}
          </div>
        ))}
      </fieldset>

      {error && <p className="rounded-lg bg-accent-soft p-3 text-sm text-accent-dark">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={guardando || !nombre}
          onClick={guardar}
          className="h-12 flex-1 rounded-xl bg-accent font-bold text-surface disabled:opacity-40"
        >
          {editando ? 'Guardar cambios' : 'Crear complemento'}
        </button>
        {editando && (
          <button
            type="button"
            disabled={guardando}
            onClick={eliminar}
            className="h-12 rounded-full border border-peligro px-4 font-semibold text-peligro disabled:opacity-40"
          >
            Dar de baja
          </button>
        )}
      </div>
    </div>
  )
}
