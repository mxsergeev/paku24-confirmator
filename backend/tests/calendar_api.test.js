import supertest from 'supertest'
import app from '../app.js'
import Order from '../models/order.js'

const api = supertest(app)

import { exampleEvent } from './test_helper.js'
import { generateJWT } from '../modules/authentication/auth.middleware.js'
import useTestDatabase from './database_harness.js'
import { makeCanonicalAppOrder } from '../../src/shared/testFixtures/orderFixtures.js'
import { orderTime } from '../../src/shared/orderPricing.js'

useTestDatabase()

const eventIds = []
const at = generateJWT(
  { name: 'Maxim', username: 'Maximus', id: '123456789' },
  { expiresIn: '20s' }
)

let persistedOrder

beforeEach(async () => {
  persistedOrder = await new Order(makeCanonicalAppOrder()).save()
})

afterEach(async () => {
  if (persistedOrder) await Order.deleteOne({ _id: persistedOrder._id })
  persistedOrder = null
})

describe('Calendar', () => {
  test('event created', async () => {
    await api
      .post('/api/calendar/')
      .set('Cookie', [`at=${at}`])
      .send({ orderId: persistedOrder.id, entry: exampleEvent.entry })
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .then((res) => {
        expect(res.body).toHaveProperty('message')
        expect(res.body).toHaveProperty(
          'createdEvent',
          `🚛🚛💳${orderTime(persistedOrder)}(${persistedOrder.duration}h)${exampleEvent.entry}`,
        )
        expect(res.body).toHaveProperty('eventId')
      })
  })

  test('rejects an unpersisted order body without orderId', async () => {
    await api
      .post('/api/calendar/')
      .set('Cookie', [`at=${at}`])
      .send(exampleEvent)
      .expect(400)
  })

  test('rejects a missing persisted order', async () => {
    await api
      .post('/api/calendar/')
      .set('Cookie', [`at=${at}`])
      .send({ orderId: '66c000000000000000000099', entry: exampleEvent.entry })
      .expect(404)
  })

  test('status code 403 if access token not supplied', async () => {
    await api
      .post('/api/calendar/')
      .send(exampleEvent)
      .expect(403)
      .expect('Content-Type', /application\/json/)
  })
})

afterAll(async () => {
  const promiseArray = eventIds.map((eventId) =>
    api
      .del(`/api/calendar/${eventId}`)
      .set('Cookie', [`at=${at}`])
      .send()
  )
  await Promise.all(promiseArray)
})
