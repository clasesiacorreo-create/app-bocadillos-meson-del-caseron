import { config } from 'dotenv'
config({ path: '.env.local' })
import { expect, test } from '@playwright/test'

const EMAIL_COCINA = process.env.PANEL_TEST_EMAIL!
const PASSWORD_COCINA = process.env.PANEL_TEST_PASSWORD!

test('la cocina confirma, prepara y entrega un pedido de recogida recién pagado', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Lomo' }).click()
  await page.getByRole('button', { name: /Aumentar cantidad/ }).click()
  await page.getByRole('button', { name: /Añadir/ }).click()
  await page.getByRole('button', { name: /Ver pedido/ }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Recogida en el local' }).click()
  await page.getByLabel('Nombre').fill('Ana')
  await page.getByLabel('Apellidos').fill('García')
  await page.getByLabel('Teléfono').fill('600111222')
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
  // El código público del pedido va en la URL de seguimiento (/pedido/<codigo>) y es
  // el mismo que el panel muestra en la cabecera de la tarjeta ("Pedido <codigo>").
  // Hace falta para distinguir esta tarjeta de otros pedidos de recogida que ya
  // hubiera en el tablero.
  const codigoPedido = urlSeguimiento.split('/pedido/')[1]

  await page.goto('/panel/iniciar-sesion')
  await page.getByLabel('Email').fill(EMAIL_COCINA)
  await page.getByLabel('Contraseña').fill(PASSWORD_COCINA)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(/\/panel$/)

  const tarjeta = page.locator('article').filter({ hasText: codigoPedido })
  // La tarjeta ofrece un flujo de confirmación distinto según si el restaurante estaba
  // abierto al pagar: si lo estaba, el checkout preselecciona "Lo antes posible" y la
  // tarjeta muestra un único botón "Aceptar y empezar" que confirma la franja y pasa a
  // preparación a la vez; si no lo estaba (pero seguía habiendo franjas futuras), el
  // pedido lleva una franja concreta y la tarjeta muestra los pasos separados
  // "Confirmar {hora}" + "Empezar". No depende de cuál esté abierto el restaurante al
  // ejecutar el test: se espera a que aparezca cualquiera de los dos y se sigue ese flujo.
  const botonAceptarYEmpezar = tarjeta.getByRole('button', { name: 'Aceptar y empezar' })
  const botonConfirmar = tarjeta.getByRole('button', { name: /Confirmar/ })
  await expect(botonAceptarYEmpezar.or(botonConfirmar)).toBeVisible({ timeout: 15000 })
  if (await botonAceptarYEmpezar.isVisible()) {
    await botonAceptarYEmpezar.click()
  } else {
    await botonConfirmar.click()
    await tarjeta.getByRole('button', { name: 'Empezar' }).click()
  }

  // El tablero solo pinta las tarjetas de la pestaña activa (TableroPedidos filtra por
  // estado), así que cada transición que cambia de pestaña obliga a cambiar de pestaña
  // para seguir viendo la tarjeta: nuevo → en_preparacion pasa a "En marcha".
  await page.getByRole('button', { name: 'En marcha' }).click()
  const casilla = tarjeta.getByRole('checkbox').first()
  await expect(casilla).toBeEnabled({ timeout: 15000 })
  // El checkbox marca la línea vía un PATCH asíncrono antes de reflejar el cambio (no hay
  // actualización optimista), así que un solo check() puede correr por delante de la
  // respuesta. Reintentar hasta que quede marcado de verdad.
  await expect(async () => {
    await casilla.check()
    await expect(casilla).toBeChecked()
  }).toPass({ timeout: 15000 })
  await tarjeta.getByRole('button', { name: 'Listo' }).click()

  // en_preparacion → pendiente_envio pasa a "Pendientes de envío".
  await page.getByRole('button', { name: 'Pendientes de envío' }).click()
  await expect(tarjeta.getByRole('button', { name: 'Entregado' })).toBeVisible({ timeout: 15000 })
  await tarjeta.getByRole('button', { name: 'Entregado' }).click()

  // pendiente_envio → entregado pasa a "Entregados". Esperar aquí a que la tarjeta
  // aparezca en esa pestaña confirma que el PATCH ha terminado antes de ir a la página
  // de seguimiento: esta solo se refresca sola cada 15 s (sondeo, no tiempo real), así
  // que navegar antes de tiempo dejaría viendo el estado anterior.
  await page.getByRole('button', { name: 'Entregados' }).click()
  await expect(tarjeta).toBeVisible({ timeout: 15000 })

  await page.goto(urlSeguimiento)
  await expect(page.getByText('Entregado')).toBeVisible({ timeout: 15000 })
})
