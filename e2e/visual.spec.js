import { test, expect } from './fixtures.js'

const DESKTOP_VIEWPORT = { width: 1280, height: 1200 }
const MOBILE_VIEWPORT = { width: 390, height: 1200 }

async function openNewOrder(page, viewport) {
  await page.setViewportSize(viewport)
  await page.goto('/app/calendar')
  await page.evaluate(() => {
    const draft = JSON.parse(window.localStorage.getItem('new_order') || '{}')
    window.localStorage.setItem(
      'new_order',
      JSON.stringify({ ...draft, id: null, date: '2026-01-15T08:00:00.000Z' }),
    )
  })
  await page.reload()
  await page.getByRole('button', { name: 'Create order' }).click()

  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'New Order', exact: true }) })
  await expect(dialog).toBeVisible()
  return dialog
}

function newOrderMasks(dialog) {
  return [
    dialog.locator('input').first(),
    dialog
      .locator('.calendar-new-order-flex-container > .flex-100-space-between > div > div')
      .first(),
  ]
}

test('New Order desktop layout remains stable', async ({ page }) => {
  const dialog = await openNewOrder(page, DESKTOP_VIEWPORT)
  const addOrder = dialog.getByRole('button', { name: 'Add order' })
  await expect(addOrder).toBeVisible()

  await expect(dialog).toHaveScreenshot('new-order-desktop.png', {
    animations: 'disabled',
    caret: 'hide',
    mask: newOrderMasks(dialog),
  })
})

test('Edit Order desktop layout remains stable', async ({ page, database }) => {
  const order = await database.seedOrder({
    name: 'Visual edit customer',
    date: '2026-01-15T10:00:00.000Z',
  })

  await page.setViewportSize(DESKTOP_VIEWPORT)
  await page.goto(`/app/calendar/order/${order.id}`)
  await page.getByRole('button', { name: 'Edit' }).click()

  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Edit order', exact: true }) })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveScreenshot('edit-order-desktop.png', {
    animations: 'disabled',
    caret: 'hide',
  })
})

test('Order details desktop layout remains stable', async ({ page, database }) => {
  const order = await database.seedOrder({
    name: 'Visual details customer',
    date: '2026-01-15T10:00:00.000Z',
    confirmed: true,
  })

  await page.setViewportSize(DESKTOP_VIEWPORT)
  await page.goto(`/app/calendar/order/${order.id}`)

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveScreenshot('order-details-desktop.png', {
    animations: 'disabled',
    caret: 'hide',
  })
})

test('New Order mobile layout remains stable', async ({ page }) => {
  const dialog = await openNewOrder(page, MOBILE_VIEWPORT)
  const addOrder = dialog.getByRole('button', { name: 'Add order' })
  await expect(addOrder).toBeVisible()

  await expect(dialog).toHaveScreenshot('new-order-mobile.png', {
    animations: 'disabled',
    caret: 'hide',
    mask: newOrderMasks(dialog),
  })
})
