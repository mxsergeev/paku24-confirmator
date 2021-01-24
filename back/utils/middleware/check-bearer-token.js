// const jwt = require('jsonwebtoken')

function getTokenFrom(req) {
  const authorization = req.get('authorization')
  console.log('authorization')
  console.log(authorization)

  if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
    return authorization.substring(7)
  }

  return null
}

module.exports = function checkBearerToken(req, res, next) {
  getTokenFrom(req)
  next()
}
