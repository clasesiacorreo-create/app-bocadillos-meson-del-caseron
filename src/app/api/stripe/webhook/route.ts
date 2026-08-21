import { NextRequest, NextResponse } from 'next/server'
import { avisarNuevoPedido } from '@/lib/avisos'
import { confirmarPagoDePedido } from '@/lib/pedidos/confirmar'
import { verificarEventoWebhook } from '@/lib/pagos'
import type Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const cuerpo = await req.text()
  const firma = req.headers.get('stripe-signature')

  if (!firma) {
    return NextResponse.json({ error: 'Falta la firma de Stripe.' }, { status: 400 })
  }

  let evento: Stripe.Event
  try {
    evento = verificarEventoWebhook(cuerpo, firma)
  } catch {
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 400 })
  }

  if (evento.type === 'checkout.session.completed') {
    const session = evento.data.object as Stripe.Checkout.Session
    if (session.payment_status === 'paid') {
      const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : ''
      const pedidoConfirmado = await confirmarPagoDePedido(session.id, paymentIntent)

      // Si es null, ya estaba confirmado (Stripe reintentó el webhook, o la red
      // de seguridad del seguimiento llegó primero): no se vuelve a avisar.
      if (pedidoConfirmado) {
        await avisarNuevoPedido(pedidoConfirmado)
      }
    }
  }

  return NextResponse.json({ received: true })
}
