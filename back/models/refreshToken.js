const mongoose = require('mongoose')

const refreshTokenSchema = new mongoose.Schema({
  token: String,
  ancestor: String,
  tokenNumber: Number,
  issuedAt: String,
  expires: String,
  user: {
    name: String,
    username: String,
    _id: String,
  },
})

const RefreshToken = mongoose.model('Token', refreshTokenSchema)

module.exports = RefreshToken
