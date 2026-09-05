import supertest from 'supertest'
import app from '../app.js'
import Order from '../models/order.js'
import useTestDatabase from './database_harness.js'

const api = supertest(app)

import { makeCustomerCommunicationPayload } from '../../src/shared/testFixtures/orderFixtures.js'
import { generateJWT } from '../modules/authentication/auth.middleware.js'
useTestDatabase()

// access token
const at = generateJWT(
  { name: 'Maxim', username: 'Maximus', id: '123456789' },
  { expiresIn: '20s' }
)

const orderIds = []

async function createOrder(overrides = {}) {
  const order = await new Order({
    ...makeCustomerCommunicationPayload(),
    pricingOverrides: { price: 167, fees: [], boxesPrice: 52 },
    confirmed: true,
    ...overrides,
  }).save()
  orderIds.push(order.id)
  return order
}

describe('Email', () => {
  afterEach(async () => {
    await Order.deleteMany({ _id: { $in: orderIds } })
    orderIds.length = 0
  })

  test('confirmation sent', async () => {
    const order = await createOrder()

    await api
      .post('/api/email/send-confirmation')
      .set('Cookie', [`at=${at}`])
      .send({ orderId: order.id })
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })

  test('status code 403 if access token not supplied', async () => {
    const order = await createOrder()

    await api
      .post('/api/email/send-confirmation')
      .send({ orderId: order.id })
      .expect(403)
      .expect('Content-Type', /application\/json/)
  })

  test('requires a persisted order ID instead of a client order payload', async () => {
    await api
      .post('/api/email/send-confirmation')
      .set('Cookie', [`at=${at}`])
      .send({
        email: 'themaximsergeev@gmail.com',
        order: makeCustomerCommunicationPayload(),
        orderDetails: 'legacy confirmation text',
        options: { distance: 'insideCapital' },
      })
      .expect(400)
      .expect('Content-Type', /application\/json/)
  })

  test('rejects a non-object order', async () => {
    await api
      .post('/api/email/send-confirmation')
      .set('Cookie', [`at=${at}`])
      .send({ order: 'legacy confirmation text' })
      .expect(400)
  })

  test('rejects a structured order without a recipient', async () => {
    const order = await createOrder({ email: null })

    await api
      .post('/api/email/send-confirmation')
      .set('Cookie', [`at=${at}`])
      .send({ orderId: order.id })
      .expect(400)
      .expect('Content-Type', /application\/json/)
  })

  test('sends invoice attachments with invoice-specific response text', async () => {
    await api
      .post('/api/email/send-receipt')
      .set('Cookie', [`at=${at}`])
      .send({
        email: 'themaximsergeev@gmail.com',
        documentType: 'invoice',
        pdfBase64: 'data:application/pdf;base64,ZmFrZQ==',
        fileName: 'invoice-2026-001.pdf',
      })
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .expect(({ body }) => {
        expect(body.message).toBe('Invoice sent to themaximsergeev@gmail.com.')
      })
  })
})
