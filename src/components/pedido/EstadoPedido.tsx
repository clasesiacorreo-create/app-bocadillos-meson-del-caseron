'use client'

import { useEffect, useState } from 'react'
import { formatearPrecio } from '@/lib/dinero'
import { fasesSeguimiento } from '@/lib/pedidos/fasesSeguimiento'
import { textoEstadoCliente } from '@/lib/pedidos/textoEstado'
import type { EstadoSeguimiento } from '@/lib/pedidos/seguimiento'

export function EstadoPedido({ estadoInicial }: { estadoInicial: EstadoSeguimiento }) {
  const [estado, setEstado] = useState(estadoInicial)

  useEffect(() => {
    const id = setInterval(async () => {
      const respuesta = await fetch(`/api/pedidos/${estado.codigoPublico}`)
      if (respuesta.ok) setEstado(await respuesta.json())
    }, 15000)
    return () => clearInterval(id)
  }, [estado.codigoPublico])

  const fases = fasesSeguimiento(estado)

  return (
    <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:gap-12">
      <div className="lg:max-w-xl lg:flex-1">
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-ink-soft">Pedido {estado.codigoPublico}</p>
          <p className="mt-2 font-display text-[23px] italic text-accent-dark">{textoEstadoCliente(estado)}</p>
        </div>

        {fases && (
          <div className="mt-7 flex flex-col">
            {fases.map((fase, indice) => (
              <div key={fase.id} className="flex gap-4">
                <div className="flex w-7 shrink-0 flex-col items-center">
                  <div
                    className={`w-0.5 flex-1 ${
                      indice === 0 ? 'bg-transparent' : fase.estado === 'futura' ? 'bg-border' : 'bg-accent'
                    }`}
                  />
                  {fase.estado === 'actual' ? (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-accent-soft">
                      <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
                    </div>
                  ) : (
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        fase.estado === 'completada' ? 'bg-accent' : 'border-[1.5px] border-border bg-surface'
                      }`}
                    >
                      {fase.estado === 'completada' && (
                        <svg
                          viewBox="0 0 24 24"
                          width="13"
                          height="13"
                          fill="none"
                          stroke="white"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="4 12 9 17 20 6" />
                        </svg>
                      )}
                    </div>
                  )}
                  <div
                    className={`w-0.5 flex-1 ${
                      indice === fases.length - 1
                        ? 'bg-transparent'
                        : fase.estado === 'completada'
                          ? 'bg-accent'
                          : 'bg-border'
                    }`}
                  />
                </div>
                <div className="pb-6">
                  <p
                    className={
                      fase.estado === 'actual'
                        ? 'text-[14.5px] font-bold text-accent-dark'
                        : fase.estado === 'futura'
                          ? 'text-[14.5px] font-semibold text-ink-soft'
                          : 'text-[14.5px] font-semibold text-ink'
                    }
                  >
                    {fase.etiqueta}
                  </p>
                  {fase.detalle && <p className="mt-0.5 text-[12.5px] text-ink-soft">{fase.detalle}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:w-[360px] lg:shrink-0">
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="mb-3 text-xs uppercase tracking-wide text-ink-soft">Tu pedido</p>
          <dl className="flex flex-col gap-2 text-sm">
            {estado.lineas.map((linea, indice) => (
              <div key={indice} className="flex justify-between gap-3">
                <dt>
                  {linea.cantidad}× {linea.nombreArticulo} · {linea.nombreTamano}
                  {linea.extras.length > 0 && <span className="text-ink-soft"> ({linea.extras.join(', ')})</span>}
                </dt>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex justify-between border-t border-border pt-3 font-bold">
            <span>Total</span>
            <span>{formatearPrecio(estado.totalCentimos)}</span>
          </div>
        </div>

        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-ink-soft">
          ¿Alguna duda? Llama al restaurante: {estado.telefonoRestaurante}
        </p>
      </div>
    </div>
  )
}
