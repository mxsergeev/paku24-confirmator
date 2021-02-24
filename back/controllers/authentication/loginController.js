const ms = require('ms')
const loginRouter = require('express').Router()
const { AT_EXPIRES_IN } = require('../../utils/config')

const {
  checkUser,
  controlRequestFlow,
  invalidAuth,
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  authenticateAccessToken,
} = require('../../utils/middleware/authentication')

function sendUserAndRefreshTokenAfterMS(req, res) {
  const { user } = req

  return res.status(200).send({
    user: {
      username: user.username,
      name: user.name,
    },
    refreshAccessTokenAfter: ms(AT_EXPIRES_IN) - 2000,
  })
}

loginRouter.post(
  '/',
  checkUser,
  controlRequestFlow,
  invalidAuth,
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  sendUserAndRefreshTokenAfterMS
)

loginRouter.post(
  '/token',
  authenticateAccessToken,
  sendUserAndRefreshTokenAfterMS
)

module.exports = loginRouter
