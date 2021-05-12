const ms = require('ms')
const loginRouter = require('express').Router()
const { AT_EXPIRES_IN } = require('../../utils/config')

const {
  filterRequestsWithExceededAttemptLimit,
  checkUser,
  controlRequestFlow,
  invalidAuth,
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  authenticateAccessToken,
} = require('../../utils/middleware/authentication')

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

module.exports = loginRouter
