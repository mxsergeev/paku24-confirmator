const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const { initialUsers, usersInDB, initializeDB } = require('./test_helper')

const User = require('../models/user')

beforeEach(async () => {
  await initializeDB()
})

describe('Registration', () => {
  describe('Requesting access', () => {
    test('User is created and added to DB when requesting access', async () => {
      const testUser = {
        name: 'Bruce Willis',
        email: 'die.hard@5th-element.com',
        purpose: 'Die hard',
      }

      await api
        .post('/api/registration/request-access')
        .send(testUser)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const usersAfterRequest = await usersInDB()
      expect(usersAfterRequest).toHaveLength(initialUsers.length + 1)

      const emailsOfUsers = usersAfterRequest.map((user) => user.email)
      expect(emailsOfUsers).toContain(testUser.email)
    })

    test("User that already requested access with the same email will get error and won't be created and added to DB", async () => {
      const testUser = {
        name: 'Bruce the Spammer',
        email: initialUsers[0].email,
        purpose: 'Spam hard',
      }

      await api
        .post('/api/registration/request-access')
        .send(testUser)
        .expect(403)

      const usersAfterRequest = await usersInDB()
      expect(usersAfterRequest).toHaveLength(initialUsers.length)
    })
  })

  describe('Granting access', () => {
    const userWithoutAccess = initialUsers[1]

    test('Access granted, credentials created and request token deleted', async () => {
      await api
        .get(
          `/api/registration/grant-access/?token=${encodeURIComponent(
            userWithoutAccess.requestToken
          )}`
        )
        .expect(200)

      const userWithAccess = await User.findOne({
        email: userWithoutAccess.email,
      })
      const userJSON = userWithAccess.toJSON()

      expect(userJSON).toHaveProperty('username')
      expect(userJSON).not.toHaveProperty('requestToken')
      expect(userJSON.access).toBeTruthy()
    })

    test('Access not granted if request token is invalid', async () => {
      await api
        .get('/api/registration/grant-access/?token=blabla1234')
        .expect(403)

      const userStillWithoutAccess = await User.findOne({
        email: userWithoutAccess.email,
      })
      const userJSON = userStillWithoutAccess.toJSON()

      expect(userJSON).toHaveProperty('requestToken')
      expect(userJSON).not.toHaveProperty('username')
      expect(userJSON.access).toBeFalsy()
    })
  })
})

afterAll(() => {
  mongoose.connection.close()
})
