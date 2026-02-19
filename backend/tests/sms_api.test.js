import axios from 'axios'
import mongoose from 'mongoose'
import supertest from 'supertest'
import app from '../app.js'
import { smsOrderPayload } from './test_helper.js'
import { generateJWT } from '../modules/authentication/auth.middleware.js'

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

    expect(axios.get).toHaveBeenCalled()
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
