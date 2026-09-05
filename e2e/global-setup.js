import { connectToDatabase, disconnectFromDatabase } from '../backend/utils/database.js'
import Order from '../backend/models/order.js'
import RefreshToken from '../backend/models/refreshToken.js'
import User from '../backend/models/user.js'

const E2E_USER = {
  username: 'admin',
  name: 'E2E Admin',
  // The corresponding password is the documented local-development password: 1234.
  passwordHash: '$2b$10$/YT6WealhKlgpPbMmxwGUOWWnOOFVnbqggNh6X2MHxRH5SDLsrYFm',
  email: 'e2e@example.com',
  access: true,
}

export default async function globalSetup() {
  const uri = process.env.TEST_MONGODB_URI
  if (!uri) throw new Error('TEST_MONGODB_URI is required for Playwright E2E tests')

  await connectToDatabase({ uri, autoIndex: true })
  try {
    await Promise.all([Order.deleteMany({}), RefreshToken.deleteMany({}), User.deleteMany({})])
    await new User(E2E_USER).save()
  } finally {
    await disconnectFromDatabase()
  }
}
