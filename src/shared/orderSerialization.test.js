import { describe, expect, it } from 'vitest'
import {
  makeAppBooking,
  makeCanonicalAppOrder,
} from './testFixtures/orderFixtures.js'
import { toOrderPayload } from './orderSerialization.js'

describe('API payloads', () => {
  it('creates an app payload with automatic pricing overrides', () => {
    const payload = toOrderPayload(makeCanonicalAppOrder())

    expect(payload).toMatchObject({ date: '2026-06-15T06:00:00.000Z' })
    expect(payload.pricingOverrides).toEqual({ price: null, fees: null, boxesPrice: null })
    expect(payload).not.toHaveProperty('id')
    expect(payload).not.toHaveProperty('originalOrder')
    expect(payload).not.toHaveProperty('price')
    expect(payload).not.toHaveProperty('fees')
    expect(payload).not.toHaveProperty('boxesPrice')
  })

  it('creates an app payload with manual pricing overrides', () => {
    const payload = toOrderPayload({
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
    const payload = toOrderPayload({
      ...makeCanonicalAppOrder(),
      pricingOverrides: { price: 0, fees: [], boxesPrice: 0 },
    })

    expect(payload.pricingOverrides).toEqual({ price: 0, fees: [], boxesPrice: 0 })
    expect(payload).not.toHaveProperty('originalOrder')
    expect(payload).not.toHaveProperty('price')
    expect(payload).not.toHaveProperty('fees')
    expect(payload).not.toHaveProperty('boxesPrice')
  })

  it('includes only pricing overrides in serialized payloads', () => {
    const order = {
      ...makeCanonicalAppOrder(),
      pricingOverrides: { price: 0, fees: [], boxesPrice: 0 },
    }
    const payload = toOrderPayload(order)

    expect(payload.pricingOverrides).toEqual({ price: 0, fees: [], boxesPrice: 0 })
    expect(payload).not.toHaveProperty('originalOrder')
    expect(payload).not.toHaveProperty('price')
    expect(payload).not.toHaveProperty('fees')
    expect(payload).not.toHaveProperty('boxesPrice')
  })

  it('strips editor-only identity metadata from extra addresses', () => {
    const booking = makeAppBooking()
    const payload = toOrderPayload({
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

  it('omits absent optional data and materializes partial boxes data', () => {
    const order = makeCanonicalAppOrder()
    const payload = toOrderPayload({
      ...order,
      address: null,
      destination: null,
      extraAddresses: undefined,
      paymentType: null,
      service: null,
      boxes: { deliveryDate: null, returnDate: null, amount: null },
    })

    expect(payload).not.toHaveProperty('address')
    expect(payload).not.toHaveProperty('destination')
    expect(payload).not.toHaveProperty('extraAddresses')
    expect(payload).not.toHaveProperty('paymentType')
    expect(payload).not.toHaveProperty('service')
    expect(payload.boxes).toEqual({
      deliveryDate: '2026-06-15T06:00:00.000Z',
      returnDate: '2026-06-15T06:00:00.000Z',
      amount: 0,
    })
  })

  it('omits nullable optional box and embedded fee metadata', () => {
    const order = makeCanonicalAppOrder()
    const payload = toOrderPayload({
      ...order,
      service: { ...order.service, fee: null },
      paymentType: { ...order.paymentType, fee: null },
      boxes: {
        ...order.boxes,
        pricePerBox: null,
        deliveryPrice: null,
        returnPrice: null,
      },
    })

    expect(payload.service).not.toHaveProperty('fee')
    expect(payload.paymentType).not.toHaveProperty('fee')
    expect(payload.boxes).not.toHaveProperty('pricePerBox')
    expect(payload.boxes).not.toHaveProperty('deliveryPrice')
    expect(payload.boxes).not.toHaveProperty('returnPrice')
  })

})
