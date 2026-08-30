import { describe, expect, it } from 'vitest'
import { makeWordPressStructuredJsonComplete } from './testFixtures/orderFixtures.js'
import { createWordPressOrder } from './orderModel.js'
import { normalizeWordPressOrderPayload } from './wordpressOrderPayload.js'

function wordpressPayload(overrides = {}) {
  return {
    ...makeWordPressStructuredJsonComplete(),
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
    const order = normalizeWordPressOrderPayload(payload)

    expect(order.date).toEqual(new Date('2026-01-15T07:00:00.000Z'))
    expect(order.duration).toBe(2)
    expect(order.service).toEqual(payload.service)
    expect(order.paymentType).toEqual(payload.paymentType)
    expect(order.boxes).toMatchObject({ amount: 10, pricePerBox: 2, deliveryPrice: 10, returnPrice: 10 })
    expect(order).not.toHaveProperty('servicePrice')
    expect(order).not.toHaveProperty('unknown')
    expect(order).not.toHaveProperty('distance')
    expect(order).not.toHaveProperty('hsy')
    expect(order).not.toHaveProperty('XL')
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
    expect(() => createWordPressOrder(emptyBoxesOrder)).not.toThrow()
    const boxes = normalizeWordPressOrderPayload(wordpressPayload({ boxes: {
      amount: '0', deliveryDate: '2026-01-16', returnDate: '2026-01-24',
    } })).boxes
    expect(boxes).toEqual({ amount: 0, deliveryDate: '2026-01-16', returnDate: '2026-01-24' })
  })

  it('preserves zero and empty imported prices while omitting missing components', () => {
    const withZeroes = normalizeWordPressOrderPayload(wordpressPayload({ price: '0', boxesPrice: '0', fees: [] }))
    expect(withZeroes).toMatchObject({ price: 0, boxesPrice: 0, fees: [] })
    const missing = normalizeWordPressOrderPayload(wordpressPayload({ price: undefined, boxesPrice: undefined, fees: undefined }))
    expect(missing).not.toHaveProperty('price')
    expect(missing).not.toHaveProperty('boxesPrice')
    expect(missing).not.toHaveProperty('fees')
  })

  it.each([
    [null, /plain object/i],
    ['{}', /plain object/i],
    [{}, /date.*required/i],
    [wordpressPayload({ date: '2026-01-15T09:00:00' }), /date.*timezone/i],
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
    [wordpressPayload({ fees: [{ name: 'bad', amount: 'nope' }] }), /fees\.0\.amount/i],
    [wordpressPayload({ fees: [{ amount: 10 }] }), /fees\.0\.name/i],
    [wordpressPayload({ price: 'nope' }), /price/i],
  ])('rejects invalid input with its field name', (payload, error) => {
    expect(() => normalizeWordPressOrderPayload(payload)).toThrow(error)
  })
})
