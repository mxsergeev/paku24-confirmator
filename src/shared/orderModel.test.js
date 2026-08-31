import { describe, expect, it } from 'vitest'
import {
  makeWordPressPayload,
  makeWordPressPayloadMissingPricing,
} from './testFixtures/orderFixtures.js'
import {
  createAppOrder,
  createWordPressOrder,
  defaultOrder,
  applyOrderPatch,
  hydrateCanonicalOrder,
  revertToInitial,
  SNAPSHOT_FIELDS,
  setManualPricing,
  setPricingSource,
  clearManualPricing,
  updateOrderField,
} from './orderModel.js'

const clone = (value) => {
  if (value instanceof Date) return new Date(value.getTime())
  if (Array.isArray(value)) return value.map((item) => clone(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]))
  }
  return value
}

describe('default and boundary order state', () => {
  it('creates fresh independent defaults with materialized automatic pricing', () => {
    const first = defaultOrder()
    const second = defaultOrder()

    expect(first).not.toBe(second)
    expect(first.service).not.toBe(second.service)
    expect(first.address).not.toBe(second.address)
    expect(first.boxes).not.toBe(second.boxes)
    expect(first.boxes.deliveryDate).not.toBe(second.boxes.deliveryDate)
    expect(first.extraAddresses).not.toBe(second.extraAddresses)
    expect(first.pricing).not.toBe(second.pricing)
    expect(first.calendarEventIds).not.toBe(second.calendarEventIds)
    expect(first.calendarEventIds).toEqual({ main: null, boxDelivery: null, boxReturn: null })
    expect(first.origin).toBe('app')
    expect(first.initialSnapshot).toBeNull()
    expect(first).not.toHaveProperty('_id')
    expect(first.pricing.source).toEqual({ price: 'auto', fees: 'auto', boxesPrice: 'auto' })
    expect(first.pricing.manual).toEqual({ price: null, fees: null, boxesPrice: null })
    expect(first.price).toBeTypeOf('number')

    first.address.street = 'changed'
    first.boxes.amount = 10
    first.pricing.manual.fees = []
    expect(second.address.street).toBe('')
    expect(second.boxes.amount).toBe(0)
    expect(second.pricing.manual.fees).toBeNull()
  })

  it('normalizes instants and date-only box values while rematerializing projections', () => {
    const normalized = createAppOrder({
      date: '2026-01-15T07:00:00.000Z',
      boxes: { deliveryDate: '2026-03-12', returnDate: '2026-03-20', amount: 10 },
      price: 999,
      fees: [{ name: 'fake', amount: 999 }],
      boxesPrice: 999,
    })

    expect(normalized.date).toBeInstanceOf(Date)
    expect(normalized.date.toISOString()).toBe('2026-01-15T07:00:00.000Z')
    expect(normalized.boxes.deliveryDate).toBe('2026-03-12')
    expect(normalized.boxes.returnDate).toBe('2026-03-20')
    expect(normalized.boxesPrice).toBe(52)
    expect(normalized.price).toBe(102)
    expect(normalized.fees).toEqual([])
    expect(() => createAppOrder({ date: 'not-a-date' })).toThrow(/invalid date/i)
  })

  it('rejects incomplete persisted snapshot boxes instead of filling fresh defaults', () => {
    const order = createWordPressOrder(makeWordPressPayload())
    const malformed = {
      ...order,
      initialSnapshot: { ...order.initialSnapshot, boxes: { amount: 10 } },
    }
    expect(() => hydrateCanonicalOrder(malformed)).toThrow(/initialSnapshot\.boxes.*deliveryDate/i)

    expect(() => hydrateCanonicalOrder({
      ...order,
      initialSnapshot: {
        ...order.initialSnapshot,
        boxes: { deliveryDate: '2026-03-12', returnDate: '2026-03-20' },
      },
    })).toThrow(/initialSnapshot\.boxes.*amount/i)
  })

  it('still fills missing dates from fresh defaults for a current order', () => {
    const normalized = createAppOrder({ boxes: { amount: 2 } })

    expect(normalized.boxes.amount).toBe(2)
    expect(normalized.boxes.deliveryDate).toBeInstanceOf(Date)
    expect(normalized.boxes.returnDate).toBeInstanceOf(Date)
  })

  it.each(['date', 'service', 'address', 'destination', 'boxes'])(
    'rejects persisted app state missing %s instead of applying creation defaults',
    (field) => {
      const order = createAppOrder()
      const malformed = { ...order }
      delete malformed[field]

      expect(() => hydrateCanonicalOrder(malformed)).toThrow(new RegExp(`${field}.*required`, 'i'))
    },
  )

  it.each([null, undefined, true, false, [], {}, ' ', NaN, Infinity, -1, '-1'])(
    'rejects invalid current box amount %p',
    (amount) => {
      expect(() => createAppOrder({ boxes: { amount } })).toThrow(/boxes\.amount/i)
      const order = createWordPressOrder(makeWordPressPayload())
      expect(() => hydrateCanonicalOrder({
        ...order,
        initialSnapshot: {
          ...order.initialSnapshot,
          boxes: { deliveryDate: '2026-03-12', returnDate: '2026-03-20', amount },
        },
      })).toThrow(/initialSnapshot\.boxes.*amount/i)
    },
  )

  it('normalizes valid numeric string box amounts in current and snapshot data', () => {
    const normalized = createAppOrder({
      boxes: { amount: '2' },
    })
    const persisted = createWordPressOrder(makeWordPressPayload())
    const hydrated = hydrateCanonicalOrder({
      ...persisted,
      initialSnapshot: {
        ...persisted.initialSnapshot,
        boxes: { deliveryDate: '2026-03-12', returnDate: '2026-03-20', amount: '3' },
      },
    })

    expect(normalized.boxes.amount).toBe(2)
    expect(hydrated.initialSnapshot.boxes.amount).toBe(3)
  })

  it('validates and preserves date-only values in a normalized snapshot', () => {
    const order = createWordPressOrder(makeWordPressPayload())
    const normalized = hydrateCanonicalOrder({
      ...order,
      initialSnapshot: {
        ...order.initialSnapshot,
        boxes: { deliveryDate: '2026-03-12', returnDate: '2026-03-20', amount: 10 },
      },
    })

    expect(normalized.initialSnapshot.boxes.deliveryDate).toBe('2026-03-12')
    expect(normalized.initialSnapshot.boxes.returnDate).toBe('2026-03-20')
    expect(normalized.initialSnapshot.boxes).not.toBe(normalized.boxes)
  })

  it('creates app orders with automatic pricing and no imported snapshot', () => {
    const order = createAppOrder({
      origin: 'wordpress',
      price: 800,
      fees: [{ name: 'weekendFee', amount: 15 }],
      boxesPrice: 700,
      initialSnapshot: null,
    })

    expect(order.origin).toBe('app')
    expect(order.initialSnapshot).toBeNull()
    expect(order.pricing.source).toEqual({ price: 'auto', fees: 'auto', boxesPrice: 'auto' })
    expect(order.price).not.toBe(800)
    expect(() => createAppOrder({ initialSnapshot: { price: 1 } })).toThrow(/server-managed/i)
  })

  it('creates isolated WordPress snapshots with complete or missing pricing components', () => {
    const input = makeWordPressPayload()
    const order = createWordPressOrder(input)

    expect(order.origin).toBe('wordpress')
    expect(order.initialSnapshot).toBeTruthy()
    expect(order.initialSnapshot.pricing).toBeUndefined()
    expect(order.initialSnapshot.origin).toBeUndefined()
    expect(order.pricing.source).toEqual({ price: 'initial', fees: 'initial', boxesPrice: 'initial' })
    expect(order.price).toBe(167)
    expect(order.boxesPrice).toBe(52)
    expect(order.fees).toEqual(input.fees)
    expect(order.initialSnapshot.service).not.toBe(order.service)
    expect(order.initialSnapshot.boxes).not.toBe(order.boxes)
    expect(Object.keys(order.initialSnapshot).sort()).toEqual([...SNAPSHOT_FIELDS].sort())
    input.service.name = 'mutated input'
    input.boxes.amount = 999
    input.fees[0].amount = 999
    expect(order.service.name).not.toBe('mutated input')
    expect(order.initialSnapshot.boxes.amount).not.toBe(999)
    expect(order.initialSnapshot.fees[0].amount).toBe(15)

    const missing = createWordPressOrder(makeWordPressPayloadMissingPricing())
    expect(missing.pricing.source).toEqual({ price: 'auto', fees: 'auto', boxesPrice: 'auto' })
    expect(missing.initialSnapshot).not.toHaveProperty('price')
    expect(missing.initialSnapshot).not.toHaveProperty('fees')
    expect(missing.initialSnapshot).not.toHaveProperty('boxesPrice')
  })

  it('hydrates role-specific calendar IDs and rejects malformed IDs', () => {
    const order = createWordPressOrder(makeWordPressPayload())
    const hydrated = hydrateCanonicalOrder({
      ...order,
      calendarEventIds: { main: 'main-id', boxDelivery: null, boxReturn: 'return-id' },
    })

    expect(hydrated.calendarEventIds).toEqual({
      main: 'main-id',
      boxDelivery: null,
      boxReturn: 'return-id',
    })
    expect(() => hydrateCanonicalOrder({
      ...order,
      calendarEventIds: { main: 123 },
    })).toThrow(/calendarEventIds\.main/i)
  })
})

