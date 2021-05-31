const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')

const api = supertest(app)
const { initialUsers, initializeDB } = require('./test_helper')

const User = require('../models/user')

beforeEach(async () => {
  await initializeDB()
})

describe('Login', () => {
  const user = initialUsers[0]
  const password = 'password'

  test('Login with credentials', async () => {
    const response = await api
      .post('/api/login')
      .send({ username: user.username, password })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.user).toEqual({
      username: user.username,
      name: user.name,
    })
  })

  test('Unsuccessful login with wrong credentials', async () => {
    // 1th attempt
    await api
      .post('/api/login')
      .send({ username: 'bla', password: 'bla' })
      .expect(400)
      .expect('Content-Type', /application\/json/)
  })

  test('Too many requests', async () => {
    // 2th attempt
    await api
      .post('/api/login')
      .send({ username: 'bla', password: 'bla' })
      .expect(400)
      .expect('Content-Type', /application\/json/)

    // 3th attempt
    await api
      .post('/api/login')
      .send({ username: 'bla', password: 'bla' })
      .expect(429)
      .expect('Content-Type', /application\/json/)
  })
})

afterAll(() => {
  mongoose.connection.close()
})
