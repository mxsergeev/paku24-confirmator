import { describe, expect, it } from 'vitest'
import {
  makeAppBooking,
  makeCanonicalAppOrder,
  makeCanonicalWordPressOrder,
} from './testFixtures/orderFixtures.js'
import {
  deserializeDraft,
  serializeDraft,
  toCommunicationOrder,
  toCreateOrderPayload,
  toUpdateOrderPayload,
} from './orderSerialization.js'

describe('draft serialization', () => {
  it('round-trips booking, pricing overrides, and the WordPress reference', () => {
    const order = makeCanonicalWordPressOrder()
    const payload = serializeDraft(order)

    expect(payload.version).toBe(2)
    expect(payload.order.pricingOverrides).toEqual({ price: null, fees: null, boxesPrice: null })
    expect(payload.order.originalOrder).toEqual(order.originalOrder)
    expect(payload.order).not.toHaveProperty('price')
    expect(payload.order).not.toHaveProperty('fees')
    expect(payload.order).not.toHaveProperty('boxesPrice')

    const restored = deserializeDraft(payload)
    expect(restored.date).toEqual(new Date('2026-01-15T07:00:00.000Z'))
    expect(restored.originalOrder).toEqual(order.originalOrder)
    expect(restored.pricingOverrides).toEqual(order.pricingOverrides)
  })

  it('keeps automatic pricing live after deserialization', () => {
    const order = makeCanonicalAppOrder()
    const payload = serializeDraft(order)
    payload.order.duration = 3

    const restored = deserializeDraft(payload)
    expect(restored.duration).toBe(3)
    expect(restored).not.toHaveProperty('price')
    expect(restored).not.toHaveProperty('fees')
    expect(restored).not.toHaveProperty('boxesPrice')
  })

  it('preserves zero and empty manual overrides', () => {
    const order = {
      ...makeCanonicalAppOrder(),
      pricingOverrides: { price: 0, fees: [], boxesPrice: 0 },
    }
    const restored = deserializeDraft(JSON.parse(JSON.stringify(serializeDraft(order))))

    expect(restored.pricingOverrides).toEqual({ price: 0, fees: [], boxesPrice: 0 })
  })

  it('preserves date-only boxes and converts instant values symmetrically', () => {
    const order = makeCanonicalWordPressOrder({
      date: '2026-03-12T07:00:00.000Z',
      boxes: {
        amount: 2,
        deliveryDate: '2026-03-15',
        returnDate: '2026-03-20T07:00:00.000Z',
      },
    })

    const payload = serializeDraft(order)
    expect(payload.order.date).toBe('2026-03-12T07:00:00.000Z')
    expect(payload.order.boxes.deliveryDate).toBe('2026-03-15')
    expect(payload.order.boxes.returnDate).toBe('2026-03-20T07:00:00.000Z')

    const restored = deserializeDraft(payload)
    expect(restored.boxes.deliveryDate).toBe('2026-03-15')
    expect(restored.boxes.returnDate).toEqual(new Date('2026-03-20T07:00:00.000Z'))
  })

  it('rejects unsupported versions, invalid dates, and malformed overrides', () => {
    const payload = serializeDraft(makeCanonicalAppOrder())

    expect(() => deserializeDraft({ ...payload, version: 1 })).toThrow(/version/i)
    expect(() => deserializeDraft({ version: 2 })).toThrow(/order/i)
    expect(() => serializeDraft({ ...makeCanonicalAppOrder(), date: 'not-a-date' })).toThrow(/date/i)
    expect(() => serializeDraft({ ...makeCanonicalAppOrder(), pricingOverrides: { price: 'bad' } })).toThrow(
      /price/i,
    )
  })

  it('deeply isolates the serialized reference and nested values', () => {
    const order = makeCanonicalWordPressOrder()
    const payload = serializeDraft(order)

    payload.order.service.name = 'Changed'
    payload.order.originalOrder.name = 'Changed'
    payload.order.boxes.deliveryDate = '2026-02-01'

    expect(order.service.name).not.toBe('Changed')
    expect(order.originalOrder.name).not.toBe('Changed')
    expect(order.boxes.deliveryDate).not.toBe('2026-02-01')
  })
})

