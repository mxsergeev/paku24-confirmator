import supertest from 'supertest'
import app from '../app.js'
import Order from '../models/order.js'
import { generateJWT } from '../modules/authentication/auth.middleware.js'
import useTestDatabase from './database_harness.js'
import { getOrderPricing } from '../../src/shared/orderPricing.js'
import {
  makeAppBooking,
  makeWordPressPayloadMissingPricing,
} from '../../src/shared/testFixtures/orderFixtures.js'

const api = supertest(app)
useTestDatabase()

const key = process.env.ORDER_POOL_KEY || '1234'
const appToken = generateJWT(
  { name: 'Tester', username: 'tester', id: '123456789' },
  { expiresIn: '10m' },
)

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
      returnDate: '2026-04-12T08:00:00.000Z',
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
      metadata: { source: 'wordpress' },
    })
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

    const effective = getOrderPricing(saved)
    expect(effective.price).toEqual(expect.any(Number))
    expect(effective.fees).toEqual(expect.any(Array))
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
      calendarEventIds: { main: 'attacker-event-id' },
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
    expect(saved.confirmed).toBe(false)
    expect(saved.confirmedBy).not.toBe('66c000000000000000000002')
    expect(saved.confirmedAt).not.toEqual(new Date('1999-01-01T00:00:00.000Z'))
    expect(saved.invoiceNumber).not.toBe('attacker-invoice')
    expect(saved.receivedAt).not.toEqual(new Date('1999-01-01T00:00:00.000Z'))
    expect(saved.canceledAt).not.toEqual(new Date('1999-01-02T00:00:00.000Z'))
    expect(saved.deletedAt).not.toEqual(new Date('1999-01-03T00:00:00.000Z'))
    expect(saved.calendarEventIds.main).not.toBe('attacker-event-id')
    expect(saved).not.toHaveProperty('price')
    expect(saved).not.toHaveProperty('fees')
    expect(saved).not.toHaveProperty('boxesPrice')
  })

  test.each([
    ['price', { price: 'bad' }],
    ['fees', { fees: {} }],
    ['fee amount', { fees: [{ name: 'Bad fee', amount: 'bad' }] }],
    ['boxesPrice', { boxesPrice: 'bad' }],
  ])('rejects malformed pricing override: %s', async (_description, pricingOverrides) => {
    await api
      .post('/api/order-pool/v2/add')
      .set('Cookie', [`at=${appToken}`])
      .send({ order: makeOrder({ pricingOverrides }) })
      .expect(400)
  })

  test.each([
    ['duration', { duration: 'garbage' }],
    ['hsy', { hsy: 'false' }],
    ['eventColor', { eventColor: { invalid: true } }],
    ['name', { name: { invalid: true } }],
    ['email', { email: { invalid: true } }],
    ['phone', { phone: { invalid: true } }],
    ['comment', { comment: { invalid: true } }],
    [
      'service.pricePerHour',
      { service: { id: 'external-service', name: 'Service', pricePerHour: 'garbage' } },
    ],
    ['address.floor', { address: { ...makeMinimalAddress('Start street 1'), floor: { invalid: true } } }],
    ['address.elevator', { address: { ...makeMinimalAddress('Start street 1'), elevator: 'false' } }],
  ])('rejects malformed booking value: %s', async (_description, bookingFields) => {
    await api
      .post('/api/order-pool/v2/add')
      .set('Cookie', [`at=${appToken}`])
      .send({ order: makeOrder(bookingFields) })
      .expect(400)
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
    orderIds.push(active.id, deleted.id)

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

  test.each([
    ['non-object updateData', { updateData: [] }],
    ['unknown field', { updateData: { origin: 'app' } }],
    ['derived price', { updateData: { price: 99 } }],
    ['malformed override', { updateData: { pricingOverrides: { price: 'bad' } } }],
    ['malformed duration', { updateData: { duration: 'garbage' } }],
    ['malformed hsy', { updateData: { hsy: 'false' } }],
    ['malformed eventColor', { updateData: { eventColor: { invalid: true } } }],
    ['unknown eventColor', { updateData: { eventColor: 'not-configured' } }],
    ['malformed name', { updateData: { name: { invalid: true } } }],
    ['malformed email', { updateData: { email: { invalid: true } } }],
    ['malformed phone', { updateData: { phone: { invalid: true } } }],
    ['malformed comment', { updateData: { comment: { invalid: true } } }],
    [
      'malformed service.pricePerHour',
      { updateData: { service: { id: 'external-service', name: 'Service', pricePerHour: 'garbage' } } },
    ],
    [
      'malformed address.floor',
      { updateData: { address: { ...makeMinimalAddress('Start street 1'), floor: { invalid: true } } } },
    ],
    [
      'malformed address.elevator',
      { updateData: { address: { ...makeMinimalAddress('Start street 1'), elevator: 'false' } } },
    ],
  ])('rejects %s', async (_description, body) => {
    const order = await createPersistedOrder()
    orderIds.push(order.id)

    await api
      .put(`/api/order-pool/v2/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .send(body)
      .expect(400)
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
      .expect(200)

    expect(await Order.findById(order.id).lean()).toBeNull()
  })
})
