import { obtenerAjustesHorario, obtenerReglas } from '@/lib/carta/consultas'
import { generarFranjas } from '@/lib/horario'
import { FormularioCheckout } from '@/components/checkout/FormularioCheckout'

export default async function PaginaCheckout() {
  const [reglas, ajustesHorario] = await Promise.all([obtenerReglas(), obtenerAjustesHorario()])
  const franjas = generarFranjas(ajustesHorario, new Date())

  return (
    <main className="mx-auto max-w-[1440px] px-5 pb-24 lg:px-16">
      <header className="py-6">
        <a href="/" className="text-sm text-ink-soft">
          ‹ Volver a la carta
        </a>
        <h1 className="mt-2 font-display text-[29px] italic text-ink">Finalizar pedido</h1>
      </header>
      {franjas.length === 0 ? (
        <p className="rounded-lg bg-surface p-4 text-sm text-ink-soft">
          El restaurante está cerrado ahora mismo y no hay franjas de entrega disponibles. Vuelve a intentarlo
          cuando abramos.
        </p>
      ) : (
        <FormularioCheckout reglas={reglas} franjas={franjas} />
      )}
    </main>
  )
}
