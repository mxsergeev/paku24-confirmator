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
  const cancellationEmailPayloads = []
  const cancellationSmsPayloads = []
  await page.route('**/api/email/send-cancellation', async (route) => {
    cancellationEmailPayloads.push(route.request().postDataJSON())
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Cancellation email sent.' }),
    })
  })
  await page.route('**/api/sms/cancellation', async (route) => {
    cancellationSmsPayloads.push(route.request().postDataJSON())
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Cancellation SMS sent.' }),
    })
  })

  const order = await database.seedOrder({
    name: 'Cancellation customer',
    date: dateInCurrentHelsinkiMonth(10),
    confirmed: true,
  })

  await page.goto(`/app/calendar/order/${order.id}`)
  await expect(page.getByText('Cancellation customer', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel order' }).click()
  const cancelDialog = page.getByRole('dialog').filter({ hasText: 'Choose whether to cancel only or cancel and notify the customer.' })
  await cancelDialog.getByRole('button', { name: 'Cancel only' }).click()
  await expect.poll(async () => (await database.readOrder(order.id))?.canceledAt).toBeTruthy()
  expect(cancellationEmailPayloads).toEqual([])
  expect(cancellationSmsPayloads).toEqual([])

  await page.getByRole('button', { name: 'Restore' }).click()
  await expect.poll(async () => (await database.readOrder(order.id))?.canceledAt).toBeFalsy()

  await page.getByRole('button', { name: 'Cancel order' }).click()
  await page.getByRole('dialog').filter({ hasText: 'Choose whether to cancel only or cancel and notify the customer.' }).getByRole('button', { name: 'Cancel & notify' }).click()
  await expect.poll(async () => (await database.readOrder(order.id))?.canceledAt).toBeTruthy()
  await expect.poll(() => cancellationEmailPayloads).toEqual([{ orderId: order.id }])
  await expect.poll(() => cancellationSmsPayloads).toEqual([{ orderId: order.id }])
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
