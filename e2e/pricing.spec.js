import { test, expect } from './fixtures.js'

function calendarDateInHelsinki(value) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Helsinki',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(value)
  const get = (type) => parts.find((part) => part.type === type).value
  return `${get('day')}.${get('month')}.${get('year')}`
}

test('New Order keeps pricing controls compact and supports manual overrides', async ({ page }) => {
  await page.goto('/app/calendar')
  await page.getByRole('button', { name: 'Create order' }).click()
  await expect(page.getByRole('heading', { name: 'New Order', exact: true })).toBeVisible()

  const price = page.getByLabel('Price estimate')
  await expect(price).toBeVisible()
  await expect(page.getByText('Automatic:', { exact: false })).toHaveCount(2)
  await expect(page.getByText('Effective:', { exact: false })).toHaveCount(0)

  await price.fill('125,50')
  await price.blur()
  await expect(price).toHaveValue('125.5')

  await price.fill('0')
  await price.blur()
  await expect(price).toHaveValue('0')

  await page.getByRole('button', { name: 'Manage fees' }).click()
  const feeDialog = page.getByRole('dialog', { name: 'Fees' })
  await expect(feeDialog).toBeVisible()
  await feeDialog.getByRole('radio', { name: 'Manual' }).check()

  const feeCheckboxes = feeDialog.getByRole('checkbox')
  for (const checkbox of await feeCheckboxes.all()) {
    if (await checkbox.isChecked()) await checkbox.uncheck()
  }
  for (const checkbox of await feeCheckboxes.all()) {
    await expect(checkbox).not.toBeChecked()
  }

  await feeDialog.getByRole('radio', { name: 'Automatic' }).check()
  await feeDialog.getByRole('button', { name: 'Done' }).click()

  await page.getByText('Boxes', { exact: true }).click()
  const boxesPrice = page.getByLabel('Price', { exact: true })
  await expect(boxesPrice).toBeVisible()
  await boxesPrice.fill('12.50')
  await boxesPrice.blur()
  await expect(boxesPrice).toHaveValue('12.5')

  await boxesPrice.fill('0')
  await boxesPrice.blur()
  await expect(boxesPrice).toHaveValue('0')
})

test('editing and reopening an order preserves all pricing overrides', async ({ page, database }) => {
  const now = new Date()
  const orderDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10, 10, 0, 0))
  const deliveryDate = new Date(orderDate.getTime() + 24 * 60 * 60 * 1000)
  const returnDate = new Date(deliveryDate.getTime() + 7 * 24 * 60 * 60 * 1000)
  const order = await database.seedOrder({
    date: orderDate.toISOString(),
    name: 'Pricing persistence customer',
    pricingOverrides: { price: 125.5, fees: [], boxesPrice: 0 },
    boxes: {
      deliveryDate: deliveryDate.toISOString(),
      deliveryHasTime: true,
      returnDate: returnDate.toISOString(),
      returnHasTime: true,
      amount: 10,
    },
  })

  await page.goto(`/app/calendar/order/${order.id}`)
  await expect(page.getByText('Pricing persistence customer', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Edit' }).click()
  const editDialog = page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: 'Edit order', exact: true }),
  })
  await expect(editDialog).toBeVisible()

  await expect(editDialog.getByLabel('Price estimate')).toHaveValue('125.5')
  await editDialog.getByText('Boxes', { exact: true }).click()
  await expect(editDialog.getByLabel('Price', { exact: true })).toHaveValue('0')

  const boxTimeCheckboxes = editDialog.getByRole('checkbox', { name: 'Include time' })
  await expect(boxTimeCheckboxes).toHaveCount(2)
  await boxTimeCheckboxes.nth(0).uncheck()

  await page.locator('select[name="duration"]').selectOption('3')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0)

  const savedOrder = await database.readOrder(order.id)
  expect(savedOrder.pricingOverrides).toEqual({ price: 125.5, fees: [], boxesPrice: 0 })
  expect(savedOrder.boxes.deliveryHasTime).toBe(false)
  expect(savedOrder.boxes.returnHasTime).toBe(true)
  expect(new Date(savedOrder.boxes.deliveryDate).toISOString()).toBe(
    new Date(Date.UTC(deliveryDate.getUTCFullYear(), deliveryDate.getUTCMonth(), 11)).toISOString(),
  )
  expect(new Date(savedOrder.boxes.returnDate).toISOString()).toBe(returnDate.toISOString())

  await page.goto(`/app/calendar/order/${order.id}`)
  await expect(page.getByText('Pricing persistence customer', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Edit' }).click()
  const reopenedEditDialog = page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: 'Edit order', exact: true }),
  })
  await expect(reopenedEditDialog).toBeVisible()
  await expect(reopenedEditDialog.getByLabel('Price estimate')).toHaveValue('125.5')
  await reopenedEditDialog.getByText('Boxes', { exact: true }).click()
  await expect(reopenedEditDialog.getByLabel('Price', { exact: true })).toHaveValue('0')
  const reopenedBoxTimeCheckboxes = reopenedEditDialog.getByRole('checkbox', { name: 'Include time' })
  await expect(reopenedBoxTimeCheckboxes.nth(0)).not.toBeChecked()
  await expect(reopenedBoxTimeCheckboxes.nth(1)).toBeChecked()
  const reopenedPickerValues = await reopenedEditDialog.locator('input').evaluateAll((inputs) =>
    inputs.map((input) => input.value),
  )
  expect(reopenedPickerValues.some((value) => value.startsWith(calendarDateInHelsinki(deliveryDate)))).toBe(
    true,
  )
  expect(reopenedPickerValues.some((value) => value.startsWith(calendarDateInHelsinki(returnDate)))).toBe(
    true,
  )
})

