import { test, expect } from './fixtures.js'

function dateInVisibleMonth(monthHeading, day) {
  const [monthName, yearValue] = monthHeading.split(' ')
  const month = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ].indexOf(monthName)
  return new Date(Date.UTC(Number(yearValue), month, day, 10, 0, 0)).toISOString()
}

test('calendar loads box events and supports every calendar view', async ({ page, database }) => {
  await page.goto('/app/calendar')
  const monthHeading = await page.getByRole('heading', { level: 2 }).textContent()
  const order = await database.seedOrder({
    name: 'Calendar views customer',
    date: dateInVisibleMonth(monthHeading, 10),
    boxes: {
      deliveryDate: dateInVisibleMonth(monthHeading, 11),
      returnDate: dateInVisibleMonth(monthHeading, 12),
      amount: 10,
    },
  })

  await page.reload()
  await expect(page.getByRole('toolbar', { name: 'Calendar options' })).toBeVisible()
  await expect(page.locator('.fc-event').filter({ hasText: order.name })).toHaveCount(3)

  await page.getByRole('tab', { name: 'week view' }).click()
  await expect(page.locator('.fc-timegrid')).toBeVisible()

  await page.getByRole('tab', { name: 'list view' }).click()
  await expect(page.locator('.fc-list')).toBeVisible()

  await page.getByRole('tab', { name: 'year view' }).click()
  await expect(page.locator('.fc-multimonth')).toBeVisible()

  await page.getByRole('tab', { name: 'month view' }).click()
  await expect(page.locator('.fc-daygrid')).toBeVisible()
  await page.reload()
  await expect(page.locator('.fc-daygrid')).toBeVisible()
})

test('calendar hides deleted orders until the deleted toggle is enabled', async ({ page, database }) => {
  await page.goto('/app/calendar')
  const monthHeading = await page.getByRole('heading', { level: 2 }).textContent()
  await database.seedOrder({
    name: 'Active calendar customer',
    date: dateInVisibleMonth(monthHeading, 10),
  })
  await database.seedOrder({
    name: 'Deleted calendar customer',
    date: dateInVisibleMonth(monthHeading, 11),
    deletedAt: new Date().toISOString(),
  })

  await page.reload()
  await expect(page.locator('.fc-event').filter({ hasText: 'Active calendar customer' })).toBeVisible()
  await expect(page.locator('.fc-event').filter({ hasText: 'Deleted calendar customer' })).toHaveCount(0)

  await page.locator('label.calendar-toolbar-toggle').click()
  await expect(page.locator('.fc-event').filter({ hasText: 'Deleted calendar customer' })).toBeVisible()
})
