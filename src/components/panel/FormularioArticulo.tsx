'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { mensajeDeError } from '@/lib/panel/erroresApi'
import { parsearPrecio } from '@/lib/dinero'

type Opcion = { id: string; nombre: string }

type TamanoFormulario = { tamanoId: string; ofrecido: boolean; precioTexto: string; disponible: boolean }

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
        disponible: existente?.disponible ?? true,
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

  function cambiarDisponibleTamano(tamanoId: string, disponible: boolean) {
    setTamanosForm((actual) => actual.map((t) => (t.tamanoId === tamanoId ? { ...t, disponible } : t)))
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
    const tamanosConPrecio: { tamanoId: string; precioCentimos: number; disponible: boolean }[] = []
    for (const t of tamanosOfrecidos) {
      const precioCentimos = parsearPrecio(t.precioTexto)
      if (precioCentimos === null) {
        setError('Revisa los precios: deben ser números válidos.')
        return
      }
      tamanosConPrecio.push({ tamanoId: t.tamanoId, precioCentimos, disponible: t.disponible })
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
      <label className="flex flex-col gap-1">
        <span>Nombre</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span>Descripción</span>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span>Categoría</span>
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 p-3"
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
          <span>Foto</span>
          <div className="relative h-32 w-32 overflow-hidden rounded-lg bg-amber-900/30">
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
            className="self-start rounded-lg border border-neutral-700 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Subir foto
          </button>
        </div>
      ) : (
        <p className="text-sm text-neutral-400">Podrás añadir la foto después de crear el artículo.</p>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide">Tamaños</legend>
        {tamanosForm.map((t) => {
          const nombreTamano = tamanos.find((tam) => tam.id === t.tamanoId)?.nombre ?? ''
          return (
            <div key={t.tamanoId} className="flex items-center gap-3 rounded-lg border border-neutral-700 p-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={t.ofrecido} onChange={() => alternarTamano(t.tamanoId)} />
                {nombreTamano}
              </label>
              {t.ofrecido && (
                <>
                  <input
                    value={t.precioTexto}
                    onChange={(e) => cambiarPrecioTamano(t.tamanoId, e.target.value)}
                    placeholder="Precio (€)"
                    className="w-24 rounded-lg border border-neutral-700 bg-neutral-800 p-2"
                  />
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={t.disponible}
                      onChange={(e) => cambiarDisponibleTamano(t.tamanoId, e.target.checked)}
                    />
                    Disponible
                  </label>
                </>
              )}
            </div>
          )
        })}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide">Complementos</legend>
        {extras.map((extra) => (
          <label key={extra.id} className="flex items-center gap-2">
            <input type="checkbox" checked={extraIds.includes(extra.id)} onChange={() => alternarExtra(extra.id)} />
            {extra.nombre}
          </label>
        ))}
      </fieldset>

      {error && <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={guardando || !nombre}
          onClick={guardar}
          className="h-12 flex-1 rounded-xl bg-amber-500 font-bold text-neutral-950 disabled:opacity-40"
        >
          {editando ? 'Guardar cambios' : 'Crear artículo'}
        </button>
        {editando && (
          <button
            type="button"
            disabled={guardando}
            onClick={eliminar}
            className="h-12 rounded-xl border border-neutral-700 px-4 font-semibold text-amber-400 disabled:opacity-40"
          >
            Dar de baja
          </button>
        )}
      </div>
    </div>
  )
}
