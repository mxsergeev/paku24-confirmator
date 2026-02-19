import mongoose from 'mongoose'
import supertest from 'supertest'
import app from '../app.js'

const api = supertest(app)

import { exampleEvent, exampleCreatedEvent } from './test_helper.js'
import { generateJWT } from '../modules/authentication/auth.middleware.js'

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
