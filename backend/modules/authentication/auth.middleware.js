/* eslint-disable no-underscore-dangle */
import { promisify } from 'util'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import ms from 'ms'
import User from '../../models/user.js'
import RefreshToken from '../../models/refreshToken.js'
import newErrorWithCustomName from '../../utils/newErrorWithCustomName.js'
import logout from './auth.helpers.js'

const randomBytes = promisify(crypto.randomBytes)

import {
  ACCESS_TOKEN_SECRET,
  AT_EXPIRES_IN,
  RT_EXPIRES_IN,
  RT_REFRESH_AFTER_SEC,
} from '../../utils/config.js'

/**
 * ip, {
      attempts: [],
      numberOfAttempts: 0,
      spamSpeed: 0,
      expires: expireDate,
      throttled: false
    }
 */

const requests = new Map()

function filterRequestsWithExceededAttemptLimit(req, res, next) {
  const cr = requests.get(req.ip)
  if (cr?.throttled) {
    const TooManyRequestsError = newErrorWithCustomName('TooManyRequestsError')
    return next(TooManyRequestsError)
  }

  return next()
}

/**
 * @param {Object} req
 * @prop {Object} req.user
 */

async function checkUser(req, res, next) {
  const { username, password } = req.body

  const user = await User.findOne({ username })

  const passwordCorrect = user === null ? false : await bcrypt.compare(password, user.passwordHash)

  const userJSON = user?.toJSON()

  req.user = userJSON || null
  req.passwordCorrect = passwordCorrect

  return next()
}

/**
 * @param {Object} req
 * @param {Boolean} req.passwordCorrect
 */

function controlRequestFlow(req, res, next) {
  function clearReqAttempts(request) {
    request.attempts = []
    request.numberOfAttempts = 0
    request.throttled = false
  }
  const { passwordCorrect, ip } = req

  requests.forEach((reqData, reqIp) => {
    if (reqData.expires < Date.now()) requests.delete(reqIp)
  })

  const expireDate = Date.now() + 30 * 1000

  if (!requests.has(ip)) {
    requests.set(ip, {
      attempts: [],
      numberOfAttempts: 0,
      spamSpeed: 0,
      expires: expireDate,
      throttled: false,
    })
  }

  // current request
  const cr = requests.get(ip)

  cr.attempts.push(Date.now())
  cr.expires = expireDate
  cr.numberOfAttempts = cr.attempts.length

  const { length } = cr.attempts
  const firstAttempt_sec = cr.attempts[0] / 1000
  const lastAttempt_sec = cr.attempts[length - 1] / 1000

  length > 1 ? (cr.spamSpeed = length / (lastAttempt_sec - firstAttempt_sec)) : (cr.spamSpeed = 0)

  if (length >= 3) {
    const throttleTime = 10000
    cr.throttled = true

    const timeoutID = setTimeout(() => {
      clearReqAttempts(cr)
    }, throttleTime)

    if (process.env.NODE_ENV === 'test') {
      clearTimeout(timeoutID)
      clearReqAttempts(cr)
    }

    const err = newErrorWithCustomName('TooManyRequestsError')
    return next(err)
  }

  if (passwordCorrect) {
    clearReqAttempts(cr)
    return next()
  }

  // if password is wrong and attempt limit was not reached go to next middleware
  return next()
}

/**
 * @param {Object} req
 * @param {Boolean} req.passwordCorrect
 * @param {Object} req.user
 */

function invalidAuth(req, res, next) {
  const { user, passwordCorrect } = req

  if (!(user && passwordCorrect)) {
    const err = newErrorWithCustomName('InvalidUserError')
    return next(err)
  }

  return next()
}

function generateJWT(
  user,
  options = {
    expiresIn: AT_EXPIRES_IN,
  }
) {
  return jwt.sign(user, ACCESS_TOKEN_SECRET, options)
}

/**
 * @param {Object} req
 * @param {Object} req.user
 */

function generateAccessToken(req, res, next) {
  if (req.refreshTokenIsNew || req.accessToken) return next()

  const { user } = req
  const userForToken = {
    name: user.name,
    username: user.username,
    id: user.id,
  }

  req.accessToken = generateJWT(userForToken)

  return next()
}

/**
 * Generates opaque refresh token, saves it to DB and adds it to the request object.
 * If user needs refresh token because of logging in, firstly we delete his previous token from DB.
 * @param {Object} req
 * @param {Object} req.user
 * @param {string} req.user.username
 * @param {string} req.user._id
 * @param {Object} [req.refreshTokenInDB]
 * @prop {string} req.refreshToken
 */

