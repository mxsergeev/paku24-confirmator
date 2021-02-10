const loginRouter = require('express').Router()
const authMw = require('../utils/middleware/authentication')

loginRouter.post(
  '/',
  authMw.checkUser,
  authMw.controlRequestFlow,
  authMw.invalidAuth,
  authMw.generateAccessToken,
  authMw.generateRefreshToken,
  authMw.setTokenCookies,
  (req, res) => {
    const { user } = req

    return res.status(200).send({
      username: user.username,
      name: user.name,
    })
  }
)

module.exports = loginRouter
