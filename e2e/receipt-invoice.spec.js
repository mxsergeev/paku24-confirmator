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

async function openDocument(page, buttonName) {
  await page.getByRole('button', { name: buttonName }).click()
  const editor = page.getByRole('dialog').filter({ hasText: /data/ }).last()
  const documentType = buttonName === 'Create invoice' ? 'Invoice data' : 'Receipt data'
  await expect(editor.getByRole('heading', { name: documentType, exact: true })).toBeVisible()
  await expect(editor.getByRole('button', { name: 'Open document' })).toBeVisible()
  const popupPromise = page.waitForEvent('popup')
  await editor.getByRole('button', { name: 'Open document' }).click()
  const documentPage = await popupPromise
  await documentPage.waitForLoadState('domcontentloaded')
  return { documentPage, editor }
}

test('receipt and invoice open in new tabs and support export/send actions', async ({ page, database }) => {
  const order = await database.seedOrder({
    name: 'Document customer',
    date: dateInCurrentHelsinkiMonth(10),
    confirmed: true,
    boxes: {
      deliveryDate: dateInCurrentHelsinkiMonth(11),
      returnDate: dateInCurrentHelsinkiMonth(12),
      amount: 10,
    },
  })

  await page.goto(`/app/calendar/order/${order.id}`)
  await expect(page.getByText('Document customer', { exact: true })).toBeVisible()
  const { documentPage: receiptPage } = await openDocument(page, 'Create receipt')
  await expect(receiptPage.getByText('KUITTI', { exact: true })).toBeVisible()
  await expect(receiptPage.locator('#cart-receipt')).toContainText('Document customer')

  const receiptDownload = receiptPage.waitForEvent('download')
  await receiptPage.getByRole('button', { name: 'Download' }).click()
  expect((await receiptDownload).suggestedFilename()).toMatch(/^Receipt .*\.pdf$/)

  const receiptResponse = receiptPage.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && response.url().includes('/api/email/send-receipt'),
  )
  await receiptPage.getByRole('button', { name: 'Send' }).click()
  expect((await receiptResponse).status()).toBe(200)
  await expect(receiptPage.getByText(/Receipt sent to customer@example.com/)).toBeVisible()
  await receiptPage.close()

  const { documentPage: invoicePage } = await openDocument(page, 'Create invoice')
  await expect(invoicePage.getByText('LASKU', { exact: true })).toBeVisible()
  await expect(invoicePage.locator('#cart-receipt')).toContainText('Document customer')

  const invoiceDownload = invoicePage.waitForEvent('download')
  await invoicePage.getByRole('button', { name: 'Download' }).click()
  expect((await invoiceDownload).suggestedFilename()).toMatch(/^Invoice .*\.pdf$/)

  const invoiceRequest = invoicePage.waitForRequest(
    (request) =>
      request.method() === 'POST' && request.url().includes('/api/email/send-receipt'),
  )
  const invoiceResponse = invoicePage.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && response.url().includes('/api/email/send-receipt'),
  )
  await invoicePage.getByRole('button', { name: 'Send' }).click()
  expect((await invoiceResponse).status()).toBe(200)
  expect((await invoiceRequest).postDataJSON()).toMatchObject({
    documentType: 'invoice',
    email: 'customer@example.com',
  })
  await expect(invoicePage.getByText(/Invoice sent to customer@example.com/)).toBeVisible()
  await invoicePage.close()
})
