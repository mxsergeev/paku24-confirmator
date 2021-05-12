const logger = require('../logger')

function errorHandler(err, req, res, next) {
  const errorsPass = {
    TokenTheftError: {
      status: 403,
      message: 'token theft',
    },
    TooManyRequestsError: {
      status: 429,
      message: 'too many requests',
    },
    InvalidUserError: {
      status: 400,
      message: 'invalid username or password',
    },
    CastError: {
      status: 400,
      message: 'malformatted id',
    },
    ValidationError: {
      status: 400,
      message: err.message,
    },
    TokenMissingError: {
      status: 403,
      message: 'token missing',
    },
    JsonWebTokenError: {
      status: 403,
      message: 'invalid access token',
    },
    RefreshTokenError: {
      status: 403,
      message: 'invalid refresh token',
    },
    TokenExpiredError: {
      status: 403,
      message: 'access token expired',
    },
    RefreshTokenExpiredError: {
      status: 403,
      message: 'refresh token expired',
    },
    RequestTokenError: {
      status: 403,
      message: 'invalid request token',
    },
    AccessAlreadyRequestedError: {
      status: 403,
      message: 'access already requested',
    },
  }

  const error = errorsPass[err.name]

  if (error) {
    return res.status(error.status).send({ error: error.message })
  }

  logger.error(err.message)

  return next(err)
}

module.exports = errorHandler