async function generateRefreshToken(req, res, next) {
  const { user, refreshTokenInDB = undefined } = req

  if (!refreshTokenInDB) await RefreshToken.deleteMany({ 'user._id': user._id })

  const buf = await randomBytes(64)
  const token = buf.toString('hex')
  const now = Date.now()

  const refreshToken = new RefreshToken({
    token,
    ancestor: refreshTokenInDB?.token || undefined,
    tokenNumber: refreshTokenInDB?.tokenNumber + 1 || 0,
    issuedAt: now,
    expires: now + ms(RT_EXPIRES_IN),
    user: {
      name: user.name,
      username: user.username,
      id: user.id,
    },
  })

  await refreshToken.save()

  req.refreshToken = token
  return next()
}

/**
 * @param {Object} req
 * @param {Object} req.cookies
 * @param {string} req.cookies.at
 * @prop {Object} req.user
 */

function authenticateAccessToken(req, res, next) {
  const { at: accessToken } = req.cookies

  if (!accessToken || accessToken === 'undefined') {
    const err = newErrorWithCustomName('AccessTokenMissingError')
    return next(err)
  }

  return jwt.verify(accessToken, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      // Proceeding to authenticate refresh token only if client HAS access token (even if it's expired).
      // In all other cases throwing an error.
      if (err.name === 'TokenExpiredError' && req.baseUrl === '/api/token') {
        return next()
      }
      return next(err)
    }
    // Skip generation of new access token if the one that client has is valid
    if (req.path === '/is-new') {
      req.accessToken = accessToken
      return next()
    }

    req.user = user
    return next()
  })
}

/**
 * @param {Object} req
 * @param {Object} req.cookies
 * @param {string} req.cookies.rt
 * @prop {Object} req.refreshTokenInDB
 * @prop {Object} req.user
 */

async function authenticateRefreshToken(req, res, next) {
  const { rt: refreshTokenFromCookie } = req.cookies

  if (!refreshTokenFromCookie || refreshTokenFromCookie === 'undefined') {
    const err = newErrorWithCustomName('RefreshTokenMissingError')
    return next(err)
  }

  const refreshTokenInDB = await RefreshToken.findOne({
    token: refreshTokenFromCookie,
  }).lean()
  if (!refreshTokenInDB) {
    /**
     * If client's token was not found in DB,
     * but there is a descendant token -
     * that's a clear indication of that his refresh token was stolen.
     * We will delete the descendant token and clear cookies
     * so that the thief can no longer use them.
     */
    const descendantToken = await RefreshToken.findOne({
      ancestor: refreshTokenFromCookie,
    })
    if (descendantToken) {
      await logout(req, res, descendantToken.token)
      const err = newErrorWithCustomName('TokenTheftError')
      return next(err)
    }

    // not tested yet 15.03.2021
    await logout(req, res)
    const err = newErrorWithCustomName('RefreshTokenError')
    return next(err)
  }

  const isExpired = refreshTokenInDB && refreshTokenInDB.expires < Date.now()
  if (isExpired) {
    await logout(req, res)
    const err = newErrorWithCustomName('RefreshTokenExpiredError')
    return next(err)
  }

  const issuedRecently = Date.now() - refreshTokenInDB.issuedAt < ms(RT_REFRESH_AFTER_SEC)
  if (issuedRecently && req.path !== '/is-new') {
    const err = newErrorWithCustomName('TooManyRequestsError')
    return next(err)
  }

  req.refreshTokenInDB = refreshTokenInDB
  req.user = refreshTokenInDB.user

  return next()
}

/**
 * @param {Object} req
 * @param {Object} req.refreshTokenInDB
 * @prop {string} req.refreshToken
 * @prop {boolean} req.refreshTokenIsNew
 */

async function updateOrDeleteOldToken(req, res, next) {
  const potentiallyAncestorToken = req.refreshTokenInDB
  const descendantToken = await RefreshToken.findOne({
    ancestor: potentiallyAncestorToken.token,
  })

  /**
   * Client has an ancestor token
   * Client should send another request to this endpoint to check
   * if he received new token this time.
   */

  if (descendantToken) {
    req.refreshToken = descendantToken.token
    return next()
  }

  // Client has new token
  await RefreshToken.deleteOne({ token: potentiallyAncestorToken.ancestor })
  req.refreshTokenIsNew = true
  return next()
}

/**
 * @param {Object} req
 * @param {string} req.accessToken
 * @param {string} req.refreshToken
 */

function setTokenCookies(req, res, next) {
  if (req.refreshTokenIsNew) return next()

  const options = {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  }

  res.cookie('at', req.accessToken, options)
  res.cookie('rt', req.refreshToken, options)

  return next()
}

export {
  filterRequestsWithExceededAttemptLimit,
  checkUser,
  controlRequestFlow,
  invalidAuth,
  generateAccessToken,
  generateRefreshToken,
  authenticateAccessToken,
  authenticateRefreshToken,
  updateOrDeleteOldToken,
  setTokenCookies,
  requests,
  generateJWT,
}