describe('immutable booking updates and pricing transitions', () => {
  const initialOrder = () =>
    createWordPressOrder({
      ...makeWordPressPayload(),
      date: '2026-01-15T07:00:00.000Z',
    })

  it.each([
    ['duration', 3, ['price']],
    ['service', { id: '2', name: 'changed', pricePerHour: 70 }, ['fees', 'price']],
    ['paymentType', { id: '3', name: 'invoice', fee: 5 }, ['fees', 'price']],
    ['date', new Date('2026-02-01T07:00:00.000Z'), ['fees', 'price']],
    ['address', { street: 'new address', floor: 0, elevator: false }, ['fees', 'price']],
    ['destination', { street: 'new destination', floor: 0, elevator: false }, ['fees', 'price']],
    ['extraAddresses', [{ street: 'stop', floor: 0, elevator: false }], ['fees', 'price']],
  ])('moves only dependent initial sources to auto for %s', (key, value, autoComponents) => {
    const order = initialOrder()
    const updated = updateOrderField(order, key, value)

    autoComponents.forEach((component) => expect(updated.pricing.source[component]).toBe('auto'))
    ;['price', 'fees', 'boxesPrice']
      .filter((component) => !autoComponents.includes(component))
      .forEach((component) => expect(updated.pricing.source[component]).toBe('initial'))
    expect(order[key]).not.toEqual(value)
  })

  it('does not reset pricing when an update keeps the same value', () => {
    const order = initialOrder()
    const updates = [
      ['duration', order.duration],
      ['service', clone(order.service)],
      ['paymentType', clone(order.paymentType)],
      ['date', clone(order.date)],
      ['address', clone(order.address)],
      ['destination', clone(order.destination)],
      ['extraAddresses', clone(order.extraAddresses)],
    ]

    updates.forEach(([key, value]) => {
      const updated = updateOrderField(order, key, value)
      expect(updated.pricing.source).toEqual(order.pricing.source)
    })
  })

  it('moves box price and total only when amount or dates change', () => {
    const order = initialOrder()
    const sameBoxes = updateOrderField(order, 'boxes', { ...clone(order.boxes), note: 'ignored' })
    expect(sameBoxes.pricing.source).toEqual(order.pricing.source)

    const amountChanged = updateOrderField(order, 'boxes', { ...clone(order.boxes), amount: 20 })
    expect(amountChanged.pricing.source).toEqual({ price: 'auto', fees: 'initial', boxesPrice: 'auto' })

    const dateChanged = updateOrderField(order, 'boxes', {
      ...clone(order.boxes),
      returnDate: '2026-02-01T07:00:00.000Z',
    })
    expect(dateChanged.pricing.source).toEqual({ price: 'auto', fees: 'initial', boxesPrice: 'auto' })
  })

  it('preserves existing manual and automatic sources across dependent edits', () => {
    let order = initialOrder()
    order = setManualPricing(order, 'fees', [{ name: 'custom', amount: 10 }])
    order = setManualPricing(order, 'boxesPrice', 20)
    order = updateOrderField(order, 'service', { id: '2', pricePerHour: 70 })
    expect(order.pricing.source).toEqual({ price: 'auto', fees: 'manual', boxesPrice: 'manual' })
    expect(order.pricing.manual.fees).toEqual([{ name: 'custom', amount: 10 }])
    expect(order.pricing.manual.boxesPrice).toBe(20)
  })

  it.each([
    ['name', 'Changed customer'],
    ['email', 'changed@example.com'],
    ['phone', '+358409999999'],
    ['comment', 'Changed comment'],
    ['eventColor', '7'],
    ['hsy', true],
    ['XL', true],
    ['distance', 'outsideCapital'],
  ])('does not change pricing sources for independent field %s', (key, value) => {
    const order = initialOrder()
    const updated = updateOrderField(order, key, value)

    expect(updated.pricing.source).toEqual(order.pricing.source)
  })

  it('does not mutate the order or retain caller-owned nested references', () => {
    const order = initialOrder()
    const address = { street: 'caller address', floor: 1, elevator: false }
    const updated = updateOrderField(order, 'address', address)
    address.street = 'mutated after update'
    updated.address.street = 'mutated output'
    expect(order.address.street).not.toBe('caller address')
    expect(updated.address.street).toBe('mutated output')
    expect(order.initialSnapshot.address.street).not.toBe('caller address')
  })

  it('shares untouched branches while isolating the updated branch', () => {
    const order = initialOrder()
    const updated = updateOrderField(order, 'name', 'Changed customer')

    expect(updated).not.toBe(order)
    expect(updated.name).toBe('Changed customer')
    expect(updated.service).toBe(order.service)
    expect(updated.initialSnapshot).toBe(order.initialSnapshot)
    expect(updated.pricing).toBe(order.pricing)
    expect(updated.pricing.source).toBe(order.pricing.source)
    expect(updated.pricing.manual).toBe(order.pricing.manual)

    const transitioned = updateOrderField(order, 'duration', order.duration + 1)
    expect(transitioned.pricing).not.toBe(order.pricing)
    expect(transitioned.pricing.source).not.toBe(order.pricing.source)
    expect(transitioned.pricing.manual).toBe(order.pricing.manual)
    expect(transitioned.initialSnapshot).toBe(order.initialSnapshot)
  })

  it('materializes pricing from the final state of a multi-field patch', () => {
    const order = createAppOrder({
      date: '2026-01-15T07:00:00.000Z',
      duration: 1,
      service: { id: '1', name: 'Service', pricePerHour: 50 },
      paymentType: { id: '1', name: 'Card', fee: 0 },
      address: { street: 'Start', floor: 0, elevator: false },
      destination: { street: 'End', floor: 0, elevator: false },
    })

    const updated = applyOrderPatch(order, {
      service: { id: '2', name: 'Changed service', pricePerHour: 70, multiplier: 1 },
      paymentType: { id: '3', name: 'Invoice', fee: 5 },
      duration: 3,
    })

    expect(updated.service.id).toBe('2')
    expect(updated.duration).toBe(3)
    expect(updated.fees).toEqual([{ name: 'paymentTypeFee', label: 'MAKSUTAPALISÄ', amount: 5 }])
    expect(updated.price).toBe(updated.duration * updated.service.pricePerHour + updated.boxesPrice + 5)
  })
})

