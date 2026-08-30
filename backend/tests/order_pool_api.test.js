import supertest from 'supertest'
import app from '../app.js'
import Order from '../models/order.js'
import { generateJWT } from '../modules/authentication/auth.middleware.js'
import useTestDatabase from './database_harness.js'

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

function makeUpdateOrder(overrides = {}) {
  const booking = {
    distance: 'insideCapital',
    hsy: false,
    XL: false,
    eventColor: '1',
    date: new Date('2026-04-10T08:00:00.000Z'),
    duration: 2,
    service: { id: '1', name: 'Service', pricePerHour: 50 },
    paymentType: { id: '1', name: 'Card', fee: 0 },
    address: makeMinimalAddress('Update start 1'),
    extraAddresses: [],
    destination: makeMinimalAddress('Update end 2'),
    boxes: {
      amount: 2,
      deliveryDate: new Date('2026-04-10T08:00:00.000Z'),
      returnDate: new Date('2026-04-12T08:00:00.000Z'),
    },
    name: 'Update Customer',
    email: 'update@example.com',
    phone: '+358401112233',
    comment: 'Keep this comment.',
  }

  const snapshot = {
    ...booking,
    fees: [{ name: 'Imported fee', amount: 11 }],
    boxesPrice: 22,
    price: 133,
  }

  return new Order({
    ...booking,
    origin: 'wordpress',
    initialSnapshot: snapshot,
    pricing: {
      source: { price: 'initial', fees: 'initial', boxesPrice: 'initial' },
      manual: { price: null, fees: null, boxesPrice: null },
    },
    price: 133,
    fees: snapshot.fees,
    boxesPrice: 22,
    ...overrides,
  })
}

const completePricing = (source, manual) => ({
  source: {
    price: source?.price || 'auto',
    fees: source?.fees || 'auto',
    boxesPrice: source?.boxesPrice || 'auto',
  },
  manual: {
    price: manual?.price ?? null,
    fees: manual?.fees ?? null,
    boxesPrice: manual?.boxesPrice ?? null,
  },
})

