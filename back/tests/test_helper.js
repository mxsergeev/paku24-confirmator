const RefreshToken = require('../models/refreshToken')
const User = require('../models/user')
const mongoose = require('mongoose')
const config = require('../utils/config')

const initialUsers = [
  {
    username: 'unicorn123',
    name: 'Twilight Sparkle',
    // hash for 'password'
    passwordHash:
      '$2b$10$DMPCz0Z2EDLBvZskwagMYO3YWIFChJapuyPbNWW.LIXPC5Nl7j7tK',
    email: 'test@test.com',
    access: true,
  },
  {
    name: 'Nathan Fillion',
    email: 'paku24.confirmator@gmail.com',
    requestToken: 'IqQHJJPuuJS6+C6A0a88d2ZGiZe8HDVbnOwHGqBQgEQ=',
    access: false,
  },
]

const exampleRefreshToken = {
  token:
    'f2dc96c209d1638b75f463f89713f51bda98158502f23682f0907e9ff6f9d49c81d9d3c86a4d406974290c965d2b135000df9c43ffe0bd64496ed8637ebc2cb0',
  tokenNumber: 0,
  issuedAt: '1615812777000',
  expires: '1615814577000',
  user: { name: 'Twilight Sparkle', username: 'unicorn123' },
}

async function usersInDB() {
  const users = await User.find({})
  return users.map((user) => user.toJSON())
}

async function tokensInDB() {
  const tokens = await RefreshToken.find({})
  return tokens.map((token) => token.toJSON())
}

async function initializeDB() {
  await User.deleteMany({})
  await RefreshToken.deleteMany({})

  const userObjects = initialUsers.map((user) => new User(user))
  const promiseArray = userObjects.map((user) => user.save())
  await Promise.all(promiseArray)
}

function connectToDB() {
  mongoose
    .connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    })
    .catch((err) => {
      console.error('Error connecting to MongoDB:', err.message)
    })
}

// mock
const res = {}

const mockNext = jest.fn((param) => {
  if (param) {
    // console.log('inside if in mockNext')
    throw param
  }
})

module.exports = {
  initialUsers,
  usersInDB,
  tokensInDB,
  initializeDB,
  connectToDB,
  mockNext,
  res,
  exampleRefreshToken,
}
