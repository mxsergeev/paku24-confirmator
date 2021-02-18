const tokenRouter = require('express').Router()
const {
  authenticateRefreshToken,
  updateOrDeleteOldToken,
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
} = require('../../utils/middleware/authentication')

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
