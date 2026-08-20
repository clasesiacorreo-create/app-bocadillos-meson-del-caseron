'use client'

import { HojaInferior } from '@/components/ui/HojaInferior'
import { useCarrito } from '@/lib/carrito/store'
import { formatearPrecio } from '@/lib/dinero'
import { calcularResumen, precioLinea } from '@/lib/precios'
import type { ReglasPedido } from '@/lib/precios/tipos'

type Props = {
  reglas: ReglasPedido
  onCerrar: () => void
}

export function HojaCarrito({ reglas, onCerrar }: Props) {
  const lineas = useCarrito((estado) => estado.lineas)
  const cambiarCantidad = useCarrito((estado) => estado.cambiarCantidad)
  const resumen = calcularResumen(lineas, 'domicilio', reglas)

  return (
    <HojaInferior titulo="Tu pedido" onCerrar={onCerrar}>
      <h2 className="text-xl font-bold">Tu pedido</h2>

      {lineas.length === 0 ? (
        <p className="mt-6 text-neutral-400">Tu carrito está vacío.</p>
      ) : (
        <>
          <ul className="mt-4 flex flex-col gap-4">
            {lineas.map((linea) => (
              <li key={linea.id} className="flex gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold">
                      {linea.nombreArticulo}{' '}
                      <span className="text-neutral-400">· {linea.nombreTamano}</span>
                    </p>
                    <span className="shrink-0 font-medium" data-testid="precio-linea">
                      {formatearPrecio(precioLinea(linea))}
                    </span>
                  </div>
                  {linea.extras.length > 0 && (
                    <p className="text-sm text-neutral-400">
                      {linea.extras.map((extra) => extra.nombre).join(', ')}
                    </p>
                  )}
                  {linea.notasLinea && (
                    <p className="text-sm italic text-amber-500">{linea.notasLinea}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      aria-label={`Reducir ${linea.nombreArticulo}`}
                      onClick={() => cambiarCantidad(linea.id, linea.cantidad - 1)}
                      className="h-9 w-9 rounded-full border border-neutral-700"
                    >
                      −
                    </button>
                    <span>{linea.cantidad}</span>
                    <button
                      type="button"
                      aria-label={`Aumentar ${linea.nombreArticulo}`}
                      onClick={() => cambiarCantidad(linea.id, linea.cantidad + 1)}
                      className="h-9 w-9 rounded-full border border-neutral-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <dl className="mt-6 flex flex-col gap-1 border-t border-neutral-800 pt-4 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd data-testid="subtotal">{formatearPrecio(resumen.subtotalCentimos)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Envío</dt>
              <dd data-testid="envio">
                {resumen.envioEsGratis ? 'Gratis' : formatearPrecio(resumen.envioCentimos)}
              </dd>
            </div>
            <div className="flex justify-between text-base font-bold">
              <dt>Total</dt>
              <dd data-testid="total">{formatearPrecio(resumen.totalCentimos)}</dd>
            </div>
          </dl>

          {!resumen.alcanzaMinimo && (
            <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">
              Te faltan {formatearPrecio(resumen.faltaParaMinimoCentimos)} para llegar al pedido
              mínimo a domicilio.
            </p>
          )}

          {resumen.alcanzaMinimo && resumen.faltaParaEnvioGratisCentimos !== null && (
            <p className="mt-4 rounded-lg bg-neutral-800 p-3 text-sm text-neutral-300">
              Añade {formatearPrecio(resumen.faltaParaEnvioGratisCentimos)} más y el envío gratis
              es tuyo.
            </p>
          )}

          {resumen.envioEsGratis && (
            <p className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400">
              Envío gratis conseguido.
            </p>
          )}

          <button
            type="button"
            disabled={!resumen.alcanzaMinimo}
            className="mt-6 h-14 w-full rounded-xl bg-amber-500 text-lg font-bold text-neutral-950 disabled:opacity-40"
          >
            Continuar
          </button>
        </>
      )}
    </HojaInferior>
  )
}