describe('manual pricing and explicit source selection', () => {
  it('supports finite manual zero and empty fees, then clears them', () => {
    let order = createAppOrder()
    order = setManualPricing(order, 'price', 0)
    order = setManualPricing(order, 'fees', [])
    order = setManualPricing(order, 'boxesPrice', 0)
    expect(order.pricing.source).toEqual({ price: 'manual', fees: 'manual', boxesPrice: 'manual' })
    expect(order.pricing.manual).toEqual({ price: 0, fees: [], boxesPrice: 0 })
    expect(order.price).toBe(0)
    expect(order.fees).toEqual([])
    expect(order.boxesPrice).toBe(0)

    order = clearManualPricing(order, 'price')
    expect(order.pricing.source.price).toBe('auto')
    expect(order.pricing.manual.price).toBeNull()
    expect(order.price).toBeGreaterThan(0)
  })

  it('isolates caller-owned manual values and shares unrelated pricing branches', () => {
    const order = createAppOrder()
    const manualFees = [{ name: 'custom', amount: 10 }]
    const updated = setManualPricing(order, 'fees', manualFees)

    manualFees[0].amount = 99
    expect(updated.pricing.manual.fees).toEqual([{ name: 'custom', amount: 10 }])
    expect(updated.pricing.manual).not.toBe(order.pricing.manual)
    expect(updated.pricing.source).not.toBe(order.pricing.source)
    expect(updated.initialSnapshot).toBe(order.initialSnapshot)
    expect(updated.service).toBe(order.service)
  })

  it('rejects malformed manual values and selects only requested sources', () => {
    const order = createWordPressOrder(makeWordPressPayload())
    expect(() => setManualPricing(order, 'price', NaN)).toThrow(/invalid/i)
    expect(() => setManualPricing(order, 'price', ' ')).toThrow(/invalid/i)
    expect(() => setManualPricing(order, 'fees', [{ name: 'bad', amount: 'nope' }])).toThrow(/invalid/i)
    expect(() => setPricingSource(order, 'price', 'manual')).toThrow(/manual price.*missing/i)

    const selected = setPricingSource(order, 'fees', 'auto')
    expect(selected.pricing.source).toEqual({ price: 'initial', fees: 'auto', boxesPrice: 'initial' })
    expect(order.pricing.source.fees).toBe('initial')
    expect(() => setPricingSource(createAppOrder(), 'price', 'initial')).toThrow(/missing/i)
  })

  it.each([null, undefined, true, false, [], {}, ' '])(
    'rejects invalid manual scalar value %p',
    (value) => {
      const order = createAppOrder()

      expect(() => setManualPricing(order, 'price', value)).toThrow(/invalid/i)
      expect(() => setManualPricing(order, 'boxesPrice', value)).toThrow(/invalid/i)
    },
  )

  it.each(['source', 'manual'])('rejects array-shaped pricing.%s', (field) => {
    expect(() => hydrateCanonicalOrder({
      ...createAppOrder(),
      pricing: { [field]: [] },
    })).toThrow(
      `Invalid pricing.${field}`,
    )
  })
})

