const loginRouter = require('express').Router()

const {
  filterRequestsWithExceededAttemptLimit,
  checkUser,
  controlRequestFlow,
  invalidAuth,
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  authenticateAccessToken,
} = require('./auth.middleware')

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
