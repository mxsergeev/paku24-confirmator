import { describe, expect, it } from 'vitest'
import {
  calculateAutomaticPricing,
  resolveActivePricing,
} from './orderPricing.js'
import {
  createAppOrder,
  createWordPressOrder,
  hydrateCanonicalOrder,
} from './orderModel.js'
import {
  makeAppOrder,
  makeWordPressStructuredJsonComplete,
  makeWordPressOrder,
} from './testFixtures/orderFixtures.js'
import {
  deserializeDraft,
  serializeDraft,
  toCommunicationOrder,
  toCreateOrderPayload,
  toUpdateOrderPayload,
} from './orderSerialization.js'

describe('draft serialization', () => {
  it('round-trips booking, snapshot, and pricing state without projections', () => {
    const order = makeWordPressOrder()
    const payload = serializeDraft(order)

    expect(payload.version).toBe(1)
    expect(payload.order).toMatchObject({
      origin: 'wordpress',
      initialSnapshot: expect.any(Object),
      pricing: order.pricing,
    })
    expect(payload.order).not.toHaveProperty('price')
    expect(payload.order).not.toHaveProperty('fees')
    expect(payload.order).not.toHaveProperty('boxesPrice')

    const restored = deserializeDraft(payload)
    expect(restored.origin).toBe('wordpress')
    expect(restored.date).toEqual(new Date('2026-01-15T07:00:00.000Z'))
    expect(restored.initialSnapshot.date).toEqual(new Date('2026-01-15T07:00:00.000Z'))
    expect(restored.pricing).toEqual(order.pricing)
    expect(resolveActivePricing(restored)).toEqual(resolveActivePricing(order))
  })

  it('keeps automatic pricing live after deserialization', () => {
    const order = createAppOrder(makeAppOrder())
    const payload = serializeDraft(order)
    payload.order.duration = 3

    const restored = deserializeDraft(payload)
    expect(restored.price).toBe(calculateAutomaticPricing(restored).price)
    expect(restored.price).not.toBe(order.price)
  })

  it('hydrates an app draft from stored fields and ignores stale outbound state', () => {
    const payload = JSON.parse(JSON.stringify(serializeDraft(makeAppOrder())))
    payload.order.price = 999
    payload.order.fees = [{ name: 'stale', amount: 999 }]
    payload.order.boxesPrice = 999
    payload.order.confirmed = true

    const restored = deserializeDraft(payload)

    expect(restored.origin).toBe('app')
    expect(restored.initialSnapshot).toBeNull()
    expect(restored.confirmed).toBe(false)
    expect(resolveActivePricing(restored)).toEqual(calculateAutomaticPricing(restored))
  })

  it('hydrates a WordPress draft with serialized snapshot and manual pricing state', () => {
    const order = makeWordPressOrder()
    const manualPricing = {
      source: { ...order.pricing.source, price: 'manual' },
      manual: { ...order.pricing.manual, price: 321 },
    }
    const payload = JSON.parse(JSON.stringify(serializeDraft({ ...order, pricing: manualPricing })))
    payload.order.price = 1
    payload.order.fees = [{ name: 'stale', amount: 1 }]
    payload.order.boxesPrice = 1
    payload.order.initialSnapshot.confirmed = true

    const restored = deserializeDraft(payload)

    expect(restored.origin).toBe('wordpress')
    expect(restored.initialSnapshot).toMatchObject({
      date: new Date('2026-01-15T07:00:00.000Z'),
    })
    expect(restored.pricing).toEqual(manualPricing)
    expect(restored.price).toBe(321)
    expect(restored).toHaveProperty('confirmed', false)
    expect(restored.initialSnapshot).not.toHaveProperty('confirmed')
  })

  it('preserves date-only boxes and converts datetime values symmetrically', () => {
    const order = createWordPressOrder({
      ...makeWordPressStructuredJsonComplete(),
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
    expect(payload.order.initialSnapshot.date).toBe('2026-03-12T07:00:00.000Z')
    expect(payload.order.initialSnapshot.boxes.deliveryDate).toBe('2026-03-15')
    expect(payload.order.initialSnapshot.boxes.returnDate).toBe('2026-03-20T07:00:00.000Z')

    const restored = deserializeDraft(payload)
    expect(restored.boxes.deliveryDate).toBe('2026-03-15')
    expect(restored.boxes.returnDate).toEqual(new Date('2026-03-20T07:00:00.000Z'))
    expect(restored.initialSnapshot.boxes.deliveryDate).toBe('2026-03-15')
    expect(restored.initialSnapshot.boxes.returnDate).toEqual(new Date('2026-03-20T07:00:00.000Z'))
  })

  it('rejects unsupported or malformed versions and invalid dates', () => {
    const payload = serializeDraft(makeAppOrder())

    expect(() => deserializeDraft({ ...payload, version: 2 })).toThrow(/version/i)
    expect(() => deserializeDraft({ version: 1 })).toThrow(/order/i)
    expect(() => serializeDraft({ ...makeAppOrder(), date: 'not-a-date' })).toThrow(/date/i)
    expect(() => serializeDraft({ ...makeAppOrder(), date: '2026-01-15T09:00:00' })).toThrow(
      /absolute instant/i,
    )
    expect(() => serializeDraft({ ...makeAppOrder(), pricing: { source: {}, manual: {} } })).toThrow(
      /pricing\.source\.price/i,
    )
    expect(() =>
      serializeDraft({ ...makeAppOrder(), initialSnapshot: makeWordPressOrder().initialSnapshot }),
    ).toThrow(/app orders.*initialSnapshot/i)
    expect(() => deserializeDraft({
      ...payload,
      order: { ...payload.order, boxes: { ...payload.order.boxes, deliveryDate: '2026-02-29' } },
    })).toThrow(/boxes\.deliveryDate/i)
  })

  it('deeply isolates drafts from the source order and nested values', () => {
    const order = makeWordPressOrder()
    const payload = serializeDraft(order)

    payload.order.service.name = 'Changed'
    payload.order.boxes.deliveryDate = '2026-02-01'
    payload.order.initialSnapshot.address.street = 'Changed'
    payload.order.pricing.manual.fees = [{ name: 'custom', amount: 3 }]

    expect(order.service.name).not.toBe('Changed')
    expect(order.boxes.deliveryDate).not.toBe('2026-02-01')
    expect(order.initialSnapshot.address.street).not.toBe('Changed')
    expect(order.pricing.manual.fees).toBeNull()
  })
})

describe('API and communication payloads', () => {
  it('creates only app-origin payloads with booking fields', () => {
    const payload = toCreateOrderPayload(makeAppOrder())

    expect(payload.origin).toBe('app')
    expect(payload).toMatchObject({ date: '2026-06-15T06:00:00.000Z' })
    expect(payload).not.toHaveProperty('initialSnapshot')
    expect(payload).not.toHaveProperty('pricing')
    expect(payload).not.toHaveProperty('price')
    expect(payload).not.toHaveProperty('fees')
    expect(payload).not.toHaveProperty('boxesPrice')
    expect(() => toCreateOrderPayload(makeWordPressOrder())).toThrow(/app-origin/i)
  })

  it('includes complete update pricing while preserving zero, empty, and null values', () => {
    let order = createAppOrder(makeAppOrder())
    order = {
      ...order,
      pricing: {
        source: { price: 'manual', fees: 'manual', boxesPrice: 'manual' },
        manual: { price: 0, fees: [], boxesPrice: 0 },
      },
    }
    const payload = toUpdateOrderPayload(order)

    expect(payload.pricing).toEqual(order.pricing)
    expect(payload.pricing.manual).toEqual({ price: 0, fees: [], boxesPrice: 0 })
    expect(payload).not.toHaveProperty('origin')
    expect(payload).not.toHaveProperty('initialSnapshot')
    expect(payload).not.toHaveProperty('price')
    expect(payload).not.toHaveProperty('fees')
    expect(payload).not.toHaveProperty('boxesPrice')

    order.pricing.manual.fees.push({ name: 'changed', amount: 1 })
    expect(payload.pricing.manual.fees).toEqual([])
  })

  it('strips editor-only identity metadata from extra addresses at the update boundary', () => {
    const appOrder = makeAppOrder()
    const order = createAppOrder({
      ...appOrder,
      extraAddresses: [
        {
          ...appOrder.extraAddresses[0],
          id: 'temporary-extra-address-0',
          _uiId: 'editor-row-0',
          key: 'row-0',
        },
      ],
    })

    const payload = toUpdateOrderPayload(order)

    expect(payload.extraAddresses).toEqual([
      {
        street: 'Mechelininkatu 20',
        index: '00100',
        city: 'Helsinki',
        floor: 1,
        elevator: false,
      },
    ])
    expect(payload.extraAddresses[0]).not.toHaveProperty('id')
    expect(payload.extraAddresses[0]).not.toHaveProperty('_uiId')
    expect(payload.extraAddresses[0]).not.toHaveProperty('key')
  })

  it('keeps imported pricing sources unchanged when a persisted order is reopened and saved', () => {
    const persistedOrder = createWordPressOrder(makeWordPressStructuredJsonComplete())
    const reopenedOrder = hydrateCanonicalOrder(persistedOrder)
    const payload = toUpdateOrderPayload(reopenedOrder)

    expect(payload.pricing.source).toEqual({
      price: 'initial',
      fees: 'initial',
      boxesPrice: 'initial',
    })
    expect(payload.extraAddresses).toEqual(persistedOrder.extraAddresses)
  })

  it('uses resolved active pricing and excludes internal state for communication', () => {
    const order = createAppOrder(makeAppOrder())
    const payload = toCommunicationOrder({
      ...order,
      pricing: {
        source: { price: 'manual', fees: 'manual', boxesPrice: 'manual' },
        manual: { price: 0, fees: [], boxesPrice: 0 },
      },
      price: 99,
      fees: [{ name: 'stale', amount: 99 }],
      boxesPrice: 99,
      initialSnapshot: { price: 99 },
    })

    expect(payload).toMatchObject({ price: 0, fees: [], boxesPrice: 0 })
    expect(payload).not.toHaveProperty('origin')
    expect(payload).not.toHaveProperty('initialSnapshot')
    expect(payload).not.toHaveProperty('pricing')
    expect(payload).not.toHaveProperty('confirmed')

    payload.fees.push({ name: 'changed', amount: 1 })
    expect(order.fees).toEqual([])
  })
})
