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

test('unconfirmed orders can be confirmed through the real order dialog', async ({ page, database }) => {
  const order = await database.seedOrder({
    name: 'Confirmation customer',
    date: dateInCurrentHelsinkiMonth(10),
    confirmed: false,
  })

  await page.goto(`/app/calendar/order/${order.id}`)
  await page.getByRole('button', { name: 'Confirm order' }).click()
  const confirmDialog = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to confirm this order?' })
  await confirmDialog.getByRole('button', { name: 'Confirm' }).click()

  await expect.poll(async () => (await database.readOrder(order.id))?.confirmed).toBe(true)
  await expect(page.getByRole('button', { name: 'Cancel order' })).toBeVisible()
})

test('cancel only and cancel with notifications preserve lifecycle state', async ({ page, database }) => {
  const order = await database.seedOrder({
    name: 'Cancellation customer',
    date: dateInCurrentHelsinkiMonth(10),
    confirmed: true,
    eventColor: '11',
  })

  await page.goto(`/app/calendar/order/${order.id}`)
  await page.evaluate(async () => {
    const response = await fetch('/api/test/communications', { method: 'DELETE' })
    if (!response.ok) throw new Error(`Could not reset provider fake: ${response.status}`)
  })
  await expect(page.getByText('Cancellation customer', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel order' }).click()
  const cancelDialog = page.getByRole('dialog').filter({ hasText: 'Choose whether to cancel only or cancel and notify the customer.' })
  await cancelDialog.getByRole('button', { name: 'Cancel only' }).click()
  await expect.poll(async () => {
    const saved = await database.readOrder(order.id)
    return { canceledAt: Boolean(saved?.canceledAt), eventColor: saved?.eventColor }
  }).toEqual({ canceledAt: true, eventColor: '11' })
  await expect.poll(async () => {
    const response = await page.evaluate(() => fetch('/api/test/communications').then((result) => result.json()))
    return response
  }).toEqual({ email: [], sms: [] })

  await page.getByRole('button', { name: 'Restore' }).click()
  await expect.poll(async () => {
    const saved = await database.readOrder(order.id)
    return { canceledAt: Boolean(saved?.canceledAt), eventColor: saved?.eventColor }
  }).toEqual({ canceledAt: false, eventColor: '11' })

  await page.getByRole('button', { name: 'Cancel order' }).click()
  const cancellationEmailResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().includes('/api/email/send-cancellation'),
  )
  const cancellationSmsResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().endsWith('/api/sms/cancellation'),
  )
  await page.getByRole('dialog').filter({ hasText: 'Choose whether to cancel only or cancel and notify the customer.' }).getByRole('button', { name: 'Cancel & notify' }).click()
  expect((await cancellationEmailResponse).status()).toBe(200)
  expect((await cancellationSmsResponse).status()).toBe(200)
  await expect.poll(async () => (await database.readOrder(order.id))?.canceledAt).toBeTruthy()
  await expect.poll(async () => {
    const response = await page.evaluate(() => fetch('/api/test/communications').then((result) => result.json()))
    return response.email
  }).toEqual([
    expect.objectContaining({ email: 'customer@example.com', subject: 'VARAUKSEN PERUUTUS' }),
  ])
  await expect.poll(async () => {
    const response = await page.evaluate(() => fetch('/api/test/communications').then((result) => result.json()))
    return response.sms
  }).toEqual([
    expect.objectContaining({ phone: '+358401234567', msg: expect.stringContaining('Cancellation customer') }),
  ])
  await expect(page.getByText(/Notifications: 2 sent/)).toBeVisible()
})

