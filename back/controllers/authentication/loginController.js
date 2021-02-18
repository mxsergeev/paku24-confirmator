const loginRouter = require('express').Router()
const {
  checkUser,
  controlRequestFlow,
  invalidAuth,
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
} = require('../../utils/middleware/authentication')

loginRouter.post(
  '/',
  checkUser,
  controlRequestFlow,
  invalidAuth,
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  (req, res) => {
    const { user } = req

    return res.status(200).send({
      username: user.username,
      name: user.name,
    })
  }
)

module.exports = loginRouter
