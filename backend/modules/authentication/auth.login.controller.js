import express from 'express'

const loginRouter = express.Router()

import {
  filterRequestsWithExceededAttemptLimit,
  checkUser,
  controlRequestFlow,
  invalidAuth,
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  authenticateAccessToken,
} from './auth.middleware.js'

function sendUserInfo(req, res) {
  const { user } = req

  return res.status(200).send({
    user: {
      username: user.username,
      name: user.name,
    },
  })
}

loginRouter.post(
  '/',
  filterRequestsWithExceededAttemptLimit,
  checkUser,
  controlRequestFlow,
  invalidAuth,
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  sendUserInfo
)

loginRouter.post('/token', authenticateAccessToken, sendUserInfo)

export default loginRouter
