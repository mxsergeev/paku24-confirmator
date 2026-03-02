import express from 'express'

const tokenRouter = express.Router()

import {
  controlRequestFlow,
  authenticateAccessToken,
  authenticateRefreshToken,
  updateOrDeleteOldToken,
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
} from './auth.middleware.js'

tokenRouter.post(
  '/',
  controlRequestFlow,
  // Proceeding to authenticate refresh token only if client HAS access token (even if it's expired).
  // In all other cases throwing an error.
  authenticateAccessToken,
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

export default tokenRouter
