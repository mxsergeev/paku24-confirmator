import { describe, expect, it } from 'vitest'
import {
  applyOrderPatch,
  createAppOrder,
  createDefaultAppOrder,
  createWordPressOrder,
  hydrateCanonicalOrder,
} from './orderModel.js'
import { getOrderPricing, setPricingOverride } from './orderPricing.js'
import {
  makeAppBooking,
  makeCanonicalAppOrder,
  makeWordPressPayload,
} from './testFixtures/orderFixtures.js'

describe('canonical order model', () => {
  it('creates independent app defaults without derived pricing fields', () => {
    const first = createDefaultAppOrder()
    const second = createDefaultAppOrder()
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

  it('keeps the exact WordPress payload as immutable reference data', () => {
    const input = makeWordPressPayload({ metadata: { source: 'wordpress' } })
    const order = createWordPressOrder(input)

    expect(order.originalOrder).toEqual(input)
    expect(order.originalOrder).not.toBe(input)
    expect(order.originalOrder.metadata).not.toBe(input.metadata)
    expect(order).not.toHaveProperty('price')
    expect(order).not.toHaveProperty('fees')
    expect(order).not.toHaveProperty('boxesPrice')
    expect(getOrderPricing(order).price).not.toBe(input.price)
  })

  it('hydrates persisted dates and defaults missing override state', () => {
    const source = makeCanonicalAppOrder()
    const hydrated = hydrateCanonicalOrder({
      ...source,
      date: source.date.toISOString(),
      boxes: {
        ...source.boxes,
        deliveryDate: '2026-03-15',
        returnDate: '2026-03-20T07:00:00.000Z',
      },
      pricingOverrides: undefined,
    })

    expect(hydrated.date).toEqual(source.date)
    expect(hydrated.boxes.deliveryDate).toBe('2026-03-15')
    expect(hydrated.boxes.returnDate).toEqual(new Date('2026-03-20T07:00:00.000Z'))
    expect(hydrated.pricingOverrides).toEqual({ price: null, fees: null, boxesPrice: null })
  })

  it('preserves manual overrides across ordinary booking edits', () => {
    const manual = setPricingOverride(makeCanonicalAppOrder(), 'price', 220)
    const updated = applyOrderPatch(manual, {
      duration: 4,
      service: { id: '2', name: 'Changed service', pricePerHour: 70 },
      address: { street: 'New street', index: '00100', city: 'Helsinki', floor: 2, elevator: false },
    })

    expect(updated.duration).toBe(4)
    expect(updated.service.id).toBe('2')
    expect(updated.pricingOverrides.price).toBe(220)
    expect(getOrderPricing(updated).price).toBe(220)
  })

  it('supports explicit zero and empty fee overrides', () => {
    const order = applyOrderPatch(makeCanonicalAppOrder(), {
      pricingOverrides: { price: 0, fees: [], boxesPrice: 0 },
    })

    expect(order.pricingOverrides).toEqual({ price: 0, fees: [], boxesPrice: 0 })
    expect(getOrderPricing(order)).toEqual({ price: 0, fees: [], boxesPrice: 0 })
  })

  it('rejects unknown or malformed editable fields', () => {
    const order = makeCanonicalAppOrder()

    expect(() => applyOrderPatch(order, { origin: 'app' })).toThrow(/not editable/i)
    expect(() => applyOrderPatch(order, { pricingOverrides: { price: 'bad' } })).toThrow(/price/i)
    expect(() => applyOrderPatch(order, { pricingOverrides: { fees: [{ amount: 'bad' }] } })).toThrow(
      /fees/i,
    )
  })

  it('rejects incomplete or invalid canonical booking values', () => {
    const order = makeCanonicalAppOrder()

    expect(() => hydrateCanonicalOrder({ ...order, date: undefined })).toThrow(/date/i)
    expect(() => createAppOrder({ ...makeAppBooking(), boxes: null })).toThrow(/boxes/i)
    expect(() => applyOrderPatch(order, { date: '2026-01-15T09:00:00' })).toThrow(/absolute instant/i)
  })
})
