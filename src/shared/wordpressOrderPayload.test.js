import { describe, expect, it } from 'vitest'
import { makeWordPressPayload } from './testFixtures/orderFixtures.js'
import { createWordPressOrder } from './orderModel.js'
import { OrderValidationError } from './orderPrimitives.js'
import { normalizeWordPressOrderPayload } from './wordpressOrderPayload.js'

function wordpressPayload(overrides = {}) {
  return {
    ...makeWordPressPayload(),
    date: '2026-01-15T07:00:00.000Z',
    boxes: {
      amount: '10',
      pricePerBox: '2',
      deliveryPrice: '10',
      returnPrice: '10',
      deliveryDate: '2026-01-16T07:00:00.000Z',
      returnDate: '2026-01-24T07:00:00.000Z',
    },
    ...overrides,
  }
}

describe('normalizeWordPressOrderPayload', () => {
  it('normalizes the real booking app payload without catalog remapping', () => {
    const payload = wordpressPayload({ servicePrice: 100, unknown: 'ignored' })

    expect(payload).not.toHaveProperty('distance')
    expect(payload).not.toHaveProperty('hsy')
    expect(payload).not.toHaveProperty('eventColor')

    const order = normalizeWordPressOrderPayload(payload)

    expect(order.date).toEqual(new Date('2026-01-15T07:00:00.000Z'))
    expect(order.duration).toBe(2)
    expect(order.service).toEqual(payload.service)
    expect(order.paymentType).toEqual(payload.paymentType)
    expect(order.boxes).toEqual({
      amount: 10,
      deliveryDate: new Date('2026-01-16T07:00:00.000Z'),
      returnDate: new Date('2026-01-24T07:00:00.000Z'),
    })
    expect(order).not.toHaveProperty('price')
    expect(order).not.toHaveProperty('fees')
    expect(order).not.toHaveProperty('boxesPrice')
    expect(order).not.toHaveProperty('servicePrice')
    expect(order).not.toHaveProperty('unknown')
    expect(order).not.toHaveProperty('distance')
    expect(order).not.toHaveProperty('hsy')
    expect(order).not.toHaveProperty('eventColor')
  })

  it('preserves and deeply isolates embedded values and structured addresses', () => {
    const payload = wordpressPayload({
      service: { id: 'external-service', name: 'External', pricePerHour: '61', details: { source: 'wordpress' } },
      paymentType: { id: 'external-payment', name: 'External payment', fee: '3', details: { source: 'wordpress' } },
    })
    const order = normalizeWordPressOrderPayload(payload)
    payload.service.details.source = 'changed'
    payload.paymentType.details.source = 'changed'
    payload.address.street = 'changed'
    payload.extraAddresses[0].city = 'changed'

    expect(order.service).toMatchObject({ id: 'external-service', pricePerHour: 61, details: { source: 'wordpress' } })
    expect(order.paymentType).toMatchObject({ id: 'external-payment', fee: 3, details: { source: 'wordpress' } })
    expect(order.address.street).not.toBe('changed')
    expect(order.extraAddresses[0].city).not.toBe('changed')
  })

  it('normalizes empty and populated boxes, preserving date-only values', () => {
    const emptyBoxesOrder = normalizeWordPressOrderPayload(wordpressPayload({ boxes: {} }))
    expect(emptyBoxesOrder.boxes).toEqual({
      amount: 0,
      deliveryDate: new Date('2026-01-15T07:00:00.000Z'),
      returnDate: new Date('2026-01-15T07:00:00.000Z'),
    })
    expect(() => createWordPressOrder(emptyBoxesOrder, wordpressPayload({ boxes: {} }))).not.toThrow()
    const boxes = normalizeWordPressOrderPayload(wordpressPayload({ boxes: {
      amount: '0', deliveryDate: '2026-01-16', returnDate: '2026-01-24',
    } })).boxes
    expect(boxes).toEqual({ amount: 0, deliveryDate: '2026-01-16', returnDate: '2026-01-24' })
  })

  it('ignores source-only box pricing when determining whether boxes are supplied', () => {
    const raw = wordpressPayload({
      boxes: {
        pricePerBox: 'legacy',
        deliveryPrice: { ancient: true },
      },
    })
    const normalized = normalizeWordPressOrderPayload(raw)
    const order = createWordPressOrder(normalized, raw)

    expect(normalized.boxes).toEqual({
      amount: 0,
      deliveryDate: new Date('2026-01-15T07:00:00.000Z'),
      returnDate: new Date('2026-01-15T07:00:00.000Z'),
    })
    expect(order.originalOrder.boxes).toEqual(raw.boxes)
  })

  it('excludes legacy box pricing from the normalized current booking', () => {
    const order = normalizeWordPressOrderPayload(wordpressPayload({
      boxes: {
        amount: '10',
        deliveryDate: '2026-01-16',
        returnDate: '2026-01-24',
        pricePerBox: 'garbage',
        deliveryPrice: { old: true },
        returnPrice: ['legacy'],
        metadata: { source: 'wordpress' },
      },
    }))

    expect(order.boxes).toEqual({
      amount: 10,
      deliveryDate: '2026-01-16',
      returnDate: '2026-01-24',
    })
    expect(order.boxes).not.toHaveProperty('metadata')
  })

  it('ignores malformed source pricing instead of rejecting an import', () => {
    const order = normalizeWordPressOrderPayload(wordpressPayload({
      price: 'legacy-garbage',
      fees: { ancientPluginShape: true },
      boxesPrice: ['whatever'],
    }))

    expect(order).not.toHaveProperty('price')
    expect(order).not.toHaveProperty('fees')
    expect(order).not.toHaveProperty('boxesPrice')
  })

  it('preserves raw source pricing and keeps current overrides automatic', () => {
    const raw = wordpressPayload({
      price: 'legacy-garbage',
      fees: { ancientPluginShape: true },
      boxesPrice: ['whatever'],
      boxes: {
        amount: 10,
        deliveryDate: '2026-01-16',
        returnDate: '2026-01-24',
        pricePerBox: 'old',
        deliveryPrice: { old: true },
        returnPrice: ['legacy'],
      },
    })
    const normalized = normalizeWordPressOrderPayload(raw)
    const order = createWordPressOrder(normalized, raw)

    expect(order.originalOrder.price).toBe('legacy-garbage')
    expect(order.originalOrder.fees).toEqual({ ancientPluginShape: true })
    expect(order.originalOrder.boxesPrice).toEqual(['whatever'])
    expect(order.originalOrder.boxes).toMatchObject({
      pricePerBox: 'old',
      deliveryPrice: { old: true },
      returnPrice: ['legacy'],
    })
    expect(order.pricingOverrides).toEqual({ price: null, fees: null, boxesPrice: null })
  })

  it.each([
    [null, /plain object/i],
    ['{}', /plain object/i],
    [{}, /date.*required/i],
    [wordpressPayload({ date: '2026-01-15T09:00:00' }), /date.*absolute instant/i],
    [wordpressPayload({ date: '2026-02-29T09:00:00.000Z' }), /date/i],
    [wordpressPayload({ duration: 'nope' }), /duration/i],
    [wordpressPayload({ service: { id: '1', name: 'Move', pricePerHour: 'nope' } }), /service\.pricePerHour/i],
    [wordpressPayload({ paymentType: { id: '1', name: 'Card', fee: Infinity } }), /paymentType\.fee/i],
    [wordpressPayload({ address: 'unstructured' }), /address/i],
    [wordpressPayload({ address: { street: '', index: '00100', city: 'Helsinki' } }), /address\.street/i],
    [
      wordpressPayload({
        address: { street: 'Testikatu 1', index: '00100', city: 'Helsinki', floor: 'nope' },
      }),
      /address\.floor/i,
    ],
    [wordpressPayload({ boxes: { amount: 1, deliveryDate: '2026-01-16T09:00:00', returnDate: '2026-01-24T07:00:00Z' } }), /boxes\.deliveryDate/i],
    [wordpressPayload({ boxes: { amount: -1, deliveryDate: '2026-01-16', returnDate: '2026-01-24' } }), /boxes\.amount/i],
  ])('rejects invalid input with its field name', (payload, error) => {
    expect(() => normalizeWordPressOrderPayload(payload)).toThrow(error)
  })

  it('reports malformed WordPress input as an order validation error', () => {
    expect(() => normalizeWordPressOrderPayload(wordpressPayload({ duration: 'nope' }))).toThrow(
      OrderValidationError,
    )
  })
})
