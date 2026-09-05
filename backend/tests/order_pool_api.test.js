import supertest from 'supertest'
import app from '../app.js'
import Order from '../models/order.js'
import User from '../models/user.js'
import { generateJWT } from '../modules/authentication/auth.middleware.js'
import useTestDatabase from './database_harness.js'
import { getOrderPricing } from '../../src/shared/orderPricing.js'
import {
  makeAppBooking,
  makeWordPressPayloadMissingPricing,
} from '../../src/shared/testFixtures/orderFixtures.js'
import { clear as clearCalendar, failNext as failNextCalendar, getEvents as getCalendarEvents } from '../modules/calendar/testCalendarProvider.js'

const api = supertest(app)
useTestDatabase()

const key = process.env.ORDER_POOL_KEY || '1234'
const appToken = generateJWT(
  { name: 'Tester', username: 'tester', id: '66c000000000000000000001' },
  { expiresIn: '10m' },
)

afterEach(() => {
  clearCalendar()
})

function makeMinimalAddress(street) {
  return {
    street,
    index: '00100',
    city: 'Helsinki',
    floor: 1,
    elevator: false,
  }
}

function makeOrder(overrides = {}) {
  return {
    distance: 'insideCapital',
    hsy: false,
    eventColor: '1',
    date: '2026-04-10T08:00:00.000Z',
    duration: 2,
    service: { id: 'external-service', name: 'Service', pricePerHour: 50 },
    paymentType: { id: 'external-payment', name: 'Card', fee: 0 },
    address: makeMinimalAddress('Start street 1'),
    extraAddresses: [],
    destination: makeMinimalAddress('End street 2'),
    boxes: {
      amount: 2,
      deliveryDate: '2026-04-10T08:00:00.000Z',
      deliveryHasTime: true,
      returnDate: '2026-04-12T08:00:00.000Z',
      returnHasTime: true,
    },
    name: 'API Order',
    email: 'order@example.com',
    phone: '+358401112233',
    comment: 'Call on arrival.',
    ...overrides,
  }
}

async function createPersistedOrder(overrides = {}) {
  return new Order({
    ...makeOrder(),
    originalOrder: { source: 'wordpress', name: 'Original name' },
    pricingOverrides: { price: null, fees: null, boxesPrice: null },
    ...overrides,
  }).save()
}

describe('Removed public calendar synchronization API', () => {
  test('does not expose the legacy direct calendar route', async () => {
    await api
      .post('/api/calendar')
      .set('Cookie', [`at=${appToken}`])
      .send({ orderId: '66c000000000000000000001' })
      .expect(404)
  })
})