test('automatic price estimate includes manual fees and boxes and recomputes after duration changes', async ({ page, database }) => {
  const now = new Date()
  const orderDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10, 10, 0, 0))
  const order = await database.seedOrder({
    date: orderDate.toISOString(),
    duration: 2,
    name: 'Composed pricing customer',
    service: { id: '1', name: 'Pakettiauto ja kuljettaja', pricePerHour: 50 },
    boxes: { amount: 0, deliveryDate: orderDate.toISOString(), returnDate: orderDate.toISOString() },
    pricingOverrides: { price: null, fees: null, boxesPrice: null },
  })

  await page.goto(`/app/calendar/order/${order.id}`)
  await page.getByRole('button', { name: 'Edit' }).click()
  const editDialog = page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: 'Edit order', exact: true }),
  })
  await expect(editDialog.getByLabel('Price estimate')).toHaveValue('')
  await expect(editDialog.getByText('Automatic: 100 €', { exact: true })).toBeVisible()

  await editDialog.getByRole('button', { name: 'Manage fees' }).click()
  const feeDialog = page.getByRole('dialog', { name: 'Fees' })
  await feeDialog.getByRole('radio', { name: 'Manual' }).check()
  const holidayFee = feeDialog.getByRole('checkbox', { name: 'Select PYHÄLISÄ fee' })
  await holidayFee.check()
  await feeDialog.getByRole('button', { name: 'Done' }).click()

  await editDialog.getByText('Boxes', { exact: true }).click()
  const boxesPrice = editDialog.getByLabel('Price', { exact: true })
  await boxesPrice.fill('12')
  await boxesPrice.blur()
  await expect(editDialog.getByText('Automatic: 127 €', { exact: true })).toBeVisible()

  await editDialog.locator('select[name="duration"]').selectOption('3')
  await expect(editDialog.getByText('Automatic: 177 €', { exact: true })).toBeVisible()
  await expect(boxesPrice).toHaveValue('12')

  await editDialog.getByRole('button', { name: 'Manage fees' }).click()
  await expect(page.getByRole('dialog', { name: 'Fees' }).getByRole('checkbox', {
    name: 'Select PYHÄLISÄ fee',
  })).toBeChecked()
})
