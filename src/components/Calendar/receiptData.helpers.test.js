import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildReceiptDraftFromOrder,
  formatDateForReceipt,
  getDocumentPricing,
  INVOICE_TERMS,
} from './receiptData.helpers'
import { makeCanonicalAppOrder } from '../../shared/testFixtures/orderFixtures.js'

afterEach(() => {
  vi.useRealTimers()
})

describe('receipt data helpers', () => {
  it('adds the invoice surcharge without changing receipt pricing', () => {
    const order = makeCanonicalAppOrder({
      duration: 1,
      boxes: { amount: 0 },
      pricingOverrides: { price: null, fees: null, boxesPrice: 0 },
    })

    const receiptPricing = getDocumentPricing(order, 'receipt')
    const invoicePricing = getDocumentPricing(order, 'invoice')

    expect(receiptPricing.price).toBe(50)
    expect(invoicePricing.price).toBe(55)
    expect(invoicePricing.fees.filter((fee) => fee.name === 'paymentTypeFee')).toHaveLength(1)
    expect(order.pricingOverrides.fees).toBeNull()
  })

  it('does not duplicate an existing positive invoice surcharge', () => {
    const order = makeCanonicalAppOrder({
      duration: 1,
      boxes: { amount: 0 },
      pricingOverrides: {
        price: null,
        fees: [{ name: 'paymentTypeFee', amount: 5 }],
        boxesPrice: 0,
      },
    })

    const pricing = getDocumentPricing(order, 'invoice')

    expect(pricing.price).toBe(55)
    expect(pricing.fees.filter((fee) => fee.name === 'paymentTypeFee')).toEqual([
      { name: 'paymentTypeFee', amount: 5 },
    ])
  })

  it('initializes receipt and invoice drafts from document-aware totals', () => {
    const order = makeCanonicalAppOrder({
      duration: 1,
      boxes: { amount: 0 },
      pricingOverrides: { price: null, fees: null, boxesPrice: 0 },
    })

    expect(buildReceiptDraftFromOrder(order, 'receipt').totalAmount).toBe('50')
    expect(buildReceiptDraftFromOrder(order, 'invoice').totalAmount).toBe('55')
  })

  it('preserves zero order and service prices in a receipt draft', () => {
    const draft = buildReceiptDraftFromOrder({
      ...makeCanonicalAppOrder(),
      pricingOverrides: { price: 0, fees: null, boxesPrice: null },
      service: { ...makeCanonicalAppOrder().service, name: 'Free service', pricePerHour: 0 },
    })

    expect(draft.totalAmount).toBe('0')
    expect(draft.unitPrice).toBe(0)
  })

  it('uses the Helsinki calendar date for the generated due date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T23:30:00.000Z'))

    expect(buildReceiptDraftFromOrder({}).dueDate).toBe('2026-01-16')
    expect(INVOICE_TERMS.paymentTermDays).toBe(14)
  })

  it('preserves explicit date-only receipt dates', () => {
    expect(formatDateForReceipt('2026-01-16', '01.01.2026')).toBe('16.01.2026')
  })
})
