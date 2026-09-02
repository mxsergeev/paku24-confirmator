import { test, expect } from './fixtures.js'

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

test('direct order URL outside the visible month loads the exact order', async ({ page, database }) => {
  const order = await database.seedOrder({
    date: '2020-01-15T10:00:00.000Z',
    boxes: {
      deliveryDate: '2020-01-15',
      returnDate: '2020-01-15',
      amount: 0,
    },
  })
  const requestedUrls = []
  page.on('request', (request) => {
    if (request.method() === 'GET') requestedUrls.push(request.url())
  })

  await page.goto(`/app/calendar/order/${order.id}`)
  await expect(page.getByText('E2E Customer', { exact: true })).toBeVisible()
  expect(requestedUrls.some((url) => url.includes(`/api/order-pool/v2/${order.id}`))).toBe(true)

  await page.reload()
  await expect(page.getByText('E2E Customer', { exact: true })).toBeVisible()
  expect(
    requestedUrls.filter((url) => url.includes(`/api/order-pool/v2/${order.id}`)).length,
  ).toBeGreaterThanOrEqual(2)
})

test('direct order URL inside the visible month loads the exact order', async ({ page, database }) => {
  const order = await database.seedOrder({ date: dateInCurrentHelsinkiMonth(10) })

  await page.goto(`/app/calendar/order/${order.id}`)
  await expect(page).toHaveURL(new RegExp(`/app/calendar/order/${order.id}$`))
  await expect(page.getByText('E2E Customer', { exact: true })).toBeVisible()
})

test('calendar order navigation supports browser back and forward', async ({ page, database }) => {
  const order = await database.seedOrder({ date: dateInCurrentHelsinkiMonth(10) })

  await page.goto('/app/calendar')
  await page.locator('.fc-event').filter({ hasText: 'E2E Customer' }).click()
  await expect(page).toHaveURL(new RegExp(`/app/calendar/order/${order.id}$`))
  await expect(page.getByText('E2E Customer', { exact: true })).toBeVisible()

  await page.goBack()
  await expect(page).toHaveURL(/\/app\/calendar$/)

  await page.goForward()
  await expect(page).toHaveURL(new RegExp(`/app/calendar/order/${order.id}$`))
  await expect(page.getByText('E2E Customer', { exact: true })).toBeVisible()
})

test('deleted orders load through their direct URL', async ({ page, database }) => {
  const order = await database.seedOrder({
    date: '2020-01-15T10:00:00.000Z',
    deletedAt: new Date().toISOString(),
  })

  await page.goto(`/app/calendar/order/${order.id}`)
  await expect(page.getByRole('heading', { name: /DELETED/, exact: false }).last()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Restore' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Delete permanently' })).toBeVisible()
})

test('a nonexistent direct order URL shows only the close path', async ({ page }) => {
  const missingId = '66c000000000000000000099'

  await page.goto(`/app/calendar/order/${missingId}`)
  await expect(page.getByRole('heading', { name: /Order not found/, exact: false }).last()).toBeVisible()
  await expect(page.getByRole('button', { name: 'close' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Confirm order' })).toHaveCount(0)
})

test('editing and saving a direct order URL updates the exact order', async ({ page, database }) => {
  const order = await database.seedOrder({
    date: '2020-01-15T10:00:00.000Z',
  })

  await page.goto(`/app/calendar/order/${order.id}`)
  await page.getByRole('button', { name: 'Edit' }).click()
  const editDialog = page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: 'Edit order', exact: true }),
  })
  await expect(editDialog).toBeVisible()
  await editDialog.locator('input[name="name"]').fill('Direct URL Customer')
  await editDialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(editDialog).toBeHidden()

  await expect.poll(async () => (await database.readOrder(order.id))?.name).toBe('Direct URL Customer')
})

test('editing a sparse order without optional data materializes boxes when used', async ({ page, database }) => {
  const order = await database.seedOrder({
    date: dateInCurrentHelsinkiMonth(10),
    address: null,
    destination: null,
    email: undefined,
    extraAddresses: undefined,
    paymentType: undefined,
    phone: undefined,
    pricingOverrides: undefined,
    service: undefined,
    boxes: undefined,
  })

  await page.goto(`/app/calendar/order/${order.id}`)
  await expect(page.getByText('E2E Customer', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Edit' }).click()
  const editDialog = page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: 'Edit order', exact: true }),
  })
  await expect(editDialog).toBeVisible()
  await expect(editDialog.locator('input[name="name"]')).toBeVisible()

  await editDialog.locator('input[name="name"]').fill('Sparse Customer')
  await editDialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(editDialog).toBeHidden()
  await expect(page.getByText('Sparse Customer', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Edit' }).click()
  await expect(editDialog).toBeVisible()
  await expect(editDialog.locator('input[name="name"]')).toHaveValue('Sparse Customer')

  await editDialog.getByText('Boxes', { exact: true }).click()
  await editDialog.locator('select[name="amount"]').selectOption('10')
  await editDialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(editDialog).toBeHidden()

  const savedOrder = await database.readOrder(order.id)
  expect(savedOrder.boxes).toMatchObject({ amount: 10 })
  expect(savedOrder.boxes.deliveryDate).toBeTruthy()
  expect(savedOrder.boxes.returnDate).toBeTruthy()
})