describe('Order pool v2/add', () => {
  afterEach(async () => {
    await Order.deleteMany({ name: { $in: ['WordPress Order', 'WordPress Auto Order', 'App Order'] } })
  })

  function makeOrder(overrides = {}) {
    return {
      date: '2026-04-10T08:00:00.000Z',
      duration: 2,
      service: { id: 'external-service', name: 'Service', pricePerHour: 50 },
      paymentType: { id: 'external-payment', name: 'Card', fee: 0 },
      address: makeMinimalAddress('Start street 1'),
      extraAddresses: [],
      destination: makeMinimalAddress('End street 2'),
      name: 'WordPress Order',
      email: 'order@example.com',
      phone: '+358401112233',
      comment: 'Call on arrival.',
      boxes: {
        amount: 2,
        deliveryDate: '2026-04-10T08:00:00.000Z',
        returnDate: '2026-04-12T08:00:00.000Z',
      },
      ...overrides,
    }
  }

  test('key creates a WordPress order with an immutable imported snapshot', async () => {
    const res = await api
      .post('/api/order-pool/v2/add')
      .send({
        key,
        order: makeOrder({
          origin: 'app',
          fees: [{ name: 'Imported fee', amount: 11 }],
          boxesPrice: 22,
          price: 133,
        }),
      })
      .expect(200)

    expect(res.body).toHaveProperty('id')
    expect(res.body.id).toEqual(expect.any(String))

    const saved = await Order.findById(res.body.id).lean()
    expect(saved).toBeTruthy()
    expect(saved.origin).toBe('wordpress')
    expect(saved.initialSnapshot).toMatchObject({
      price: 133,
      boxesPrice: 22,
      fees: [{ name: 'Imported fee', amount: 11 }],
    })
    expect(saved.pricing.source).toEqual({
      price: 'initial',
      fees: 'initial',
      boxesPrice: 'initial',
    })
    expect(saved.price).toBe(133)
    expect(saved.boxesPrice).toBe(22)
    expect(saved.fees).toEqual([{ name: 'Imported fee', amount: 11 }])
    expect(saved.receivedAt).toBeInstanceOf(Date)
    expect(saved.invoiceNumber).toMatch(/^20260410\d{4}$/)
  })

  test('uses automatic pricing when WordPress omits imported components', async () => {
    const res = await api
      .post('/api/order-pool/v2/add')
      .send({
        key,
        order: makeOrder({ name: 'WordPress Auto Order' }),
      })
      .expect(200)

    const saved = await Order.findById(res.body.id).lean()

    expect(saved.origin).toBe('wordpress')
    expect(saved.initialSnapshot).not.toHaveProperty('price')
    expect(saved.initialSnapshot).not.toHaveProperty('fees')
    expect(saved.initialSnapshot).not.toHaveProperty('boxesPrice')
    expect(saved.pricing.source).toEqual({ price: 'auto', fees: 'auto', boxesPrice: 'auto' })
    expect(saved.price).toEqual(expect.any(Number))
    expect(saved.boxesPrice).toEqual(expect.any(Number))
    expect(saved.fees).toEqual(expect.any(Array))
  })

  test('authenticated app creation uses only booking fields and automatic pricing', async () => {
    const res = await api
      .post('/api/order-pool/v2/add')
      .set('Cookie', [`at=${appToken}`])
      .send({
        order: makeOrder({
          name: 'App Order',
          origin: 'app',
          confirmed: true,
          receivedAt: '1999-01-01T00:00:00.000Z',
          invoiceNumber: 'attacker-invoice',
          price: 999999,
          fees: [{ name: 'Injected fee', amount: 999999 }],
          boxesPrice: 999999,
          pricing: { source: { price: 'manual' } },
        }),
      })
      .expect(200)

    const saved = await Order.findById(res.body.id).lean()

    expect(saved.origin).toBe('app')
    expect(saved.initialSnapshot).toBeNull()
    expect(saved.pricing.source).toEqual({ price: 'auto', fees: 'auto', boxesPrice: 'auto' })
    expect(saved.price).not.toBe(999999)
    expect(saved.boxesPrice).not.toBe(999999)
    expect(saved.fees).not.toEqual([{ name: 'Injected fee', amount: 999999 }])
    expect(saved.confirmed).toBe(false)
    expect(saved.receivedAt).not.toEqual(new Date('1999-01-01T00:00:00.000Z'))
    expect(saved.invoiceNumber).not.toBe('attacker-invoice')
  })

  test.each([
    ['without authentication', {}, 403],
    ['with a JSON-string order', { key, order: JSON.stringify(makeOrder()) }, 400],
    [
      'with an injected snapshot',
      { key, order: makeOrder({ initialSnapshot: { price: 1 } }) },
      400,
    ],
    [
      'with an invalid app origin',
      { order: makeOrder({ origin: 'wordpress' }) },
      400,
    ],
  ])('rejects create request %s', async (_description, payload, status) => {
    const request = api.post('/api/order-pool/v2/add')
    if (payload.order && payload.order.origin === 'wordpress') request.set('Cookie', [`at=${appToken}`])

    await request.send(payload).expect(status)
  })

  test('rejects a missing app origin even for an authenticated request', async () => {
    await api
      .post('/api/order-pool/v2/add')
      .set('Cookie', [`at=${appToken}`])
      .send({ order: makeOrder({ name: 'App Order', origin: undefined }) })
      .expect(400)
  })

  test('rejects snapshot injection from an authenticated app request', async () => {
    await api
      .post('/api/order-pool/v2/add')
      .set('Cookie', [`at=${appToken}`])
      .send({
        order: makeOrder({
          name: 'App Order',
          origin: 'app',
          initialSnapshot: null,
        }),
      })
      .expect(400)
  })

  test('key origin wins over a client origin value', async () => {
    const res = await api
      .post('/api/order-pool/v2/add')
      .send({ key, order: makeOrder({ name: 'WordPress Auto Order', origin: 'invalid' }) })
      .expect(200)

    const saved = await Order.findById(res.body.id).lean()
    expect(saved.origin).toBe('wordpress')
  })

  test('does not retain legacy aliases or client projections in an app order', async () => {
    const res = await api
      .post('/api/order-pool/v2/add')
      .set('Cookie', [`at=${appToken}`])
      .send({
        order: makeOrder({
          name: 'App Order',
          origin: 'app',
          from: makeMinimalAddress('Legacy start'),
          to: makeMinimalAddress('Legacy end'),
          servicePrice: 500,
          number: 10,
          date: '2026-04-10T08:00:00.000Z',
        }),
      })
      .expect(200)

    const saved = await Order.findById(res.body.id).lean()
    expect(saved.address.street).toBe('Start street 1')
    expect(saved.destination.street).toBe('End street 2')
    expect(saved).not.toHaveProperty('from')
    expect(saved).not.toHaveProperty('to')
    expect(saved).not.toHaveProperty('servicePrice')
    expect(saved).not.toHaveProperty('number')
  })
})

