import mongoose from 'mongoose'

const refreshTokenSchema = new mongoose.Schema({
  token: String,
  ancestor: String,
  tokenNumber: Number,
  issuedAt: String,
  expires: String,
  user: {
    name: String,
    username: String,
    id: String,
  },
})

const RefreshToken = mongoose.model('Token', refreshTokenSchema)

export default RefreshToken
