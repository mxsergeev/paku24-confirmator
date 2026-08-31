import { describe, expect, it } from 'vitest'
import services from '../data/services.json' with { type: 'json' }
import { calculateAutomaticFees } from './fees.js'
import {
  calculateAutomaticBoxesPrice,
  calculateAutomaticPricing,
  calculateBoxPeriod,
  getEventColor,
  materializeActivePricing,
  orderTime,
  resolveActiveBoxesPrice,
  resolveActiveFees,
  resolveActivePrice,
  resolveActivePricing,
  calculateServiceSubtotal,
  resolveServiceHourlyRate,
} from './orderPricing.js'

const makeOrder = (overrides = {}) => ({
  date: new Date('2026-03-10T07:00:00.000Z'),
  duration: 2,
  service: { id: '1', pricePerHour: 50, eventColor: 'embedded-color' },
  paymentType: { id: '1', fee: 0 },
  address: { street: '', floor: 0, elevator: false },
  destination: { street: '', floor: 0, elevator: false },
  extraAddresses: [],
  boxes: {
    deliveryDate: '2026-03-12',
    returnDate: '2026-03-20',
    amount: 0,
  },
  initialSnapshot: null,
  pricing: {
    source: { price: 'auto', fees: 'auto', boxesPrice: 'auto' },
    manual: { price: null, fees: null, boxesPrice: null },
  },
  price: 999,
  fees: [{ name: 'weekendFee', amount: 15 }],
  boxesPrice: 999,
  ...overrides,
})