describe('Order pool v2 list', () => {
  const orderIds = []

  async function createListOrder(name, overrides = {}) {
    const order = await new Order({
      date: new Date('2026-04-10T08:00:00.000Z'),
      duration: 2,
      service: { id: 'list-service', name: 'Service', pricePerHour: 50 },
      paymentType: { id: 'list-payment', name: 'Card', fee: 0 },
      address: makeMinimalAddress(`${name} start`),
      destination: makeMinimalAddress(`${name} end`),
      name,
      email: `${name.toLowerCase().replaceAll(' ', '-')}@example.com`,
      phone: '+358401112233',
      boxes: {
        amount: 1,
        deliveryDate: new Date('2026-04-10T08:00:00.000Z'),
        returnDate: new Date('2026-04-12T08:00:00.000Z'),
      },
      ...overrides,
    }).save()

    orderIds.push(order.id)
    return order
  }

  afterEach(async () => {
    await Order.deleteMany({ _id: { $in: orderIds } })
    orderIds.length = 0
  })

  test('supports first page, a single later page, and accumulated pages', async () => {
    for (let index = 1; index <= 41; index += 1) {
      await createListOrder(`Active page ${index}`)
    }

    const pageOne = await api
      .get('/api/order-pool/v2/?deleted=false&pages[]=1')
      .set('Cookie', [`at=${appToken}`])
      .expect(200)
    const pageTwo = await api
      .get('/api/order-pool/v2/?deleted=false&pages[]=2')
      .set('Cookie', [`at=${appToken}`])
      .expect(200)
    const accumulated = await api
      .get('/api/order-pool/v2/?deleted=false&pages[]=1&pages[]=2')
      .set('Cookie', [`at=${appToken}`])
      .expect(200)

    expect(pageOne.body.limitPerPage).toBe(20)
    expect(pageOne.body.orders).toHaveLength(20)
    expect(pageTwo.body.orders).toHaveLength(20)
    expect(pageOne.body.orders[0].name).toBe('Active page 41')
    expect(pageOne.body.orders[19].name).toBe('Active page 22')
    expect(pageTwo.body.orders[0].name).toBe('Active page 21')
    expect(pageTwo.body.orders[19].name).toBe('Active page 2')
    expect(accumulated.body.orders.map((order) => order.id)).toEqual([
      ...pageOne.body.orders,
      ...pageTwo.body.orders,
    ].map((order) => order.id))
  })

  test('filters deleted orders for pagination and range queries', async () => {
    for (let index = 1; index <= 20; index += 1) {
      await createListOrder(`Deleted page ${index}`, {
        date: new Date('2026-05-10T08:00:00.000Z'),
        deletedAt: new Date(),
        boxes: {
          amount: 1,
          deliveryDate: new Date('2026-05-10T08:00:00.000Z'),
          returnDate: new Date('2026-05-12T08:00:00.000Z'),
        },
      })
    }
    await createListOrder('Range active date', { date: new Date('2026-04-15T08:00:00.000Z') })
    await createListOrder('Range active box', {
      date: new Date('2026-05-15T08:00:00.000Z'),
      boxes: {
        amount: 1,
        deliveryDate: new Date('2026-04-16T08:00:00.000Z'),
        returnDate: new Date('2026-04-17T08:00:00.000Z'),
      },
    })
    await createListOrder('Range active date-only box', {
      date: new Date('2026-05-20T08:00:00.000Z'),
      boxes: {
        amount: 1,
        deliveryDate: '2026-04-18',
        returnDate: '2026-04-19',
      },
    })
    await createListOrder('Range deleted', {
      date: new Date('2026-04-15T08:00:00.000Z'),
      deletedAt: new Date(),
    })

    const inbox = await api
      .get('/api/order-pool/v2/?deleted=false&pages[]=1')
      .set('Cookie', [`at=${appToken}`])
      .expect(200)
    const trash = await api
      .get('/api/order-pool/v2/?deleted=true&pages[]=2')
      .set('Cookie', [`at=${appToken}`])
      .expect(200)
    const rangeInbox = await api
      .get(
        '/api/order-pool/v2/?from=2026-04-01T00%3A00%3A00.000Z&to=2026-04-30T23%3A59%3A59.999Z&deleted=false',
      )
      .set('Cookie', [`at=${appToken}`])
    expect(rangeInbox.status).toBe(200)
    const rangeTrash = await api
      .get(
        '/api/order-pool/v2/?from=2026-04-01T00%3A00%3A00.000Z&to=2026-04-30T23%3A59%3A59.999Z&deleted=true',
      )
      .set('Cookie', [`at=${appToken}`])
      .expect(200)

    expect(inbox.body.orders.map((order) => order.name)).toEqual([
      'Range active date-only box',
      'Range active box',
      'Range active date',
    ])
    expect(trash.body.orders).toHaveLength(1)
    expect(trash.body.orders[0].name).toBe('Deleted page 1')
    expect(rangeInbox.body.orders.map((order) => order.name)).toEqual([
      'Range active date-only box',
      'Range active box',
      'Range active date',
    ])
    expect(rangeTrash.body.orders.map((order) => order.name)).toEqual(['Range deleted'])
  })

  test.each([
    ['zero page', '/api/order-pool/v2/?pages[]=0'],
    ['fractional page', '/api/order-pool/v2/?pages[]=1.5'],
    ['non-numeric page', '/api/order-pool/v2/?pages[]=later'],
    ['partial range', '/api/order-pool/v2/?from=2026-04-01'],
  ])('rejects %s', async (_description, url) => {
    await api.get(url).set('Cookie', [`at=${appToken}`]).expect(400)
  })
})

