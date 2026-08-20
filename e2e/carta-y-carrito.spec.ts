import { expect, test } from '@playwright/test'

test('un cliente monta un pedido desde el móvil', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'El Horno del Caserón' })).toBeVisible()

  // Elegir un artículo de la primera categoría
  await page.getByRole('button', { name: 'Lomo' }).click()
  await expect(page.getByRole('dialog', { name: 'Lomo' })).toBeVisible()

  // Cambiar de tamaño y añadir un complemento
  await page.getByRole('radio', { name: /Montado/ }).check()
  await page.getByRole('checkbox', { name: /Queso/ }).check()
  await page.getByRole('button', { name: 'Aumentar cantidad' }).click()

  // 400 + 50 = 450, por dos unidades
  await page.getByRole('button', { name: /Añadir/ }).click()

  // La barra de carrito aparece con el subtotal
  const barra = page.getByRole('button', { name: /Ver pedido/ })
  await expect(barra).toBeVisible()
  await expect(barra).toContainText('2 artículos')
  await expect(barra).toContainText('9,00')

  // El carrito avisa de que no llega al pedido mínimo
  await barra.click()
  await expect(page.getByText(/Te faltan 1,00/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled()
})

test('el carrito sobrevive a una recarga', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Lomo' }).click()
  await page.getByRole('button', { name: /Añadir/ }).click()
  await expect(page.getByRole('button', { name: /Ver pedido/ })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: /Ver pedido/ })).toBeVisible()
})
