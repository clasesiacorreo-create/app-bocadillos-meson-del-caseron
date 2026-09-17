import { obtenerCarta, obtenerReglas } from '@/lib/carta/consultas'
import { VistaCarta } from '@/components/carta/VistaCarta'

export const revalidate = 60

export default async function PaginaCarta() {
  const [carta, reglas] = await Promise.all([obtenerCarta(), obtenerReglas()])

  return (
    <main className="mx-auto max-w-[1440px]">
      <header className="border-b border-border px-5 py-6">
        <h1 className="font-display text-[29px] italic text-ink">El Horno del Caserón</h1>
        <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-soft">
          Asador y casa de comidas · Torrejón de Ardoz
        </p>
      </header>
      <VistaCarta carta={carta} reglas={reglas} />
    </main>
  )
}
