import {
  buildReceiptDraftFromOrder,
  getReceiptBoxesPrice,
  getReceiptServicePrice,
  getReceiptTotal,
} from './receiptData.helpers'

describe('receipt data helpers', () => {
  it('preserves zero order and service prices in a receipt draft', () => {
    const draft = buildReceiptDraftFromOrder({
      price: 0,
      service: { name: 'Free service', pricePerHour: 0 },
    })

    expect(draft.totalAmount).toBe('0')
    expect(draft.unitPrice).toBe(0)
  })

  it('uses stored zero box price instead of derived fields', () => {
    expect(getReceiptBoxesPrice({ boxesPrice: 0 }, 123)).toBe(0)
  })

  it('uses stored zero service price instead of a fallback', () => {
    expect(getReceiptServicePrice({ service: { pricePerHour: 0 } }, 123)).toBe(0)
  })

  it('uses an explicit zero receipt total and falls back only when missing', () => {
    expect(getReceiptTotal(0, 123)).toBe(0)
    expect(getReceiptTotal(null, 123)).toBe(123)
    expect(getReceiptTotal(undefined, 123)).toBe(123)
    expect(getReceiptTotal('', 123)).toBe(123)
  })
})
