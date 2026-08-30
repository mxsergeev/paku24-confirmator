import supertest from 'supertest'
import app from '../app.js'

const api = supertest(app)

import { makeCustomerCommunicationPayload } from '../../src/shared/testFixtures/orderFixtures.js'
import { generateJWT } from '../modules/authentication/auth.middleware.js'

// access token
const at = generateJWT(
  { name: 'Maxim', username: 'Maximus', id: '123456789' },
  { expiresIn: '20s' }
)

const requestData = {
  email: 'themaximsergeev@gmail.com',
  order: makeCustomerCommunicationPayload(),
}

describe('Email', () => {
  test('confirmation sent', async () => {
    await api
      .post('/api/email/send-confirmation')
      .set('Cookie', [`at=${at}`])
      .send(requestData)
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })

  test('status code 403 if access token not supplied', async () => {
    await api
      .post('/api/email/send-confirmation')
      .send(requestData)
      .expect(403)
      .expect('Content-Type', /application\/json/)
  })

  test('rejects the legacy orderDetails/options-only shape', async () => {
    await api
      .post('/api/email/send-confirmation')
      .set('Cookie', [`at=${at}`])
      .send({
        email: 'themaximsergeev@gmail.com',
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
      .send({ email: 'themaximsergeev@gmail.com', order: 'legacy confirmation text' })
      .expect(400)
  })

  test('rejects a structured order without a recipient', async () => {
    const order = makeCustomerCommunicationPayload()
    delete order.email

    await api
      .post('/api/email/send-confirmation')
      .set('Cookie', [`at=${at}`])
      .send({ order })
      .expect(400)
      .expect('Content-Type', /application\/json/)
  })
})
