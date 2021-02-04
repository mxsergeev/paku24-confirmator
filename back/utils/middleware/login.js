/* eslint-disable no-underscore-dangle */
const util = require('util')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const User = require('../../models/user')
const RefreshToken = require('../../models/refreshToken')

const randomBytes = util.promisify(crypto.randomBytes)

const { ACCESS_TOKEN_SECRET } = require('../config')

const requests = new Map()

async function checkUser(req, res, next) {
  const { username, password } = req.body

  const user = await User.findOne({ username }).lean()

  const passwordCorrect =
    user === null ? false : await bcrypt.compare(password, user.passwordHash)

  req.user = user
  req.passwordCorrect = passwordCorrect

  return next()
}

function controlRequestFlow(req, res, next) {
  const { passwordCorrect, ip } = req

  requests.forEach((reqData, reqIp) => {
    if (reqData.expires < Date.now()) requests.delete(reqIp)
  })

  const expireDate = () => Date.now() + 30 * 1000

  if (!requests.has(ip))
    requests.set(ip, { attempts: 0, expires: expireDate() })

  const currentRequest = requests.get(ip)

  currentRequest.attempts += 1
  currentRequest.expires = expireDate()

  if (currentRequest.attempts > 3 && !passwordCorrect) {
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

function generateAccessToken(req, res, next) {
  const { user } = req
  const userForToken = {
    username: user.username,
    id: user._id,
  }

  req.accessToken = jwt.sign(userForToken, ACCESS_TOKEN_SECRET, {
    expiresIn: '15s',
  })

  return next()
}

async function generateRefreshToken(req, res, next) {
  const buf = await randomBytes(32)
  const token = buf.toString('hex')
  const { user } = req
  const minute = 60 * 1000

  const refreshToken = new RefreshToken({
    token,
    expires: Date.now() + minute,
    user: {
      username: user.username,
      _id: user._id,
    },
  })

  await refreshToken.save()

  req.refreshToken = token
  return next()
}

function setTokenCookies(req, res, next) {
  const secure = process.env.NODE_ENV === 'production'
  res.cookie('accessToken', req.accessToken, {
    httpOnly: true,
    secure,
  })
  res.cookie('refreshToken', req.refreshToken, {
    httpOnly: true,
    secure,
  })

  return next()
}

module.exports = {
  checkUser,
  controlRequestFlow,
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
}
