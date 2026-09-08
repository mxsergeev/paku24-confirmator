import { readFile } from 'node:fs/promises'
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

async function openDocument(page, buttonName, { totalAmount } = {}) {
  await page.getByRole('button', { name: buttonName }).click()
  const editor = page.getByRole('dialog').filter({ hasText: /data/ }).last()
  const documentType = buttonName === 'Create invoice' ? 'Invoice data' : 'Receipt data'
  await expect(editor.getByRole('heading', { name: documentType, exact: true })).toBeVisible()
  await expect(editor.getByRole('button', { name: 'Open document' })).toBeVisible()
  if (totalAmount !== undefined) {
    const total = editor.locator('input').nth(2)
    await total.fill(totalAmount)
    await total.blur()
    await expect(total).toHaveValue(totalAmount)
  }
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
    duration: 1,
    confirmed: true,
    boxes: {
      deliveryDate: dateInCurrentHelsinkiMonth(11),
      returnDate: dateInCurrentHelsinkiMonth(12),
      amount: 0,
    },
    pricingOverrides: {
      price: null,
      fees: [
        { name: 'holidayFee', amount: 15 },
        { name: 'weekendFee', amount: 15 },
        { name: 'startOrEndOfMonthFee', amount: 15 },
        { name: 'paymentTypeFee', label: 'MAKSUTAPALISÄ', amount: 5 },
        { name: 'manualFee', label: 'Manual fee', amount: 20 },
      ],
      boxesPrice: 0,
    },
  })

  await page.goto(`/app/calendar/order/${order.id}`)
  await expect(page.getByText('Document customer', { exact: true })).toBeVisible()
  const { documentPage: receiptPage } = await openDocument(page, 'Create receipt')
  await expect(receiptPage.getByText('KUITTI', { exact: true })).toBeVisible()
  await expect(receiptPage.locator('#cart-receipt')).toContainText('Document customer')
  await expect(receiptPage.locator('.receipt-info-service').filter({ hasText: 'Maksutapalisä' })).toHaveCount(1)
  await expect(receiptPage.locator('.receipt-summary-row').nth(2)).toContainText('120,00')

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
  await expect(invoicePage.locator('.receipt-summary-row').nth(2)).toContainText('120,00')
  await expect(invoicePage.getByText('Veroton yhteensä', { exact: true })).toBeVisible()
  await expect(invoicePage.getByText('ALV 25,5 %', { exact: true })).toBeVisible()
  await expect(invoicePage.getByText('Maksettava yhteensä', { exact: true })).toBeVisible()
  const invoiceSurchargeRows = invoicePage
    .locator('.receipt-info-service')
    .filter({ hasText: 'Maksutapalisä' })
  await expect(invoiceSurchargeRows).toHaveCount(1)
  await expect(invoiceSurchargeRows.first()).toContainText('5,00')
  await expect(invoicePage.locator('.receipt-info-service')).toHaveCount(6)
  await expect(invoicePage.getByText('Hinnan oikaisu', { exact: true })).toHaveCount(0)
  for (const heading of [
    'Tuote tai palvelu',
    'Määrä',
    'Yksikköhinta',
    'Veroton',
    'ALV',
    'Yhteensä',
  ]) {
    await expect(invoicePage.locator('.receipt-info-header-string')).toContainText(heading)
  }

  await expect(invoicePage.getByText('Huomautusaika', { exact: true })).toBeVisible()
  await expect(invoicePage.getByText('Huomatusaika', { exact: true })).toHaveCount(0)
  await expect(invoicePage.getByText('Posti', { exact: true })).toHaveCount(0)
  await expect(invoicePage.locator('.receipt-bank-info')).toContainText('Tilisiirto / Girering')
  await expect(invoicePage.locator('.receipt-bank-info')).toContainText(
    'Maksu välitetään saajalle maksujenvälityksen yleisten ehtojen mukaisesti ja vain maksajan ilmoittaman tilinumeron perusteella.',
  )
  await expect(invoicePage.locator('.receipt-bank-info')).toContainText(
    'Betalningen förmedlas till mottagaren enligt de allmänna villkoren för betalningsförmedling och endast på basis av det kontonummer som betalaren angett.',
  )
  const invoiceNumber = (
    await invoicePage.locator('.receipt-meta-grid span').nth(3).textContent()
  ).trim()
  await expect(invoicePage.locator('.receipt-bank-table')).toContainText(`Lasku ${invoiceNumber}`)

  const invoiceDownload = invoicePage.waitForEvent('download')
  await invoicePage.getByRole('button', { name: 'Download' }).click()
  const downloadedInvoice = await invoiceDownload
  expect(downloadedInvoice.suggestedFilename()).toMatch(/^Invoice .*\.pdf$/)
  const invoicePdfPath = await downloadedInvoice.path()
  expect(invoicePdfPath).toBeTruthy()
  const invoicePdfText = (await readFile(invoicePdfPath)).toString('latin1')
  const mediaBoxMatch = invoicePdfText.match(/\/MediaBox\s*\[\s*([^\]]+)\]/)
  expect(mediaBoxMatch).not.toBeNull()
  const mediaBox = mediaBoxMatch[1].trim().split(/\s+/).map(Number)
  expect(mediaBox[2]).toBeGreaterThan(0)
  expect(mediaBox[3]).toBeGreaterThan(mediaBox[2])
  expect(mediaBox[3] / mediaBox[2]).toBeCloseTo(1.4142, 2)
  expect((invoicePdfText.match(/\/Type\s*\/Page\b/g) || []).length).toBe(1)

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

test('receipt can be opened and downloaded without email, but cannot be sent', async ({ page, database }) => {
  const order = await database.seedOrder({
    name: 'No email customer',
    email: '',
    confirmed: true,
    date: dateInCurrentHelsinkiMonth(13),
  })

  await page.goto(`/app/calendar/order/${order.id}`)
  const { documentPage } = await openDocument(page, 'Create receipt')
  await expect(documentPage.getByText('KUITTI', { exact: true })).toBeVisible()

  const download = documentPage.waitForEvent('download')
  await documentPage.getByRole('button', { name: 'Download' }).click()
  expect((await download).suggestedFilename()).toMatch(/^Receipt .*\.pdf$/)

  const emailRequests = []
  documentPage.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/api/email/send-receipt')) {
      emailRequests.push(request)
    }
  })
  await documentPage.getByRole('button', { name: 'Send' }).click()
  await expect(documentPage.getByText('Email is missing in receipt data.')).toBeVisible()
  expect(emailRequests).toHaveLength(0)
  await documentPage.close()
})
