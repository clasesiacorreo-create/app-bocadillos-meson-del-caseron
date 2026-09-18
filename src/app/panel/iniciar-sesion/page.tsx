import { FormularioLogin } from '@/components/panel/FormularioLogin'

export default function PaginaLogin() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="font-display text-3xl italic text-ink">El Horno del Caserón</h1>
        <p className="mt-1.5 text-sm text-ink-soft">Acceso del personal</p>
      </div>
      <FormularioLogin />
    </main>
  )
}