describe('API and communication payloads', () => {
  it('creates an app payload with automatic pricing overrides', () => {
    const payload = toCreateOrderPayload(makeCanonicalAppOrder())

    expect(payload).toMatchObject({ date: '2026-06-15T06:00:00.000Z' })
    expect(payload.pricingOverrides).toEqual({ price: null, fees: null, boxesPrice: null })
    expect(payload).not.toHaveProperty('id')
    expect(payload).not.toHaveProperty('originalOrder')
    expect(payload).not.toHaveProperty('price')
    expect(payload).not.toHaveProperty('fees')
    expect(payload).not.toHaveProperty('boxesPrice')
  })

  it('creates an app payload with manual pricing overrides', () => {
    const payload = toCreateOrderPayload({
      ...makeCanonicalAppOrder(),
      pricingOverrides: {
        price: 220,
        fees: [{ name: 'Manual fee', amount: 10 }],
        boxesPrice: 40,
      },
    })

    expect(payload.pricingOverrides).toEqual({
      price: 220,
      fees: [{ name: 'Manual fee', amount: 10 }],
      boxesPrice: 40,
    })
    expect(payload).not.toHaveProperty('originalOrder')
    expect(payload).not.toHaveProperty('price')
    expect(payload).not.toHaveProperty('fees')
    expect(payload).not.toHaveProperty('boxesPrice')
  })

  it('preserves explicit zero and no-fees overrides in an app payload', () => {
    const payload = toCreateOrderPayload({
      ...makeCanonicalAppOrder(),
      pricingOverrides: { price: 0, fees: [], boxesPrice: 0 },
    })

    expect(payload.pricingOverrides).toEqual({ price: 0, fees: [], boxesPrice: 0 })
    expect(payload).not.toHaveProperty('originalOrder')
    expect(payload).not.toHaveProperty('price')
    expect(payload).not.toHaveProperty('fees')
    expect(payload).not.toHaveProperty('boxesPrice')
  })

  it('includes only pricing overrides in update payloads', () => {
    const order = {
      ...makeCanonicalAppOrder(),
      pricingOverrides: { price: 0, fees: [], boxesPrice: 0 },
    }
    const payload = toUpdateOrderPayload(order)

    expect(payload.pricingOverrides).toEqual({ price: 0, fees: [], boxesPrice: 0 })
    expect(payload).not.toHaveProperty('originalOrder')
    expect(payload).not.toHaveProperty('price')
    expect(payload).not.toHaveProperty('fees')
    expect(payload).not.toHaveProperty('boxesPrice')
  })

  it('strips editor-only identity metadata from extra addresses', () => {
    const booking = makeAppBooking()
    const payload = toUpdateOrderPayload({
      ...makeCanonicalAppOrder(),
      extraAddresses: [
        {
          ...booking.extraAddresses[0],
          id: 'temporary-extra-address-0',
          _uiId: 'editor-row-0',
          key: 'row-0',
        },
      ],
    })

    expect(payload.extraAddresses[0]).toEqual(booking.extraAddresses[0])
    expect(payload.extraAddresses[0]).not.toHaveProperty('id')
    expect(payload.extraAddresses[0]).not.toHaveProperty('_uiId')
  })

  it('materializes effective pricing only for communication payloads', () => {
    const payload = toCommunicationOrder({
      ...makeCanonicalAppOrder(),
      pricingOverrides: { price: 0, fees: [], boxesPrice: 0 },
    })

    expect(payload).toMatchObject({ price: 0, fees: [], boxesPrice: 0 })
    expect(payload.pricingOverrides).toEqual({ price: 0, fees: [], boxesPrice: 0 })
    expect(payload).not.toHaveProperty('originalOrder')
    expect(payload).not.toHaveProperty('confirmed')
  })
})
