import mongoose from 'mongoose'
import * as authentication from '../modules/authentication/auth.middleware.js'
import RefreshToken from '../models/refreshToken.js'
import newErrorWithCustomName from '../utils/newErrorWithCustomName.js'

import {
  initialUsers,
  tokensInDB,
  initializeDB,
  connectToDB,
  mockNext,
  exampleRefreshToken,
} from './test_helper.js'

let mockReq
let mockRes

beforeAll(async () => {
  await connectToDB()
})

beforeEach(async () => {
  mockReq = { cookies: {} }
  mockRes = {
    send: vi.fn(function () {
      return this
    }),
    clearCookie: vi.fn(function () {
      return this
    }),
  }
  await initializeDB()
})

describe('Authentication middleware', () => {
  describe('checkUser', () => {
    test('happy path', async () => {
      const user = initialUsers[0]
      mockReq = {
        body: {
          username: user.username,
          password: 'password',
        },
      }

      await authentication.checkUser(mockReq, mockRes, mockNext)

      expect(mockReq).toHaveProperty('user')
      expect(mockReq.user).toHaveProperty('username', 'unicorn123')
      expect(mockReq.user).toHaveProperty('name', 'Twilight Sparkle')
      expect(mockReq.user).toHaveProperty('email', 'test@test.com')
      expect(mockReq.user).toHaveProperty('access', true)
      expect(mockReq.passwordCorrect).toBeTruthy()
    })

    test('wrong password', async () => {
      const user = initialUsers[0]
      mockReq = {
        body: {
          username: user.username,
          password: 'passwodr',
        },
      }

      await authentication.checkUser(mockReq, mockRes, mockNext)

      expect(mockReq.passwordCorrect).toBeFalsy()
    })

    test('no values', async () => {
      mockReq = {
        body: {
          username: '',
          password: '',
        },
      }

      await authentication.checkUser(mockReq, mockRes, mockNext)

      expect(mockReq.passwordCorrect).toBeFalsy()
      expect(mockReq.user).toBeNull()
    })
  })

  describe('controlRequestFlow', () => {
    const ip = '127.0.0.1'

    afterEach(() => authentication.requests.delete(ip))

    test('password is correct', () => {
      mockReq = {
        ip,
        passwordCorrect: true,
      }

      const result = authentication.controlRequestFlow(mockReq, mockRes, mockNext)
      const request = authentication.requests.get(ip)

      // middleware returned mockNext() thus undefined
      expect(result).toBeUndefined()
      expect(request).toHaveProperty('attempts', [])
      expect(request).toHaveProperty('expires')
    })

    test('one failed attempt', () => {
      mockReq = {
        ip,
        passwordCorrect: false,
      }

      // 1th failed attempt
      const result = authentication.controlRequestFlow(mockReq, mockRes, mockNext)
      const request = authentication.requests.get(ip)

      // middleware returned mockNext() thus undefined
      expect(result).toBeUndefined()
      expect(request).toHaveProperty('attempts')
      expect(request).toHaveProperty('numberOfAttempts', 1)
      expect(request).toHaveProperty('expires')
    })

    test('three failed attempts', () => {
      mockReq = {
        ip,
        passwordCorrect: false,
      }

      // 1th failed attempt
      authentication.controlRequestFlow(mockReq, mockRes, mockNext)
      // 2th failed attempt
      authentication.controlRequestFlow(mockReq, mockRes, mockNext)

      // 3th failed attempt
      expect(() => authentication.controlRequestFlow(mockReq, mockRes, mockNext)).toThrowError(
        newErrorWithCustomName('TooManyRequestsError')
      )
    })

    test('after three failed attempts, successful login with correct credentials', () => {
      mockReq = {
        ip,
        passwordCorrect: false,
      }

      authentication.controlRequestFlow(mockReq, mockRes, mockNext)
      authentication.controlRequestFlow(mockReq, mockRes, mockNext)

      expect(() =>
        // 3th failed attempt
        authentication.controlRequestFlow(mockReq, mockRes, mockNext)
      ).toThrowError(newErrorWithCustomName('TooManyRequestsError'))

      mockReq.passwordCorrect = true
      const request = authentication.requests.get(ip)

      expect(authentication.controlRequestFlow(mockReq, mockRes, mockNext)).toBeUndefined()
      expect(request).toHaveProperty('numberOfAttempts', 0)
    })
  })

  describe('invalidAuth', () => {
    const user = initialUsers[0]

    test('user and password are correct', async () => {
      mockReq = {
        user,
        passwordCorrect: true,
      }

      const result = await authentication.invalidAuth(mockReq, mockRes, mockNext)

      expect(result).toBeUndefined()
    })

    test('invalid password', async () => {
      mockReq = {
        user,
        passwordCorrect: false,
      }

      expect(() => authentication.invalidAuth(mockReq, mockRes, mockNext)).toThrowError(
        newErrorWithCustomName('InvalidUserError')
      )
    })

    test('user is null', async () => {
      mockReq = {
        user: null,
        passwordCorrect: false,
      }

      expect(() => authentication.invalidAuth(mockReq, mockRes, mockNext)).toThrowError(
        newErrorWithCustomName('InvalidUserError')
      )
    })
  })

  describe('generateAccessToken', () => {
    const user = initialUsers[0]
    test('access token is generated', async () => {
      mockReq = { user }

      const result = await authentication.generateAccessToken(mockReq, mockRes, mockNext)

      expect(result).toBeUndefined()
      expect(mockReq).toHaveProperty('accessToken')
    })

    test('access token is not generated when tokens are fresh', async () => {
      mockReq = {
        user,
        refreshTokenIsNew: true,
        accessToken: 'notrealtoken',
      }

      const result = await authentication.generateAccessToken(mockReq, mockRes, mockNext)

      expect(result).toBeUndefined()
      expect(mockReq).toHaveProperty('accessToken', 'notrealtoken')
    })
  })

  describe('generateRefreshToken', () => {
    const user = initialUsers[0]
    test('refresh token is generated for the first time', async () => {
      mockReq = { user }
      const result = await authentication.generateRefreshToken(mockReq, mockRes, mockNext)

      expect(result).toBeUndefined()
      expect(mockReq).toHaveProperty('refreshToken')

      const refreshToken = await RefreshToken.findOne({
        token: mockReq.refreshToken,
      }).lean()

      expect(refreshToken).not.toHaveProperty('ancestor')
      expect(refreshToken).toHaveProperty('user', {
        name: user.name,
        username: user.username,
      })

      const allRefreshTokens = await RefreshToken.find({})
      expect(allRefreshTokens).toHaveLength(1)
    })

    test('descendant refresh token is generated', async () => {
      const refreshTokenInDB = new RefreshToken(exampleRefreshToken)
      await refreshTokenInDB.save()

      mockReq = { user, refreshTokenInDB }
      const result = await authentication.generateRefreshToken(mockReq, mockRes, mockNext)

      expect(result).toBeUndefined()
      expect(mockReq).toHaveProperty('refreshToken')

      const refreshToken = await RefreshToken.findOne({
        token: mockReq.refreshToken,
      }).lean()

      expect(refreshToken).toHaveProperty('ancestor', refreshTokenInDB.token)
      expect(refreshToken).toHaveProperty('user', {
        name: refreshTokenInDB.user.name,
        username: refreshTokenInDB.user.username,
      })

      const allRefreshTokens = await RefreshToken.find({})
      expect(allRefreshTokens).toHaveLength(2)
    })
  })

  describe('authenticateAccessToken', () => {
    const user = initialUsers[0]

    test('access token authenticated', async () => {
      mockReq = {
        user,
        cookies: { at: authentication.generateJWT(user) },
      }

      const result = await authentication.authenticateAccessToken(mockReq, mockRes, mockNext)

      expect(result).toBeUndefined()
      expect(mockReq).toHaveProperty('user')
      expect(mockReq.user).toHaveProperty('name', user.name)
      expect(mockReq.user).toHaveProperty('username', user.username)
    })

    test('expired access token', async () => {
      mockReq = {
        cookies: { at: authentication.generateJWT(user, { expiresIn: '1ms' }) },
      }

      expect(() => authentication.authenticateAccessToken(mockReq, mockRes, mockNext)).toThrowError(
        newErrorWithCustomName('JsonWebTokenError', 'jwt expired')
      )

      expect(mockReq).not.toHaveProperty('user')
    })

    test('if path is "/is-new" new token is not generated', async () => {
      const at = authentication.generateJWT(user)
      mockReq = {
        path: '/is-new',
        cookies: { at },
      }

      const rslt = await authentication.authenticateAccessToken(mockReq, mockRes, mockNext)

      expect(rslt).toBeUndefined()
      expect(mockReq).toHaveProperty('accessToken')
      expect(mockReq.accessToken).toBe(at)
    })
  })

  describe('authenticateRefreshToken', () => {
    test('refresh token authenticated', async () => {
      const refreshToken = new RefreshToken({
        ...exampleRefreshToken,
        // long expiry date so it won't throw an expiry error
        expires: '9999999999999',
      })
      await refreshToken.save()

      mockReq = {
        cookies: {
          rt: exampleRefreshToken.token,
        },
      }

      const rslt = await authentication.authenticateRefreshToken(mockReq, mockRes, mockNext)

      expect(rslt).toBeUndefined()
      expect(mockReq).toHaveProperty('user', exampleRefreshToken.user)
      expect(mockReq).toHaveProperty('refreshTokenInDB', refreshToken.toJSON())
    })

    test('refresh token missing', async () => {
      mockReq = {
        cookies: {},
      }

      await expect(async () => {
        await authentication.authenticateRefreshToken(mockReq, mockRes, mockNext)
      }).rejects.toThrowError(newErrorWithCustomName('TokenMissingError'))
      expect(mockReq).not.toHaveProperty('user')
      expect(mockReq).not.toHaveProperty('refreshTokenInDB')
    })

    test('non-existing refresh token', async () => {
      mockReq = {
        cookies: { rt: 'thisisnonexistingtoken' },
      }

      await expect(async () => {
        await authentication.authenticateRefreshToken(mockReq, mockRes, mockNext)
      }).rejects.toThrowError(newErrorWithCustomName('RefreshTokenError'))
      expect(mockReq).not.toHaveProperty('user')
      expect(mockReq).not.toHaveProperty('refreshTokenInDB')
    })

    test('deleted refresh token with existing descendant - token theft', async () => {
      const descendantToken = new RefreshToken({
        ...exampleRefreshToken,
        ancector: 'ancestortoken',
      })
      await descendantToken.save()

      mockReq.cookies.rt = 'ancestortoken'

      await expect(async () => {
        await authentication.authenticateRefreshToken(mockReq, mockRes, mockNext)
      }).rejects.toThrowError(newErrorWithCustomName('TokenTheftError'))
      expect(mockReq).not.toHaveProperty('user')
      expect(mockReq).not.toHaveProperty('refreshTokenInDB')
    })

    test('expired refresh token', async () => {
      const refreshToken = new RefreshToken({
        ...exampleRefreshToken,
        expires: '0',
      })
      await refreshToken.save()

      mockReq.cookies.rt = exampleRefreshToken.token

      await expect(async () => {
        await authentication.authenticateRefreshToken(mockReq, mockRes, mockNext)
      }).rejects.toThrowError(newErrorWithCustomName('RefreshTokenExpiredError'))
      expect(mockReq).not.toHaveProperty('user')
      expect(mockReq).not.toHaveProperty('refreshTokenInDB')
    })

    test('refresh token issued just recently', async () => {
      const refreshToken = new RefreshToken({
        ...exampleRefreshToken,
        issuedAt: Date.now(),
      })
      await refreshToken.save()

      mockReq.cookies.rt = exampleRefreshToken.token

      await expect(async () => {
        await authentication.authenticateRefreshToken(mockReq, mockRes, mockNext)
      }).rejects.toThrowError(newErrorWithCustomName('TooManyRequestsError'))
      expect(mockReq).not.toHaveProperty('user')
      expect(mockReq).not.toHaveProperty('refreshTokenInDB')
    })
  })

  describe('updateOrDeleteOldToken', () => {
    test('client has a new refresh token', async () => {
      const descendantToken = new RefreshToken({
        ...exampleRefreshToken,
        token: 'descendantToken',
        tokenNumber: exampleRefreshToken.tokenNumber + 1,
        ancestor: exampleRefreshToken.token,
      })
      const ancestorToken = new RefreshToken(exampleRefreshToken)
      await Promise.all([descendantToken.save(), ancestorToken.save()])

      const tokensInDBBeforeDeletion = await tokensInDB()
      mockReq = { refreshTokenInDB: descendantToken }

      const rslt = await authentication.updateOrDeleteOldToken(mockReq, mockRes, mockNext)

      expect(rslt).toBeUndefined()
      expect(await tokensInDB()).toHaveLength(tokensInDBBeforeDeletion.length - 1)
      expect(mockReq).toHaveProperty('refreshTokenIsNew')
      expect(mockReq).not.toHaveProperty('refreshToken')
    })

    test('client has an ancestor token', async () => {
      const descendantToken = new RefreshToken({
        ...exampleRefreshToken,
        token: 'descendantToken',
        tokenNumber: exampleRefreshToken.tokenNumber + 1,
        ancestor: exampleRefreshToken.token,
      })
      const ancestorToken = new RefreshToken(exampleRefreshToken)
      await Promise.all([descendantToken.save(), ancestorToken.save()])

      const tokensInDBBeforeDeletion = await tokensInDB()
      mockReq.refreshTokenInDB = ancestorToken

      const rslt = await authentication.updateOrDeleteOldToken(mockReq, mockRes, mockNext)

      expect(rslt).toBeUndefined()
      expect(await tokensInDB()).toHaveLength(tokensInDBBeforeDeletion.length)
      expect(mockReq).toHaveProperty('refreshToken')
      expect(mockReq).not.toHaveProperty('refreshTokenIsNew')
    })
  })
})

afterAll(() => {
  mongoose.connection.close()
})
