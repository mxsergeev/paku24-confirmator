import RefreshToken from '../models/refreshToken.js'
import User from '../models/user.js'
import { vi } from 'vitest'

const initialUsers = [
  {
    username: 'unicorn123',
    name: 'Twilight Sparkle',
    // hash for 'password'
    passwordHash: '$2b$10$DMPCz0Z2EDLBvZskwagMYO3YWIFChJapuyPbNWW.LIXPC5Nl7j7tK',
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

// mock
const res = {}

const mockNext = vi.fn((param) => {
  if (param) {
    throw param
  }
})

const exampleOrder = {
  address: 'Raiviosuonmäki 2 E 68',
  comment: '',
  date: new Date('2026-03-02T20:00'),
  destination: '',
  duration: '2',
  email: 'themaximsergeev@gmail.com',
  fees: [],
  name: 'Maxim Sergeev',
  paymentType: { id: '1', name: 'Maksukortti', fee: 0 },
  phone: '+358449747442',
  service: {
    id: '1',
    name: 'Paku ja kuski',
    pricePerHour: 30,
    price: 60,
  },
  time: '17:00',
}

const exampleOptions = {
  distance: 'insideCapital',
  hsy: false,
  altColorPalette: false,
}

const exampleEntryPartOfTheConfirmation =
  'Raiviosuonmäki 2 E 68\nNIMI\nMaxim Sergeev\nSÄHKÖPOSTI\nthemaximsergeev@gmail.com\nPUHELIN\n+358449747442'

const exampleEvent = {
  order: {
    address: 'Raiviosuonmäki 2 E 68',
    comment: 'Hello!',
    date: '2026-03-02T20:00:00.000+00:00',
    destination: 'Kalkkihiekantie',
    duration: '5',
    email: 'themaximsergeev@gmail.com',
    fees: [],
    name: 'Maxim Sergeev',
    paymentType: { id: '1', name: 'Maksukortti', fee: 0 },
    phone: '+358449747442',
    service: {
      id: '3',
      name: 'Paku ja kaksi muuttomiestä',
      pricePerHour: 90,
    },
    time: '15:00',
  },
  options: {
    distance: 'insideCapital',
    hsy: false,
  },
  entry:
    'Raiviosuonmäki 2 E 68\nMÄÄRÄNPÄÄ\nSortti-asema\nNIMI\nMaxim Sergeev\nSÄHKÖPOSTI\nthemaximsergeev@gmail.com\nPUHELIN\n+358449747442\nLISÄTIETOJA\nHello!',
}

const exampleCreatedEvent = `🚛🚛💳15:00(5h)${exampleEvent.entry}`

const smsOrderPayload = {
  address: {
    street: 'Raiviosuonmäki 2 E 68',
    index: '',
    city: 'Vantaa',
    floor: 0,
    elevator: false,
  },
  destination: {
    street: 'Raiviosuonmäki 5 C 32',
    index: '',
    city: 'Vantaa',
    floor: 0,
    elevator: false,
  },
  extraAddresses: [],
  fees: [],
  paymentType: { id: '1', name: 'Maksukortti', fee: 0 },
  boxes: {
    deliveryDate: '2021-04-22T17:00:00.000Z',
    deliveryHasTime: true,
    returnDate: '2021-04-22T19:00:00.000Z',
    returnHasTime: true,
    amount: 0,
  },
  boxesPrice: 0,
  pricingOverrides: { price: null, fees: null, boxesPrice: null },
  date: '2021-04-22T17:00:00.000Z',
  time: '17:00',
  duration: '2',
  service: {
    id: '1',
    name: 'Pakettiauto ja kuljettaja',
    pricePerHour: 50,
  },
  name: 'Maxim Sergeev',
  email: 'themaximsergeev@gmail.com',
  phone: '+358449747442',
}

export {
  initialUsers,
  usersInDB,
  tokensInDB,
  initializeDB,
  mockNext,
  res,
  exampleRefreshToken,
  exampleOrder,
  exampleOptions,
  exampleEntryPartOfTheConfirmation,
  exampleEvent,
  exampleCreatedEvent,
  smsOrderPayload,
}
