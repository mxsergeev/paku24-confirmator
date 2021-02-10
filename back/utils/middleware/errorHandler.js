const logger = require('../logger')

const errorHandler = (err, req, res, next) => {
  if (err.name === 'CastError') {
    return res.status(400).send({
      error: 'malformatted id',
    })
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: err.message,
    })
  }
  if (err.name === 'TokenMissingError') {
    return res.status(403).send({
      error: 'token missing',
    })
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'RefreshTokenError') {
    return res.status(403).json({
      error: 'invalid token',
    })
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(403).send({
      error: 'token expired',
    })
  }

  logger.error(err.message)

  return next(err)
}

module.exports = errorHandler
