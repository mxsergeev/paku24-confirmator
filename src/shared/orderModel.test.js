import { describe, expect, it } from 'vitest'
import {
  createAppOrder,
  createWordPressOrder,
  normalizeOrderPatch,
} from './orderModel.js'
import { getOrderPricing, setPricingOverride } from './orderPricing.js'
import {
  makeAppBooking,
  makeCanonicalAppOrder,
  makeWordPressPayload,
} from './testFixtures/orderFixtures.js'
import { normalizeWordPressOrderPayload } from './wordpressOrderPayload.js'

describe('order model boundaries', () => {
  it('creates independent app defaults without derived pricing fields', () => {
    const first = createAppOrder()
    const second = createAppOrder()
    first.address.street = 'Changed'
    first.pricingOverrides.price = 0

    expect(second.address.street).toBe('')
    expect(second.pricingOverrides.price).toBeNull()
    expect(first).not.toHaveProperty('price')
    expect(first).not.toHaveProperty('fees')
    expect(first).not.toHaveProperty('boxesPrice')
    expect(first.originalOrder).toBeNull()
  })

  it('creates app orders with automatic pricing and no WordPress reference', () => {
    const order = createAppOrder(makeAppBooking())

    expect(order.originalOrder).toBeNull()
    expect(order.pricingOverrides).toEqual({ price: null, fees: null, boxesPrice: null })
    expect(getOrderPricing(order)).toEqual({ price: 100, fees: [], boxesPrice: 0 })
    expect(order).not.toHaveProperty('origin')
  })

  it('creates app orders with validated manual pricing overrides', () => {
    const order = createAppOrder({
      ...makeAppBooking(),
      pricingOverrides: { price: 220, fees: [], boxesPrice: 40 },
    })

    expect(order.pricingOverrides).toEqual({ price: 220, fees: [], boxesPrice: 40 })
    expect(getOrderPricing(order)).toEqual({ price: 220, fees: [], boxesPrice: 40 })
    expect(() => createAppOrder({ ...makeAppBooking(), pricingOverrides: { price: 'bad' } })).toThrow(
      /price/i,
    )
  })

  it('keeps the exact WordPress payload as immutable reference data', () => {
    const input = makeWordPressPayload({ metadata: { source: 'wordpress' } })
    const order = createWordPressOrder(normalizeWordPressOrderPayload(input), input)

    expect(order.originalOrder).toEqual(input)
    expect(order.originalOrder).not.toBe(input)
    expect(order.originalOrder.metadata).not.toBe(input.metadata)
    expect(order).not.toHaveProperty('price')
    expect(order).not.toHaveProperty('fees')
    expect(order).not.toHaveProperty('boxesPrice')
    expect(getOrderPricing(order).price).not.toBe(input.price)
  })

  it('creates orders with normalized dates and defaults missing override state', () => {
    const source = makeCanonicalAppOrder()
    const order = createAppOrder({
      ...source,
      date: source.date.toISOString(),
      boxes: {
        ...source.boxes,
        deliveryDate: new Date('2026-03-15T20:00:00.000Z'),
        deliveryHasTime: false,
        returnDate: new Date('2026-03-20T07:00:00.000Z'),
        returnHasTime: true,
      },
      pricingOverrides: undefined,
    })

    expect(order.date).toEqual(source.date)
    expect(order.boxes.deliveryDate).toEqual(new Date('2026-03-15T00:00:00.000Z'))
    expect(order.boxes.deliveryHasTime).toBe(false)
    expect(order.boxes.returnDate).toEqual(new Date('2026-03-20T07:00:00.000Z'))
    expect(order.pricingOverrides).toEqual({ price: null, fees: null, boxesPrice: null })
  })

  it('keeps legacy box pricing out of canonical create and update paths', () => {
    const order = createAppOrder({
      ...makeAppBooking(),
      boxes: {
        ...makeAppBooking().boxes,
        pricePerBox: 999,
        deliveryPrice: 888,
        returnPrice: 777,
      },
    })
    const patch = normalizeOrderPatch({
      boxes: {
        ...makeAppBooking().boxes,
        amount: 5,
        pricePerBox: 1,
        deliveryPrice: 2,
        returnPrice: 3,
      },
    })

    expect(order.boxes).not.toHaveProperty('pricePerBox')
    expect(order.boxes).not.toHaveProperty('deliveryPrice')
    expect(order.boxes).not.toHaveProperty('returnPrice')
    expect(patch.boxes).toEqual({
      amount: 5,
      deliveryDate: new Date('2026-06-16T06:00:00.000Z'),
      deliveryHasTime: true,
      returnDate: new Date('2026-06-24T06:00:00.000Z'),
      returnHasTime: true,
    })
  })

  it('preserves manual overrides across ordinary booking edits', () => {
    const manual = setPricingOverride(makeCanonicalAppOrder(), 'price', 220)
    const updated = {
      ...manual,
      ...normalizeOrderPatch({
      duration: 4,
      service: { id: '2', name: 'Changed service', pricePerHour: 70 },
      address: { street: 'New street', index: '00100', city: 'Helsinki', floor: 2, elevator: false },
      }),
    }

    expect(updated.duration).toBe(4)
    expect(updated.service.id).toBe('2')
    expect(updated.pricingOverrides.price).toBe(220)
    expect(getOrderPricing(updated).price).toBe(220)
  })

  it('supports explicit zero and empty fee overrides', () => {
    const order = {
      ...makeCanonicalAppOrder(),
      ...normalizeOrderPatch({
      pricingOverrides: { price: 0, fees: [], boxesPrice: 0 },
      }),
    }

    expect(order.pricingOverrides).toEqual({ price: 0, fees: [], boxesPrice: 0 })
    expect(getOrderPricing(order)).toEqual({ price: 0, fees: [], boxesPrice: 0 })
  })

  it('rejects unknown or malformed editable fields', () => {
    expect(() => normalizeOrderPatch({ origin: 'app' })).toThrow(/not editable/i)
    expect(() => normalizeOrderPatch({ pricingOverrides: { price: 'bad' } })).toThrow(/price/i)
    expect(() => normalizeOrderPatch({ pricingOverrides: { fees: [{ amount: 'bad' }] } })).toThrow(
      /fees/i,
    )
    expect(() => normalizeOrderPatch({ confirmed: true })).toThrow(/not editable/i)
  })

  it('rejects incomplete or invalid canonical booking values', () => {
    expect(() => createAppOrder({ ...makeAppBooking(), date: undefined })).not.toThrow()
    expect(() => createAppOrder({ ...makeAppBooking(), boxes: null })).toThrow(/boxes/i)
    expect(() => normalizeOrderPatch({ date: '2026-01-15T09:00:00' })).toThrow(/absolute instant/i)
  })
})
