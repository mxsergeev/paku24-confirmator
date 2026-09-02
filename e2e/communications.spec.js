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

test('confirmed orders send email and SMS through the communication actions', async ({ page, database }) => {
  let smsPayload
  await page.route('**/api/sms', async (route) => {
    smsPayload = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'SMS sent.' }),
    })
  })
  const order = await database.seedOrder({
    name: 'Communication customer',
    date: dateInCurrentHelsinkiMonth(10),
    confirmed: true,
  })

  await page.goto(`/app/calendar/order/${order.id}`)
  await expect(page.getByText('Communication customer', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send email' })).toBeEnabled()
  const emailResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().includes('/api/email/send-confirmation'),
  )
  await page.getByRole('button', { name: 'Send email' }).click()
  expect((await emailResponse).status()).toBe(200)
  await expect(page.getByText(/Email sent to customer@example.com/)).toBeVisible()

  const smsResponse = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().endsWith('/api/sms'),
  )
  await page.getByRole('button', { name: 'Send SMS' }).click()
  expect((await smsResponse).status()).toBe(200)
  expect(smsPayload).toEqual({ orderId: order.id })
  await expect(page.getByText('SMS sent.')).toBeVisible()
})