test('editing partially populated optional data remains usable', async ({ page, database }) => {
  const order = await database.seedOrder({
    date: dateInCurrentHelsinkiMonth(11),
    address: { street: 'Only street' },
    destination: { city: 'Only city' },
    extraAddresses: [null, { street: 'Extra street' }],
    service: { id: '1', name: 'Partial service' },
    paymentType: { id: '1', name: 'Partial payment' },
    boxes: { deliveryDate: null, returnDate: null, amount: 10 },
  })

  await page.goto(`/app/calendar/order/${order.id}`)
  await expect(page.getByText('E2E Customer', { exact: true })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('undefined')

  await page.getByRole('button', { name: 'Edit' }).click()
  const editDialog = page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: 'Edit order', exact: true }),
  })
  await expect(editDialog).toBeVisible()
  await editDialog.locator('input[name="name"]').fill('Partial Customer')
  await editDialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(editDialog).toBeHidden()

  const savedOrder = await database.readOrder(order.id)
  expect(savedOrder.name).toBe('Partial Customer')
  expect(savedOrder.boxes).toMatchObject({ amount: 10 })
  expect(savedOrder.boxes.deliveryDate).toBeTruthy()
  expect(savedOrder.boxes.returnDate).toBeTruthy()
  expect(savedOrder.extraAddresses).toHaveLength(1)
  expect(savedOrder.extraAddresses[0]).toMatchObject({
    street: 'Extra street',
    index: '',
    city: '',
  })
})

test('New Order exposes the browser-level pricing location', async ({ page }) => {
  await page.goto('/app/calendar')
  await page.getByRole('button', { name: 'Create order' }).click()
  await expect(page.getByRole('heading', { name: 'New Order', exact: true })).toBeVisible()
  await expect(page.getByLabel('Price estimate')).toBeVisible()
})

test('automatic and explicit event colors survive cancel and restore', async ({ page, database }) => {
  const order = await database.seedOrder({
    date: dateInCurrentHelsinkiMonth(12),
    confirmed: true,
    eventColor: null,
    service: {
      id: '1',
      name: 'Pakettiauto ja kuljettaja',
      pricePerHour: 50,
      eventColor: '1',
    },
  })

  await page.goto('/app/calendar')
  const orderEvent = page.locator('.fc-event').filter({ hasText: 'E2E Customer' })
  const orderEventColor = orderEvent.locator('.fc-event-inner')
  await expect(orderEvent).toBeVisible()
  await expect(orderEventColor).toHaveCSS('background-color', 'rgb(121, 134, 203)')
  await orderEvent.click()

  const dialog = page.getByRole('dialog').first()
  await dialog.locator('.color-selector .MuiSelect-select').click()
  await page.getByRole('option', { name: 'Tomato', exact: true }).click()
  await expect.poll(async () => (await database.readOrder(order.id))?.eventColor).toBe('11')
  await expect(orderEventColor).toHaveCSS('background-color', 'rgb(214, 0, 0)')

  await dialog.locator('.color-selector .MuiSelect-select').click()
  await page.getByRole('option', { name: 'Automatic', exact: true }).click()
  await expect.poll(async () => (await database.readOrder(order.id))?.eventColor).toBeNull()
  await expect(orderEventColor).toHaveCSS('background-color', 'rgb(121, 134, 203)')

  await dialog.getByRole('button', { name: 'Cancel order' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel only' }).click()
  await expect.poll(async () => (await database.readOrder(order.id))?.canceledAt).toBeTruthy()
  await expect(orderEventColor).toHaveCSS('background-color', 'rgb(97, 97, 97)')
  expect((await database.readOrder(order.id))?.eventColor).toBeNull()

  await page.getByRole('dialog').first().getByRole('button', { name: 'Restore' }).click()
  await expect.poll(async () => (await database.readOrder(order.id))?.canceledAt).toBeFalsy()
  await expect((await database.readOrder(order.id))?.eventColor).toBeNull()
  await expect(orderEventColor).toHaveCSS('background-color', 'rgb(121, 134, 203)')

  await dialog.locator('.color-selector .MuiSelect-select').click()
  await page.getByRole('option', { name: 'Tomato', exact: true }).click()
  await expect.poll(async () => (await database.readOrder(order.id))?.eventColor).toBe('11')
  await expect(orderEventColor).toHaveCSS('background-color', 'rgb(214, 0, 0)')

  await dialog.getByRole('button', { name: 'Cancel order' }).click()
  const cancelDialog = page.getByRole('dialog').filter({ hasText: 'Cancel this order?' })
  await cancelDialog.getByRole('button', { name: 'Cancel only' }).click()
  await expect.poll(async () => (await database.readOrder(order.id))?.canceledAt).toBeTruthy()
  await expect((await database.readOrder(order.id))?.eventColor).toBe('11')
  await expect(orderEventColor).toHaveCSS('background-color', 'rgb(97, 97, 97)')

  await dialog.getByRole('button', { name: 'Restore' }).click()
  await expect.poll(async () => (await database.readOrder(order.id))?.canceledAt).toBeFalsy()
  await expect((await database.readOrder(order.id))?.eventColor).toBe('11')
  await expect(orderEventColor).toHaveCSS('background-color', 'rgb(214, 0, 0)')
})
