import { obtenerAjustesHorario, obtenerReglas } from '@/lib/carta/consultas'
import { generarFranjas } from '@/lib/horario'
import { FormularioCheckout } from '@/components/checkout/FormularioCheckout'

export default async function PaginaCheckout() {
  const [reglas, ajustesHorario] = await Promise.all([obtenerReglas(), obtenerAjustesHorario()])
  const franjas = generarFranjas(ajustesHorario, new Date())

  return (
    <main className="mx-auto max-w-lg px-4 pb-24 bg-neutral-950 text-neutral-100">
      <header className="py-6">
        <a href="/" className="text-sm text-neutral-400">
          ‹ Volver a la carta
        </a>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Finalizar pedido</h1>
      </header>
      {franjas.length === 0 ? (
        <p className="rounded-lg bg-neutral-900 p-4 text-sm text-neutral-300">
          El restaurante está cerrado ahora mismo y no hay franjas de entrega disponibles. Vuelve a intentarlo
          cuando abramos.
        </p>
      ) : (
        <FormularioCheckout reglas={reglas} franjas={franjas} />
      )}
    </main>
  )
}
