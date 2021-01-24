const jwt = require('jsonwebtoken')
const { JWT_SECRET } = require('../config')

function getTokenFrom(req) {
  const authorization = req.get('authorization')

  if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
    return authorization.substring(7)
  }

  return null
}

module.exports = function checkBearerToken(req, res, next) {
  const token = getTokenFrom(req)
  if (!token || !jwt.verify(token, JWT_SECRET)?.id) {
    return res.status(401).send({ error: 'Token missing or invalid.' })
  }

  return next()
}
