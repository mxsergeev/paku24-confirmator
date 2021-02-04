const tokenRouter = require('express').Router()
const {
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
} = require('../utils/middleware/login')
const RefreshToken = require('../models/refreshToken')

async function checkRefreshToken(req, res, next) {
  const { refreshToken } = req.cookies
  if (!refreshToken) {
    return res.status(401).send({ error: 'Refresh token missing.' })
  }

  const matchedToken = await RefreshToken.findOne({
    token: refreshToken,
  }).exec()
  if (!matchedToken) {
    return res.status(403).send({ error: 'Refresh token invalid.' })
  }

  const isExpired = matchedToken && matchedToken.expires < Date.now()
  if (isExpired) {
    // logout()
    await matchedToken.remove()
    return res.status(401).send({ error: 'Token expired.' })
  }

  req.user = matchedToken.user
  await matchedToken.remove()

  return next()
}

tokenRouter.get(
  '/',
  checkRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  (req, res) => {
    return res.status(200).send({ message: 'New access token generated.' })
  }
)

module.exports = tokenRouter
