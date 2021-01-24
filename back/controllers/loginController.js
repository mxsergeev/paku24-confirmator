/* eslint-disable no-underscore-dangle */
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const loginRouter = require('express').Router()
const User = require('../models/user')

const { JWT_SECRET } = require('../utils/config')

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

    return res.send({ message: 'Too many failed attempts.', throttleTime })
  }

  if (passwordCorrect) {
    currentRequest.attempts = 0
    return next()
  }

  return next()
}

async function generateJWT(req, res, next) {
  const { user } = req
  const userForToken = {
    username: user.username,
    id: user._id,
  }

  req.token = jwt.sign(userForToken, JWT_SECRET)

  return next()
}

loginRouter.post(
  '/',
  checkUser,
  controlRequestFlow,
  generateJWT,
  async (req, res) => {
    const { user, passwordCorrect, token } = req

    console.log(requests)
    if (!(user && passwordCorrect)) {
      return res.status(401).send({ error: 'invalid username or password' })
    }

    return res.status(200).send({
      token,
      username: user.username,
      name: user.name,
    })
  }
)

module.exports = loginRouter
