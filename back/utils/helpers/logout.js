const RefreshToken = require('../../models/refreshToken')

/**
 * Deletes refresh token and clears cookies.
 * @param {Object} req
 * @param {Object} req.cookies
 * @param {string} req.cookies.refreshToken
 * @param {Object} res
 * @param {string} [token]
 */

async function logout(req, res, token = undefined) {
  const { refreshToken } = req.cookies
  await RefreshToken.deleteOne({ token: token || refreshToken })

  const options = {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  }
  return res
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
}

module.exports = logout