test('soft-deleted orders can be restored and permanently deleted', async ({ page, database }) => {
  const order = await database.seedOrder({
    name: 'Deletion customer',
    date: dateInCurrentHelsinkiMonth(10),
    confirmed: false,
  })

  await page.goto(`/app/calendar/order/${order.id}`)
  await page.getByRole('button', { name: 'Delete' }).click()
  const deleteDialog = page.getByRole('dialog').filter({ hasText: 'This will remove the order from active planning.' })
  await deleteDialog.getByRole('button', { name: 'Delete' }).click()
  await expect.poll(async () => (await database.readOrder(order.id))?.deletedAt).toBeTruthy()
  await expect(page).toHaveURL(/\/app\/calendar$/)

  await page.locator('label.calendar-toolbar-toggle').click()
  await page.locator('.fc-event').filter({ hasText: order.name }).click()
  await page.getByRole('button', { name: 'Restore' }).click()
  await expect.poll(async () => (await database.readOrder(order.id))?.deletedAt).toBeFalsy()

  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog').filter({ hasText: 'This will remove the order from active planning.' }).getByRole('button', { name: 'Delete' }).click()
  await expect.poll(async () => (await database.readOrder(order.id))?.deletedAt).toBeTruthy()
  await page.locator('.fc-event').filter({ hasText: order.name }).click()
  await page.getByRole('button', { name: 'Delete permanently' }).click()
  const permanentDialog = page.getByRole('dialog').filter({ hasText: 'This action cannot be undone.' })
  await permanentDialog.getByRole('button', { name: 'Delete permanently' }).click()
  await expect.poll(async () => database.readOrder(order.id)).toBeNull()
})

test('confirmed deleted orders recreate Calendar ownership when restored', async ({ page, database }) => {
  const order = await database.seedOrder({
    name: 'Confirmed deletion customer',
    date: dateInCurrentHelsinkiMonth(10),
    confirmed: false,
  })

  await page.goto(`/app/calendar/order/${order.id}`)
  await page.getByRole('button', { name: 'Confirm order' }).click()
  await page.getByRole('dialog').filter({ hasText: 'Are you sure you want to confirm this order?' }).getByRole('button', { name: 'Confirm' }).click()
  await expect.poll(async () => (await database.readOrder(order.id))?.confirmed).toBe(true)
  await expect.poll(async () => (await database.readOrder(order.id))?.calendarEventIds?.main).toBeTruthy()

  await page.getByRole('button', { name: 'Cancel order' }).click()
  await page.getByRole('dialog').filter({ hasText: 'Choose whether to cancel only or cancel and notify the customer.' }).getByRole('button', { name: 'Cancel only' }).click()
  await expect.poll(async () => (await database.readOrder(order.id))?.canceledAt).toBeTruthy()

  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog').filter({ hasText: 'This will remove the order from active planning.' }).getByRole('button', { name: 'Delete' }).click()
  await expect.poll(async () => (await database.readOrder(order.id))?.deletedAt).toBeTruthy()
  await expect.poll(async () => (await database.readOrder(order.id))?.calendarEventIds?.main).toBeFalsy()

  await page.locator('label.calendar-toolbar-toggle').click()
  await page.locator('.fc-event').filter({ hasText: order.name }).click()
  await page.getByRole('button', { name: 'Restore' }).click()
  await expect.poll(async () => {
    const saved = await database.readOrder(order.id)
    return saved && {
      deletedAt: Boolean(saved.deletedAt),
      confirmed: saved.confirmed,
      main: Boolean(saved.calendarEventIds?.main),
    }
  }).toEqual({ deletedAt: false, confirmed: true, main: true })
  await expect(page.getByRole('button', { name: 'Cancel order' })).toBeVisible()
})

test('deleted confirmed orders do not expose cancellation', async ({ page, database }) => {
  const order = await database.seedOrder({
    name: 'Deleted confirmed customer',
    date: dateInCurrentHelsinkiMonth(10),
    confirmed: true,
    deletedAt: new Date(),
  })

  await page.goto(`/app/calendar/order/${order.id}`)
  await expect(page.getByRole('button', { name: 'Restore' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cancel order' })).toHaveCount(0)
})
