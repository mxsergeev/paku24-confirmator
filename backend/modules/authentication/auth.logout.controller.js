const logoutRouter = require('express').Router()
const logout = require('./auth.helpers')

logoutRouter.post('/', async (req, res) => {
  await logout(req, res)
  return res.status(200).end()
})

module.exports = logoutRouter
