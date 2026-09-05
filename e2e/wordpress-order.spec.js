import { test, expect } from './fixtures.js'

const E2E_ORDER_POOL_KEY = process.env.E2E_ORDER_POOL_KEY || 'e2e-order-pool-key'

function dateInCurrentHelsinkiMonth(day) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Helsinki',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(new Date())
  const year = Number(parts.find((part) => part.type === 'year').value)
  const month = Number(parts.find((part) => part.type === 'month').value)
  return new Date(Date.UTC(year, month - 1, day, 10, 0, 0)).toISOString()
}

test('WordPress imports keep source data read-only while the current order remains editable', async ({ page, database }) => {
  const source = {
    date: dateInCurrentHelsinkiMonth(10),
    duration: 2,
    service: { id: 'wp-service', name: 'WordPress service', pricePerHour: 80 },
    paymentType: { id: 'wp-payment', name: 'WordPress payment', fee: 5 },
    address: { street: 'WordPress Street 1', index: '00100', city: 'Helsinki', floor: 1, elevator: true },
    destination: { street: 'WordPress Destination 2', index: '00200', city: 'Espoo', floor: 2, elevator: false },
    extraAddresses: [],
    boxes: {
      amount: 10,
      deliveryDate: dateInCurrentHelsinkiMonth(11),
      returnDate: dateInCurrentHelsinkiMonth(12),
      pricePerBox: 'legacy-box-price',
      deliveryPrice: { old: true },
      returnPrice: ['legacy'],
    },
    name: 'WordPress imported customer',
    email: 'wordpress@example.com',
    phone: '+358401234567',
    comment: 'Imported source comment',
    price: 'legacy-price',
    fees: { legacy: 'shape' },
    boxesPrice: ['legacy-boxes-price'],
    metadata: { source: 'wordpress' },
  }
  const response = await page.request.post('/api/order-pool/v2/add', {
    data: { key: E2E_ORDER_POOL_KEY, order: source },
  })
  expect(response.ok()).toBe(true)
  const importedId = (await response.json()).id
  const imported = await database.readOrder(importedId)
  expect(imported.originalOrder).toMatchObject({
    name: 'WordPress imported customer',
    comment: 'Imported source comment',
  })
  expect(imported.originalOrder.price).toBe('legacy-price')
  expect(imported.originalOrder.fees).toEqual({ legacy: 'shape' })
  expect(imported.originalOrder.boxes.pricePerBox).toBe('legacy-box-price')
  expect(new Date(imported.boxes.deliveryDate).toISOString()).toBe(source.boxes.deliveryDate)
  expect(new Date(imported.boxes.returnDate).toISOString()).toBe(source.boxes.returnDate)
  expect(imported.boxes.deliveryHasTime).toBe(true)
  expect(imported.boxes.returnHasTime).toBe(true)
  expect(imported.pricingOverrides).toEqual({ price: null, fees: null, boxesPrice: null })
  expect(imported.boxes).not.toHaveProperty('pricePerBox')
  expect(imported.boxes).not.toHaveProperty('deliveryPrice')
  expect(imported.boxes).not.toHaveProperty('returnPrice')

  await page.goto(`/app/calendar/order/${importedId}`)
  await expect(page.getByText('WordPress imported customer', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Edit' }).click()
  const editDialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Edit order', exact: true }) })
  await expect(editDialog.getByLabel('Price estimate')).toHaveValue('')
  await expect(editDialog.getByText('Automatic: 215.5 €', { exact: true })).toBeVisible()
  await editDialog.getByRole('button', { name: 'View original WordPress order' }).click()
  const originalDialog = page.getByRole('dialog', { name: 'Original WordPress order' })
  await expect(originalDialog).toContainText('WordPress imported customer')
  await expect(originalDialog).toContainText('Imported source comment')
  await expect(originalDialog).toContainText('legacy-price')
  await originalDialog.getByRole('button', { name: 'Close' }).click()

  await editDialog.getByLabel('Price estimate').fill('321')
  await editDialog.getByLabel('Price estimate').blur()
  await editDialog.getByText('Boxes', { exact: true }).click()
  await editDialog.getByLabel('Price', { exact: true }).fill('12')
  await editDialog.getByLabel('Price', { exact: true }).blur()
  await editDialog.locator('input[name="name"]').fill('Edited imported customer')
  await editDialog.getByRole('button', { name: 'Save changes' }).click()
  await expect.poll(async () => (await database.readOrder(importedId))?.name).toBe('Edited imported customer')
  const saved = await database.readOrder(importedId)
  expect(saved.originalOrder.name).toBe('WordPress imported customer')
  expect(saved.originalOrder.price).toBe('legacy-price')
  expect(saved.originalOrder.fees).toEqual({ legacy: 'shape' })
  expect(saved.originalOrder.boxes.pricePerBox).toBe('legacy-box-price')
  expect(saved.pricingOverrides).toMatchObject({ price: 321, boxesPrice: 12 })
})
