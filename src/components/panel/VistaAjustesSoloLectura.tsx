import { formatearPrecio } from '@/lib/dinero'
import type { Ajustes } from '@/lib/ajustes'

const DIAS: { clave: keyof Ajustes['horario']; etiqueta: string }[] = [
  { clave: 'lunes', etiqueta: 'Lunes' },
  { clave: 'martes', etiqueta: 'Martes' },
  { clave: 'miercoles', etiqueta: 'Miércoles' },
  { clave: 'jueves', etiqueta: 'Jueves' },
  { clave: 'viernes', etiqueta: 'Viernes' },
  { clave: 'sabado', etiqueta: 'Sábado' },
  { clave: 'domingo', etiqueta: 'Domingo' },
]

export function VistaAjustesSoloLectura({ ajustes }: { ajustes: Ajustes }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-semibold">{ajustes.nombreRestaurante}</p>
        <p className="text-sm text-neutral-400">
          {ajustes.telefono} · {ajustes.direccion}
        </p>
      </div>
      <dl className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <dt>Envío</dt>
          <dd>{formatearPrecio(ajustes.envioCentimos)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Pedido mínimo</dt>
          <dd>{formatearPrecio(ajustes.pedidoMinimoCentimos)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Envío gratis desde</dt>
          <dd>
            {ajustes.envioGratisDesdeCentimos !== null ? formatearPrecio(ajustes.envioGratisDesdeCentimos) : 'Desactivado'}
          </dd>
        </div>
      </dl>
      <dl className="flex flex-col gap-1 text-sm">
        {DIAS.map((dia) => (
          <div key={dia.clave} className="flex justify-between">
            <dt>{dia.etiqueta}</dt>
            <dd>
              {ajustes.horario[dia.clave].length === 0
                ? 'Cerrado'
                : ajustes.horario[dia.clave].map((t) => `${t.desde}–${t.hasta}`).join(', ')}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
