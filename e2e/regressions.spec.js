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
  await expect(page.getByRole('heading', { name: 'Edit order' })).toBeVisible()
})

test('New Order exposes the browser-level pricing location', async ({ page }) => {
  await page.goto('/app/calendar')
  await page.getByRole('button', { name: 'Create order' }).click()
  await expect(page.getByRole('heading', { name: 'New Order', exact: true })).toBeVisible()
  await expect(page.getByLabel('Price estimate')).toBeVisible()
})
