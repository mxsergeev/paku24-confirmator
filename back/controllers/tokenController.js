const tokenRouter = require('express').Router()
const {
  authenticateRefreshToken,
  updateOrDeleteRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
} = require('../utils/middleware/authentication')

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
  '/is-up-to-date',
  authenticateRefreshToken,
  updateOrDeleteRefreshToken,
  generateAccessToken,
  setTokenCookies,
  (req, res) => {
    res.status(200).send({ message: 'token updated' })
  }
)

module.exports = tokenRouter
