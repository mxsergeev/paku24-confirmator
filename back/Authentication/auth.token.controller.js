const tokenRouter = require('express').Router()
const {
  authenticateAccessToken,
  authenticateRefreshToken,
  updateOrDeleteOldToken,
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
} = require('./auth.middleware')

tokenRouter.post(
  '/',
  authenticateRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  (req, res) => {
    res.status(200).send({ message: 'token generated' })
  }
)

tokenRouter.post(
  '/is-new',
  authenticateRefreshToken,
  updateOrDeleteOldToken,
  authenticateAccessToken,
  generateAccessToken,
  setTokenCookies,
  (req, res) => {
    if (req.refreshTokenIsNew) {
      return res.status(200).send({ message: 'refresh token up to date' })
    }
    return res.status(200).send({ message: 'token updated' })
  }
)

module.exports = tokenRouter
