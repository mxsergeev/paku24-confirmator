const jwt = require('jsonwebtoken')
const { ACCESS_TOKEN_SECRET } = require('../config')

module.exports = function authenticateToken(req, res, next) {
  const { accessToken } = req.cookies
  if (!accessToken) return res.status(403).send({ error: 'Token missing' })

  return jwt.verify(accessToken, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return next(err)
    req.user = user
    return next()
  })
}