describe('automatic pricing', () => {
  it('calculates service and boxes prices with finite numeric values', () => {
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

  it('rejects impossible date-only box values at the pricing boundary', () => {
    expect(() =>
      calculateAutomaticBoxesPrice(
        makeOrder({
          boxes: { deliveryDate: '2026-02-29', returnDate: '2026-03-20', amount: 1 },
        }),
      ),
    ).toThrow('Invalid boxes.deliveryDate')
  })

  it.each([
    ['normal period', '2026-03-12T07:00:00Z', '2026-03-20T07:00:00Z', 8],
    // The spring transition removes one elapsed hour. Calendar dates still
    // span eight chargeable days.
    ['Helsinki spring DST', '2026-03-28T22:00:00Z', '2026-04-05T21:00:00Z', 8],
    // The autumn transition adds one elapsed hour. With endpoints near
    // midnight, elapsed blocks still undercount the local calendar days.
    ['Helsinki autumn DST', '2026-10-25T20:30:00Z', '2026-11-01T22:00:00Z', 8],
    ['date-only endpoints', '2026-03-12', '2026-03-20', 8],
    [
      'instants sharing a local calendar date',
      '2026-03-28T22:00:00Z',
      '2026-03-29T00:30:00Z',
      7,
    ],
  ])('uses Helsinki calendar-day difference for %s', (_name, deliveryDate, returnDate, expected) => {
    expect(calculateBoxPeriod(deliveryDate, returnDate)).toBe(expected)
  })

  it.each([-1, '-1', NaN, Infinity, 'not-a-number', true, [], {}])(
    'neutralizes invalid or negative box amount %p',
    (amount) => {
      expect(
        calculateAutomaticBoxesPrice(
          makeOrder({
            boxes: { deliveryDate: '2026-03-12', returnDate: '2026-03-20', amount },
          }),
        ),
      ).toBe(0)
    },
  )

  it('uses embedded service price only for an unknown service and neutralizes invalid values', () => {
    expect(resolveServiceHourlyRate(makeOrder({ service: { id: 'unknown', pricePerHour: 33 } }))).toBe(33)
    expect(calculateServiceSubtotal(makeOrder({ service: { id: 'unknown', pricePerHour: 33 } }))).toBe(66)
    expect(resolveServiceHourlyRate(makeOrder({ service: { id: 'unknown', pricePerHour: 'nope' } }))).toBe(0)
    expect(resolveServiceHourlyRate(makeOrder({ service: { id: 'unknown', pricePerHour: ' ' } }))).toBe(0)
    expect(resolveServiceHourlyRate(makeOrder({ service: { id: 'unknown', pricePerHour: Infinity } }))).toBe(0)
  })

  it('calculates automatic fees without reading box dates', () => {
    const order = makeOrder({
      boxes: { amount: 10, deliveryDate: 'not-a-date', returnDate: 'also-not-a-date' },
    })

    expect(resolveActiveFees(order)).toEqual([])
  })

  it('uses an embedded payment fee for an unknown payment type', () => {
    expect(calculateAutomaticFees(makeOrder({ paymentType: { id: 'unknown', fee: 7 } }))).toEqual([
      { name: 'paymentTypeFee', label: 'MAKSUTAPALISÄ', amount: 5 },
    ])
  })

  it('keeps automatic estimates independent from stored and manual projections', () => {
    const order = makeOrder({
      price: 700,
      fees: [{ name: 'weekendFee', amount: 15 }],
      boxesPrice: 800,
      pricing: {
        source: { price: 'manual', fees: 'manual', boxesPrice: 'manual' },
        manual: { price: 600, fees: [{ name: 'nightFee', amount: 20 }], boxesPrice: 500 },
      },
    })

    expect(calculateAutomaticPricing(order)).toEqual({ price: 100, fees: [], boxesPrice: 0 })
  })
})

describe('active pricing resolution', () => {
  it('resolves initial values, including zero and empty arrays', () => {
    const order = makeOrder({
      initialSnapshot: { price: 0, fees: [], boxesPrice: 0 },
      pricing: {
        source: { price: 'initial', fees: 'initial', boxesPrice: 'initial' },
        manual: { price: null, fees: null, boxesPrice: null },
      },
    })

    expect(resolveActivePricing(order)).toEqual({ price: 0, fees: [], boxesPrice: 0 })
  })

  it('normalizes numeric initial and manual values and fee amounts', () => {
    const initial = makeOrder({
      initialSnapshot: {
        price: '12',
        fees: [{ name: 'initial', amount: '3' }],
        boxesPrice: '4',
      },
      pricing: {
        source: { price: 'initial', fees: 'initial', boxesPrice: 'initial' },
        manual: { price: null, fees: null, boxesPrice: null },
      },
    })

    expect(resolveActivePricing(initial)).toEqual({
      price: 12,
      fees: [{ name: 'initial', amount: 3 }],
      boxesPrice: 4,
    })

    const manual = makeOrder({
      pricing: {
        source: { price: 'manual', fees: 'manual', boxesPrice: 'manual' },
        manual: { price: '5', fees: [{ name: 'manual', amount: '6' }], boxesPrice: '7' },
      },
    })

    expect(resolveActivePricing(manual)).toEqual({
      price: 5,
      fees: [{ name: 'manual', amount: 6 }],
      boxesPrice: 7,
    })
  })

  it('resolves manual zero and empty fees as valid values', () => {
    const order = makeOrder({
      pricing: {
        source: { price: 'manual', fees: 'manual', boxesPrice: 'manual' },
        manual: { price: 0, fees: [], boxesPrice: 0 },
      },
    })

    expect(resolveActivePricing(order)).toEqual({ price: 0, fees: [], boxesPrice: 0 })
  })

  it('includes active manual components in an automatic total', () => {
    const order = makeOrder({
      pricing: {
        source: { price: 'auto', fees: 'manual', boxesPrice: 'manual' },
        manual: { price: null, fees: [{ name: 'custom', amount: 20 }], boxesPrice: 12 },
      },
    })

    expect(resolveActivePrice(order)).toBe(132)
    expect(resolveActiveFees(order)).toEqual([{ name: 'custom', amount: 20 }])
    expect(resolveActiveBoxesPrice(order)).toBe(12)
  })

  it('gives a manual total precedence over calculated components', () => {
    const order = makeOrder({
      pricing: {
        source: { price: 'manual', fees: 'manual', boxesPrice: 'manual' },
        manual: { price: 1, fees: [{ name: 'custom', amount: 20 }], boxesPrice: 12 },
      },
    })

    expect(resolveActivePrice(order)).toBe(1)
  })

  it('throws clear errors for impossible initial and manual sources', () => {
    expect(() => resolveActiveFees(makeOrder({ pricing: {
      source: { price: 'auto', fees: 'initial', boxesPrice: 'auto' },
      manual: { price: null, fees: null, boxesPrice: null },
    } }))).toThrow(/initial fees.*missing/i)

    expect(() => resolveActivePrice(makeOrder({ pricing: {
      source: { price: 'manual', fees: 'auto', boxesPrice: 'auto' },
      manual: { price: null, fees: null, boxesPrice: null },
    } }))).toThrow(/manual price.*missing/i)

    expect(() => resolveActivePrice(makeOrder({ pricing: {
      source: { price: 'bogus', fees: 'auto', boxesPrice: 'auto' },
      manual: { price: null, fees: null, boxesPrice: null },
    } }))).toThrow(/invalid pricing source/i)
  })

  it('materializes active projections without mutating the input', () => {
    const order = makeOrder()
    const originalFees = order.fees
    const originalPrice = order.price
    const originalBoxesPrice = order.boxesPrice
    const materialized = materializeActivePricing(order)

    expect(materialized).not.toBe(order)
    expect(materialized.price).toBe(100)
    expect(materialized.fees).toEqual([])
    expect(materialized.boxesPrice).toBe(0)
    expect(order.price).toBe(originalPrice)
    expect(order.fees).toBe(originalFees)
    expect(order.boxesPrice).toBe(originalBoxesPrice)
    expect(order.fees).not.toBe(materialized.fees)
  })
})

describe('catalog lookup and Helsinki time', () => {
  it('looks up services by ID and falls back to embedded unknown-service fields', () => {
    expect(getEventColor(makeOrder({ service: { id: '1', eventColor: 'wrong' } }))).toBe(
      services[0].eventColor,
    )
    expect(getEventColor(makeOrder({ service: { id: 'unknown', eventColor: 'embedded' } }))).toBe(
      'embedded',
    )
    expect(getEventColor(makeOrder({ eventColor: 'explicit', service: { id: '1' } }))).toBe('explicit')
    expect(getEventColor(makeOrder({ service: { id: 'unknown', eventColor: null } }))).toBeNull()
  })

  it('formats absolute instants in Europe/Helsinki', () => {
    expect(orderTime(makeOrder({ date: '2026-01-15T07:00:00.000Z' }))).toBe('09:00')
    expect(orderTime(makeOrder({ date: '2026-06-15T06:00:00.000Z' }))).toBe('09:00')
  })

  it('uses Helsinki-local weekend, night and month-boundary rules across DST', () => {
    expect(calculateAutomaticFees(makeOrder({ date: '2026-03-28T22:00:00.000Z' }))).toEqual([
      { name: 'weekendFee', label: 'VIIKONLOPPULISÄ', amount: 15 },
      { name: 'nightFee', label: 'YÖ/AAMULISÄ', amount: 20 },
    ])
    expect(calculateAutomaticFees(makeOrder({ date: '2026-03-29T01:00:00.000Z' }))).toEqual([
      { name: 'weekendFee', label: 'VIIKONLOPPULISÄ', amount: 15 },
      { name: 'nightFee', label: 'YÖ/AAMULISÄ', amount: 20 },
    ])
    expect(calculateAutomaticFees(makeOrder({ date: '2026-03-31T21:00:00.000Z' }))).toEqual([
      { name: 'startOrEndOfMonthFee', label: 'KUUNVAIHDELISÄ', amount: 15 },
      { name: 'nightFee', label: 'YÖ/AAMULISÄ', amount: 20 },
    ])

    expect(calculateAutomaticFees(makeOrder({ date: '2026-10-25T00:30:00.000Z' }))).toEqual([
      { name: 'weekendFee', label: 'VIIKONLOPPULISÄ', amount: 15 },
      { name: 'nightFee', label: 'YÖ/AAMULISÄ', amount: 20 },
    ])
    expect(calculateAutomaticFees(makeOrder({ date: '2026-10-25T01:30:00.000Z' }))).toEqual([
      { name: 'weekendFee', label: 'VIIKONLOPPULISÄ', amount: 15 },
      { name: 'nightFee', label: 'YÖ/AAMULISÄ', amount: 20 },
    ])
  })
})