describe('revertToInitial', () => {
  it('restores snapshot fields, clears manual state, and preserves lifecycle metadata', () => {
    let order = createWordPressOrder(makeWordPressPayload())
    order = {
      ...order,
      id: 'id-1',
      confirmed: true,
      confirmedBy: 'operator',
      confirmedAt: new Date('2026-01-10T12:00:00.000Z'),
      receivedAt: new Date('2026-01-10T11:00:00.000Z'),
      canceledAt: new Date('2026-01-11T11:00:00.000Z'),
      deletedAt: new Date('2026-01-12T11:00:00.000Z'),
      markedForDeletion: true,
      invoiceNumber: 'invoice-1',
      calendarEventIds: {
        main: 'event-1',
        boxDelivery: 'delivery-event-1',
        boxReturn: 'return-event-1',
      },
    }
    const changed = updateOrderField(order, 'address', { street: 'edited', floor: 0, elevator: false })
    const manual = setManualPricing(changed, 'price', 999)
    const snapshot = manual.initialSnapshot
    const reverted = revertToInitial(manual)

    expect(reverted.address).toEqual(snapshot.address)
    expect(reverted.date).toEqual(snapshot.date)
    expect(reverted.boxes).toEqual(snapshot.boxes)
    expect(reverted.pricing.source).toEqual({ price: 'initial', fees: 'initial', boxesPrice: 'initial' })
    expect(reverted.pricing.manual).toEqual({ price: null, fees: null, boxesPrice: null })
    expect(reverted.price).toBe(snapshot.price)
    expect(reverted.fees).toEqual(snapshot.fees)
    expect(reverted.boxesPrice).toBe(snapshot.boxesPrice)
    expect(reverted.id).toBe('id-1')
    expect(reverted).not.toHaveProperty('_id')
    expect(reverted.confirmed).toBe(true)
    expect(reverted.confirmedBy).toBe('operator')
    expect(reverted.confirmedAt).toEqual(new Date('2026-01-10T12:00:00.000Z'))
    expect(reverted.receivedAt).toEqual(new Date('2026-01-10T11:00:00.000Z'))
    expect(reverted.canceledAt).toEqual(new Date('2026-01-11T11:00:00.000Z'))
    expect(reverted.deletedAt).toEqual(new Date('2026-01-12T11:00:00.000Z'))
    expect(reverted.markedForDeletion).toBe(true)
    expect(reverted.invoiceNumber).toBe('invoice-1')
    expect(reverted.calendarEventIds).toEqual({
      main: 'event-1',
      boxDelivery: 'delivery-event-1',
      boxReturn: 'return-event-1',
    })
    expect(reverted.initialSnapshot).toBe(snapshot)
    expect(revertToInitial(reverted)).toEqual(reverted)
    expect(() => revertToInitial(createAppOrder())).toThrow(/do not have an initial snapshot/i)
  })

  it('uses automatic sources after reverting missing imported components', () => {
    const order = createWordPressOrder(makeWordPressPayloadMissingPricing())
    const reverted = revertToInitial(updateOrderField(order, 'name', 'edited'))

    expect(reverted.pricing.source).toEqual({ price: 'auto', fees: 'auto', boxesPrice: 'auto' })
    expect(reverted.name).toBe(order.initialSnapshot.name)
  })

  it('shares untouched lifecycle values and isolates restored mutable values', () => {
    const order = {
      ...createWordPressOrder(makeWordPressPayload()),
      confirmedAt: new Date('2026-01-10T12:00:00.000Z'),
      extraState: { keep: true },
    }
    const snapshot = order.initialSnapshot
    const reverted = revertToInitial(order)

    expect(reverted.initialSnapshot).toBe(snapshot)
    expect(reverted.confirmedAt).toBe(order.confirmedAt)
    expect(reverted.extraState).toBe(order.extraState)
    expect(reverted.service).not.toBe(snapshot.service)
    expect(reverted.boxes).not.toBe(snapshot.boxes)
    expect(reverted.fees).not.toBe(snapshot.fees)

    reverted.address.street = 'changed after revert'
    reverted.boxes.amount = 99
    reverted.fees[0].amount = 99
    expect(snapshot.address.street).not.toBe('changed after revert')
    expect(snapshot.boxes.amount).toBe(10)
    expect(snapshot.fees[0].amount).toBe(15)
  })
})
