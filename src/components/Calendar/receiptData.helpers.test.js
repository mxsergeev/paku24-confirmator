import {
  buildReceiptDraftFromOrder,
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

})
