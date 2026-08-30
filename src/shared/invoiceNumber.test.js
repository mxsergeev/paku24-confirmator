import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildStableInvoiceNumber } from './invoiceNumber.js'
import { buildStableInvoiceNumber as buildBackendStableInvoiceNumber } from '../../backend/utils/invoiceNumber.js'

const order = {
  date: '2026-04-10T08:00:00.000Z',
  id: 'order-1',
  name: 'Customer',
  email: 'customer@example.com',
}

afterEach(() => {
  vi.useRealTimers()
})

describe('stable invoice numbers', () => {
  it('returns an existing invoice number unchanged', () => {
    expect(buildStableInvoiceNumber(order, '  INV-42  ')).toBe('INV-42')
  })

  it('builds a stable number from a valid order date', () => {
    const invoiceNumber = buildStableInvoiceNumber(order)

    expect(invoiceNumber).toMatch(/^20260410\d{4}$/)
    expect(buildStableInvoiceNumber(order)).toBe(invoiceNumber)
  })

  it('keeps the backend default strict for invalid or missing dates', () => {
    expect(() => buildBackendStableInvoiceNumber({ date: 'not-a-date' })).toThrow(
      'Cannot generate invoice number: order.date is missing or invalid. Provide a valid date for the order.',
    )
    expect(() => buildBackendStableInvoiceNumber({})).toThrow(
      'Cannot generate invoice number: order.date is missing or invalid. Provide a valid date for the order.',
    )
  })

  it('allows the frontend fallback to use today for malformed orders', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-30T12:00:00.000Z'))

    expect(buildStableInvoiceNumber({ id: 'missing-date' }, '', { invalidDate: 'today' })).toMatch(
      /^20260830\d{4}$/,
    )
  })
})
