/* eslint-disable no-underscore-dangle */
const util = require('util')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const ms = require('ms')
const User = require('../../models/user')
const RefreshToken = require('../../models/refreshToken')
const newErrorWithCustomName = require('../newErrorWithCustomName')

const randomBytes = util.promisify(crypto.randomBytes)

const {
  ACCESS_TOKEN_SECRET,
  AT_EXPIRES_IN,
  RT_EXPIRES_IN,
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

    return res
      .status(429)
      .send({ message: 'Too many failed attempts.', throttleTime })
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
    return res.status(401).send({ error: 'invalid username or password' })
  }

  return next()
}

/**
 * @param {Object} req.user
 */

function generateAccessToken(req, res, next) {
  const { user } = req
  const userForToken = {
    username: user.username,
    id: user._id,
  }

  req.accessToken = jwt.sign(userForToken, ACCESS_TOKEN_SECRET, {
    expiresIn: AT_EXPIRES_IN,
  })

  return next()
}

/**
 * @param {Object} req
 * @param {Object} req.user
 * @param {string} req.accessorToken
 * @param {Number} req.tokenNumber
 * @prop {string} req.refreshToken
 */

async function generateRefreshToken(req, res, next) {
  const buf = await randomBytes(32)
  const token = buf.toString('hex')
  const { user, accessorToken, tokenNumber } = req
  const now = Date.now()

  const refreshToken = new RefreshToken({
    token,
    accessor: accessorToken || undefined,
    tokenNumber: tokenNumber + 1 || 0,
    issuedAt: now,
    expires: now + ms(RT_EXPIRES_IN),
    user: {
      username: user.username,
      _id: user._id,
    },
  })

  await refreshToken.save()

  req.refreshToken = token
  req.timestamp = Date.now().toString()
  return next()
}

/**
 * @param {Object} req
 * @param {Object} req.cookies
 * @param {string} req.cookies.accessToken
 * @prop {Object} req.user
 */

function authenticateAccessToken(req, res, next) {
  const { accessToken } = req.cookies
  if (!accessToken) {
    const err = newErrorWithCustomName('TokenMissingError')
    return next(err)
  }

  return jwt.verify(accessToken, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return next(err)
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
 * @prop {string} req.accessorToken
 * @prop {Number} req.tokenNumber
 */

async function authenticateRefreshToken(req, res, next) {
  const refreshTokenFromCookie = req.cookies.refreshToken
  if (!refreshTokenFromCookie) {
    const err = newErrorWithCustomName('TokenMissingError')
    return next(err)
  }

  const refreshTokenInDB = await RefreshToken.findOne({
    token: refreshTokenFromCookie,
  }).exec()
  if (!refreshTokenInDB) {
    const err = newErrorWithCustomName('RefreshTokenError')
    return next(err)
  }

  const isExpired = refreshTokenInDB && refreshTokenInDB.expires < Date.now()
  if (isExpired) {
    // logout()
    await refreshTokenInDB.remove()
    const err = newErrorWithCustomName('TokenExpiredError')
    return next(err)
  }

  req.refreshTokenInDB = refreshTokenInDB
  req.user = refreshTokenInDB.user
  req.accessorToken = refreshTokenInDB.token
  req.tokenNumber = refreshTokenInDB.tokenNumber

  return next()
}

/**
 * @param {Object} req
 * @param {Object} req.refreshTokenInDB
 * @prop {string} req.refreshToken
 */

async function updateOrDeleteRefreshToken(req, res, next) {
  const potentiallyAccessorToken = req.refreshTokenInDB
  const newToken = await RefreshToken.findOne({
    accessor: potentiallyAccessorToken.token,
  })

  // Client has an accessor token
  if (newToken) {
    req.refreshToken = newToken.token
    return next()
  }

  await RefreshToken.deleteOne({ token: potentiallyAccessorToken.accessor })
  return res.status(200).send({ message: 'refresh token up to date' })
}

/**
 * @param {Object} req
 * @param {string} req.accessToken
 * @param {string} req.refreshToken
 */

function setTokenCookies(req, res, next) {
  const secure = process.env.NODE_ENV === 'production'
  const httpOnly = true

  res.cookie('accessToken', req.accessToken, {
    httpOnly,
    secure,
  })
  res.cookie('refreshToken', req.refreshToken, {
    httpOnly,
    secure,
  })

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
  updateOrDeleteRefreshToken,
  setTokenCookies,
}
