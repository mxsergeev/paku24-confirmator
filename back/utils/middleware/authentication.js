/* eslint-disable no-underscore-dangle */
const util = require('util')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const ms = require('ms')
const User = require('../../models/user')
const RefreshToken = require('../../models/refreshToken')
const newErrorWithCustomName = require('../helpers/newErrorWithCustomName')
const logout = require('../helpers/logout')

const randomBytes = util.promisify(crypto.randomBytes)

const {
  ACCESS_TOKEN_SECRET,
  AT_EXPIRES_IN,
  RT_EXPIRES_IN,
  RT_REFRESH_AFTER_SEC,
} = require('../config')

const requests = new Map()

/**
 * @param {Object} req
 * @prop {Object} req.user
 */

async function checkUser(req, res, next) {
  const { username, password } = req.body

  const user = await User.findOne({ username }).lean()

  const passwordCorrect =
    user === null ? false : await bcrypt.compare(password, user.passwordHash)

  req.user = user
  req.passwordCorrect = passwordCorrect

  return next()
}

/**
 * @param {Object} req
 * @param {Boolean} req.passwordCorrect
 */

function controlRequestFlow(req, res, next) {
  const { passwordCorrect, ip } = req

  requests.forEach((reqData, reqIp) => {
    if (reqData.expires < Date.now()) requests.delete(reqIp)
  })

  const expireDate = Date.now() + 30 * 1000

  if (!requests.has(ip)) requests.set(ip, { attempts: 0, expires: expireDate })

  const currentRequest = requests.get(ip)

  currentRequest.attempts += 1
  currentRequest.expires = expireDate

  if (currentRequest.attempts > 3) {
    const throttleTime = 10000
    setTimeout(() => {
      currentRequest.attempts = 0
    }, throttleTime)

    const err = newErrorWithCustomName('TooManyRequestsError')
    return next(err)
  }

  if (passwordCorrect) {
    currentRequest.attempts = 0
    return next()
  }

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
    id: user._id,
  }

  req.accessToken = jwt.sign(userForToken, ACCESS_TOKEN_SECRET, {
    expiresIn: AT_EXPIRES_IN,
  })

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
      _id: user._id,
    },
  })

  await refreshToken.save()

  req.refreshToken = token
  return next()
}

/**
 * @param {Object} req
 * @param {Object} req.cookies
 * @param {string} req.cookies.accessToken
 * @prop {Object} req.user
 */

function authenticateAccessToken(req, res, next) {
  const { at: accessToken } = req.cookies

  if (!accessToken || accessToken === 'undefined') {
    const err = newErrorWithCustomName('TokenMissingError')
    return next(err)
  }

  return jwt.verify(accessToken, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return next(err)

    // Skip generation of new access token if the one that client has is valid
    if (req.path === '/is-new') req.accessToken = accessToken

    console.log(user)

    req.user = user
    return next()
  })
}

/**
 * @param {Object} req
 * @param {Object} req.cookies
 * @param {string} req.cookies.refreshToken
 * @prop {Object} req.refreshTokenInDB
 * @prop {Object} req.user
 */

async function authenticateRefreshToken(req, res, next) {
  const { rt: refreshTokenFromCookie } = req.cookies

  if (!refreshTokenFromCookie || refreshTokenFromCookie === 'undefined') {
    const err = newErrorWithCustomName('TokenMissingError')
    return next(err)
  }

  const refreshTokenInDB = await RefreshToken.findOne({
    token: refreshTokenFromCookie,
  }).exec()
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

    const err = newErrorWithCustomName('RefreshTokenError')
    return next(err)
  }

  const isExpired = refreshTokenInDB && refreshTokenInDB.expires < Date.now()
  if (isExpired) {
    await logout(req, res)
    const err = newErrorWithCustomName('RefreshTokenExpiredError')
    return next(err)
  }

  const issuedRecently =
    Date.now() - refreshTokenInDB.issuedAt < ms(RT_REFRESH_AFTER_SEC)
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

module.exports = {
  checkUser,
  controlRequestFlow,
  invalidAuth,
  generateAccessToken,
  generateRefreshToken,
  authenticateAccessToken,
  authenticateRefreshToken,
  updateOrDeleteOldToken,
  setTokenCookies,
}