describe('Order pool v2/add', () => {
  const names = []

  afterEach(async () => {
    await Order.deleteMany({ name: { $in: names } })
    names.length = 0
  })

  test('key creates an editable WordPress order with an immutable reference', async () => {
    const source = makeWordPressPayloadMissingPricing({
      name: 'WordPress Order',
      price: 'legacy-price',
      fees: { legacy: 'shape' },
      boxesPrice: ['old'],
      boxes: {
        ...makeWordPressPayloadMissingPricing().boxes,
        pricePerBox: 'old',
        deliveryPrice: { old: true },
        returnPrice: 'not-a-number',
      },
      metadata: { source: 'wordpress' },
    })
    source.service.details = { source: 'wordpress' }
    source.paymentType.details = { source: 'wordpress' }
    names.push(source.name)

    const res = await api
      .post('/api/order-pool/v2/add')
      .send({ key, order: source })
      .expect(200)

    const saved = await Order.findById(res.body.id).lean()
    expect(saved.originalOrder).toEqual(source)
    expect(saved.pricingOverrides).toEqual({ price: null, fees: null, boxesPrice: null })
    expect(saved).not.toHaveProperty('origin')
    expect(saved).not.toHaveProperty('price')
    expect(saved).not.toHaveProperty('fees')
    expect(saved).not.toHaveProperty('boxesPrice')
    expect(saved.boxes).not.toHaveProperty('pricePerBox')
    expect(saved.boxes).not.toHaveProperty('deliveryPrice')
    expect(saved.boxes).not.toHaveProperty('returnPrice')
    expect(saved.service).not.toHaveProperty('details')
    expect(saved.paymentType).not.toHaveProperty('details')

    const effective = getOrderPricing(saved)
    expect(effective.price).toEqual(expect.any(Number))
    expect(effective.fees).toEqual(expect.any(Array))
    expect(effective.price).not.toBe('legacy-price')
  })

  test('key preserves WordPress scalar casting semantics', async () => {
    const source = makeWordPressPayloadMissingPricing({
      name: 12345,
      email: 67890,
      phone: 401112233,
      comment: 42,
    })
    names.push(String(source.name))

    const res = await api
      .post('/api/order-pool/v2/add')
      .send({ key, order: source })
      .expect(200)

    const saved = await Order.findById(res.body.id).lean()
    expect(saved.originalOrder).toEqual(source)
    expect(saved.name).toBe(String(source.name))
    expect(saved.email).toBe(String(source.email))
    expect(saved.phone).toBe(String(source.phone))
    expect(saved.comment).toBe(String(source.comment))
  })

  test('key accepts a no-box WordPress order with only legacy box pricing metadata', async () => {
    const source = makeWordPressPayloadMissingPricing({
      name: 'WordPress No Boxes Legacy Pricing Order',
      boxes: {
        pricePerBox: 'legacy',
        deliveryPrice: { ancient: true },
      },
    })
    names.push(source.name)

    const res = await api
      .post('/api/order-pool/v2/add')
      .send({ key, order: source })
      .expect(200)

    const saved = await Order.findById(res.body.id).lean()
    expect(saved.originalOrder.boxes).toEqual(source.boxes)
    expect(saved.boxes).toMatchObject({ amount: 0 })
    expect(saved.boxes).not.toHaveProperty('pricePerBox')
    expect(saved.boxes).not.toHaveProperty('deliveryPrice')
    expect(saved.boxes).not.toHaveProperty('returnPrice')
    expect(saved.pricingOverrides).toEqual({ price: null, fees: null, boxesPrice: null })
    expect(getOrderPricing(saved).price).toEqual(expect.any(Number))
  })

  test('authenticated app creation persists manual pricing overrides', async () => {
    const source = makeOrder({
      name: 'App Manual Pricing Order',
      pricingOverrides: { price: 220, fees: [], boxesPrice: 40 },
    })
    names.push(source.name)

    const res = await api
      .post('/api/order-pool/v2/add')
      .set('Cookie', [`at=${appToken}`])
      .send({ order: source })
      .expect(200)

    const saved = await Order.findById(res.body.id).lean()
    expect(saved.pricingOverrides).toEqual({ price: 220, fees: [], boxesPrice: 40 })
    expect(getOrderPricing(saved)).toEqual({ price: 220, fees: [], boxesPrice: 40 })
    expect(saved.originalOrder).toBeNull()
  })

  test('authenticated app creation confirms the order and creates deterministic calendar events', async () => {
    const source = makeOrder({ name: 'App Calendar Order' })
    names.push(source.name)

    const res = await api
      .post('/api/order-pool/v2/add')
      .set('Cookie', [`at=${appToken}`])
      .send({ order: source })
      .expect(200)

    const events = getCalendarEvents()
    expect(res.body.warning).toBeNull()
    expect(events.map((event) => event.id).sort()).toEqual([
      `paku24${res.body.id}d`,
      `paku24${res.body.id}m`,
      `paku24${res.body.id}r`,
    ])
    const saved = await Order.findById(res.body.id).lean()
    expect(saved.confirmed).toBe(true)
    expect(saved.confirmedBy.toString()).toBe('66c000000000000000000001')
  })

  test('WordPress imports remain unconfirmed and have no calendar events', async () => {
    const source = makeWordPressPayloadMissingPricing({ name: 'WordPress Calendar Order' })
    names.push(source.name)

    const res = await api.post('/api/order-pool/v2/add').send({ key, order: source }).expect(200)
    expect(getCalendarEvents()).toEqual([])
    expect((await Order.findById(res.body.id).lean()).confirmed).toBe(false)
  })

  test('composes effective pricing from persisted manual components when total is automatic', async () => {
    const source = makeOrder({
      name: 'App Composed Pricing Order',
      boxes: { ...makeOrder().boxes, amount: 0 },
      pricingOverrides: {
        price: null,
        fees: [{ name: 'Manual fee', amount: 10 }],
        boxesPrice: 20,
      },
    })
    names.push(source.name)

    const res = await api
      .post('/api/order-pool/v2/add')
      .set('Cookie', [`at=${appToken}`])
      .send({ order: source })
      .expect(200)

    const saved = await Order.findById(res.body.id).lean()
    expect(saved.pricingOverrides).toEqual({
      price: null,
      fees: [{ name: 'Manual fee', amount: 10 }],
      boxesPrice: 20,
    })
    expect(getOrderPricing(saved)).toEqual({
      price: 130,
      fees: [{ name: 'Manual fee', amount: 10 }],
      boxesPrice: 20,
    })
  })

  test('authenticated app creation preserves explicit zero and no-fees overrides', async () => {
    const source = makeOrder({
      name: 'App Zero Pricing Order',
      pricingOverrides: { price: 0, fees: [], boxesPrice: 0 },
    })
    names.push(source.name)

    const res = await api
      .post('/api/order-pool/v2/add')
      .set('Cookie', [`at=${appToken}`])
      .send({ order: source })
      .expect(200)

    const saved = await Order.findById(res.body.id).lean()
    expect(saved.pricingOverrides).toEqual({ price: 0, fees: [], boxesPrice: 0 })
    expect(getOrderPricing(saved)).toEqual({ price: 0, fees: [], boxesPrice: 0 })
  })

  test('authenticated app creation ignores lifecycle, reference, and derived pricing fields', async () => {
    const source = makeOrder({
      name: 'App Order',
      confirmed: true,
      confirmedBy: '66c000000000000000000002',
      confirmedAt: '1999-01-01T00:00:00.000Z',
      receivedAt: '1999-01-01T00:00:00.000Z',
      canceledAt: '1999-01-02T00:00:00.000Z',
      deletedAt: '1999-01-03T00:00:00.000Z',
      invoiceNumber: 'attacker-invoice',
      originalOrder: { injected: true },
      pricingOverrides: { price: 220, fees: [], boxesPrice: 40 },
      price: 999999,
      fees: [{ name: 'Injected fee', amount: 999999 }],
      boxesPrice: 999999,
    })
    names.push(source.name)

    const res = await api
      .post('/api/order-pool/v2/add')
      .set('Cookie', [`at=${appToken}`])
      .send({ order: source })
      .expect(200)

    const saved = await Order.findById(res.body.id).lean()
    expect(saved.originalOrder).toBeNull()
    expect(saved.pricingOverrides).toEqual({ price: 220, fees: [], boxesPrice: 40 })
    expect(getOrderPricing(saved)).toEqual({ price: 220, fees: [], boxesPrice: 40 })
    expect(saved.confirmed).toBe(true)
    expect(saved.confirmedBy.toString()).toBe('66c000000000000000000001')
    expect(saved.confirmedAt).toEqual(expect.any(Date))
    expect(saved.invoiceNumber).not.toBe('attacker-invoice')
    expect(saved.receivedAt).not.toEqual(new Date('1999-01-01T00:00:00.000Z'))
    expect(saved.canceledAt).not.toEqual(new Date('1999-01-02T00:00:00.000Z'))
    expect(saved.deletedAt).not.toEqual(new Date('1999-01-03T00:00:00.000Z'))
    expect(saved).not.toHaveProperty('price')
    expect(saved).not.toHaveProperty('fees')
    expect(saved).not.toHaveProperty('boxesPrice')
  })

  test('rejects unauthenticated, non-object, and invalid WordPress requests', async () => {
    await api.post('/api/order-pool/v2/add').send({ order: makeOrder() }).expect(403)
    await api
      .post('/api/order-pool/v2/add')
      .send({ key, order: JSON.stringify(makeOrder()) })
      .expect(400)
    await api
      .post('/api/order-pool/v2/add')
      .send({ key, order: makeOrder({ boxes: null }) })
      .expect(400)
  })
})

