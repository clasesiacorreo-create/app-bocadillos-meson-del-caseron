import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Refresca la cookie de sesión de Supabase en cada petición a `/panel/**` y
 * manda a iniciar sesión a quien no la tenga. La propia página de inicio de
 * sesión queda fuera para no entrar en bucle de redirecciones.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname !== '/panel/iniciar-sesion') {
    return NextResponse.redirect(new URL('/panel/iniciar-sesion', request.url))
  }

  return response
}

export const config = {
  matcher: '/panel/:path*',
}
