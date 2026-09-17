import { FormularioLogin } from '@/components/panel/FormularioLogin'

export default function PaginaLogin() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 bg-neutral-950 text-neutral-100">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">El Horno del Caserón</h1>
      <FormularioLogin />
    </main>
  )
}
