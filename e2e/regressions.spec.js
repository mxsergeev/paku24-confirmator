import { test, expect } from './fixtures.js'

test('direct order URL outside the visible month loads the exact order', async ({ page, database }) => {
  test.fail(true, 'Known Phase 3 regression: routed orders are currently resolved from the range list')
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
})

test('editing a sparse order without boxes does not crash', async ({ page, database }) => {
  test.fail(true, 'Known Phase 4 regression: Boxes currently assumes order.boxes exists')
  const now = new Date()
  const visibleDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10, 10, 0, 0))
  const order = await database.seedOrder({ date: visibleDate.toISOString(), boxes: undefined })

  await page.goto(`/app/calendar/order/${order.id}`)
  await page.getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByRole('heading', { name: 'Edit order' })).toBeVisible()
})

test('New Order exposes the browser-level pricing location', async ({ page }) => {
  await page.goto('/app/calendar')
  await page.getByRole('button', { name: 'Create order' }).click()
  await expect(page.getByRole('heading', { name: 'New Order', exact: true })).toBeVisible()
  await expect(page.getByLabel('Manual price override')).toBeVisible()
})
