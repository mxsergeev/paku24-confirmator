import express from 'express'

const logoutRouter = express.Router()

import logout from './auth.helpers.js'

logoutRouter.post('/', async (req, res) => {
  await logout(req, res)
  return res.status(200).end()
})

export default logoutRouter
