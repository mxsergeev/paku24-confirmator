import supertest from 'supertest'
import app from '../app.js'

const generateUsername = vi.hoisted(() => vi.fn(() => 'generated-username'))

vi.mock('unique-names-generator', async (importOriginal) => {
  const original = await importOriginal()
  return { ...original, uniqueNamesGenerator: generateUsername }
})

const api = supertest(app)

import { initialUsers, usersInDB } from './test_helper.js'
import useTestDatabase from './database_harness.js'
import User from '../models/user.js'

useTestDatabase()

beforeEach(() => {
  generateUsername.mockReset()
  generateUsername.mockReturnValue('generated-username')
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

    test('retries a colliding generated username and saves the second username', async () => {
      await new User({ username: 'collision', email: 'collision@example.com' }).save()
      generateUsername.mockReturnValueOnce('collision').mockReturnValueOnce('available')

      await api
        .post('/api/registration/request-access')
        .send({ name: 'Retry User', email: 'retry@example.com', purpose: 'Testing' })
        .expect(200)

      const saved = await User.findOne({ email: 'retry@example.com' }).lean()
      expect(saved.username).toBe('available')
      expect(generateUsername).toHaveBeenCalledTimes(2)
    })

    test('does not retry a duplicate-key error for another field', async () => {
      const duplicateEmailError = Object.assign(new Error('duplicate email'), {
        code: 11000,
        keyPattern: { email: 1 },
        keyValue: { email: 'retry@example.com' },
      })
      const save = vi.spyOn(User.prototype, 'save').mockRejectedValueOnce(duplicateEmailError)

      await api
        .post('/api/registration/request-access')
        .send({ name: 'Retry User', email: 'retry@example.com', purpose: 'Testing' })
        .expect(500)

      expect(generateUsername).toHaveBeenCalledTimes(1)
      save.mockRestore()
    })

    test("User that already requested access with the same email will get error and won't be created and added to DB", async () => {
      const testUser = {
        name: 'Bruce the Spammer',
        email: initialUsers[0].email,
        purpose: 'Spam hard',
      }

      await api.post('/api/registration/request-access').send(testUser).expect(403)

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

    test('retries a username collision when granting legacy access', async () => {
      await new User({ username: 'collision', email: 'collision@example.com' }).save()
      generateUsername.mockReturnValueOnce('collision').mockReturnValueOnce('available')

      await api
        .get(
          `/api/registration/grant-access/?token=${encodeURIComponent(
            userWithoutAccess.requestToken
          )}`
        )
        .expect(200)

      const user = await User.findOne({ email: userWithoutAccess.email }).lean()
      expect(user.username).toBe('available')
      expect(generateUsername).toHaveBeenCalledTimes(2)
    })

    test('preserves an existing username when granting access', async () => {
      await User.updateOne(
        { email: userWithoutAccess.email },
        { username: 'legacy-username' }
      )

      await api
        .get(
          `/api/registration/grant-access/?token=${encodeURIComponent(
            userWithoutAccess.requestToken
          )}`
        )
        .expect(200)

      const user = await User.findOne({ email: userWithoutAccess.email }).lean()
      expect(user.username).toBe('legacy-username')
      expect(generateUsername).not.toHaveBeenCalled()
    })

    test('returns the final duplicate-key error after five username collisions', async () => {
      await new User({ username: 'collision', email: 'collision@example.com' }).save()
      generateUsername.mockReturnValue('collision')

      await api
        .get(
          `/api/registration/grant-access/?token=${encodeURIComponent(
            userWithoutAccess.requestToken
          )}`
        )
        .expect(500)

      expect(generateUsername).toHaveBeenCalledTimes(5)
      const user = await User.findOne({ email: userWithoutAccess.email }).lean()
      expect(user).not.toHaveProperty('username')
      expect(user.access).toBe(false)
    })

    test('Access not granted if request token is invalid', async () => {
      await api.get('/api/registration/grant-access/?token=blabla1234').expect(403)

      const userStillWithoutAccess = await User.findOne({
        email: userWithoutAccess.email,
      })
      const userJSON = userStillWithoutAccess.toJSON()

      expect(userJSON).toHaveProperty('requestToken')
      expect(userJSON).not.toHaveProperty('username')
      expect(userJSON.access).toBeFalsy()
    })
  })

  describe('Username index', () => {
    test('is strict, unique, and rejects duplicate usernames', async () => {
      const indexes = await User.collection.indexes()
      expect(indexes).toContainEqual(
        expect.objectContaining({ name: 'username_1', key: { username: 1 }, unique: true })
      )

      await expect(
        new User({ username: initialUsers[0].username, email: 'duplicate@example.com' }).save()
      ).rejects.toMatchObject({ code: 11000 })
    })
  })
})
