import { describe, expect, it } from 'vitest'
import { calculateAutomaticFees } from './fees.js'
import {
  calculateAutomaticBoxesPrice,
  calculateAutomaticPricing,
  calculateBoxPeriod,
  calculateServiceSubtotal,
  clearPricingOverride,
  getOrderPricing,
  orderTime,
  resolveServiceHourlyRate,
  setPricingOverride,
} from './orderPricing.js'

const makeOrder = (overrides = {}) => ({
  date: new Date('2026-03-10T07:00:00.000Z'),
  duration: 2,
  service: { id: '1', pricePerHour: 50 },
  paymentType: { id: '1', fee: 0 },
  address: { street: '', index: '', city: 'Helsinki', floor: 0, elevator: false },
  destination: { street: '', index: '', city: 'Helsinki', floor: 0, elevator: false },
  extraAddresses: [],
  boxes: {
    deliveryDate: '2026-03-12',
    returnDate: '2026-03-20',
    amount: 0,
  },
  pricingOverrides: { price: null, fees: null, boxesPrice: null },
  ...overrides,
})

describe('automatic pricing', () => {
  it('calculates service and boxes prices from current booking data', () => {
    const order = makeOrder({
      duration: 2,
      service: { id: '1', pricePerHour: 999 },
      boxes: { deliveryDate: '2026-03-12', returnDate: '2026-03-20', amount: 10 },
    })

    expect(resolveServiceHourlyRate(order)).toBe(50)
    expect(calculateServiceSubtotal(order)).toBe(100)
    expect(calculateAutomaticBoxesPrice(order)).toBe(52)
    expect(calculateAutomaticPricing(order)).toEqual({ price: 152, fees: [], boxesPrice: 52 })
  })

  it('uses Helsinki calendar days for box periods', () => {
    expect(calculateBoxPeriod('2026-03-12', '2026-03-20')).toBe(8)
    expect(calculateBoxPeriod('2026-03-28T22:00:00Z', '2026-04-05T21:00:00Z')).toBe(8)
    expect(calculateBoxPeriod('2026-03-28T22:00:00Z', '2026-03-29T00:30:00Z')).toBe(7)
  })

  it('handles empty, zero, and invalid box amounts without charging boxes', () => {
    for (const amount of [-1, '-1', NaN, Infinity, 'not-a-number', true, [], {}]) {
      expect(
        calculateAutomaticBoxesPrice(
          makeOrder({
            boxes: { deliveryDate: '2026-03-12', returnDate: '2026-03-20', amount },
          }),
        ),
      ).toBe(0)
    }
  })

  it('does not price boxes until both box dates are available', () => {
    expect(
      calculateAutomaticBoxesPrice(
        makeOrder({ boxes: { deliveryDate: null, returnDate: null, amount: 10 } }),
      ),
    ).toBe(0)
  })

  it('rejects an invalid box date when boxes are charged', () => {
    expect(() =>
      calculateAutomaticBoxesPrice(
        makeOrder({
          boxes: { deliveryDate: '2026-02-29', returnDate: '2026-03-20', amount: 1 },
        }),
      ),
    ).toThrow('Invalid boxes.deliveryDate')
  })

  it('calculates automatic fees independently of box dates', () => {
    const order = makeOrder({
      boxes: { amount: 10, deliveryDate: 'not-a-date', returnDate: 'also-not-a-date' },
    })

    expect(calculateAutomaticFees(order)).toEqual([])
  })

  it('uses an embedded service price for an unknown service', () => {
    const order = makeOrder({ service: { id: 'unknown', pricePerHour: 33 } })
    expect(resolveServiceHourlyRate(order)).toBe(33)
    expect(calculateServiceSubtotal(order)).toBe(66)
    expect(resolveServiceHourlyRate(makeOrder({ service: { id: 'unknown', pricePerHour: 'nope' } }))).toBe(0)
  })
})

describe('effective pricing and manual overrides', () => {
  it('uses automatic values when every override is null', () => {
    const order = makeOrder({
      boxes: { deliveryDate: '2026-03-12', returnDate: '2026-03-20', amount: 10 },
    })

    expect(getOrderPricing(order)).toEqual(calculateAutomaticPricing(order))
  })

  it('supports manual price zero, empty fees, and manual boxes price zero', () => {
    const order = makeOrder({
      pricingOverrides: { price: 0, fees: [], boxesPrice: 0 },
    })

    expect(getOrderPricing(order)).toEqual({ price: 0, fees: [], boxesPrice: 0 })
  })

  it('keeps component overrides independent', () => {
    const order = makeOrder({
      pricingOverrides: {
        price: null,
        fees: [{ name: 'customFee', amount: 20 }],
        boxesPrice: 12,
      },
    })

    expect(getOrderPricing(order)).toEqual({
      price: 100,
      fees: [{ name: 'customFee', amount: 20 }],
      boxesPrice: 12,
    })
  })

  it('sets and clears overrides without mutating the order', () => {
    const order = makeOrder()
    const changed = setPricingOverride(order, 'price', 220)
    const cleared = clearPricingOverride(changed, 'price')

    expect(order.pricingOverrides.price).toBeNull()
    expect(changed.pricingOverrides.price).toBe(220)
    expect(cleared.pricingOverrides.price).toBeNull()
  })

  it('recalculates automatic pricing after a booking change', () => {
    const order = makeOrder({ duration: 2 })
    const changed = { ...order, duration: 3 }

    expect(getOrderPricing(order).price).toBe(100)
    expect(getOrderPricing(changed).price).toBe(150)
  })
})

describe('catalog lookup and Helsinki time', () => {
  it('formats absolute instants in Europe/Helsinki', () => {
    expect(orderTime(makeOrder({ date: '2026-01-15T07:00:00.000Z' }))).toBe('09:00')
    expect(orderTime(makeOrder({ date: '2026-06-15T06:00:00.000Z' }))).toBe('09:00')
  })

  it('uses the local payment fee for an unknown payment type', () => {
    expect(calculateAutomaticFees(makeOrder({ paymentType: { id: 'unknown', fee: 7 } }))).toEqual([
      { name: 'paymentTypeFee', label: 'MAKSUTAPALISÄ', amount: 5 },
    ])
  })
})
