import mongoose from 'mongoose'
import supertest from 'supertest'
import app from '../app.js'
import Order from '../models/order.js'
import { generateJWT } from '../modules/authentication/auth.middleware.js'

const api = supertest(app)

const key = process.env.ORDER_POOL_KEY || '1234'

function makeMinimalAddress(street) {
  return {
    street,
    index: '00100',
    city: 'Helsinki',
    floor: 1,
    elevator: false,
  }
}

describe('Order pool v2/add', () => {
  afterEach(async () => {
    await Order.deleteMany({ name: { $in: ['Legacy Order', 'V2 Order'] } })
  })

  test('accepts regular v2 payload and saves order', async () => {
    const res = await api
      .post('/api/order-pool/v2/add')
      .send({
        key,
        order: {
          date: '2026-04-10T08:00:00.000Z',
          duration: 2,
          service: { id: '1', name: 'Service', pricePerHour: 50, price: 100 },
          paymentType: { id: '1', name: 'Card', fee: 0 },
          address: makeMinimalAddress('Start street 1'),
          destination: makeMinimalAddress('End street 2'),
          name: 'V2 Order',
          email: 'v2@example.com',
          phone: '+358401112233',
          boxes: {
            amount: 2,
            deliveryDate: '2026-04-10T08:00:00.000Z',
            returnDate: '2026-04-12T08:00:00.000Z',
          },
        },
      })
      .expect(200)

    expect(res.body).toHaveProperty('id')

    const saved = await Order.findById(res.body.id).lean()
    expect(saved).toBeTruthy()
    expect(saved.boxes.amount).toBe(2)
    expect(saved.boxes.deliveryDate).toBeTruthy()
    expect(saved.boxes.returnDate).toBeTruthy()
  })

  test('normalizes legacy boxes payload into v2 fields', async () => {
    const res = await api
      .post('/api/order-pool/v2/add')
      .send({
        key,
        order: {
          date: '2026-04-10T08:00:00.000Z',
          duration: 2,
          service: { id: '1', name: 'Service', pricePerHour: 50 },
          servicePrice: 100,
          paymentType: { id: '1', name: 'Card', fee: 0 },
          from: makeMinimalAddress('Legacy start 1'),
          to: makeMinimalAddress('Legacy end 2'),
          name: 'Legacy Order',
          email: 'legacy@example.com',
          phone: '+358409998877',
          boxes: {
            number: 3,
            date: {
              delivery: '2026-04-10T08:00:00.000Z',
              pickup: '2026-04-12T08:00:00.000Z',
            },
          },
        },
      })
      .expect(200)

    const saved = await Order.findById(res.body.id).lean()

    expect(saved.address.street).toBe('Legacy start 1')
    expect(saved.destination.street).toBe('Legacy end 2')
    expect(saved.service.price).toBe(100)
    expect(saved.boxes.amount).toBe(3)
    expect(saved.boxes.deliveryDate).toBeTruthy()
    expect(saved.boxes.returnDate).toBeTruthy()
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

afterAll(async () => {
  mongoose.connection.close()
})
