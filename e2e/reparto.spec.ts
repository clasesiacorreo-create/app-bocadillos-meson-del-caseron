import { config } from 'dotenv'
config({ path: '.env.local' })
import { expect, test } from '@playwright/test'
import { crearClienteServicio } from '@/lib/supabase/cliente-servicio'

const EMAIL_COCINA = process.env.PANEL_TEST_EMAIL!
const PASSWORD_COCINA = process.env.PANEL_TEST_PASSWORD!
const EMAIL_REPARTIDOR = process.env.REPARTIDOR_TEST_EMAIL!
const PASSWORD_REPARTIDOR = process.env.REPARTIDOR_TEST_PASSWORD!

test('un repartidor recoge y entrega un pedido a domicilio ya preparado por cocina', async ({ page }) => {
  // El pedido mínimo a domicilio (ajustes.pedido_minimo_centimos) y el precio
  // del tamaño de Lomo que esté disponible hoy son datos configurables desde
  // el panel, no constantes de código — el dueño puede cambiarlos sin tocar
  // el código (fase de Administración). Se leen en vivo para calcular cuántas
  // unidades hacen falta, en vez de asumir el mínimo por defecto (10,00 €) y
  // un tamaño concreto: así el test no vuelve a romperse si cambian de nuevo.
  const supabase = crearClienteServicio()
  const { data: ajustes } = await supabase
    .from('ajustes')
    .select('pedido_minimo_centimos')
    .single()
  const { data: articulo } = await supabase
    .from('articulos')
    .select('articulo_tamanos ( precio_centimos, disponible, tamanos ( orden ) )')
    .eq('nombre', 'Lomo')
    .single()
  const tamanoDisponible = articulo!.articulo_tamanos
    .filter((t) => t.disponible)
    .sort((a, b) => a.tamanos!.orden - b.tamanos!.orden)[0]
  const unidadesLomo = Math.ceil(
    ajustes!.pedido_minimo_centimos / tamanoDisponible.precio_centimos,
  )

  await page.goto('/')
  await page.getByRole('button', { name: 'Lomo' }).click()
  // Tantas unidades como haga falta para alcanzar el pedido mínimo a
  // domicilio (la cantidad empieza en 1, así que solo hay que aumentarla
  // unidadesLomo - 1 veces): a domicilio, a diferencia de la recogida, el
  // mínimo sí se comprueba.
  for (let i = 1; i < unidadesLomo; i++) {
    await page.getByRole('button', { name: /Aumentar cantidad/ }).click()
  }
  await page.getByRole('button', { name: /Añadir/ }).click()
  await page.getByRole('button', { name: /Ver pedido/ }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'A domicilio' }).click()
  await page.getByLabel('Nombre').fill('Ana')
  await page.getByLabel('Apellidos').fill('García')
  await page.getByLabel('Teléfono').fill('600111222')
  await page.getByLabel('Calle').fill('C. Hierro')
  await page.getByLabel('Número').fill('73')
  await page.getByLabel('Código postal').fill('28850')
  await page.getByLabel('Ciudad').fill('Torrejón de Ardoz')
  await page.getByRole('button', { name: /Pagar/ }).click()

  await page.waitForURL(/checkout\.stripe\.com/)
  await page.locator('#email').fill('ana@example.com')
  await page.getByRole('radio', { name: 'Card' }).click({ force: true })
  await page.locator('#cardNumber').fill('4242424242424242')
  await page.locator('#cardExpiry').fill('12/34')
  await page.locator('#cardCvc').fill('123')
  await page.locator('#billingName').fill('Ana García')
  await page.getByTestId('hosted-payment-submit-button').click()
  await page.waitForURL(/\/pedido\//)
  const urlSeguimiento = page.url()
  const codigoPedido = urlSeguimiento.split('/pedido/')[1]

  // Cocina lo confirma, lo prepara y lo pasa a pendiente de envío — igual
  // que en e2e/panel.spec.ts, pero aquí el pedido es a domicilio, así que
  // termina esperando a un repartidor en vez de ofrecer "Entregado".
  await page.goto('/panel/iniciar-sesion')
  await page.getByLabel('Email').fill(EMAIL_COCINA)
  await page.getByLabel('Contraseña').fill(PASSWORD_COCINA)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(/\/panel$/)

  const tarjetaCocina = page.locator('article').filter({ hasText: codigoPedido })
  const botonAceptarYEmpezar = tarjetaCocina.getByRole('button', { name: 'Aceptar y empezar' })
  const botonConfirmar = tarjetaCocina.getByRole('button', { name: /Confirmar/ })
  await expect(botonAceptarYEmpezar.or(botonConfirmar)).toBeVisible({ timeout: 15000 })
  if (await botonAceptarYEmpezar.isVisible()) {
    await botonAceptarYEmpezar.click()
  } else {
    await botonConfirmar.click()
    await tarjetaCocina.getByRole('button', { name: 'Empezar' }).click()
  }

  await page.getByRole('button', { name: 'En marcha' }).click()
  const casilla = tarjetaCocina.getByRole('checkbox').first()
  await expect(casilla).toBeEnabled({ timeout: 15000 })
  await expect(async () => {
    await casilla.check()
    await expect(casilla).toBeChecked()
  }).toPass({ timeout: 15000 })
  await tarjetaCocina.getByRole('button', { name: 'Listo' }).click()

  await page.getByRole('button', { name: 'Pendientes de envío' }).click()
  await expect(tarjetaCocina.getByText('Esperando a que un repartidor lo recoja.')).toBeVisible({ timeout: 15000 })

  // El repartidor entra en su propia pantalla, lo recoge y lo entrega.
  await page.goto('/panel/iniciar-sesion')
  await page.getByLabel('Email').fill(EMAIL_REPARTIDOR)
  await page.getByLabel('Contraseña').fill(PASSWORD_REPARTIDOR)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(/\/reparto$/)

  const tarjetaReparto = page.locator('article').filter({ hasText: codigoPedido })
  await expect(tarjetaReparto).toBeVisible({ timeout: 15000 })
  await expect(tarjetaReparto.getByText('Pagado online — no cobrar')).toBeVisible()
  await tarjetaReparto.getByRole('button', { name: 'Recojo este' }).click()

  await page.getByRole('button', { name: 'Mis entregas' }).click()
  await expect(tarjetaReparto.getByRole('button', { name: 'Entregado' })).toBeVisible({ timeout: 15000 })
  await tarjetaReparto.getByRole('button', { name: 'Entregado' }).click()

  // El clic dispara un POST asíncrono a /avanzar que TarjetaReparto no espera
  // de forma bloqueante antes de que el test siga: navegar de inmediato lo
  // cancelaría a mitad (el pedido nunca llegaría a "entregado" en la base de
  // datos). Al entregarlo deja de pertenecer a "Mis entregas" —no hay
  // pestaña de entregados para el repartidor—, así que esperar a que la
  // tarjeta desaparezca de aquí confirma que el POST ha terminado: mismo
  // motivo por el que e2e/panel.spec.ts espera a la pestaña "Entregados"
  // antes de ir a la página de seguimiento.
  await expect(tarjetaReparto).not.toBeVisible({ timeout: 15000 })

  // pendiente_envio → en_reparto → entregado: el seguimiento del cliente lo
  // confirma igual que en e2e/panel.spec.ts para la recogida.
  await page.goto(urlSeguimiento)
  await expect(page.getByText('Entregado')).toBeVisible({ timeout: 15000 })
})