describe('Order pool permanent delete', () => {
  const at = generateJWT(
    { name: 'Tester', username: 'tester', id: '123456789' },
    { expiresIn: '10m' }
  )

  let orderId = null

  afterEach(async () => {
    if (orderId) {
      await Order.findByIdAndDelete(orderId)
      orderId = null
    }
  })

  test('deletes order from database by /v2/delete-permanent/:id', async () => {
    const created = await new Order({
      date: '2026-04-10T08:00:00.000Z',
      duration: 2,
      service: { id: '1', name: 'Service', pricePerHour: 50, price: 100 },
      paymentType: { id: '1', name: 'Card', fee: 0 },
      address: makeMinimalAddress('Permanent delete start 1'),
      destination: makeMinimalAddress('Permanent delete end 2'),
      name: 'Permanent Delete Order',
      email: 'permanent@example.com',
      phone: '+358401112233',
    }).save()

    orderId = created.id

    await api
      .delete(`/api/order-pool/v2/delete-permanent/${orderId}`)
      .set('Cookie', [`at=${at}`])
      .expect(200)

    const fromDb = await Order.findById(orderId).lean()
    expect(fromDb).toBeNull()

    orderId = null
  })
})

describe('Order pool v2/:id read and partial update', () => {
  const orderIds = []

  async function createOrder(overrides = {}) {
    const order = await makeUpdateOrder(overrides).save()
    orderIds.push(order.id)
    return order
  }

  afterEach(async () => {
    await Order.deleteMany({ _id: { $in: orderIds } })
    orderIds.length = 0
  })

  test.each(['get', 'put'])('rejects unauthenticated %s requests', async (method) => {
    const order = await createOrder()
    const request = method === 'get'
      ? api.get(`/api/order-pool/v2/${order.id}`)
      : api.put(`/api/order-pool/v2/${order.id}`).send({ updateData: { name: 'Nope' } })

    await request.expect(403)
  })

  test('returns an order from an authenticated GET', async () => {
    const order = await createOrder()

    const res = await api
      .get(`/api/order-pool/v2/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .expect(200)

    expect(res.body.order.id).toBe(order.id)
    expect(res.body.order.origin).toBe('wordpress')
    expect(res.body.order.initialSnapshot).toBeTruthy()
  })

  test('updates only supplied booking fields and preserves lifecycle metadata', async () => {
    const order = await createOrder({
      confirmed: true,
      confirmedBy: '66c000000000000000000002',
      confirmedAt: new Date('2026-04-10T09:00:00.000Z'),
      receivedAt: new Date('2026-04-10T07:00:00.000Z'),
      canceledAt: new Date('2026-04-11T09:00:00.000Z'),
      deletedAt: new Date('2026-04-12T09:00:00.000Z'),
      markedForDeletion: true,
      invoiceNumber: 'invoice-1',
      googleEventId: 'google-event-1',
    })

    const res = await api
      .put(`/api/order-pool/v2/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .send({ updateData: { name: 'Updated Customer' } })
      .expect(200)

    expect(res.body.order.name).toBe('Updated Customer')
    expect(res.body.order.comment).toBe('Keep this comment.')
    expect(res.body.order.confirmed).toBe(true)
    expect(res.body.order.invoiceNumber).toBe('invoice-1')
    expect(res.body.order.origin).toBe('wordpress')
    expect(res.body.order.initialSnapshot.name).toBe('Update Customer')
  })

  test('preserves explicit null while omission keeps the existing value', async () => {
    const order = await createOrder()

    await api
      .put(`/api/order-pool/v2/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .send({ updateData: { comment: null } })
      .expect(200)

    const saved = await Order.findById(order.id).lean()
    expect(saved.comment).toBeNull()
    expect(saved.name).toBe('Update Customer')
  })

  test('applies pricing before booking changes so dependent edits reset initial sources', async () => {
    const order = await createOrder()

    const res = await api
      .put(`/api/order-pool/v2/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .send({
        updateData: {
          pricing: completePricing(
            { price: 'initial', fees: 'initial', boxesPrice: 'initial' },
            {},
          ),
          duration: 3,
        },
      })
      .expect(200)

    expect(res.body.order.pricing.source).toEqual({
      price: 'auto',
      fees: 'initial',
      boxesPrice: 'initial',
    })
  })

  test('keeps manual pricing sources across dependent booking changes', async () => {
    const order = await createOrder()

    const res = await api
      .put(`/api/order-pool/v2/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .send({
        updateData: {
          pricing: completePricing(
            { price: 'auto', fees: 'manual', boxesPrice: 'manual' },
            { fees: [{ name: 'Manual fee', amount: 10 }], boxesPrice: 20 },
          ),
          service: { id: '1', name: 'Changed service', pricePerHour: 70 },
        },
      })
      .expect(200)

    expect(res.body.order.pricing.source).toEqual({
      price: 'auto',
      fees: 'manual',
      boxesPrice: 'manual',
    })
    expect(res.body.order.fees).toEqual([{ name: 'Manual fee', amount: 10 }])
    expect(res.body.order.boxesPrice).toBe(20)
  })

  test('accepts manual zero and empty fees and materializes them', async () => {
    const order = await createOrder()

    const res = await api
      .put(`/api/order-pool/v2/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .send({
        updateData: {
          pricing: completePricing(
            { price: 'manual', fees: 'manual', boxesPrice: 'manual' },
            { price: 0, fees: [], boxesPrice: 0 },
          ),
        },
      })
      .expect(200)

    expect(res.body.order.price).toBe(0)
    expect(res.body.order.fees).toEqual([])
    expect(res.body.order.boxesPrice).toBe(0)
  })

  test('materializes pricing from the final state of a multi-field update', async () => {
    const order = await createOrder()

    const res = await api
      .put(`/api/order-pool/v2/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .send({
        updateData: {
          service: { id: '2', name: 'Changed service', pricePerHour: 70, multiplier: 1 },
          paymentType: { id: '3', name: 'Invoice', fee: 5 },
          duration: 3,
        },
      })
      .expect(200)

    expect(res.body.order.service.id).toBe('2')
    expect(res.body.order.duration).toBe(3)
    expect(res.body.order.fees).toEqual([
      { name: 'paymentTypeFee', label: 'MAKSUTAPALISÄ', amount: 5 },
    ])
    expect(res.body.order.price).toBe(70 * 3 + 22 + 5)
  })

  test.each([
    ['non-object updateData', { updateData: [] }],
    ['unknown field', { updateData: { madeUp: true } }],
    ['origin', { updateData: { origin: 'app' } }],
    ['initialSnapshot', { updateData: { initialSnapshot: null } }],
    ['active price', { updateData: { price: 99 } }],
    ['active fees', { updateData: { fees: [] } }],
    ['active boxes price', { updateData: { boxesPrice: 99 } }],
    ['lifecycle', { updateData: { confirmed: false } }],
    [
      'manual null',
      {
        updateData: {
          pricing: completePricing(
            { price: 'manual', fees: 'auto', boxesPrice: 'auto' },
            { price: null },
          ),
        },
      },
    ],
    [
      'malformed manual fee',
      {
        updateData: {
          pricing: completePricing(
            { price: 'auto', fees: 'manual', boxesPrice: 'auto' },
            { fees: [{ name: 'bad', amount: 'not-a-number' }] },
          ),
        },
      },
    ],
  ])('rejects %s with 400', async (_description, payload) => {
    const order = await createOrder()

    await api
      .put(`/api/order-pool/v2/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .send(payload)
      .expect(400)
  })

  test('returns 404 for an authenticated missing order', async () => {
    const id = '66c000000000000000000099'

    await api
      .get(`/api/order-pool/v2/${id}`)
      .set('Cookie', [`at=${appToken}`])
      .expect(404)

    await api
      .put(`/api/order-pool/v2/${id}`)
      .set('Cookie', [`at=${appToken}`])
      .send({ updateData: { name: 'Missing' } })
      .expect(404)
  })
})

describe('Order pool v2/:id/revert', () => {
  const orderIds = []

  async function createOrder(overrides = {}) {
    const order = await makeUpdateOrder(overrides).save()
    orderIds.push(order.id)
    return order
  }

  afterEach(async () => {
    await Order.deleteMany({ _id: { $in: orderIds } })
    orderIds.length = 0
  })

  test('requires authentication', async () => {
    const order = await createOrder()

    await api.post(`/api/order-pool/v2/${order.id}/revert`).expect(403)
  })

  test('restores the snapshot, clears manual values, and preserves lifecycle metadata', async () => {
    const order = await createOrder({
      confirmed: true,
      confirmedBy: '66c000000000000000000002',
      confirmedAt: new Date('2026-04-10T09:00:00.000Z'),
      receivedAt: new Date('2026-04-10T07:00:00.000Z'),
      canceledAt: new Date('2026-04-11T09:00:00.000Z'),
      deletedAt: new Date('2026-04-12T09:00:00.000Z'),
      markedForDeletion: true,
      invoiceNumber: 'invoice-revert-1',
      googleEventId: 'google-event-revert-1',
    })

    await api
      .put(`/api/order-pool/v2/${order.id}`)
      .set('Cookie', [`at=${appToken}`])
      .send({
        updateData: {
          name: 'Changed before revert',
          boxes: { amount: 8 },
          pricing: completePricing(
            { price: 'manual', fees: 'manual', boxesPrice: 'manual' },
            { price: 901, fees: [{ name: 'Manual fee', amount: 12 }], boxesPrice: 902 },
          ),
        },
      })
      .expect(200)

    const reverted = await api
      .post(`/api/order-pool/v2/${order.id}/revert`)
      .set('Cookie', [`at=${appToken}`])
      .expect(200)

    expect(reverted.body.order.name).toBe('Update Customer')
    expect(reverted.body.order.boxes.amount).toBe(2)
    expect(reverted.body.order.pricing).toEqual({
      source: { price: 'initial', fees: 'initial', boxesPrice: 'initial' },
      manual: { price: null, fees: null, boxesPrice: null },
    })
    expect(reverted.body.order.price).toBe(133)
    expect(reverted.body.order.fees).toEqual([{ name: 'Imported fee', amount: 11 }])
    expect(reverted.body.order.boxesPrice).toBe(22)
    expect(reverted.body.order.origin).toBe('wordpress')
    expect(reverted.body.order.initialSnapshot).toBeTruthy()
    expect(reverted.body.order.confirmed).toBe(true)
    expect(reverted.body.order.confirmedBy).toBe('66c000000000000000000002')
    expect(reverted.body.order.invoiceNumber).toBe('invoice-revert-1')
    expect(reverted.body.order.googleEventId).toBe('google-event-revert-1')
    expect(reverted.body.order.markedForDeletion).toBe(true)
    expect(reverted.body.order.deletedAt).toBe('2026-04-12T09:00:00.000Z')

    const second = await api
      .post(`/api/order-pool/v2/${order.id}/revert`)
      .set('Cookie', [`at=${appToken}`])
      .expect(200)

    expect(second.body.order).toEqual(reverted.body.order)
  })

  test('uses automatic sources when the snapshot omits pricing components', async () => {
    const source = makeUpdateOrder().toObject().initialSnapshot
    delete source.price
    delete source.fees
    delete source.boxesPrice

    const order = await createOrder({
      initialSnapshot: source,
      pricing: completePricing({ price: 'auto', fees: 'auto', boxesPrice: 'auto' }, {}),
    })

    const res = await api
      .post(`/api/order-pool/v2/${order.id}/revert`)
      .set('Cookie', [`at=${appToken}`])
      .expect(200)

    expect(res.body.order.pricing.source).toEqual({
      price: 'auto',
      fees: 'auto',
      boxesPrice: 'auto',
    })
    expect(res.body.order.pricing.manual).toEqual({ price: null, fees: null, boxesPrice: null })
    expect(res.body.order.price).toEqual(expect.any(Number))
    expect(res.body.order.fees).toEqual(expect.any(Array))
    expect(res.body.order.boxesPrice).toEqual(expect.any(Number))
  })

  test('rejects app-origin orders without a snapshot without changing them', async () => {
    const order = await createOrder({
      origin: 'app',
      initialSnapshot: null,
      pricing: completePricing({ price: 'auto', fees: 'auto', boxesPrice: 'auto' }, {}),
    })
    const before = await Order.findById(order.id).lean()

    const res = await api
      .post(`/api/order-pool/v2/${order.id}/revert`)
      .set('Cookie', [`at=${appToken}`])
      .expect(400)

    expect(res.body.error).toMatch(/do not have an initial snapshot/i)
    const after = await Order.findById(order.id).lean()
    expect(after.name).toBe(before.name)
    expect(after.origin).toBe('app')
    expect(after.initialSnapshot).toBeNull()
  })

  test('returns 404 for an authenticated missing order', async () => {
    await api
      .post('/api/order-pool/v2/66c000000000000000000099/revert')
      .set('Cookie', [`at=${appToken}`])
      .expect(404)
  })
})
