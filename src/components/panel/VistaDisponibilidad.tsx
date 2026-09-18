'use client'

import { useState } from 'react'
import { mensajeDeError } from '@/lib/panel/erroresApi'
import type { Carta } from '@/lib/carta/tipos'

type FilaProps = {
  etiqueta: string
  disponibleInicial: boolean
  endpoint: string
  pequeno?: boolean
}

function FilaDisponibilidad({ etiqueta, disponibleInicial, endpoint, pequeno }: FilaProps) {
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

  const pistaClase = pequeno ? 'h-5 w-[34px]' : 'h-6 w-[42px]'
  const pulgarClase = pequeno ? 'h-4 w-4' : 'h-5 w-5'
  const pulgarActivo = pequeno ? 'left-[16px]' : 'left-[20px]'

  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`${pequeno ? 'text-xs' : 'text-sm'} ${disponible ? 'text-ink' : 'text-ink-soft'}`}>
        {etiqueta}
      </span>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-accent-dark">{error}</span>}
        <button
          type="button"
          role="switch"
          aria-checked={disponible}
          aria-label={etiqueta}
          disabled={enviando}
          onClick={alternar}
          className={`relative shrink-0 rounded-full transition disabled:opacity-40 ${pistaClase}`}
          style={{ backgroundColor: disponible ? 'var(--color-accent)' : 'rgba(43,32,21,0.18)' }}
        >
          <span
            className={`absolute top-0.5 left-0.5 block rounded-full bg-white transition ${pulgarClase} ${disponible ? pulgarActivo : ''}`}
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
          <h2 className="mb-2 font-display text-lg italic text-ink">{categoria.nombre}</h2>
          <div className="flex flex-col gap-2">
            {categoria.articulos.map((articulo) => (
              <div key={articulo.id} className="rounded-xl border border-border bg-surface p-3">
                <FilaDisponibilidad
                  etiqueta={articulo.nombre}
                  disponibleInicial={articulo.disponible}
                  endpoint={`/api/panel/carta/articulos/${articulo.id}/disponibilidad`}
                />
                {articulo.tamanos.length > 0 && (
                  <div className="mt-2.5 flex flex-col gap-1.5 pl-1">
                    {articulo.tamanos.map((tamano) => (
                      <FilaDisponibilidad
                        key={tamano.id}
                        etiqueta={tamano.nombre}
                        disponibleInicial={tamano.disponible}
                        endpoint={`/api/panel/carta/articulos/${articulo.id}/tamanos/${tamano.id}/disponibilidad`}
                        pequeno
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <section>
        <h2 className="mb-2 font-display text-lg italic text-ink">Complementos</h2>
        <div className="flex flex-col gap-2">
          {[...extrasUnicos.values()].map((extra) => (
            <div key={extra.id} className="rounded-xl border border-border bg-surface p-3">
              <FilaDisponibilidad
                etiqueta={extra.nombre}
                disponibleInicial={extra.disponible}
                endpoint={`/api/panel/carta/complementos/${extra.id}/disponibilidad`}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
