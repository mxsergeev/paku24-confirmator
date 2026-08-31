import { describe, expect, it, vi } from 'vitest'

const pricing = vi.hoisted(() => ({ materialize: vi.fn() }))

vi.mock('./orderPricing.js', async () => {
  const actual = await vi.importActual('./orderPricing.js')
  pricing.materialize.mockImplementation(actual.materializeActivePricing)
  return {
    ...actual,
    materializeActivePricing: pricing.materialize,
  }
})

const { createWordPressOrder } = await import('./orderModel.js')
const { makeWordPressPayload } = await import('./testFixtures/orderFixtures.js')

describe('WordPress order construction', () => {
  it('materializes active pricing once after building the booking and snapshot', () => {
    pricing.materialize.mockClear()

    const input = makeWordPressPayload()
    const order = createWordPressOrder(input)

    expect(pricing.materialize).toHaveBeenCalledTimes(1)
    expect(order.initialSnapshot).toMatchObject({
      date: order.date,
      service: order.service,
      paymentType: order.paymentType,
      boxes: order.boxes,
      price: input.price,
      fees: input.fees,
      boxesPrice: input.boxesPrice,
    })
    expect(order.price).toBe(input.price)
    expect(order.fees).toEqual(input.fees)
    expect(order.boxesPrice).toBe(input.boxesPrice)
  })
})
