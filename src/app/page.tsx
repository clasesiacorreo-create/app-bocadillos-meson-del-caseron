import { obtenerCarta, obtenerReglas } from '@/lib/carta/consultas'
import { VistaCarta } from '@/components/carta/VistaCarta'

export const revalidate = 60

export default async function PaginaCarta() {
  const [carta, reglas] = await Promise.all([obtenerCarta(), obtenerReglas()])

  return (
    <main className="mx-auto max-w-lg px-4">
      <header className="py-6">
        <h1 className="text-2xl font-bold tracking-tight">El Horno del Caserón</h1>
        <p className="text-sm text-neutral-400">Asador y casa de comidas · Torrejón de Ardoz</p>
      </header>
      <VistaCarta carta={carta} reglas={reglas} />
    </main>
  )
}
