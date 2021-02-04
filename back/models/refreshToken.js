const mongoose = require('mongoose')

const refreshTokenSchema = new mongoose.Schema({
  token: String,
  expires: String,
  user: {
    username: String,
    _id: String,
  },
})

const RefreshToken = mongoose.model('Token', refreshTokenSchema)

module.exports = RefreshToken
