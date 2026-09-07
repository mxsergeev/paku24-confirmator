import axios from 'axios'
import supertest from 'supertest'
import app from '../app.js'
import Order from '../models/order.js'
import { smsOrderPayload } from './test_helper.js'
import { generateJWT } from '../modules/authentication/auth.middleware.js'
import useTestDatabase from './database_harness.js'
import { clearSentCommunications, getSentCommunications } from '../modules/testCommunicationProvider.js'

vi.mock('axios', () => {
  return {
    default: {
      get: vi.fn(),
    },
  }
})

const api = supertest(app)
const at = generateJWT(
  { name: 'Maxim', username: 'Maximus', id: '123456789' },
  { expiresIn: '20s' }
)

useTestDatabase()

const orderIds = []

async function createOrder(overrides = {}) {
  const order = await new Order({
    ...smsOrderPayload,
    confirmed: true,
    ...overrides,
  }).save()
  orderIds.push(order.id)
  return order
}

describe('SMS API', () => {
  beforeEach(() => {
    axios.get.mockReset()
    axios.get.mockResolvedValue({ data: {} })
    clearSentCommunications()
  })

  afterEach(async () => {
    await Order.deleteMany({ _id: { $in: orderIds } })
    orderIds.length = 0
  })

  test('posts a confirmation when authenticated', async () => {
    const order = await createOrder()

    await api
      .post('/api/sms')
      .set('Cookie', [`at=${at}`])
      .send({ orderId: order.id })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(getSentCommunications().sms).toEqual(expect.arrayContaining([
      expect.objectContaining({ phone: order.phone }),
    ]))
    expect(axios.get).not.toHaveBeenCalled()
  })

  test('returns 403 when access token is missing', async () => {
    const order = await createOrder()

    await api.post('/api/sms').send({ orderId: order.id }).expect(403)
    expect(axios.get).not.toHaveBeenCalled()
  })

  test('forwards helper errors', async () => {
    const overflowingOrder = await createOrder({ comment: 'A'.repeat(1000) })

    await api
      .post('/api/sms')
      .set('Cookie', [`at=${at}`])
      .send({ orderId: overflowingOrder.id })
      .expect(500)
      .then((res) => {
        expect(res.text).toMatch(/exceeds the limit/)
      })

    expect(axios.get).not.toHaveBeenCalled()
  })
})