describe('Order pool listing and reads', () => {
  const orderIds = []

  afterEach(async () => {
    await Order.deleteMany({ _id: { $in: orderIds } })
    orderIds.length = 0
  })

  test('returns an authenticated order without derived pricing fields', async () => {
    const order = await createPersistedOrder()
    orderIds.push(order.id)

    const res = await api
      .get(`/api/order-pool/v2/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .expect(200)

    expect(res.body.order.id).toBe(order.id)
    expect(res.body.order.originalOrder).toEqual({ source: 'wordpress', name: 'Original name' })
    expect(res.body.order).not.toHaveProperty('price')
  })

  test('filters deleted orders by calendar range and rejects legacy pagination', async () => {
    const active = await createPersistedOrder({ name: 'Active listing order' })
    const deleted = await createPersistedOrder({ name: 'Deleted listing order', deletedAt: new Date() })
    const boxOnly = await createPersistedOrder({
      name: 'Box-only listing order',
      date: '2026-05-10T08:00:00.000Z',
      boxes: {
        ...makeOrder().boxes,
        deliveryDate: '2026-04-15T00:00:00.000Z',
        deliveryHasTime: false,
        returnDate: '2026-04-16T08:00:00.000Z',
        returnHasTime: true,
      },
    })
    orderIds.push(active.id, deleted.id, boxOnly.id)

    const reloadedBoxOnly = await Order.findById(boxOnly.id).lean()
    expect(reloadedBoxOnly.boxes.deliveryDate).toEqual(expect.any(Date))
    expect(reloadedBoxOnly.boxes.returnDate).toEqual(expect.any(Date))
    expect(reloadedBoxOnly.boxes.deliveryHasTime).toBe(false)
    expect(reloadedBoxOnly.boxes.returnHasTime).toBe(true)

    const activeResponse = await api
      .get(
        '/api/order-pool/v2/?deleted=false&from=2026-04-01T00:00:00.000Z&to=2026-04-30T00:00:00.000Z',
      )
      .set('Cookie', [`at=${appToken}`])
      .expect(200)
    const deletedResponse = await api
      .get(
        '/api/order-pool/v2/?deleted=true&from=2026-04-01T00:00:00.000Z&to=2026-04-30T00:00:00.000Z',
      )
      .set('Cookie', [`at=${appToken}`])
      .expect(200)

    expect(activeResponse.body.orders.map((item) => item.name)).toContain('Active listing order')
    expect(activeResponse.body.orders.map((item) => item.name)).toContain('Box-only listing order')
    const listedBoxOnly = activeResponse.body.orders.find((item) => item.name === 'Box-only listing order')
    expect(listedBoxOnly.boxes.deliveryDate).toEqual('2026-04-15T00:00:00.000Z')
    expect(listedBoxOnly.boxes.returnDate).toEqual('2026-04-16T08:00:00.000Z')
    expect(listedBoxOnly.boxes.deliveryHasTime).toBe(false)
    expect(listedBoxOnly.boxes.returnHasTime).toBe(true)
    expect(activeResponse.body.orders.map((item) => item.name)).not.toContain('Deleted listing order')
    expect(deletedResponse.body.orders.map((item) => item.name)).toContain('Deleted listing order')
    expect(activeResponse.body).not.toHaveProperty('limitPerPage')

    await api
      .get(
        '/api/order-pool/v2/?from=2026-04-01T00:00:00.000Z&to=2026-04-30T00:00:00.000Z&pages[]=1',
      )
      .set('Cookie', [`at=${appToken}`])
      .expect(400)
  })
})

describe('Order pool v2/:id updates', () => {
  const orderIds = []

  afterEach(async () => {
    await Order.deleteMany({ _id: { $in: orderIds } })
    orderIds.length = 0
  })

  test('updates booking fields while preserving original reference and lifecycle', async () => {
    const order = await createPersistedOrder({
      confirmed: true,
      confirmedBy: '66c000000000000000000002',
      invoiceNumber: 'invoice-1',
    })
    orderIds.push(order.id)

    const res = await api
      .put(`/api/order-pool/v2/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .send({ updateData: { name: 'Updated Customer' } })
      .expect(200)

    expect(res.body.order.name).toBe('Updated Customer')
    expect(res.body.order.originalOrder).toEqual({ source: 'wordpress', name: 'Original name' })
    expect(res.body.order.confirmed).toBe(true)
    expect(res.body.order.invoiceNumber).toBe('invoice-1')
  })

  test('updates event color through the ordinary order endpoint', async () => {
    const order = await createPersistedOrder()
    orderIds.push(order.id)

    const res = await api
      .put(`/api/order-pool/v2/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .send({ updateData: { eventColor: '11' } })
      .expect(200)

    expect(res.body.order.eventColor).toBe('11')
  })

  test('stores manual overrides, including zero and empty fees', async () => {
    const order = await createPersistedOrder()
    orderIds.push(order.id)

    const res = await api
      .put(`/api/order-pool/v2/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .send({ updateData: { pricingOverrides: { price: 0, fees: [], boxesPrice: 0 } } })
      .expect(200)

    expect(res.body.order.pricingOverrides).toEqual({ price: 0, fees: [], boxesPrice: 0 })
    const saved = await Order.findById(order.id).lean()
    expect(getOrderPricing(saved)).toEqual({ price: 0, fees: [], boxesPrice: 0 })
  })

  test('keeps manual overrides when booking data changes', async () => {
    const order = await createPersistedOrder({
      pricingOverrides: { price: 220, fees: [{ name: 'Manual fee', amount: 10 }], boxesPrice: 20 },
    })
    orderIds.push(order.id)

    const res = await api
      .put(`/api/order-pool/v2/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .send({
        updateData: {
          duration: 3,
          service: { id: 'external-service', name: 'Changed service', pricePerHour: 70 },
        },
      })
      .expect(200)

    expect(res.body.order.pricingOverrides).toEqual({
      price: 220,
      fees: [{ name: 'Manual fee', amount: 10 }],
      boxesPrice: 20,
    })
  })

  test('rejects non-object updateData', async () => {
    const order = await createPersistedOrder()
    orderIds.push(order.id)

    await api
      .put(`/api/order-pool/v2/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .send({ updateData: [] })
      .expect(400)
  })

  test.each(['boxes', 'service', 'paymentType', 'date'])('rejects a null structural field: %s', async (field) => {
    const order = await createPersistedOrder()
    orderIds.push(order.id)
    const before = await Order.findById(order.id).lean()

    await api
      .put(`/api/order-pool/v2/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .send({ updateData: { [field]: null } })
      .expect(400)

    const after = await Order.findById(order.id).lean()
    expect(after[field]).toEqual(before[field])
  })

  test('rejects malformed boxes while preserving the valid persisted structure', async () => {
    const order = await createPersistedOrder()
    orderIds.push(order.id)
    const before = await Order.findById(order.id).lean()

    await api
      .put(`/api/order-pool/v2/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .send({
        updateData: {
          boxes: {
            amount: 10,
            deliveryDate: null,
            deliveryHasTime: true,
            returnDate: before.boxes.returnDate,
            returnHasTime: true,
          },
        },
      })
      .expect(400)

    const after = await Order.findById(order.id).lean()
    expect(after.boxes).toEqual(before.boxes)
  })

  test('ignores source-owned and unknown update fields', async () => {
    const order = await createPersistedOrder()
    orderIds.push(order.id)

    await api
      .put(`/api/order-pool/v2/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .send({
        updateData: {
          origin: 'app',
          price: 99,
          confirmed: true,
          originalOrder: { injected: true },
        },
      })
      .expect(200)

    const saved = await Order.findById(order.id).lean()
    expect(saved.confirmed).toBe(false)
    expect(saved.originalOrder).toEqual({ source: 'wordpress', name: 'Original name' })
    expect(saved).not.toHaveProperty('origin')
    expect(saved).not.toHaveProperty('price')
  })

  test('the removed revert route is not available', async () => {
    const order = await createPersistedOrder()
    orderIds.push(order.id)

    await api
      .post(`/api/order-pool/v2/${order.id}/revert`)
      .set('Cookie', [`at=${appToken}`])
      .expect(404)
  })
})

describe('Order pool deletion', () => {
  test('permanently deletes an order after calendar cleanup', async () => {
    const order = await createPersistedOrder({ name: 'Permanent delete order' })

    await api
      .delete(`/api/order-pool/v2/delete-permanent/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .expect(400)
    expect(await Order.findById(order.id).lean()).not.toBeNull()

    await api
      .delete(`/api/order-pool/delete/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .expect(200)

    await api
      .delete(`/api/order-pool/v2/delete-permanent/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .expect(200)

    expect(await Order.findById(order.id).lean()).toBeNull()
  })
})

describe('Order pool calendar reconciliation', () => {
  const orderIds = []

  afterEach(async () => {
    await Order.deleteMany({ _id: { $in: orderIds } })
    orderIds.length = 0
  })

  test('confirmation, edits, cancellation, deletion, and restore converge on stable IDs', async () => {
    const order = await createPersistedOrder({ name: 'Calendar lifecycle order' })
    orderIds.push(order.id)

    await api.put(`/api/order-pool/v2/confirm/${order.id}`).set('Cookie', [`at=${appToken}`]).expect(200)
    expect(getCalendarEvents().map((event) => event.id).sort()).toEqual([
      `paku24${order.id}d`, `paku24${order.id}m`, `paku24${order.id}r`,
    ])

    await api.put(`/api/order-pool/v2/${order.id}`).set('Cookie', [`at=${appToken}`]).send({
      updateData: { name: 'Calendar lifecycle edited' },
    }).expect(200)
    expect(getCalendarEvents()).toHaveLength(3)

    await api.put(`/api/order-pool/v2/cancel/${order.id}`).set('Cookie', [`at=${appToken}`]).expect(200)
    expect(getCalendarEvents().every((event) => event.summary.includes('(CANCELED)'))).toBe(true)

    await api.delete(`/api/order-pool/delete/${order.id}`).set('Cookie', [`at=${appToken}`]).expect(200)
    expect(getCalendarEvents()).toEqual([])

    const accessUser = await User.findOne({ username: 'unicorn123' })
    const accessToken = generateJWT(
      { name: accessUser.name, username: accessUser.username, id: accessUser.id },
      { expiresIn: '10m' },
    )
    await api.post(`/api/order-pool/v2/restore/${order.id}`).set('Cookie', [`at=${accessToken}`]).expect(200)
    expect(getCalendarEvents().map((event) => event.id).sort()).toEqual([
      `paku24${order.id}d`, `paku24${order.id}m`, `paku24${order.id}r`,
    ])
  })

  test('a missing event is recovered and a provider failure returns a stable warning after Mongo saves', async () => {
    const order = await createPersistedOrder({ name: 'Calendar recovery order', confirmed: true })
    orderIds.push(order.id)

    failNextCalendar('update')
    const failed = await api.put(`/api/order-pool/v2/${order.id}`).set('Cookie', [`at=${appToken}`]).send({
      updateData: { name: 'Saved despite calendar failure' },
    }).expect(200)
    expect(failed.body.warning).toEqual({
      code: 'CALENDAR_SYNC_FAILED',
      message: 'Order was saved, but Google Calendar could not be synchronized.',
    })
    expect((await Order.findById(order.id).lean()).name).toBe('Saved despite calendar failure')
    expect(getCalendarEvents()).toEqual([])

    await api.put(`/api/order-pool/v2/${order.id}`).set('Cookie', [`at=${appToken}`]).send({
      updateData: { comment: 'Retry' },
    }).expect(200)
    expect(getCalendarEvents()).toHaveLength(3)
  })
})

describe('Order pool restore', () => {
  const orderIds = []

  afterEach(async () => {
    await Order.deleteMany({ _id: { $in: orderIds } })
    orderIds.length = 0
  })

  test('restores a confirmed deleted order only after recreating Calendar ownership', async () => {
    const order = await createPersistedOrder({
      name: 'Confirmed restore order',
      confirmed: true,
      deletedAt: new Date(),
      canceledAt: new Date(),
    })
    orderIds.push(order.id)
    const accessUser = await User.findOne({ username: 'unicorn123' })
    const accessToken = generateJWT(
      { name: accessUser.name, username: accessUser.username, id: accessUser.id },
      { expiresIn: '10m' },
    )

    await api
      .post(`/api/order-pool/v2/restore/${order.id}`)
      .set('Cookie', [`at=${accessToken}`])
      .expect(200)

    const saved = await Order.findById(order.id).lean()
    expect(saved.confirmed).toBe(true)
    expect(saved.deletedAt).toBeUndefined()
    expect(saved.canceledAt).toBeUndefined()
  })
})
