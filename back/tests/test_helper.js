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
    throw param
  }
})

const exampleOrder = {
  address: 'Raiviosuonmäki 2 E 68',
  comment: '',
  date: {
    ISODate: '2021-04-22',
    confirmationFormat: '22-04-2021',
    original: new Date('2021-04-22 17:00'),
  },
  destination: '',
  duration: '2',
  email: 'themaximsergeev@gmail.com',
  fees: {
    array: [],
    string: '',
  },
  name: 'Maxim Sergeev',
  paymentType: 'Maksukortti',
  phone: '+358449747442',
  serviceName: 'Paku ja kuski',
  servicePrice: 30,
  time: '17:00',
}

const exampleOptions = {
  XL: false,
  distance: 'insideCapital',
  hsy: false,
  altColorPalette: false,
}

const exampleEntryPartOfTheConfirmation =
  'Raiviosuonmäki 2 E 68\nNIMI\nMaxim Sergeev\nSÄHKÖPOSTI\nthemaximsergeev@gmail.com\nPUHELIN\n+358449747442'

const orderDetails =
  'VARAUKSEN TIEDOT\n10-04-2021\nALKAMISAIKA\nKlo 17:00 (+/-15min)\nARVIOITU KESTO\n2.5h (30€/h, Paku ja kuski)\nMAKSUTAPA\nKäteinen\nVIIKONLOPPULISÄ\n15€\nLÄHTÖPAIKKA\nRaiviosuonmäki 2 E 68, Vantaa\nMÄÄRÄNPÄÄ\nRaiviosuonmäki 5 C 32, Vantaa\nNIMI\nMaxim Sergeev\nSÄHKÖPOSTI\nthemaximsergeev@gmail.com\nPUHELIN\n0449747442\nLISÄTIETOJA\nTesting my app'

const exampleEvent = {
  order: {
    address: 'Raiviosuonmäki 2 E 68',
    comment: 'Hello!',
    date: {
      ISODate: '2021-03-17',
      confirmationFormat: '17-03-2021',
      original: '2021-03-17T15:00:00.000Z',
    },
    destination: 'Kalkkihiekantie',
    duration: '5',
    email: 'themaximsergeev@gmail.com',
    fees: { array: [], string: '' },
    name: 'Maxim Sergeev',
    paymentType: 'Maksukortti',
    phone: '+358449747442',
    serviceName: 'Paku ja kaksi muuttomiestä',
    servicePrice: 90,
    time: '15:00',
  },
  options: {
    distance: 'insideCapital',
    hsy: false,
    XL: false,
  },
  entry:
    'Raiviosuonmäki 2 E 68\nMÄÄRÄNPÄÄ\nSortti-asema\nNIMI\nMaxim Sergeev\nSÄHKÖPOSTI\nthemaximsergeev@gmail.com\nPUHELIN\n+358449747442\nLISÄTIETOJA\nHello!',
}

const exampleCreatedEvent = `🚛🚛💳15:00(5h)${exampleEvent.entry}`

module.exports = {
  initialUsers,
  usersInDB,
  tokensInDB,
  initializeDB,
  connectToDB,
  mockNext,
  res,
  exampleRefreshToken,
  exampleOrder,
  exampleOptions,
  exampleEntryPartOfTheConfirmation,
  exampleEvent,
  exampleCreatedEvent,
  orderDetails,
}
