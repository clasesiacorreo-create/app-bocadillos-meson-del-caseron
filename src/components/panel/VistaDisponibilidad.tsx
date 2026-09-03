'use client'

import { useState } from 'react'
import { mensajeDeError } from '@/lib/panel/erroresApi'
import type { Carta } from '@/lib/carta/tipos'

type FilaProps = {
  etiqueta: string
  disponibleInicial: boolean
  endpoint: string
  indentado?: boolean
}

function FilaDisponibilidad({ etiqueta, disponibleInicial, endpoint, indentado }: FilaProps) {
  const [disponible, setDisponible] = useState(disponibleInicial)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function alternar() {
    const nuevoValor = !disponible
    setDisponible(nuevoValor)
    setEnviando(true)
    setError(null)
    const respuesta = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disponible: nuevoValor }),
    })
    if (!respuesta.ok) {
      setDisponible(!nuevoValor)
      setError(await mensajeDeError(respuesta))
    }
    setEnviando(false)
  }

  return (
    <div className={`flex items-center justify-between gap-2 py-2 ${indentado ? 'pl-6' : ''}`}>
      <span className={disponible ? '' : 'text-neutral-500'}>{etiqueta}</span>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-amber-400">{error}</span>}
        <button
          type="button"
          role="switch"
          aria-checked={disponible}
          aria-label={etiqueta}
          disabled={enviando}
          onClick={alternar}
          className={`h-7 w-12 rounded-full border transition disabled:opacity-40 ${
            disponible ? 'border-emerald-600 bg-emerald-600/30' : 'border-neutral-700 bg-neutral-800'
          }`}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-white transition ${disponible ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>
    </div>
  )
}

type Props = { carta: Carta }

export function VistaDisponibilidad({ carta }: Props) {
  const extrasUnicos = new Map<string, { id: string; nombre: string; disponible: boolean }>()
  for (const categoria of carta.categorias) {
    for (const articulo of categoria.articulos) {
      for (const extra of articulo.extras) {
        extrasUnicos.set(extra.id, { id: extra.id, nombre: extra.nombre, disponible: extra.disponible })
      }
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {carta.categorias.map((categoria) => (
        <section key={categoria.id}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">{categoria.nombre}</h2>
          <div className="divide-y divide-neutral-800">
            {categoria.articulos.map((articulo) => (
              <div key={articulo.id}>
                <FilaDisponibilidad
                  etiqueta={articulo.nombre}
                  disponibleInicial={articulo.disponible}
                  endpoint={`/api/panel/carta/articulos/${articulo.id}/disponibilidad`}
                />
                {articulo.tamanos.length > 1 &&
                  articulo.tamanos.map((tamano) => (
                    <FilaDisponibilidad
                      key={tamano.id}
                      etiqueta={tamano.nombre}
                      disponibleInicial={tamano.disponible}
                      endpoint={`/api/panel/carta/articulos/${articulo.id}/tamanos/${tamano.id}/disponibilidad`}
                      indentado
                    />
                  ))}
              </div>
            ))}
          </div>
        </section>
      ))}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">Complementos</h2>
        <div className="divide-y divide-neutral-800">
          {[...extrasUnicos.values()].map((extra) => (
            <FilaDisponibilidad
              key={extra.id}
              etiqueta={extra.nombre}
              disponibleInicial={extra.disponible}
              endpoint={`/api/panel/carta/complementos/${extra.id}/disponibilidad`}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
