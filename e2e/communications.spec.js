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
  const order = await database.seedOrder({
    name: 'Communication customer',
    date: dateInCurrentHelsinkiMonth(10),
    confirmed: true,
  })

  await page.goto(`/app/calendar/order/${order.id}`)
  await page.evaluate(async () => {
    const response = await fetch('/api/test/communications', { method: 'DELETE' })
    if (!response.ok) throw new Error(`Could not reset provider fake: ${response.status}`)
  })
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
  await expect.poll(async () => {
    const response = await page.evaluate(() => fetch('/api/test/communications').then((result) => result.json()))
    return response.email
  }).toEqual([
    expect.objectContaining({ email: 'customer@example.com', html: true }),
  ])

  const smsResponse = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().endsWith('/api/sms'),
  )
  await page.getByRole('button', { name: 'Send SMS' }).click()
  expect((await smsResponse).status()).toBe(200)
  await expect.poll(async () => {
    const response = await page.evaluate(() => fetch('/api/test/communications').then((result) => result.json()))
    return response.sms
  }).toEqual(expect.arrayContaining([
    expect.objectContaining({ phone: '+358401234567', msg: expect.stringContaining('Communication customer') }),
  ]))
  await expect(page.getByText(/SMS to phonenumber \+358401234567 added to the queue/)).toBeVisible()
})
