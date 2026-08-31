import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildReceiptDraftFromOrder, formatDateForReceipt } from './receiptData.helpers'

afterEach(() => {
  vi.useRealTimers()
})

describe('receipt data helpers', () => {
  it('preserves zero order and service prices in a receipt draft', () => {
    const draft = buildReceiptDraftFromOrder({
      price: 0,
      service: { name: 'Free service', pricePerHour: 0 },
    })

    expect(draft.totalAmount).toBe('0')
    expect(draft.unitPrice).toBe(0)
  })

  it('uses the Helsinki calendar date for the generated due date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T23:30:00.000Z'))

    expect(buildReceiptDraftFromOrder({}).dueDate).toBe('2026-01-16')
  })

  it('preserves explicit date-only receipt dates', () => {
    expect(formatDateForReceipt('2026-01-16', '01.01.2026')).toBe('16.01.2026')
  })
})
