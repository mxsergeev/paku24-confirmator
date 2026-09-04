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
      deliveryDate: '2020-01-15T00:00:00.000Z',
      deliveryHasTime: false,
      returnDate: '2020-01-15T00:00:00.000Z',
      returnHasTime: false,
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
  await expect(page.locator('[role="dialog"] h2 h3')).toHaveCount(0)
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

test('calendar provider warnings do not roll back a saved edit', async ({ page, database }) => {
  const order = await database.seedOrder({
    name: 'Calendar warning customer',
    date: dateInCurrentHelsinkiMonth(10),
    confirmed: true,
  })

  await page.request.delete('/api/test/calendar')
  await page.request.post('/api/test/calendar/fail-next', { data: { operation: 'update' } })
  await page.goto(`/app/calendar/order/${order.id}`)
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.locator('input[name="name"]').fill('Saved warning customer')
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect.poll(async () => (await database.readOrder(order.id))?.name).toBe('Saved warning customer')
  await expect(page.getByText('Order was saved, but Google Calendar could not be synchronized.')).toBeVisible()
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
  await expect(page.getByRole('button', { name: 'Cancel order' })).toBeVisible()
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

test('manual order creation uses one request and confirms the Mongo row', async ({ page, database }) => {
  let addRequests = 0
  let confirmRequests = 0
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/api/order-pool/v2/add')) addRequests += 1
    if (request.method() === 'PUT' && request.url().includes('/api/order-pool/v2/confirm/')) confirmRequests += 1
  })

  await page.goto('/app/calendar')
  await page.getByRole('button', { name: 'Create order' }).click()
  await page.locator('input[name="name"]').fill('One request customer')
  await page.locator('input[name="phone"]').fill('+358401234567')
  const addResponsePromise = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().includes('/api/order-pool/v2/add'))
  await page.getByRole('button', { name: /add order/i }).click()
  const addResponse = await addResponsePromise
  const createdId = (await addResponse.json()).id

  await expect(page.getByRole('heading', { name: 'New Order', exact: true })).toBeHidden()
  await expect.poll(async () => (await database.readOrder(createdId))?.confirmed).toBe(true)
  expect(addRequests).toBe(1)
  expect(confirmRequests).toBe(0)
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('new_order'))).toBeNull()
})

test('manual creation warns on Calendar failure, clears the draft, and converges on a later edit', async ({ page, database }) => {
  await page.request.delete('/api/test/calendar')
  await page.request.post('/api/test/calendar/fail-next', { data: { operation: 'update' } })
  await page.goto('/app/calendar')
  await page.getByRole('button', { name: 'Create order' }).click()
  await page.locator('input[name="name"]').fill('Calendar warning new customer')
  await page.locator('input[name="phone"]').fill('+358401234567')
  const addResponsePromise = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().includes('/api/order-pool/v2/add'))
  await page.getByRole('button', { name: /add order/i }).click()
  const addResponse = await addResponsePromise
  const body = await addResponse.json()

  expect(body.warning.code).toBe('CALENDAR_SYNC_FAILED')
  await expect(page.getByText('Order was saved, but Google Calendar could not be synchronized.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'New Order', exact: true })).toBeHidden()
  await expect.poll(async () => (await database.readOrder(body.id))?.confirmed).toBe(true)
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('new_order'))).toBeNull()

  await page.goto(`/app/calendar/order/${body.id}`)
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.locator('input[name="name"]').fill('Calendar warning recovered customer')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect.poll(async () => (await database.readOrder(body.id))?.name).toBe('Calendar warning recovered customer')
  await expect.poll(async () => (await page.request.get('/api/test/calendar').then((response) => response.json())).events).toHaveLength(1)
})
