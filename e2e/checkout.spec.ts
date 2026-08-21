import { config } from 'dotenv'
config({ path: '.env.local' }) // el test habla con Supabase directamente, fuera del servidor de Next
import { expect, test } from '@playwright/test'
import { crearClienteServicio } from '../src/lib/supabase/cliente-servicio'

test('un cliente completa el pedido y paga con la tarjeta de prueba', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Lomo' }).click()
  // Dos unidades (2 × 5,00 €) para alcanzar el pedido mínimo de 10,00 €: la
  // barra de carrito comprueba el mínimo asumiendo domicilio, aunque más
  // tarde en el checkout se elija recogida.
  await page.getByRole('button', { name: /Aumentar cantidad/ }).click()
  await page.getByRole('button', { name: /Añadir/ }).click()
  await page.getByRole('button', { name: /Ver pedido/ }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()

  await expect(page).toHaveURL(/\/checkout$/)
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
  await expect(page.getByText(/Recibido|Confirmado/)).toBeVisible({ timeout: 15000 })
})

test('recogida en local no pide dirección ni cobra envío', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Lomo' }).click()
  await page.getByRole('button', { name: /Aumentar cantidad/ }).click()
  await page.getByRole('button', { name: /Añadir/ }).click()
  await page.getByRole('button', { name: /Ver pedido/ }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()

  await page.getByRole('button', { name: 'Recogida en el local' }).click()
  await expect(page.getByLabel('Calle')).not.toBeVisible()
})

test('un artículo agotado durante el checkout bloquea el pago', async ({ page }) => {
  const supabase = crearClienteServicio()
  const { data: articulo } = await supabase.from('articulos').select('id').eq('nombre', 'Lomo').single()

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

  await supabase.from('articulos').update({ disponible: false }).eq('id', articulo!.id)
  try {
    await page.getByRole('button', { name: /Pagar/ }).click()
    await expect(page.getByText(/Lomo.*ya no está disponible/)).toBeVisible()
    await expect(page).toHaveURL(/\/checkout$/)
  } finally {
    await supabase.from('articulos').update({ disponible: true }).eq('id', articulo!.id)
  }
})

test('el servidor rechaza un pedido por debajo del mínimo aunque el navegador lo permita', async ({
  request,
}) => {
  const respuesta = await request.post('/api/pedidos', {
    data: {
      lineas: [],
      modoEntrega: 'domicilio',
      contacto: { nombre: 'Ana', apellidos: 'García', telefono: '600111222' },
      direccion: { calle: 'C. Hierro', numero: '73', piso: '', cp: '28850', ciudad: 'Torrejón de Ardoz', indicaciones: '' },
      franjaSolicitada: { inicio: new Date().toISOString(), fin: new Date().toISOString(), loAntesPosible: true },
      notas: '',
    },
  })
  expect(respuesta.status()).toBe(422)
  const cuerpo = await respuesta.json()
  expect(cuerpo.error.tipo).toBe('bajo_minimo')
})
