const axios = require('axios')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const { smsOrderPayload } = require('./test_helper')
const { generateJWT } = require('../modules/authentication/auth.middleware')

jest.mock('axios', () => ({
  get: jest.fn(),
}))

const api = supertest(app)
const at = generateJWT(
  { name: 'Maxim', username: 'Maximus', id: '123456789' },
  { expiresIn: '20s' }
)

const payloadOrder = smsOrderPayload

describe('SMS API', () => {
  beforeEach(() => {
    axios.get.mockReset()
    axios.get.mockResolvedValue({ data: {} })
  })

  test('posts a confirmation when authenticated', async () => {
    await api
      .post('/api/sms')
      .set('Cookie', [`at=${at}`])
      .send({ order: payloadOrder })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(axios.get).toHaveBeenCalledTimes(1)
    expect(axios.get).toHaveBeenCalledWith('https://semysms.net/api/3/sms.php', {
      params: expect.objectContaining({ phone: payloadOrder.phone }),
    })
  })

  test('returns 403 when access token is missing', async () => {
    await api.post('/api/sms').send({ order: payloadOrder }).expect(403)
    expect(axios.get).not.toHaveBeenCalled()
  })

  test('forwards helper errors', async () => {
    const overflowingOrder = {
      ...payloadOrder,
      comment: 'A'.repeat(1000),
    }

    await api
      .post('/api/sms')
      .set('Cookie', [`at=${at}`])
      .send({ order: overflowingOrder })
      .expect(500)
      .then((res) => {
        expect(res.text).toMatch(/exceeds the limit/)
      })

    expect(axios.get).not.toHaveBeenCalled()
  })
})

afterAll(async () => {
  await mongoose.connection.close()
})
