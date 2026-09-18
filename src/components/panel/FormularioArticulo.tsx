'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { mensajeDeError } from '@/lib/panel/erroresApi'
import { parsearPrecio } from '@/lib/dinero'

type Opcion = { id: string; nombre: string }

type TamanoFormulario = { tamanoId: string; ofrecido: boolean; precioTexto: string }

type ArticuloInicial = {
  id: string
  nombre: string
  descripcion: string
  categoriaId: string
  imagenUrl: string | null
  tamanos: { tamanoId: string; precioCentimos: number; disponible: boolean }[]
  extraIds: string[]
}

type Props = {
  categorias: Opcion[]
  tamanos: Opcion[]
  extras: Opcion[]
  articuloInicial?: ArticuloInicial
}

export function FormularioArticulo({ categorias, tamanos, extras, articuloInicial }: Props) {
  const router = useRouter()
  const editando = articuloInicial !== undefined

  const [nombre, setNombre] = useState(articuloInicial?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(articuloInicial?.descripcion ?? '')
  const [categoriaId, setCategoriaId] = useState(articuloInicial?.categoriaId ?? categorias[0]?.id ?? '')
  const [tamanosForm, setTamanosForm] = useState<TamanoFormulario[]>(
    tamanos.map((t) => {
      const existente = articuloInicial?.tamanos.find((at) => at.tamanoId === t.id)
      return {
        tamanoId: t.id,
        ofrecido: existente !== undefined,
        precioTexto: existente ? String(existente.precioCentimos / 100).replace('.', ',') : '',
      }
    }),
  )
  const [extraIds, setExtraIds] = useState<string[]>(articuloInicial?.extraIds ?? [])
  const [imagenUrl, setImagenUrl] = useState(articuloInicial?.imagenUrl ?? null)
  const [archivoImagen, setArchivoImagen] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function alternarTamano(tamanoId: string) {
    setTamanosForm((actual) => actual.map((t) => (t.tamanoId === tamanoId ? { ...t, ofrecido: !t.ofrecido } : t)))
  }

  function cambiarPrecioTamano(tamanoId: string, texto: string) {
    setTamanosForm((actual) => actual.map((t) => (t.tamanoId === tamanoId ? { ...t, precioTexto: texto } : t)))
  }

  function alternarExtra(extraId: string) {
    setExtraIds((actual) => (actual.includes(extraId) ? actual.filter((id) => id !== extraId) : [...actual, extraId]))
  }

  async function guardar() {
    setError(null)

    const tamanosOfrecidos = tamanosForm.filter((t) => t.ofrecido)
    if (tamanosOfrecidos.length === 0) {
      setError('Ofrece el artículo en al menos un tamaño.')
      return
    }
    const tamanosConPrecio: { tamanoId: string; precioCentimos: number }[] = []
    for (const t of tamanosOfrecidos) {
      const precioCentimos = parsearPrecio(t.precioTexto)
      if (precioCentimos === null) {
        setError('Revisa los precios: deben ser números válidos.')
        return
      }
      tamanosConPrecio.push({ tamanoId: t.tamanoId, precioCentimos })
    }

    setGuardando(true)
    const datos = { nombre, descripcion, categoriaId, tamanos: tamanosConPrecio, extraIds }
    const respuesta = await fetch(
      editando ? `/api/panel/carta/articulos/${articuloInicial!.id}` : '/api/panel/carta/articulos',
      {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      },
    )
    if (!respuesta.ok) {
      setError(await mensajeDeError(respuesta))
      setGuardando(false)
      return
    }

    if (editando) {
      router.push('/panel/carta/articulos')
      router.refresh()
    } else {
      const creado = (await respuesta.json()) as { id: string }
      router.push(`/panel/carta/articulos/${creado.id}`)
    }
  }

  async function subirImagen() {
    if (!archivoImagen || !articuloInicial) return
    setError(null)
    setGuardando(true)
    const formData = new FormData()
    formData.append('imagen', archivoImagen)
    const respuesta = await fetch(`/api/panel/carta/articulos/${articuloInicial.id}/imagen`, {
      method: 'POST',
      body: formData,
    })
    if (respuesta.ok) {
      const cuerpo = (await respuesta.json()) as { imagenUrl: string }
      setImagenUrl(cuerpo.imagenUrl)
      setArchivoImagen(null)
    } else {
      setError(await mensajeDeError(respuesta))
    }
    setGuardando(false)
  }

  async function eliminar() {
    if (!articuloInicial) return
    if (!window.confirm(`¿Dar de baja «${articuloInicial.nombre}»? Esta acción no se puede deshacer.`)) return
    setGuardando(true)
    const respuesta = await fetch(`/api/panel/carta/articulos/${articuloInicial.id}`, { method: 'DELETE' })
    if (respuesta.ok) {
      router.push('/panel/carta/articulos')
      router.refresh()
    } else {
      setError(await mensajeDeError(respuesta))
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/panel/carta/articulos" className="text-sm font-semibold text-ink-soft">
          ‹ Artículos
        </Link>
        <h1 className="font-display text-2xl italic text-ink">{editando ? 'Editar artículo' : 'Nuevo artículo'}</h1>
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
      <label className="flex flex-col gap-1">
        <span className="text-ink">Categoría</span>
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="rounded-lg border border-border bg-surface p-3 text-ink"
        >
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>

      {editando ? (
        <div className="flex flex-col gap-2">
          <span className="text-ink">Foto</span>
          <div className="relative h-32 w-32 overflow-hidden rounded-lg bg-accent-soft">
            {imagenUrl && <Image src={imagenUrl} alt="" fill sizes="128px" className="object-cover" />}
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setArchivoImagen(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            disabled={!archivoImagen || guardando}
            onClick={subirImagen}
            className="self-start rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-ink disabled:opacity-40"
          >
            Subir foto
          </button>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">Podrás añadir la foto después de crear el artículo.</p>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">Tamaños</legend>
        {tamanosForm.map((t) => {
          const nombreTamano = tamanos.find((tam) => tam.id === t.tamanoId)?.nombre ?? ''
          return (
            <div key={t.tamanoId} className="rounded-xl border border-border bg-surface p-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={t.ofrecido}
                  onChange={() => alternarTamano(t.tamanoId)}
                  className="accent-[var(--color-accent)]"
                />
                <span className="font-semibold text-ink">{nombreTamano}</span>
              </label>
              {t.ofrecido && (
                <input
                  value={t.precioTexto}
                  onChange={(e) => cambiarPrecioTamano(t.tamanoId, e.target.value)}
                  placeholder="Precio (€)"
                  className="mt-2 ml-6 w-24 rounded-lg border border-border bg-surface p-2 text-ink"
                />
              )}
            </div>
          )
        })}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">Complementos</legend>
        {extras.map((extra) => (
          <label key={extra.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={extraIds.includes(extra.id)}
              onChange={() => alternarExtra(extra.id)}
              className="accent-[var(--color-accent)]"
            />
            <span className="text-ink">{extra.nombre}</span>
          </label>
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
          {editando ? 'Guardar cambios' : 'Crear artículo'}
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
