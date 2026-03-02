import mongoose from 'mongoose'
import supertest from 'supertest'
import app from '../app.js'

const api = supertest(app)

import { orderDetails, exampleOptions } from './test_helper.js'
import { generateJWT } from '../modules/authentication/auth.middleware.js'

// access token
const at = generateJWT(
  { name: 'Maxim', username: 'Maximus', id: '123456789' },
  { expiresIn: '20s' }
)

const requestData = {
  email: 'themaximsergeev@gmail.com',
  orderDetails,
  options: exampleOptions,
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
})

afterAll(async () => {
  mongoose.connection.close()
})
