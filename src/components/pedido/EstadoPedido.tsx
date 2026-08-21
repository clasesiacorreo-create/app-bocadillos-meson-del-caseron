'use client'

import { useEffect, useState } from 'react'
import { formatearPrecio } from '@/lib/dinero'
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

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl bg-neutral-900 p-4">
        <p className="text-xs uppercase tracking-wide text-neutral-400">Pedido {estado.codigoPublico}</p>
        <p className="mt-1 text-xl font-bold">{textoEstadoCliente(estado)}</p>
      </div>

      <dl className="flex flex-col gap-1 text-sm">
        {estado.lineas.map((linea, indice) => (
          <div key={indice} className="flex justify-between">
            <dt>
              {linea.cantidad}× {linea.nombreArticulo} · {linea.nombreTamano}
              {linea.extras.length > 0 && (
                <span className="text-neutral-400"> ({linea.extras.join(', ')})</span>
              )}
            </dt>
          </div>
        ))}
        <div className="mt-2 flex justify-between font-bold">
          <dt>Total</dt>
          <dd>{formatearPrecio(estado.totalCentimos)}</dd>
        </div>
      </dl>

      <p className="text-sm text-neutral-400">
        ¿Alguna duda? Llama al restaurante: {estado.telefonoRestaurante}
      </p>
    </div>
  )
}
