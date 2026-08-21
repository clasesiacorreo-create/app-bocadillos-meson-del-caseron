import { obtenerAjustesHorario, obtenerReglas } from '@/lib/carta/consultas'
import { generarFranjas } from '@/lib/horario'
import { FormularioCheckout } from '@/components/checkout/FormularioCheckout'

export default async function PaginaCheckout() {
  const [reglas, ajustesHorario] = await Promise.all([obtenerReglas(), obtenerAjustesHorario()])
  const franjas = generarFranjas(ajustesHorario, new Date())

  return (
    <main className="mx-auto max-w-lg px-4 pb-24">
      <header className="py-6">
        <a href="/" className="text-sm text-neutral-400">
          ‹ Volver a la carta
        </a>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Finalizar pedido</h1>
      </header>
      <FormularioCheckout reglas={reglas} franjas={franjas} />
    </main>
  )
}
