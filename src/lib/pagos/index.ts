import Stripe from 'stripe'
import type { LineaParaCarrito } from '@/lib/carrito/tipos'

function clienteStripe(): Stripe {
  const clave = process.env.STRIPE_SECRET_KEY
  if (!clave) throw new Error('Falta STRIPE_SECRET_KEY. Revisa .env.local.')
  return new Stripe(clave)
  // Si TypeScript exige `apiVersion`, añade la que indique el error de
  // compilación: la fija el SDK instalado, no este plan.
}

type ParaSesion = {
  codigoPublico: string
  lineas: LineaParaCarrito[]
  envioCentimos: number
  origen: string
}

export async function crearSesionCheckout({
  codigoPublico,
  lineas,
  envioCentimos,
  origen,
}: ParaSesion): Promise<{ id: string; url: string }> {
  const stripe = clienteStripe()

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = lineas.map((linea) => {
    const nombreExtras = linea.extras.map((extra) => extra.nombre).join(', ')
    const precioLinea =
      linea.precioUnitarioCentimos + linea.extras.reduce((total, extra) => total + extra.precioCentimos, 0)

    return {
      quantity: linea.cantidad,
      price_data: {
        currency: 'eur',
        unit_amount: precioLinea,
        product_data: {
          name: `${linea.nombreArticulo} · ${linea.nombreTamano}`,
          ...(nombreExtras ? { description: nombreExtras } : {}),
        },
      },
    }
  })

  if (envioCentimos > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: 'eur',
        unit_amount: envioCentimos,
        product_data: { name: 'Envío a domicilio' },
      },
    })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    metadata: { codigo_publico: codigoPublico },
    success_url: `${origen}/pedido/${codigoPublico}`,
    cancel_url: `${origen}/checkout`,
  })

  if (!session.url) throw new Error('Stripe no devolvió una URL de pago.')
  return { id: session.id, url: session.url }
}

export async function obtenerEstadoSesion(
  sessionId: string,
): Promise<{ pagada: boolean; paymentIntent: string | null }> {
  const stripe = clienteStripe()
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  return {
    pagada: session.payment_status === 'paid',
    paymentIntent:
      typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null),
  }
}

export function verificarEventoWebhook(cuerpo: string, firma: string): Stripe.Event {
  const secreto = process.env.STRIPE_WEBHOOK_SECRET
  if (!secreto) throw new Error('Falta STRIPE_WEBHOOK_SECRET. Revisa .env.local.')
  return clienteStripe().webhooks.constructEvent(cuerpo, firma, secreto)
}
