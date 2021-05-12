const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)

const { exampleEvent, exampleCreatedEvent } = require('./test_helper')
const { generateJWT } = require('../utils/middleware/authentication')

const eventIds = []
const at = generateJWT(
  { name: 'Maxim', username: 'Maximus', id: '123456789' },
  { expiresIn: '20s' }
)

describe('Calendar', () => {
  test('event created', async () => {
    await api
      .post('/api/calendar/')
      .set('Cookie', [`at=${at}`])
      .send(exampleEvent)
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .then((res) => {
        expect(res.body).toHaveProperty('message')
        expect(res.body).toHaveProperty('createdEvent', exampleCreatedEvent)
        expect(res.body).toHaveProperty('eventId')
        eventIds.push(res.body.eventId)
      })
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
  mongoose.connection.close()
})
