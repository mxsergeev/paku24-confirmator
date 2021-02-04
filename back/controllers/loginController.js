const loginRouter = require('express').Router()
const loginMiddleware = require('../utils/middleware/login')

loginRouter.post(
  '/',
  loginMiddleware.checkUser,
  loginMiddleware.controlRequestFlow,
  loginMiddleware.generateAccessToken,
  loginMiddleware.generateRefreshToken,
  loginMiddleware.setTokenCookies,
  (req, res) => {
    const { user, passwordCorrect } = req

    if (!(user && passwordCorrect)) {
      return res.status(401).send({ error: 'invalid username or password' })
    }

    return res.status(200).send({
      username: user.username,
      name: user.name,
    })
  }
)

module.exports = loginRouter
