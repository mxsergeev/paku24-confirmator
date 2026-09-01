import { describe, expect, it } from 'vitest'
import {
  makeAppBooking,
  makeCanonicalAppOrder,
} from './testFixtures/orderFixtures.js'
import {
  toCreateOrderPayload,
  toUpdateOrderPayload,
} from './orderSerialization.js'

describe('API payloads', () => {
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

})
